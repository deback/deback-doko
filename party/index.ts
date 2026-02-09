import type * as Party from "partykit/server";
import { env } from "@/env";
import {
	canPlayCard,
	contractToTrumpMode,
	getPlayableCards,
	isTrump,
} from "../src/lib/game/rules";
import { canMakeAnnouncement } from "./announcements";
import { createDeck, dealCards } from "./deck";
import { calculateTrickPoints, determineTrickWinner } from "./trick-scoring";
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
} from "./types";

export default class Server implements Party.Server {
	tables: Map<string, Table> = new Map();
	games: Map<string, GameState> = new Map();
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

	constructor(readonly room: Party.Room) {}

	// Load persisted state from storage
	async onStart() {
		console.log("[onStart] Room:", this.room.id);
		if (this.room.id === "tables-room") {
			const storedTables = await this.room.storage.get<Table[]>("tables");
			if (storedTables) {
				this.tables = new Map(storedTables.map((t) => [t.id, t]));
			}
		} else if (this.room.id.startsWith("game-")) {
			const storedGame = await this.room.storage.get<GameState>("gameState");
			console.log(
				"[onStart] Loaded game:",
				storedGame?.id,
				"gameEnded:",
				storedGame?.gameEnded,
			);
			if (storedGame) {
				this.games.set(this.room.id, storedGame);

				// If loaded game is ended, schedule restart
				if (storedGame.gameEnded) {
					console.log(
						"[onStart] Game is ended, scheduling restart in 5 seconds",
					);
					const RESTART_DELAY = 5000;
					setTimeout(() => {
						console.log("[onStart] Restarting game now...");
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

	onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
		console.log(
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
				const event: GameEvent = JSON.parse(message);
				this.handleGameEvent(event, sender);
			} catch (error) {
				console.error("Error parsing message:", error);
				this.sendGameError(sender, "Invalid message format");
			}
			return;
		}

		// Handle tables room
		if (this.room.id === "tables-room") {
			try {
				const event: TableEvent = JSON.parse(message);
				this.handleEvent(event, sender);
			} catch (error) {
				console.error("Error parsing message:", error);
				this.sendError(sender, "Invalid message format");
			}
		}
	}

	// Helper method to find table where player is sitting
	findPlayerTable(playerId: string): Table | undefined {
		for (const table of this.tables.values()) {
			if (table.players.some((p) => p.id === playerId)) {
				return table;
			}
		}
		return undefined;
	}

	async handleEvent(event: TableEvent, sender: Party.Connection) {
		switch (event.type) {
			case "get-state":
				this.sendState(sender);
				break;

			case "create-table":
				await this.createTable(event.name, event.player, sender);
				break;

			case "join-table":
				await this.joinTable(event.tableId, event.player, sender);
				break;

			case "leave-table":
				await this.leaveTable(event.tableId, event.playerId);
				break;

			case "delete-table":
				await this.deleteTable(event.tableId, event.playerId);
				break;
		}
	}

	async createTable(name: string, player: Player, sender: Party.Connection) {
		// Check if player is already at another table
		const existingTable = this.findPlayerTable(player.id);
		if (existingTable) {
			this.sendError(
				sender,
				"Du sitzt bereits an einem Tisch. Verlasse zuerst den anderen Tisch.",
			);
			return;
		}

		const tableId = `table-${Date.now()}-${Math.random().toString(36).substring(7)}`;
		const table: Table = {
			id: tableId,
			name,
			players: [player],
			createdAt: Date.now(),
			gameStarted: false,
		};

		this.tables.set(tableId, table);
		await this.persistTables();
		this.broadcastState();
	}

	async joinTable(tableId: string, player: Player, sender: Party.Connection) {
		const table = this.tables.get(tableId);
		if (!table) {
			this.sendError(sender, "Tisch nicht gefunden.");
			return;
		}

		// Check if table is full (4 players for Doppelkopf)
		if (table.players.length >= 4) {
			this.sendError(sender, "Der Tisch ist bereits voll.");
			return;
		}

		// Check if player is already at the table
		if (table.players.some((p) => p.id === player.id)) {
			return;
		}

		// Check if player is already at another table
		const existingTable = this.findPlayerTable(player.id);
		if (existingTable) {
			this.sendError(
				sender,
				"Du sitzt bereits an einem Tisch. Verlasse zuerst den anderen Tisch.",
			);
			return;
		}

		table.players.push(player);
		await this.persistTables();
		this.broadcastState();

		// Check if table is full (4 players) and start game
		if (table.players.length === 4 && !table.gameStarted) {
			await this.startGame(table);
		}
	}

	async startGame(table: Table) {
		// Generate game ID
		const gameId = `game-${Date.now()}-${Math.random().toString(36).substring(7)}`;
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

	async leaveTable(tableId: string, playerId: string) {
		const table = this.tables.get(tableId);
		if (!table) {
			return;
		}

		table.players = table.players.filter((p) => p.id !== playerId);

		// Delete table if empty
		if (table.players.length === 0) {
			this.tables.delete(tableId);
		}

		await this.persistTables();
		this.broadcastState();
	}

	async deleteTable(tableId: string, playerId: string) {
		const table = this.tables.get(tableId);
		if (!table) {
			return;
		}

		// Only allow deletion if the player is the creator (first player)
		if (table.players.length > 0 && table.players[0]?.id === playerId) {
			this.tables.delete(tableId);
			await this.persistTables();
			this.broadcastState();
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
					this.sendGameState(sender, gameState);
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
			await this.persistGameState(gameState);
			this.broadcastGameState(gameState);
			this.broadcastToSpectators(gameState);
			return;
		}

		// Alle haben deklariert — Bidding auflösen
		gameState.biddingPhase.awaitingContractDeclaration = undefined;
		await this.persistGameState(gameState);
		this.broadcastGameState(gameState);
		this.broadcastToSpectators(gameState);

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
				await this.persistGameState(gameState);
				this.broadcastGameState(gameState);
				this.broadcastToSpectators(gameState);
				return;
			}

			// Finalen Zustand broadcasten, damit der letzte Bid sichtbar wird
			await this.persistGameState(gameState);
			this.broadcastGameState(gameState);
			this.broadcastToSpectators(gameState);

			// Bidding nach 2s auflösen, damit der Dialog sichtbar bleibt
			setTimeout(() => {
				this.resolveBidding(gameState);
			}, 2000);
			return;
		}

		await this.persistGameState(gameState);
		this.broadcastGameState(gameState);
		this.broadcastToSpectators(gameState);
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

		await this.persistGameState(gameState);
		this.broadcastGameState(gameState);
		this.broadcastToSpectators(gameState);
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

		await this.persistGameState(gameState);
		this.broadcastGameState(gameState);
		this.broadcastToSpectators(gameState);
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

		await this.persistGameState(gameState);
		this.broadcastGameState(gameState);
		this.broadcastToSpectators(gameState);
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

		await this.persistGameState(gameState);
		this.broadcastGameState(gameState);
		this.broadcastToSpectators(gameState);
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
		if (this.games.has(gameId)) {
			return;
		}

		const deck = createDeck();
		const hands = dealCards(deck, players);
		const trump = "jacks" as const;

		// Prüfe, welche Spieler beide Karo-Assen haben (Schweinerei)
		const schweinereiPlayers: string[] = [];
		for (const player of players) {
			const hand = hands[player.id];
			if (hand) {
				const diamondsAces = hand.filter(
					(card) => card.suit === "diamonds" && card.rank === "ace",
				);
				if (diamondsAces.length === 2) {
					schweinereiPlayers.push(player.id);
				}
			}
		}

		// Initialisiere Scores für alle Spieler mit 0
		const scores: Record<string, number> = {};
		for (const player of players) {
			scores[player.id] = 0;
		}

		// Bestimme Re/Kontra-Teams: Spieler mit Kreuz-Dame = Re
		const teams: Record<string, "re" | "kontra"> = {};
		for (const player of players) {
			const hand = hands[player.id];
			if (hand) {
				const hasClubsQueen = hand.some(
					(card) => card.suit === "clubs" && card.rank === "queen",
				);
				teams[player.id] = hasClubsQueen ? "re" : "kontra";
			}
		}

		// Create hand counts for spectators
		const handCounts: Record<string, number> = {};
		for (const player of players) {
			handCounts[player.id] = hands[player.id]?.length || 0;
		}

		const gameState: GameState = {
			id: gameId,
			tableId,
			players,
			currentPlayerIndex: 0,
			hands,
			handCounts,
			initialHands: structuredClone(hands),
			currentTrick: {
				cards: [],
				completed: false,
			},
			completedTricks: [],
			trump,
			gameStarted: true,
			gameEnded: false,
			round: 1,
			scores,
			schweinereiPlayers,
			teams,
			spectatorCount: 0,
			spectators: [],
			announcements: {
				re: { announced: false },
				kontra: { announced: false },
				rePointAnnouncements: [],
				kontraPointAnnouncements: [],
			},
			// Bidding-Phase: Spieler werden der Reihe nach gefragt
			biddingPhase: {
				active: true,
				currentBidderIndex: 0,
				bids: {},
				pendingContracts: {},
			},
			contractType: "normal",
		};

		this.games.set(gameId, gameState);
		await this.persistGameState(gameState);
		this.broadcastGameState(gameState);
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
			this.sendGameError(sender, "Stich wird gerade ausgewertet.");
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
			await this.persistGameState(gameState);
			this.broadcastGameState(gameState);
			this.broadcastToSpectators(gameState);
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
		await this.persistGameState(gameState);
		this.broadcastGameState(gameState);
		this.broadcastToSpectators(gameState);

		// After animation delay, clear the trick and start a new one
		const TRICK_ANIMATION_DELAY = 2500; // 1s wait + ~1.5s animation
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
				this.saveGameResults(gameState);

				await this.persistGameState(gameState);
				this.broadcastGameState(gameState);
				this.broadcastToSpectators(gameState);

				// Restart game after 5 seconds
				const RESTART_DELAY = 5000;
				setTimeout(() => {
					this.restartGame(gameState);
				}, RESTART_DELAY);
				return;
			}

			await this.persistGameState(gameState);
			this.broadcastGameState(gameState);
			this.broadcastToSpectators(gameState);
		}, TRICK_ANIMATION_DELAY);
	}

