import type * as Party from "partykit/server";
import { env } from "@/env";
import {
	calculateBalanceChange,
	canPlayCard,
	contractToTrumpMode,
	getPlayableCards,
	isSoloGame,
	isTrump,
} from "../../src/lib/game/rules";
import { TRICK_ANIMATION_DELAY } from "../../src/lib/trick-animation";
import { canMakeAnnouncement } from "../announcements";
import { calculateGamePoints } from "../game-scoring";
import {
	createStartedGameState,
	createWaitingGameState,
} from "../game-state-factory";
import { logger } from "../logger";
import { createPartykitHttpClient } from "../partykit-http";
import { gameEventSchema, tableEventSchema } from "../schemas";
import {
	findPlayerTable,
	handleTableEvent,
	leaveTable as leaveTableRoom,
	type TableRoomContext,
	updatePlayerInfo as updateTableRoomPlayerInfo,
} from "../table-room";
import { calculateTrickPoints, determineTrickWinner } from "../trick-scoring";
import type {
	AnnouncementType,
	ContractType,
	GameEvent,
	GameMessage,
	GameState,
	Player,
	PointAnnouncement,
	PointAnnouncementType,
	ReservationType,
	Table,
	TableEvent,
	TableMessage,
	TablesState,
	Trick,
} from "../types";

export default class Server implements Party.Server {
	private static readonly WAITING_RECONNECT_GRACE_MS = 8_000;
	tables: Map<string, Table> = new Map();
	games: Map<string, GameState> = new Map();
	// Track player connections per game: gameId -> Set of player connection IDs
	playerConnections: Map<string, Set<string>> = new Map();
	// Track spectators per game: gameId -> Set of spectator connection IDs
	spectatorConnections: Map<string, Set<string>> = new Map();
	// Map connection ID to spectator info (including name and image)
	connectionToSpectator: Map<
		string,
		{
			gameId: string;
			spectatorId: string;
			spectatorName: string;
			spectatorImage?: string | null;
		}
	> = new Map();
	// Map connection ID to player info (for targeted messages like redirect-to-lobby)
	connectionToPlayer: Map<string, { gameId: string; playerId: string }> =
		new Map();
	// Map connection ID to player ID (for tables-room auto-leave on disconnect)
	connectionToTablePlayer: Map<string, string> = new Map();
	// Waiting-game reconnect grace timers: `${gameId}:${playerId}` -> timeout
	waitingPlayerDisconnectTimers: Map<string, ReturnType<typeof setTimeout>> =
		new Map();
	private readonly partykitHttp = createPartykitHttpClient({
		host: process.env.NEXT_PUBLIC_PARTYKIT_HOST || "localhost:1999",
		apiSecret: env.PARTYKIT_API_SECRET || "",
		logger,
	});

	constructor(readonly room: Party.Room) {}

	// Load persisted state from storage
	async onStart() {
		logger.debug("[onStart] Room:", this.room.id);
		if (this.room.id === "tables-room") {
			const storedTables = await this.room.storage.get<Table[]>("tables");
			if (storedTables) {
				this.tables = new Map(storedTables.map((t) => [t.id, t]));
			}
		} else if (this.room.id.startsWith("game-")) {
			const storedGame = await this.room.storage.get<GameState>("gameState");
			logger.debug(
				"[onStart] Loaded game:",
				storedGame?.id,
				"gameEnded:",
				storedGame?.gameEnded,
			);
			if (storedGame) {
				this.games.set(this.room.id, storedGame);

				// If loaded game is ended, schedule restart
				if (storedGame.gameEnded) {
					logger.info(
						"[onStart] Game is ended, scheduling restart in 5 seconds",
					);
					const RESTART_DELAY = 5000;
					setTimeout(() => {
						logger.info("[onStart] Restarting game now...");
						this.restartGame(storedGame);
					}, RESTART_DELAY);
				}
			}
		}
	}

	// Persist tables to storage
	async persistTables() {
		if (this.room.id === "tables-room") {
			await this.room.storage.put("tables", Array.from(this.tables.values()));
		}
	}

	// Persist game state to storage
	async persistGameState(gameState: GameState) {
		await this.room.storage.put("gameState", gameState);
	}

	private async persistAndBroadcastGame(gameState: GameState) {
		await this.persistGameState(gameState);
		this.broadcastGameState(gameState);
		this.broadcastToSpectators(gameState);
	}

	private getWaitingDisconnectKey(gameId: string, playerId: string) {
		return `${gameId}:${playerId}`;
	}

	private clearWaitingPlayerDisconnectTimer(gameId: string, playerId: string) {
		const key = this.getWaitingDisconnectKey(gameId, playerId);
		const timer = this.waitingPlayerDisconnectTimers.get(key);
		if (!timer) return;

		clearTimeout(timer);
		this.waitingPlayerDisconnectTimers.delete(key);
	}

	private hasOtherActivePlayerConnection(
		gameId: string,
		playerId: string,
		excludeConnId?: string,
	): boolean {
		for (const [connId, info] of this.connectionToPlayer.entries()) {
			if (excludeConnId && connId === excludeConnId) continue;
			if (info.gameId === gameId && info.playerId === playerId) {
				return true;
			}
		}
		return false;
	}

	private scheduleWaitingPlayerDisconnect(gameId: string, playerId: string) {
		const key = this.getWaitingDisconnectKey(gameId, playerId);
		if (this.waitingPlayerDisconnectTimers.has(key)) return;

		const timer = setTimeout(() => {
			void this.handleWaitingPlayerDisconnect(gameId, playerId);
		}, Server.WAITING_RECONNECT_GRACE_MS);

		this.waitingPlayerDisconnectTimers.set(key, timer);
	}

	private async handleWaitingPlayerDisconnect(
		gameId: string,
		playerId: string,
	) {
		this.clearWaitingPlayerDisconnectTimer(gameId, playerId);

		if (this.hasOtherActivePlayerConnection(gameId, playerId)) {
			return;
		}

		const gameState = this.games.get(gameId);
		if (!gameState || gameState.gameStarted) {
			return;
		}

		const wasPlayer = gameState.players.some(
			(player) => player.id === playerId,
		);
		if (!wasPlayer) {
			return;
		}

		gameState.players = gameState.players.filter((p) => p.id !== playerId);
		if (gameState.players.length === 0) {
			this.games.delete(gameId);
			await this.room.storage.delete("gameState");
		} else {
			await this.persistAndBroadcastGame(gameState);
		}

		this.partykitHttp.removePlayerFromTable(gameState.tableId, playerId);
	}