	async restartGame(oldGameState: GameState) {
		console.log("[restartGame] Starting restart for game:", oldGameState.id);
		const gameId = this.room.id;
		const players = oldGameState.players;
		const tableId = oldGameState.tableId;
		const newRound = oldGameState.round + 1;

		// Create new deck and deal
		const deck = createDeck();
		const hands = dealCards(deck, players);
		const trump = "jacks" as const;

		// Check for Schweinerei
		const schweinereiPlayers: string[] = [];
		for (const player of players) {
			const hand = hands[player.id];
			if (hand) {
				const diamondsAces = hand.filter(
					(card) => card.suit === "diamonds" && card.rank === "ace",
				);
				if (diamondsAces.length === 2) {
					schweinereiPlayers.push(player.id);
				}
			}
		}

		// Reset scores
		const scores: Record<string, number> = {};
		for (const player of players) {
			scores[player.id] = 0;
		}

		// Determine Re/Kontra teams
		const teams: Record<string, "re" | "kontra"> = {};
		for (const player of players) {
			const hand = hands[player.id];
			if (hand) {
				const hasClubsQueen = hand.some(
					(card) => card.suit === "clubs" && card.rank === "queen",
				);
				teams[player.id] = hasClubsQueen ? "re" : "kontra";
			}
		}

		// Create hand counts for spectators
		const handCounts: Record<string, number> = {};
		for (const player of players) {
			handCounts[player.id] = hands[player.id]?.length || 0;
		}

		const gameState: GameState = {
			id: gameId,
			tableId,
			players,
			currentPlayerIndex: (newRound - 1) % 4,
			hands,
			handCounts,
			initialHands: structuredClone(hands),
			currentTrick: {
				cards: [],
				completed: false,
			},
			completedTricks: [],
			trump,
			gameStarted: true,
			gameEnded: false,
			round: newRound,
			scores,
			schweinereiPlayers,
			teams,
			spectatorCount: oldGameState.spectatorCount,
			spectators: oldGameState.spectators,
			announcements: {
				re: { announced: false },
				kontra: { announced: false },
				rePointAnnouncements: [],
				kontraPointAnnouncements: [],
			},
			// Bidding-Phase: Spieler werden der Reihe nach gefragt
			biddingPhase: {
				active: true,
				currentBidderIndex: (newRound - 1) % 4,
				bids: {},
				pendingContracts: {},
			},
			contractType: "normal",
		};

		this.games.set(gameId, gameState);
		await this.persistGameState(gameState);
		this.broadcastGameState(gameState);
		this.broadcastToSpectators(gameState);
	}

	async saveGameResults(gameState: GameState) {
		// Berechne Re-Team-Punkte
		let reScore = 0;
		for (const player of gameState.players) {
			if (gameState.teams[player.id] === "re") {
				reScore += gameState.scores[player.id] || 0;
			}
		}
		const reWins = reScore >= 121;

		// Balance-Änderung: Gewinner bekommen 50 Cents (0,50 $), Verlierer verlieren 50 Cents
		// Solo: Solo-Spieler (Re, allein) bekommt 3x, Kontra-Spieler je 1x
		const baseChange = 50;
		const isSolo =
			gameState.contractType !== "normal" &&
			gameState.contractType !== "hochzeit";

		const playerResults = gameState.players.map((player) => {
			const team = gameState.teams[player.id] || "kontra";
			const won = team === "re" ? reWins : !reWins;
			const change = isSolo && team === "re" ? baseChange * 3 : baseChange;
			return {
				id: player.id,
				name: player.name,
				score: gameState.scores[player.id] || 0,
				team,
				won,
				balanceChange: won ? change : -change,
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
				}),
			});
		} catch (error) {
			console.error("Failed to save game results:", error);
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
		const spectators = this.spectatorConnections.get(gameState.id);
		const message: GameMessage = {
			type: "state",
			state: gameState,
		};
		const messageStr = JSON.stringify(message);

		for (const conn of this.room.getConnections()) {
			// Skip spectator connections — they receive a sanitized view via broadcastToSpectators
			if (spectators?.has(conn.id)) continue;
			conn.send(messageStr);
		}
	}
}

Server satisfies Party.Worker;