	private async removePlayerAsSpectator(gameId: string, playerId: string) {
		const spectators = this.spectatorConnections.get(gameId);
		if (!spectators || spectators.size === 0) return;

		let removed = false;
		for (const connId of Array.from(spectators)) {
			const info = this.connectionToSpectator.get(connId);
			if (info?.spectatorId !== playerId) continue;

			spectators.delete(connId);
			this.connectionToSpectator.delete(connId);
			removed = true;
		}

		if (!removed) return;

		const gameState = this.games.get(gameId);
		if (!gameState) return;

		gameState.spectatorCount = spectators.size;
		gameState.spectators = this.getSpectatorList(gameId);
		this.broadcastGameState(gameState);
		await this.updateTableSpectatorCount(
			gameState.tableId,
			gameState.spectatorCount,
		);
	}

	private getTableRoomContext(): TableRoomContext {
		return {
			room: this.room,
			tables: this.tables,
			connectionToTablePlayer: this.connectionToTablePlayer,
			persistTables: () => this.persistTables(),
			sendState: (conn) => this.sendState(conn),
			broadcastState: () => this.broadcastState(),
			sendError: (conn, message) => this.sendError(conn, message),
			startGame: (table) => this.startGame(table),
			initGameRoom: (gameId, tableId, player) =>
				this.partykitHttp.initGameRoom(gameId, tableId, player),
			addPlayerToGame: async (gameId, player) =>
				await this.partykitHttp.addPlayerToGame(gameId, player),
			updateGameRoomPlayerInfo: (gameId, playerId, name, image) =>
				this.partykitHttp.updateGameRoomPlayerInfo(
					gameId,
					playerId,
					name,
					image,
				),
		};
	}

	async onRequest(req: Party.Request) {
		if (req.method !== "POST") {
			return new Response("Method not allowed", { status: 405 });
		}

		const authHeader = req.headers.get("Authorization");
		const apiSecret = env.PARTYKIT_API_SECRET || "";
		if (authHeader !== `Bearer ${apiSecret}`) {
			return new Response("Unauthorized", { status: 401 });
		}

		try {
			const body = (await req.json()) as {
				type: string;
				playerId: string;
				name?: string;
				image?: string | null;
				tableId?: string;
				gameId?: string;
				player?: Player;
			};

			if (
				body.type === "ensure-player-at-table" &&
				this.room.id === "tables-room" &&
				body.tableId &&
				body.gameId &&
				body.player
			) {
				const table = this.tables.get(body.tableId);
				if (!table) {
					return new Response("OK", { status: 200 });
				}

				// If the table has no game id yet (legacy data), bind it now.
				if (!table.gameId) {
					table.gameId = body.gameId;
				}

				if (table.gameId !== body.gameId) {
					return new Response("OK", { status: 200 });
				}

				const isAlreadyAtTable = table.players.some(
					(player) => player.id === body.player?.id,
				);
				if (isAlreadyAtTable) {
					return new Response("OK", { status: 200 });
				}

				const existingTable = findPlayerTable(this.tables, body.player.id);
				if (existingTable && existingTable.id !== table.id) {
					return new Response("OK", { status: 200 });
				}

				if (table.players.length >= 4) {
					return new Response("OK", { status: 200 });
				}

				table.players.push(body.player);
				await this.persistTables();
				this.broadcastState();
				return new Response("OK", { status: 200 });
			}

			if (
				body.type === "leave-table" &&
				this.room.id === "tables-room" &&
				body.tableId
			) {
				await leaveTableRoom(
					this.getTableRoomContext(),
					body.tableId,
					body.playerId,
				);
				return new Response("OK", { status: 200 });
			}

			if (body.type === "update-player-info") {
				if (this.room.id === "tables-room") {
					const gameIds = await updateTableRoomPlayerInfo(
						this.getTableRoomContext(),
						body.playerId,
						body.name ?? "",
						body.image,
					);
					return Response.json({ gameIds });
				}
				if (this.room.id.startsWith("game-")) {
					await this.updateGamePlayerInfo(
						body.playerId,
						body.name ?? "",
						body.image,
					);
				}
				return new Response("OK", { status: 200 });
			}

			if (
				body.type === "add-player" &&
				this.room.id.startsWith("game-") &&
				body.player
			) {
				const player = body.player;
				const gameState = this.games.get(this.room.id);
				if (!gameState) {
					return new Response("Game not found", { status: 404 });
				}

				// Idempotent success for duplicate requests.
				if (gameState.players.some((p) => p.id === player.id)) {
					return new Response("OK", { status: 200 });
				}

				if (gameState.gameStarted || gameState.players.length >= 4) {
					return new Response("Game not joinable", { status: 409 });
				}

				gameState.players.push(player);
				if (gameState.players.length === 4) {
					await this.restartGame(gameState);
				} else {
					await this.persistAndBroadcastGame(gameState);
				}
				return new Response("OK", { status: 200 });
			}

			if (
				body.type === "init-game" &&
				this.room.id.startsWith("game-") &&
				body.player &&
				body.tableId
			) {
				// Only init if no game exists yet
				if (!this.games.has(this.room.id)) {
					const waitingState = createWaitingGameState({
						gameId: this.room.id,
						tableId: body.tableId,
						players: [body.player],
						round: 1,
					});
					this.games.set(this.room.id, waitingState);
					await this.persistGameState(waitingState);
				}
				return new Response("OK", { status: 200 });
			}

			return new Response("Unknown event type", { status: 400 });
		} catch {
			return new Response("Invalid request body", { status: 400 });
		}
	}

	onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
		logger.debug(
			`Connected: id: ${conn.id}, room: ${this.room.id}, url: ${new URL(ctx.request.url).pathname}`,
		);

		if (this.room.id === "tables-room") {
			// Send current state to newly connected client
			this.sendState(conn);
		} else if (this.room.id.startsWith("game-")) {
			// Handle game room - don't send state immediately, wait for get-state or spectate-game event
			// Players will send "get-state", spectators will send "spectate-game" (which returns a sanitized view)
		}
	}

	async onClose(conn: Party.Connection) {
		// Tables-room: auto-leave only for pre-game tables without game room binding.
		// Tables that already have a gameId must survive lobby disconnects so invite joins
		// from /game links can still resolve the table.
		if (this.room.id === "tables-room") {
			const playerId = this.connectionToTablePlayer.get(conn.id);
			if (playerId) {
				this.connectionToTablePlayer.delete(conn.id);
				const table = findPlayerTable(this.tables, playerId);
				if (table && !table.gameStarted && !table.gameId) {
					await leaveTableRoom(this.getTableRoomContext(), table.id, playerId);
				}
			}
		}

		// Game-room: auto-leave game on disconnect (only if game in waiting state)
		if (this.room.id.startsWith("game-")) {
			const playerInfo = this.connectionToPlayer.get(conn.id);
			if (playerInfo) {
				const gameState = this.games.get(playerInfo.gameId);
				if (gameState && !gameState.gameStarted) {
					const hasOtherConnection = this.hasOtherActivePlayerConnection(
						playerInfo.gameId,
						playerInfo.playerId,
						conn.id,
					);
					if (!hasOtherConnection) {
						this.scheduleWaitingPlayerDisconnect(
							playerInfo.gameId,
							playerInfo.playerId,
						);
					}
				}
			}
		}

		// Clean up connection tracking maps
		for (const players of this.playerConnections.values()) {
			players.delete(conn.id);
		}
		this.connectionToPlayer.delete(conn.id);

		// Handle spectator disconnect
		const spectatorInfo = this.connectionToSpectator.get(conn.id);
		if (spectatorInfo) {
			await this.removeSpectator(spectatorInfo.gameId, conn.id);
			this.connectionToSpectator.delete(conn.id);
		}
	}

	onMessage(message: string, sender: Party.Connection) {
		if (this.room.id.startsWith("game-")) {
			// Handle game events
			try {
				const parsed = gameEventSchema.safeParse(JSON.parse(message));
				if (!parsed.success) {
					this.sendGameError(sender, "Ungültiges Nachrichtenformat");
					return;
				}
				this.handleGameEvent(parsed.data as GameEvent, sender);
			} catch (error) {
				logger.error("Error parsing message:", error);
				this.sendGameError(sender, "Ungültiges Nachrichtenformat");
			}
			return;
		}

		// Handle tables room
		if (this.room.id === "tables-room") {
			try {
				const parsed = tableEventSchema.safeParse(JSON.parse(message));
				if (!parsed.success) {
					this.sendError(sender, "Ungültiges Nachrichtenformat");
					return;
				}
				handleTableEvent(
					this.getTableRoomContext(),
					parsed.data as TableEvent,
					sender,
				);
			} catch (error) {
				logger.error("Error parsing message:", error);
				this.sendError(sender, "Ungültiges Nachrichtenformat");
			}
		}
	}

	async startGame(table: Table) {
		// Use existing gameId (created in createTable) or generate new one
		const gameId =
			table.gameId ??
			`game-${Date.now()}-${Math.random().toString(36).substring(7)}`;
		table.gameId = gameId;
		table.gameStarted = true;

		// Persist tables state
		await this.persistTables();

		// Broadcast game started event with players
		const message: TableMessage = {
			type: "game-started",
			gameId,
			tableId: table.id,
			players: table.players,
		};
		this.room.broadcast(JSON.stringify(message));

		// Also update state
		this.broadcastState();
	}

	async updateGamePlayerInfo(
		playerId: string,
		name: string,
		image?: string | null,
	) {
		const gameState = this.games.get(this.room.id);
		if (!gameState) return;

		let changed = false;

		const player = gameState.players.find((p) => p.id === playerId);
		if (player) {
			player.name = name;
			if (image !== undefined) player.image = image;
			changed = true;
		}

		const spectator = gameState.spectators.find((s) => s.id === playerId);
		if (spectator) {
			spectator.name = name;
			if (image !== undefined) spectator.image = image;
			changed = true;
		}

		for (const info of this.connectionToSpectator.values()) {
			if (info.spectatorId === playerId) {
				info.spectatorName = name;
				if (image !== undefined) info.spectatorImage = image;
				changed = true;
			}
		}

		if (changed) {
			await this.persistAndBroadcastGame(gameState);
		}
	}

	getState(): TablesState {
		return {
			tables: Array.from(this.tables.values()),
		};
	}

	sendState(conn: Party.Connection) {
		const message: TableMessage = {
			type: "state",
			state: this.getState(),
		};
		conn.send(JSON.stringify(message));
	}

	sendError(conn: Party.Connection, message: string) {
		const errorMessage: TableMessage = {
			type: "error",
			message,
		};
		conn.send(JSON.stringify(errorMessage));
	}

	broadcastState() {
		const message: TableMessage = {
			type: "state",
			state: this.getState(),
		};
		this.room.broadcast(JSON.stringify(message));
	}

	// Game server methods
	async handleGameEvent(event: GameEvent, sender: Party.Connection) {
		switch (event.type) {
			case "get-state": {
				const gameState = this.games.get(this.room.id);
				if (gameState) {
					const isPlayer =
						event.playerId &&
						gameState.players.some((p) => p.id === event.playerId);
					if (isPlayer) {
						// Reconnected player in waiting phase: cancel pending auto-remove timer.
						this.clearWaitingPlayerDisconnectTimer(
							gameState.id,
							event.playerId as string,
						);

						// Ensure player is never tracked as spectator on any stale connection.
						await this.removePlayerAsSpectator(
							gameState.id,
							event.playerId as string,
						);

						// Keep tables-room in sync: if game knows this player, table must too.
						const gamePlayer = gameState.players.find(
							(player) => player.id === event.playerId,
						);
						if (gamePlayer) {
							this.partykitHttp.ensurePlayerAtTable(
								gameState.tableId,
								gameState.id,
								gamePlayer,
							);
						}

						// If this connection was previously registered as spectator,
						// upgrade it to player by removing spectator tracking first.
						if (this.connectionToSpectator.has(sender.id)) {
							await this.removeSpectator(gameState.id, sender.id);
							this.connectionToSpectator.delete(sender.id);
						}

						// Register as player connection
						if (!this.playerConnections.has(gameState.id)) {
							this.playerConnections.set(gameState.id, new Set());
						}
						this.playerConnections.get(gameState.id)?.add(sender.id);
						this.connectionToPlayer.set(sender.id, {
							gameId: gameState.id,
							playerId: event.playerId as string,
						});
						this.sendGameState(sender, gameState);
					} else {
						// Not a player: always register as spectator.
						// Seat joins must come through explicit join-table in tables-room.
						await this.addSpectator(
							gameState.id,
							event.playerId ?? sender.id,
							event.playerName ?? "Zuschauer",
							event.playerImage ?? null,
							sender,
						);
					}
				}
				break;
			}

			case "start-game":
				await this.startGameRoom(event.players, event.tableId);
				break;

			case "play-card":
				await this.playCard(event.cardId, event.playerId, sender);
				break;

			case "auto-play":
				await this.autoPlay(sender);
				break;

			case "auto-play-all":
				await this.autoPlayAll(sender);
				break;

			case "spectate-game":
				await this.addSpectator(
					event.gameId,
					event.spectatorId,
					event.spectatorName,
					event.spectatorImage,
					sender,
				);
				break;

			case "announce":
				await this.handleAnnouncement(
					event.announcement,
					event.playerId,
					sender,
				);
				break;

			case "reset-game":
				await this.handleResetGame(sender);
				break;

			case "bid":
				await this.handleBid(event.playerId, event.bid, sender);
				break;

			case "declare-contract":
				await this.handleDeclareContract(
					event.playerId,
					event.contract,
					sender,
				);
				break;

			case "toggle-stand-up":
				await this.handleToggleStandUp(event.playerId, sender);
				break;

			case "update-player-info":
				await this.updateGamePlayerInfo(
					event.playerId,
					event.name,
					event.image,
				);
				break;
		}
	}

	async handleResetGame(sender: Party.Connection) {
		const gameState = this.games.get(this.room.id);
		if (!gameState) {
			this.sendGameError(sender, "Kein Spiel gefunden.");
			return;
		}

		// Restart the game immediately
		await this.restartGame(gameState);
	}

	async handleToggleStandUp(playerId: string, sender: Party.Connection) {
		const gameState = this.games.get(this.room.id);
		if (!gameState) {
			this.sendGameError(sender, "Kein Spiel gefunden.");
			return;
		}

		// Only active players can toggle
		const isPlayer = gameState.players.some((p) => p.id === playerId);
		if (!isPlayer) return;

		// If game is in waiting state, leave immediately
		if (!gameState.gameStarted) {
			// Remove player from game
			gameState.players = gameState.players.filter((p) => p.id !== playerId);

			// Redirect player to lobby
			const msg: GameMessage = {
				type: "redirect-to-lobby",
				tableId: gameState.tableId,
			};
			sender.send(JSON.stringify(msg));

			// Clean up connection
			const connId = sender.id;
			this.playerConnections.get(this.room.id)?.delete(connId);
			this.connectionToPlayer.delete(connId);

			// Remove player from table
			this.partykitHttp.removePlayerFromTable(gameState.tableId, playerId);

			await this.persistAndBroadcastGame(gameState);
			return;
		}

		// Toggle: add or remove from standingUpPlayers
		const idx = gameState.standingUpPlayers.indexOf(playerId);
		if (idx === -1) {
			gameState.standingUpPlayers.push(playerId);
		} else {
			gameState.standingUpPlayers.splice(idx, 1);
		}

		await this.persistAndBroadcastGame(gameState);
	}

	// Vorbehaltsabfrage (Bidding) Logik
	async handleBid(
		playerId: string,
		bid: ReservationType,
		sender: Party.Connection,
	) {
		const gameState = this.games.get(this.room.id);
		if (!gameState || !gameState.biddingPhase?.active) {
			this.sendGameError(sender, "Keine aktive Vorbehaltsabfrage.");
			return;
		}

		// Prüfe ob der Spieler an der Reihe ist
		const currentBidder =
			gameState.players[gameState.biddingPhase.currentBidderIndex];
		if (!currentBidder || currentBidder.id !== playerId) {
			this.sendGameError(sender, "Du bist nicht an der Reihe.");
			return;
		}

		// Speichere das Gebot
		gameState.biddingPhase.bids[playerId] = bid;

		// Nächster Spieler (Contract-Deklaration kommt erst nach allen Bids)
		await this.advanceBidding(gameState);
	}

	async handleDeclareContract(
		playerId: string,
		contract: ContractType,
		sender: Party.Connection,
	) {
		const gameState = this.games.get(this.room.id);
		if (!gameState || !gameState.biddingPhase?.active) {
			this.sendGameError(sender, "Keine aktive Vorbehaltsabfrage.");
			return;
		}

		// Prüfe ob dieser Spieler seinen Vorbehalt deklarieren soll
		const awaiting = gameState.biddingPhase.awaitingContractDeclaration ?? [];
		if (!awaiting.includes(playerId)) {
			this.sendGameError(sender, "Du musst keinen Vorbehalt deklarieren.");
			return;
		}

		// Validiere Hochzeit: Spieler muss beide Kreuz-Damen haben
		if (contract === "hochzeit") {
			const hand = gameState.hands[playerId];
			if (!hand) {
				this.sendGameError(sender, "Spieler nicht gefunden.");
				return;
			}
			const clubsQueens = hand.filter(
				(card) => card.suit === "clubs" && card.rank === "queen",
			);
			if (clubsQueens.length !== 2) {
				this.sendGameError(
					sender,
					"Du brauchst beide Kreuz-Damen für eine Hochzeit.",
				);
				return;
			}
		}

		// Speichere den Contract und entferne Spieler aus der Warteliste
		gameState.biddingPhase.pendingContracts[playerId] = contract;
		const remaining = awaiting.filter((id) => id !== playerId);
		gameState.biddingPhase.awaitingContractDeclaration = remaining;

		// Prüfe ob noch weitere Vorbehalt-Spieler deklarieren müssen
		if (remaining.length > 0) {
			await this.persistAndBroadcastGame(gameState);
			return;
		}

		// Alle haben deklariert — Bidding auflösen
		gameState.biddingPhase.awaitingContractDeclaration = undefined;
		await this.persistAndBroadcastGame(gameState);

		setTimeout(() => {
			this.resolveBidding(gameState);
		}, 2000);
	}

	// Finde alle Vorbehalt-Spieler die noch keinen Contract deklariert haben
	findAllUndeclaredVorbehalt(gameState: GameState): string[] {
		if (!gameState.biddingPhase) return [];
		const result: string[] = [];
		const forehandIndex = (gameState.round - 1) % gameState.players.length;
		for (let i = 0; i < gameState.players.length; i++) {
			const index = (forehandIndex + i) % gameState.players.length;
			const player = gameState.players[index];
			if (!player) continue;
			if (
				gameState.biddingPhase.bids[player.id] === "vorbehalt" &&
				!gameState.biddingPhase.pendingContracts[player.id]
			) {
				result.push(player.id);
			}
		}
		return result;
	}

	async advanceBidding(gameState: GameState) {
		if (!gameState.biddingPhase) return;

		// Nächster Spieler (im Uhrzeigersinn)
		gameState.biddingPhase.currentBidderIndex =
			(gameState.biddingPhase.currentBidderIndex + 1) %
			gameState.players.length;

		// Prüfe ob alle Spieler gefragt wurden
		if (
			Object.keys(gameState.biddingPhase.bids).length >=
			gameState.players.length
		) {
			// Prüfe ob Vorbehalt-Spieler noch deklarieren müssen
			const undeclared = this.findAllUndeclaredVorbehalt(gameState);
			if (undeclared.length > 0) {
				gameState.biddingPhase.awaitingContractDeclaration = undeclared;
				await this.persistAndBroadcastGame(gameState);
				return;
			}

			// Finalen Zustand broadcasten, damit der letzte Bid sichtbar wird
			await this.persistAndBroadcastGame(gameState);

			// Bidding nach 2s auflösen, damit der Dialog sichtbar bleibt
			setTimeout(() => {
				this.resolveBidding(gameState);
			}, 2000);
			return;
		}

		await this.persistAndBroadcastGame(gameState);
	}

	async resolveBidding(gameState: GameState) {
		if (!gameState.biddingPhase) return;

		const { bids, pendingContracts } = gameState.biddingPhase;

		// Sammle alle Vorbehalt-Spieler
		const vorbehaltPlayers = Object.entries(bids)
			.filter(([_, bid]) => bid === "vorbehalt")
			.map(([playerId]) => playerId);

		if (vorbehaltPlayers.length === 0) {
			// Alle "gesund" - normales Spiel
			await this.setupNormalGame(gameState);
			return;
		}

		// Priorität: Solo > Hochzeit > Normal (zurückgezogen)
		function contractPriority(contract: ContractType): number {
			if (contract === "normal") return 0;
			if (contract === "hochzeit") return 1;
			return 2; // Alle Solo-Varianten
		}

		// Vorhand-Position für Tie-Breaking (früherer Bieter gewinnt)
		const forehandIndex = (gameState.round - 1) % gameState.players.length;

		let winningPlayerId: string | undefined;
		let winningContract: ContractType = "normal";
		let winningPriority = -1;
		let winningPosition = 99;

		for (const playerId of vorbehaltPlayers) {
			const contract = pendingContracts[playerId];
			if (!contract) continue;

			const priority = contractPriority(contract);
			const playerIndex = gameState.players.findIndex((p) => p.id === playerId);
			const position =
				(playerIndex - forehandIndex + gameState.players.length) %
				gameState.players.length;

			if (
				priority > winningPriority ||
				(priority === winningPriority && position < winningPosition)
			) {
				winningPlayerId = playerId;
				winningContract = contract;
				winningPriority = priority;
				winningPosition = position;
			}
		}

		// Falls alle zurückgezogen haben
		if (!winningPlayerId || winningContract === "normal") {
			await this.setupNormalGame(gameState);
			return;
		}

		if (winningContract === "hochzeit") {
			await this.setupHochzeit(gameState, winningPlayerId);
		} else {
			await this.setupSolo(gameState, winningPlayerId, winningContract);
		}
	}

	async setupNormalGame(gameState: GameState) {
		// Teams sind bereits durch Kreuz-Dame bestimmt (in startGameRoom/restartGame)
		gameState.contractType = "normal";
		gameState.biddingPhase = undefined;

		await this.persistAndBroadcastGame(gameState);
	}

	async setupSolo(
		gameState: GameState,
		soloistId: string,
		contract: ContractType,
	) {
		gameState.contractType = contract;
		gameState.trump = contractToTrumpMode(contract);

		// Solo-Teams: Solist = Re (allein), alle anderen = Kontra
		for (const player of gameState.players) {
			gameState.teams[player.id] = player.id === soloistId ? "re" : "kontra";
		}

		// Schweinerei gilt nicht im Solo
		gameState.schweinereiPlayers = [];

		gameState.biddingPhase = undefined;

		await this.persistAndBroadcastGame(gameState);
	}

	async setupHochzeit(gameState: GameState, seekerPlayerId: string) {
		gameState.contractType = "hochzeit";
		gameState.hochzeit = {
			active: true,
			seekerPlayerId,
			clarificationTrickNumber: 3, // Spätestens im 3. Stich
		};

		// Hochzeiter ist zunächst allein im Re-Team
		// Alle anderen sind Kontra, bis Partner gefunden
		for (const player of gameState.players) {
			gameState.teams[player.id] =
				player.id === seekerPlayerId ? "re" : "kontra";
		}

		gameState.biddingPhase = undefined;

		await this.persistAndBroadcastGame(gameState);
	}

	// Hochzeit: Prüfe ob Partner gefunden wurde
	checkHochzeitPartner(
		gameState: GameState,
		trick: Trick,
		winnerId: string,
		trickNumber: number,
	) {
		if (!gameState.hochzeit) return;

		const seekerId = gameState.hochzeit.seekerPlayerId;

		// Prüfe ob es ein Fehl-Stich ist (Nicht-Trumpf angespielt)
		const firstCard = trick.cards[0]?.card;
		if (!firstCard) return;

		const isFehlStich = !isTrump(firstCard, gameState.trump);

		if (isFehlStich && winnerId !== seekerId) {
			// Partner gefunden: Gewinner des Fehl-Stichs
			gameState.hochzeit.partnerPlayerId = winnerId;
			gameState.hochzeit.active = false;

			// Teams aktualisieren: Hochzeiter + Partner = Re
			gameState.teams[seekerId] = "re";
			gameState.teams[winnerId] = "re";
			for (const player of gameState.players) {
				if (player.id !== seekerId && player.id !== winnerId) {
					gameState.teams[player.id] = "kontra";
				}
			}
		} else if (trickNumber >= gameState.hochzeit.clarificationTrickNumber) {
			// Kein Partner gefunden bis Stich 3: Hochzeiter spielt allein (wie Solo)
			gameState.hochzeit.active = false;
			// Teams bleiben wie sie sind: Hochzeiter = Re, alle anderen = Kontra
		}
	}

	async handleAnnouncement(
		announcement: AnnouncementType,
		playerId: string,
		sender: Party.Connection,
	) {
		const gameState = this.games.get(this.room.id);
		if (!gameState || !gameState.gameStarted || gameState.gameEnded) {
			this.sendGameError(sender, "Spiel läuft nicht.");
			return;
		}

		// Während der Vorbehaltsabfrage sind keine Ansagen erlaubt
		if (gameState.biddingPhase?.active) {
			this.sendGameError(
				sender,
				"Ansagen sind während der Vorbehaltsabfrage nicht erlaubt.",
			);
			return;
		}

		// Validierung
		const validation = canMakeAnnouncement(gameState, playerId, announcement);
		if (!validation.allowed) {
			this.sendGameError(sender, validation.reason || "Ansage nicht erlaubt.");
			return;
		}

		const playerTeam = gameState.teams[playerId];

		// Ansage speichern
		if (announcement === "re") {
			gameState.announcements.re = { announced: true, by: playerId };
		} else if (announcement === "kontra") {
			gameState.announcements.kontra = { announced: true, by: playerId };
		} else {
			// Punkt-Ansage - auch alle übersprungenen Ansagen speichern (Regel 6.4.3)
			const announcementOrder: PointAnnouncementType[] = [
				"no90",
				"no60",
				"no30",
				"schwarz",
			];
			const requestedIndex = announcementOrder.indexOf(
				announcement as PointAnnouncementType,
			);

			const teamPointAnnouncements =
				playerTeam === "re"
					? gameState.announcements.rePointAnnouncements
					: gameState.announcements.kontraPointAnnouncements;

			// Füge alle übersprungenen Ansagen hinzu (die noch nicht gemacht wurden)
			for (let i = 0; i <= requestedIndex; i++) {
				const announcementToAdd = announcementOrder[i];
				if (
					announcementToAdd &&
					!teamPointAnnouncements.some((pa) => pa.type === announcementToAdd)
				) {
					const pointAnnouncement: PointAnnouncement = {
						type: announcementToAdd,
						by: playerId,
					};
					teamPointAnnouncements.push(pointAnnouncement);
				}
			}
		}

		await this.persistAndBroadcastGame(gameState);
	}

	// Spectator management
	async addSpectator(
		gameId: string,
		spectatorId: string,
		spectatorName: string,
		spectatorImage: string | null | undefined,
		conn: Party.Connection,
	) {
		// Track connection as spectator
		if (!this.spectatorConnections.has(gameId)) {
			this.spectatorConnections.set(gameId, new Set());
		}
		const spectators = this.spectatorConnections.get(gameId);
		if (spectators) {
			spectators.add(conn.id);
		}
		this.connectionToSpectator.set(conn.id, {
			gameId,
			spectatorId,
			spectatorName,
			spectatorImage,
		});

		// Update spectator count and list in game state
		const gameState = this.games.get(gameId);
		if (gameState) {
			gameState.spectatorCount =
				this.spectatorConnections.get(gameId)?.size || 0;
			gameState.spectators = this.getSpectatorList(gameId);

			// Send spectator view (without hands) to the new spectator
			this.sendSpectatorState(conn, gameState);

			// Broadcast updated state to players (so they see new spectator)
			this.broadcastGameState(gameState);

			// Update table with spectator count
			await this.updateTableSpectatorCount(
				gameState.tableId,
				gameState.spectatorCount,
			);
		}
	}

	getSpectatorList(
		gameId: string,
	): Array<{ id: string; name: string; image?: string | null }> {
		const spectatorList: Array<{
			id: string;
			name: string;
			image?: string | null;
		}> = [];
		const spectatorConnIds = this.spectatorConnections.get(gameId);
		if (spectatorConnIds) {
			for (const connId of spectatorConnIds) {
				const info = this.connectionToSpectator.get(connId);
				if (info) {
					spectatorList.push({
						id: info.spectatorId,
						name: info.spectatorName,
						image: info.spectatorImage,
					});
				}
			}
		}
		return spectatorList;
	}

	async removeSpectator(gameId: string, connectionId: string) {
		const spectators = this.spectatorConnections.get(gameId);
		if (spectators) {
			spectators.delete(connectionId);

			// Update spectator count and list in game state
			const gameState = this.games.get(gameId);
			if (gameState) {
				gameState.spectatorCount = spectators.size;
				gameState.spectators = this.getSpectatorList(gameId);

				// Broadcast updated state to players (so they see spectator left)
				this.broadcastGameState(gameState);

				// Update table with spectator count
				await this.updateTableSpectatorCount(
					gameState.tableId,
					gameState.spectatorCount,
				);
			}
		}
	}

	async updateTableSpectatorCount(tableId: string, count: number) {
		const table = this.tables.get(tableId);
		if (table) {
			table.spectatorCount = count;
			await this.persistTables();
			this.broadcastState();
		}
	}

	createSpectatorView(gameState: GameState): GameState {
		// Create hand counts from hands
		const handCounts: Record<string, number> = {};
		for (const [playerId, hand] of Object.entries(gameState.hands)) {
			handCounts[playerId] = hand.length;
		}

		return {
			...gameState,
			hands: {}, // Don't send actual cards to spectators
			handCounts, // Send card counts instead
			initialHands: {}, // Don't send initial hands to spectators
		};
	}

	sendSpectatorState(conn: Party.Connection, gameState: GameState) {
		const spectatorView = this.createSpectatorView(gameState);
		const message: GameMessage = {
			type: "state",
			state: spectatorView,
			isSpectator: true,
		};
		conn.send(JSON.stringify(message));
	}

	broadcastToSpectators(gameState: GameState) {
		const spectators = this.spectatorConnections.get(gameState.id);
		if (!spectators || spectators.size === 0) return;

		const spectatorView = this.createSpectatorView(gameState);
		const message: GameMessage = {
			type: "state",
			state: spectatorView,
			isSpectator: true,
		};
		const messageStr = JSON.stringify(message);

		for (const conn of this.room.getConnections()) {
			if (spectators.has(conn.id)) {
				conn.send(messageStr);
			}
		}
	}

	async startGameRoom(players: Player[], tableId: string) {
		const gameId = this.room.id;
		const existingGame = this.games.get(gameId);
		if (existingGame) {
			// If game exists in waiting state (not started, fewer than 4 players),
			// restart with the full player list
			if (!existingGame.gameStarted && existingGame.players.length < 4) {
				await this.restartGame({
					...existingGame,
					players,
				});
			}
			return;
		}
		const gameState = createStartedGameState({
			gameId,
			tableId,
			players,
			round: 1,
			currentPlayerIndex: 0,
		});

		this.games.set(gameId, gameState);
		await this.persistAndBroadcastGame(gameState);
	}

	async playCard(cardId: string, playerId: string, sender: Party.Connection) {
		const gameState = this.games.get(this.room.id);
		if (!gameState || !gameState.gameStarted || gameState.gameEnded) {
			this.sendGameError(sender, "Spiel wurde noch nicht gestartet.");
			return;
		}

		// Block play during bidding phase
		if (gameState.biddingPhase?.active) {
			this.sendGameError(sender, "Vorbehaltsabfrage läuft noch.");
			return;
		}

		// Block play during trick completion animation
		if (
			gameState.currentTrick.completed ||
			gameState.currentTrick.cards.length >= 4
		) {
			logger.debug("[playCard] Ignoring card play while trick is resolving");
			return;
		}

		const currentPlayer = gameState.players[gameState.currentPlayerIndex];
		if (!currentPlayer || currentPlayer.id !== playerId) {
			this.sendGameError(sender, "Du bist nicht dran.");
			return;
		}

		const hand = gameState.hands[currentPlayer.id];
		if (!hand) {
			this.sendGameError(sender, "Spieler nicht gefunden.");
			return;
		}

		const cardIndex = hand.findIndex((c) => c.id === cardId);
		if (cardIndex === -1) {
			this.sendGameError(sender, "Karte nicht gefunden.");
			return;
		}

		const card = hand[cardIndex];
		if (!card) {
			this.sendGameError(sender, "Karte nicht gefunden.");
			return;
		}

		// Validierung: Prüfe Bedien-Regeln
		if (!canPlayCard(card, hand, gameState.currentTrick, gameState.trump)) {
			this.sendGameError(sender, "Du musst die angespielte Farbe bedienen.");
			return;
		}

		hand.splice(cardIndex, 1);

		// Update hand counts for spectators
		gameState.handCounts[currentPlayer.id] = hand.length;

		gameState.currentTrick.cards.push({
			card,
			playerId: currentPlayer.id,
		});

		if (gameState.currentTrick.cards.length === 4) {
			// completeTrick handles broadcasting with animation delay
			await this.completeTrick(gameState);
		} else {
			gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % 4;
			await this.persistAndBroadcastGame(gameState);
		}
	}

	async completeTrick(gameState: GameState) {
		const trick = gameState.currentTrick;
		const isLastTrick = gameState.completedTricks.length === 11; // 12. Stich
		const trickNumber = gameState.completedTricks.length + 1;
		const winner = determineTrickWinner(
			trick,
			gameState.trump,
			gameState.schweinereiPlayers,
			isLastTrick,
		);
		trick.winnerId = winner;
		trick.completed = true;

		// Hochzeit-Partner-Ermittlung
		if (gameState.hochzeit?.active && !gameState.hochzeit.partnerPlayerId) {
			this.checkHochzeitPartner(gameState, trick, winner, trickNumber);
		}

		// Berechne und speichere Punkte des Stichs
		const trickPoints = calculateTrickPoints(trick);
		trick.points = trickPoints;

		// Addiere Punkte zum Gewinner
		if (winner && !gameState.scores[winner]) {
			gameState.scores[winner] = 0;
		}
		if (winner) {
			gameState.scores[winner] = (gameState.scores[winner] || 0) + trickPoints;
		}

		// First broadcast: Show completed trick with winnerId (cards still visible)
		await this.persistAndBroadcastGame(gameState);

		// After animation delay, clear the trick and start a new one
		setTimeout(async () => {
			// Move trick to completed
			gameState.completedTricks.push({ ...trick });
			gameState.currentPlayerIndex = gameState.players.findIndex(
				(p) => p.id === winner,
			);

			// Start new trick
			gameState.currentTrick = {
				cards: [],
				completed: false,
			};

			if (gameState.completedTricks.length >= 12) {
				gameState.gameEnded = true;
				gameState.gamePointsResult = calculateGamePoints(gameState);
				this.saveGameResults(gameState);

				await this.persistAndBroadcastGame(gameState);

				// Restart game after 5 seconds
				const RESTART_DELAY = 5000;
				setTimeout(() => {
					this.restartGame(gameState);
				}, RESTART_DELAY);
				return;
			}

			await this.persistAndBroadcastGame(gameState);
		}, TRICK_ANIMATION_DELAY);
	}

	async restartGame(oldGameState: GameState) {
		logger.debug("[restartGame] Starting restart for game:", oldGameState.id);
		const gameId = this.room.id;
		const tableId = oldGameState.tableId;
		const newRound = oldGameState.round + 1;

		// Handle players who want to stand up (leave the table)
		const standingPlayers = oldGameState.standingUpPlayers ?? [];
		const remainingPlayers = oldGameState.players.filter(
			(p) => !standingPlayers.includes(p.id),
		);

		// Send redirect-to-lobby to standing players and clean up their connections
		for (const playerId of standingPlayers) {
			for (const [connId, info] of this.connectionToPlayer.entries()) {
				if (info.gameId === gameId && info.playerId === playerId) {
					const conn = this.room.getConnection(connId);
					if (conn) {
						const msg: GameMessage = {
							type: "redirect-to-lobby",
							tableId,
						};
						conn.send(JSON.stringify(msg));
					}
					this.playerConnections.get(gameId)?.delete(connId);
					this.connectionToPlayer.delete(connId);
				}
			}

			// Remove player from table via HTTP call to tables-room
			this.partykitHttp.removePlayerFromTable(tableId, playerId);
		}

		// If fewer than 4 players remain, enter waiting state
		if (remainingPlayers.length < 4) {
			logger.info(
				`[restartGame] Only ${remainingPlayers.length} players remaining, entering waiting state`,
			);
			const waitingState = createWaitingGameState({
				gameId,
				tableId,
				players: remainingPlayers,
				round: newRound,
				spectatorCount: oldGameState.spectatorCount,
				spectators: oldGameState.spectators,
			});
			this.games.set(gameId, waitingState);
			await this.persistAndBroadcastGame(waitingState);
			return;
		}

		const players = remainingPlayers;
		const gameState = createStartedGameState({
			gameId,
			tableId,
			players,
			round: newRound,
			currentPlayerIndex: (newRound - 1) % 4,
			spectatorCount: oldGameState.spectatorCount,
			spectators: oldGameState.spectators,
		});

		this.games.set(gameId, gameState);
		await this.persistAndBroadcastGame(gameState);
	}

	async saveGameResults(gameState: GameState) {
		const gpr = gameState.gamePointsResult;
		if (!gpr) return;

		// Balance-Änderung nach DDV-Regeln: Jeder Spielpunkt = 50 Cents (0,50$)
		// Solo (7.2.4): Solist bekommt 3x, Gegner je 1x
		const isSolo = isSoloGame(gameState.contractType, gameState.teams);

		const playerResults = gameState.players.map((player) => {
			const team = gameState.teams[player.id] || "kontra";
			const won = team === "re" ? gpr.reWon : gpr.kontraWon;
			const balanceChange = calculateBalanceChange(
				gpr.netGamePoints,
				team,
				isSolo,
			);

			return {
				id: player.id,
				name: player.name,
				score: gameState.scores[player.id] || 0,
				team,
				won,
				balanceChange,
				gamePoints: team === "re" ? gpr.netGamePoints : -gpr.netGamePoints,
			};
		});

		const apiUrl = env.BETTER_AUTH_URL || "http://localhost:3000";
		const apiSecret = env.PARTYKIT_API_SECRET || "";

		try {
			await fetch(`${apiUrl}/api/game-results`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiSecret}`,
				},
				body: JSON.stringify({
					gameId: `${gameState.id}-r${gameState.round}`,
					tableId: gameState.tableId,
					players: playerResults,
					tricks: gameState.completedTricks.map((trick) => ({
						cards: trick.cards,
						winnerId: trick.winnerId,
						points: trick.points ?? 0,
					})),
					initialHands: gameState.initialHands ?? {},
					announcements: gameState.announcements,
					contractType: gameState.contractType,
					schweinereiPlayers: gameState.schweinereiPlayers,
					gamePoints: gpr,
				}),
			});
		} catch (error) {
			logger.error("Failed to save game results:", error);
		}
	}

	async autoPlay(sender: Party.Connection) {
		const gameState = this.games.get(this.room.id);
		if (!gameState || !gameState.gameStarted || gameState.gameEnded) {
			this.sendGameError(sender, "Spiel läuft nicht.");
			return;
		}

		// Block during trick completion animation
		if (
			gameState.currentTrick.completed ||
			gameState.currentTrick.cards.length >= 4
		) {
			return;
		}

		// During bidding phase: auto-bid "gesund" for current bidder
		if (gameState.biddingPhase?.active) {
			// Falls Spieler ihren Vorbehalt deklarieren müssen, auto-retract für den ersten
			const awaitingPlayers =
				gameState.biddingPhase.awaitingContractDeclaration;
			const firstAwaiting = awaitingPlayers?.[0];
			if (firstAwaiting) {
				await this.handleDeclareContract(firstAwaiting, "normal", sender);
				return;
			}
			const currentBidder =
				gameState.players[gameState.biddingPhase.currentBidderIndex];
			if (currentBidder) {
				await this.handleBid(currentBidder.id, "gesund", sender);
			}
			return;
		}

		const currentPlayer = gameState.players[gameState.currentPlayerIndex];
		if (!currentPlayer) {
			this.sendGameError(sender, "Kein aktueller Spieler.");
			return;
		}

		const hand = gameState.hands[currentPlayer.id];
		if (!hand || hand.length === 0) {
			this.sendGameError(sender, "Keine Karten auf der Hand.");
			return;
		}

		const playableCards = getPlayableCards(
			hand,
			gameState.currentTrick,
			gameState.trump,
		);
		const cardToPlay = playableCards[0];
		if (!cardToPlay) {
			this.sendGameError(sender, "Keine spielbare Karte gefunden.");
			return;
		}

		await this.playCard(cardToPlay.id, currentPlayer.id, sender);
	}

	async autoPlayAll(sender: Party.Connection) {
		const gameState = this.games.get(this.room.id);
		if (!gameState || !gameState.gameStarted || gameState.gameEnded) return;

		// Block if trick is being animated
		if (
			gameState.currentTrick.completed ||
			gameState.currentTrick.cards.length >= 4
		) {
			return;
		}

		// Handle bidding phase first
		while (gameState.biddingPhase?.active) {
			const awaitingPlayers =
				gameState.biddingPhase.awaitingContractDeclaration;
			const firstAwaiting = awaitingPlayers?.[0];
			if (firstAwaiting) {
				await this.handleDeclareContract(firstAwaiting, "normal", sender);
				continue;
			}
			const currentBidder =
				gameState.players[gameState.biddingPhase.currentBidderIndex];
			if (currentBidder) {
				await this.handleBid(currentBidder.id, "gesund", sender);
			}
		}

		// Play all remaining tricks
		while (!gameState.gameEnded && gameState.completedTricks.length < 12) {
			// Play 4 cards to complete one trick
			while (gameState.currentTrick.cards.length < 4) {
				const currentPlayer = gameState.players[gameState.currentPlayerIndex];
				if (!currentPlayer) break;
				const hand = gameState.hands[currentPlayer.id];
				if (!hand || hand.length === 0) break;

				const playableCards = getPlayableCards(
					hand,
					gameState.currentTrick,
					gameState.trump,
				);
				const card = playableCards[0];
				if (!card) break;

				const cardIndex = hand.findIndex((c) => c.id === card.id);
				hand.splice(cardIndex, 1);
				gameState.handCounts[currentPlayer.id] = hand.length;
				gameState.currentTrick.cards.push({
					card,
					playerId: currentPlayer.id,
				});

				if (gameState.currentTrick.cards.length < 4) {
					gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % 4;
				}
			}

			// Complete trick synchronously (no animation delay)
			const trick = gameState.currentTrick;
			const isLastTrick = gameState.completedTricks.length === 11;
			const trickNumber = gameState.completedTricks.length + 1;
			const winner = determineTrickWinner(
				trick,
				gameState.trump,
				gameState.schweinereiPlayers,
				isLastTrick,
			);
			trick.winnerId = winner;
			trick.completed = true;

			if (gameState.hochzeit?.active && !gameState.hochzeit.partnerPlayerId) {
				this.checkHochzeitPartner(gameState, trick, winner, trickNumber);
			}

			const trickPoints = calculateTrickPoints(trick);
			trick.points = trickPoints;
			if (winner) {
				gameState.scores[winner] =
					(gameState.scores[winner] || 0) + trickPoints;
			}

			gameState.completedTricks.push({ ...trick });
			gameState.currentPlayerIndex = gameState.players.findIndex(
				(p) => p.id === winner,
			);
			gameState.currentTrick = { cards: [], completed: false };

			if (gameState.completedTricks.length >= 12) {
				gameState.gameEnded = true;
				gameState.gamePointsResult = calculateGamePoints(gameState);
				this.saveGameResults(gameState);
			}
		}

		// Final broadcast
		await this.persistAndBroadcastGame(gameState);

		// If game ended, restart after delay
		if (gameState.gameEnded) {
			const RESTART_DELAY = 5000;
			setTimeout(() => {
				this.restartGame(gameState);
			}, RESTART_DELAY);
		}
	}

	sendGameState(conn: Party.Connection, gameState: GameState) {
		const message: GameMessage = {
			type: "state",
			state: gameState,
		};
		conn.send(JSON.stringify(message));
	}

	sendGameError(conn: Party.Connection, message: string) {
		const errorMessage: GameMessage = {
			type: "error",
			message,
		};
		conn.send(JSON.stringify(errorMessage));
	}

	broadcastGameState(gameState: GameState) {
		const players = this.playerConnections.get(gameState.id);
		const message: GameMessage = {
			type: "state",
			state: gameState,
		};
		const messageStr = JSON.stringify(message);

		for (const conn of this.room.getConnections()) {
			// Only send full state to registered player connections
			if (players?.has(conn.id)) {
				conn.send(messageStr);
			}
		}
	}
}

Server satisfies Party.Worker;
