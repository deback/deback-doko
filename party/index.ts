import type * as Party from "partykit/server";
import { env } from "@/env";

interface Player {
	id: string;
	name: string;
	email?: string;
	image?: string | null;
	gamesPlayed: number;
	gamesWon: number;
	balance: number;
}

interface Table {
	id: string;
	name: string;
	players: Player[];
	createdAt: number;
	gameId?: string;
	gameStarted: boolean;
	spectatorCount?: number;
}

interface TablesState {
	tables: Table[];
}

type TableEvent =
	| { type: "create-table"; name: string; player: Player }
	| { type: "join-table"; tableId: string; player: Player }
	| { type: "leave-table"; tableId: string; playerId: string }
	| { type: "delete-table"; tableId: string; playerId: string }
	| { type: "get-state" };

type TableMessage =
	| { type: "state"; state: TablesState }
	| { type: "error"; message: string }
	| {
			type: "game-started";
			gameId: string;
			tableId: string;
			players: Player[];
	  };

// Game types
type Suit = "hearts" | "diamonds" | "clubs" | "spades";
type Rank = "9" | "10" | "jack" | "queen" | "king" | "ace";

// Ansagen-Typen
type AnnouncementType = "re" | "kontra" | "no90" | "no60" | "no30" | "schwarz";
type PointAnnouncementType = "no90" | "no60" | "no30" | "schwarz";

// Vorbehaltsabfrage (Bidding) Typen
type ReservationType = "gesund" | "vorbehalt";
type ContractType = "normal" | "hochzeit";

interface BiddingPhase {
	active: boolean;
	currentBidderIndex: number;
	bids: Record<string, ReservationType>;
	awaitingContractDeclaration?: string;
}

interface HochzeitState {
	active: boolean;
	seekerPlayerId: string;
	partnerPlayerId?: string;
	clarificationTrickNumber: number;
}

interface PointAnnouncement {
	type: PointAnnouncementType;
	by: string; // playerId
}

interface Announcements {
	re: {
		announced: boolean;
		by?: string;
	};
	kontra: {
		announced: boolean;
		by?: string;
	};
	rePointAnnouncements: PointAnnouncement[];
	kontraPointAnnouncements: PointAnnouncement[];
}

interface Card {
	suit: Suit;
	rank: Rank;
	id: string;
}

interface Trick {
	cards: Array<{ card: Card; playerId: string }>;
	winnerId?: string;
	completed: boolean;
	points?: number;
}

interface GameState {
	id: string;
	tableId: string;
	players: Player[];
	currentPlayerIndex: number;
	hands: Record<string, Card[]>;
	handCounts: Record<string, number>; // For spectators: card count per player
	currentTrick: Trick;
	completedTricks: Trick[];
	trump: Suit | "jacks" | "queens";
	gameStarted: boolean;
	gameEnded: boolean;
	round: number;
	scores: Record<string, number>;
	schweinereiPlayers: string[]; // Spieler-IDs, die beide Karo-Assen haben
	teams: Record<string, "re" | "kontra">; // playerId -> Team-Zuordnung
	spectatorCount: number;
	spectators: Array<{ id: string; name: string; image?: string | null }>; // List of spectators
	announcements: Announcements; // Ansagen (Re, Kontra, keine 90, etc.)
	// Vorbehaltsabfrage (Bidding)
	biddingPhase?: BiddingPhase;
	contractType: ContractType;
	hochzeit?: HochzeitState;
}

type GameEvent =
	| { type: "get-state" }
	| { type: "play-card"; cardId: string; playerId: string }
	| { type: "auto-play" }
	| { type: "reset-game" }
	| { type: "start-game"; players: Player[]; tableId: string }
	| {
			type: "spectate-game";
			gameId: string;
			spectatorId: string;
			spectatorName: string;
			spectatorImage?: string | null;
	  }
	| { type: "announce"; announcement: AnnouncementType; playerId: string }
	| { type: "bid"; playerId: string; bid: ReservationType }
	| { type: "declare-contract"; playerId: string; contract: ContractType };

type GameMessage =
	| { type: "state"; state: GameState; isSpectator?: boolean }
	| { type: "error"; message: string }
	| { type: "spectator-count"; gameId: string; count: number };

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
			const gameState = this.games.get(this.room.id);
			if (gameState) {
				this.sendGameState(conn, gameState);
			}
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

		if (bid === "vorbehalt") {
			// Spieler muss seinen Vorbehalt-Typ deklarieren
			gameState.biddingPhase.awaitingContractDeclaration = playerId;
			await this.persistGameState(gameState);
			this.broadcastGameState(gameState);
			this.broadcastToSpectators(gameState);
			return;
		}

		// Gesund: Nächster Spieler
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
		if (gameState.biddingPhase.awaitingContractDeclaration !== playerId) {
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

		// Speichere den Contract temporär (wird bei Bidding-Ende ausgewertet)
		gameState.biddingPhase.awaitingContractDeclaration = undefined;

		// Wenn Hochzeit gewählt, merken wir uns das im bids-Objekt mit einem Marker
		// (Einfachheitshalber speichern wir den Contract-Typ als zusätzliches Feld)
		(
			gameState.biddingPhase as BiddingPhase & {
				pendingContract?: ContractType;
			}
		).pendingContract = contract;
		(
			gameState.biddingPhase as BiddingPhase & {
				pendingContractPlayer?: string;
			}
		).pendingContractPlayer = playerId;

		// Nächster Spieler
		await this.advanceBidding(gameState);
	}

	async advanceBidding(gameState: GameState) {
		if (!gameState.biddingPhase) return;

		// Nächster Spieler
		gameState.biddingPhase.currentBidderIndex++;

		// Prüfe ob alle Spieler gefragt wurden
		if (gameState.biddingPhase.currentBidderIndex >= gameState.players.length) {
			// Bidding abgeschlossen
			await this.resolveBidding(gameState);
			return;
		}

		await this.persistGameState(gameState);
		this.broadcastGameState(gameState);
		this.broadcastToSpectators(gameState);
	}

	async resolveBidding(gameState: GameState) {
		if (!gameState.biddingPhase) return;

		const biddingPhase = gameState.biddingPhase as BiddingPhase & {
			pendingContract?: ContractType;
			pendingContractPlayer?: string;
		};

		// Prüfe ob jemand Vorbehalt hat
		const hasVorbehalt = Object.values(biddingPhase.bids).includes("vorbehalt");

		if (
			hasVorbehalt &&
			biddingPhase.pendingContract === "hochzeit" &&
			biddingPhase.pendingContractPlayer
		) {
			// Hochzeit wurde angesagt
			await this.setupHochzeit(gameState, biddingPhase.pendingContractPlayer);
		} else {
			// Normales Spiel: Teams durch Kreuz-Dame
			await this.setupNormalGame(gameState);
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

		const isFehlStich = !this.isTrump(firstCard, gameState.trump);

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

	// Ansagen-Logik
	getPlayerCardCount(gameState: GameState, playerId: string): number {
		const hand = gameState.hands[playerId];
		return hand ? hand.length : 0;
	}

	getMinCardsForAnnouncement(announcement: AnnouncementType): number {
		// Zeitfenster basierend auf Kartenanzahl
		switch (announcement) {
			case "re":
			case "kontra":
				return 11; // Mit 11 Karten (erster Stich = Freistich)
			case "no90":
				return 10;
			case "no60":
				return 9;
			case "no30":
				return 8;
			case "schwarz":
				return 7;
			default:
				return 12;
		}
	}

	canMakeAnnouncement(
		gameState: GameState,
		playerId: string,
		announcement: AnnouncementType,
	): { allowed: boolean; reason?: string } {
		const playerTeam = gameState.teams[playerId];
		if (!playerTeam) {
			return { allowed: false, reason: "Spieler hat kein Team." };
		}

		const cardCount = this.getPlayerCardCount(gameState, playerId);
		const minCards = this.getMinCardsForAnnouncement(announcement);

		if (cardCount < minCards) {
			return {
				allowed: false,
				reason: `Zu spät! Du brauchst mindestens ${minCards} Karten.`,
			};
		}

		// Re/Kontra Ansage
		if (announcement === "re" || announcement === "kontra") {
			// Spieler kann nur für sein eigenes Team ansagen
			if (playerTeam === "re" && announcement !== "re") {
				return {
					allowed: false,
					reason: "Du bist im Re-Team und kannst nur Re sagen.",
				};
			}
			if (playerTeam === "kontra" && announcement !== "kontra") {
				return {
					allowed: false,
					reason: "Du bist im Kontra-Team und kannst nur Kontra sagen.",
				};
			}

			// Prüfe ob bereits angesagt
			if (announcement === "re" && gameState.announcements.re.announced) {
				return { allowed: false, reason: "Re wurde bereits angesagt." };
			}
			if (
				announcement === "kontra" &&
				gameState.announcements.kontra.announced
			) {
				return { allowed: false, reason: "Kontra wurde bereits angesagt." };
			}

			return { allowed: true };
		}

		// Punkt-Ansagen (keine 90, keine 60, keine 30, schwarz)
		const teamAnnouncement = playerTeam === "re" ? "re" : "kontra";
		const teamHasAnnounced =
			playerTeam === "re"
				? gameState.announcements.re.announced
				: gameState.announcements.kontra.announced;

		if (!teamHasAnnounced) {
			return {
				allowed: false,
				reason: `Du musst zuerst ${teamAnnouncement === "re" ? "Re" : "Kontra"} sagen.`,
			};
		}

		// Prüfe ob diese Ansage bereits gemacht wurde
		const teamPointAnnouncements =
			playerTeam === "re"
				? gameState.announcements.rePointAnnouncements
				: gameState.announcements.kontraPointAnnouncements;

		if (teamPointAnnouncements.some((pa) => pa.type === announcement)) {
			return { allowed: false, reason: "Diese Ansage wurde bereits gemacht." };
		}

		// Prüfe Reihenfolge: keine 90 -> keine 60 -> keine 30 -> schwarz
		const announcementOrder: PointAnnouncementType[] = [
			"no90",
			"no60",
			"no30",
			"schwarz",
		];
		const requestedIndex = announcementOrder.indexOf(
			announcement as PointAnnouncementType,
		);

		for (let i = 0; i < requestedIndex; i++) {
			const requiredAnnouncement = announcementOrder[i];
			if (
				requiredAnnouncement &&
				!teamPointAnnouncements.some((pa) => pa.type === requiredAnnouncement)
			) {
				return {
					allowed: false,
					reason: `Du musst zuerst "${this.getAnnouncementLabel(requiredAnnouncement)}" sagen.`,
				};
			}
		}

		return { allowed: true };
	}

	getAnnouncementLabel(announcement: AnnouncementType): string {
		switch (announcement) {
			case "re":
				return "Re";
			case "kontra":
				return "Kontra";
			case "no90":
				return "Keine 90";
			case "no60":
				return "Keine 60";
			case "no30":
				return "Keine 30";
			case "schwarz":
				return "Schwarz";
			default:
				return announcement;
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

		// Validierung
		const validation = this.canMakeAnnouncement(
			gameState,
			playerId,
			announcement,
		);
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
			// Punkt-Ansage
			const pointAnnouncement: PointAnnouncement = {
				type: announcement as PointAnnouncementType,
				by: playerId,
			};
			if (playerTeam === "re") {
				gameState.announcements.rePointAnnouncements.push(pointAnnouncement);
			} else {
				gameState.announcements.kontraPointAnnouncements.push(
					pointAnnouncement,
				);
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

	createDeck(): Card[] {
		const suits: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
		const ranks: Rank[] = ["9", "10", "jack", "queen", "king", "ace"];
		const deck: Card[] = [];

		for (const suit of suits) {
			for (const rank of ranks) {
				for (let i = 0; i < 2; i++) {
					deck.push({
						suit,
						rank,
						id: `${suit}-${rank}-${i}`,
					});
				}
			}
		}

		return this.shuffleDeck(deck);
	}

	shuffleDeck(deck: Card[]): Card[] {
		const shuffled = [...deck];
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			const temp = shuffled[i];
			if (temp && shuffled[j]) {
				shuffled[i] = shuffled[j];
				shuffled[j] = temp;
			}
		}
		return shuffled;
	}

	dealCards(deck: Card[], players: Player[]): Record<string, Card[]> {
		const hands: Record<string, Card[]> = {};
		const cardsPerPlayer = 12;

		for (let i = 0; i < players.length; i++) {
			const player = players[i];
			if (player) {
				hands[player.id] = deck.slice(
					i * cardsPerPlayer,
					(i + 1) * cardsPerPlayer,
				);
			}
		}

		return hands;
	}

	async startGameRoom(players: Player[], tableId: string) {
		const gameId = this.room.id;
		if (this.games.has(gameId)) {
			return;
		}

		const deck = this.createDeck();
		const hands = this.dealCards(deck, players);
		const trump: Suit | "jacks" | "queens" = "jacks";

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
		if (
			!this.canPlayCard(card, hand, gameState.currentTrick, gameState.trump)
		) {
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
		const winner = this.determineTrickWinner(
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
		const trickPoints = this.calculateTrickPoints(trick);
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
		const deck = this.createDeck();
		const hands = this.dealCards(deck, players);
		const trump: Suit | "jacks" | "queens" = "jacks";

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
			currentPlayerIndex: 0,
			hands,
			handCounts,
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
				currentBidderIndex: 0,
				bids: {},
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
		const balanceChange = 50;

		const playerResults = gameState.players.map((player) => {
			const team = gameState.teams[player.id] || "kontra";
			const won = team === "re" ? reWins : !reWins;
			return {
				id: player.id,
				name: player.name,
				score: gameState.scores[player.id] || 0,
				team,
				won,
				balanceChange: won ? balanceChange : -balanceChange,
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
					gameId: gameState.id,
					tableId: gameState.tableId,
					players: playerResults,
				}),
			});
		} catch (error) {
			console.error("Failed to save game results:", error);
		}
	}

	determineTrickWinner(
		trick: Trick,
		trump: Suit | "jacks" | "queens",
		schweinereiPlayers: string[],
		isLastTrick = false,
	): string {
		if (trick.cards.length === 0) return "";

		const firstCardEntry = trick.cards[0];
		if (!firstCardEntry) return "";

		const firstCard = firstCardEntry.card;
		if (!firstCard) return firstCardEntry.playerId || "";

		const leadSuit = firstCard.suit;
		let winner = firstCardEntry;
		const firstPlayerId = firstCardEntry.playerId || "";
		let highestValue = this.getCardValue(
			firstCard,
			leadSuit,
			trump,
			firstPlayerId,
			schweinereiPlayers,
		);

		// Sonderregel für letzten Stich: Wenn beide Herz 10 sind, gewinnt die zweite
		if (isLastTrick) {
			const hearts10Cards = trick.cards.filter(
				(entry) => entry.card.suit === "hearts" && entry.card.rank === "10",
			);
			if (hearts10Cards.length === 2) {
				// Zweite Herz 10 gewinnt im letzten Stich
				return hearts10Cards[1]?.playerId || winner.playerId;
			}
		}

		for (let i = 1; i < trick.cards.length; i++) {
			const cardEntry = trick.cards[i];
			if (!cardEntry) continue;

			const playerId = cardEntry.playerId || "";
			const value = this.getCardValue(
				cardEntry.card,
				leadSuit,
				trump,
				playerId,
				schweinereiPlayers,
			);
			if (value > highestValue) {
				highestValue = value;
				winner = cardEntry;
			}
		}

		return winner.playerId;
	}

	getCardValue(
		card: Card,
		leadSuit: Suit,
		trump: Suit | "jacks" | "queens",
		playerId: string,
		schweinereiPlayers: string[],
	): number {
		const isTrump = this.isTrump(card, trump);
		const isLeadSuit = card.suit === leadSuit;

		if (isTrump) {
			// Schweinerei: Karo-Assen sind höher als Herz 10, wenn Spieler beide hat
			if (
				card.suit === "diamonds" &&
				card.rank === "ace" &&
				schweinereiPlayers.includes(playerId)
			) {
				return 1200; // Höher als Herz 10 (1100)
			}
			// In Doppelkopf: Herz 10 ist höchster Trumpf, dann Damen, dann Buben, dann Karo
			if (card.suit === "hearts" && card.rank === "10") return 1100;
			if (card.rank === "queen") return 1000;
			if (card.rank === "jack") return 900;
			// Karo (Diamonds) ist auch Trumpf
			if (card.suit === "diamonds") {
				if (card.rank === "ace") return 850;
				if (card.rank === "king") return 840;
				if (card.rank === "10") return 830;
				if (card.rank === "9") return 820;
			}
		}

		if (isLeadSuit && !isTrump) {
			if (card.rank === "ace") return 800;
			if (card.rank === "king") return 700;
			if (card.rank === "queen") return 600;
			if (card.rank === "10") return 500;
			if (card.rank === "9") return 400;
		}

		return 0;
	}

	isTrump(card: Card, trump: Suit | "jacks" | "queens"): boolean {
		// In Doppelkopf sind Herz 10, Buben, Damen und Karo Trumpf
		// Herz 10 ist immer der höchste Trumpf
		if (card.suit === "hearts" && card.rank === "10") return true;

		if (trump === "jacks") {
			// Buben und Damen sind immer Trumpf
			if (card.rank === "jack" || card.rank === "queen") return true;
			// Karo (Diamonds) ist auch Trumpf
			if (card.suit === "diamonds") return true;
		}
		if (trump === "queens") {
			if (card.rank === "queen") return true;
			if (card.suit === "diamonds") return true;
		}
		return card.suit === trump;
	}

	getCardPoints(card: Card): number {
		// Doppelkopf Punktewerte: 9=0, Bube=2, Dame=3, König=4, 10=10, Ass=11
		// Gesamt: 8×0 + 8×2 + 8×3 + 8×4 + 8×10 + 8×11 = 240 Punkte
		switch (card.rank) {
			case "9":
				return 0;
			case "jack":
				return 2;
			case "queen":
				return 3;
			case "king":
				return 4;
			case "10":
				return 10;
			case "ace":
				return 11;
			default:
				return 0;
		}
	}

	calculateTrickPoints(trick: Trick): number {
		let totalPoints = 0;
		for (const cardEntry of trick.cards) {
			if (cardEntry.card) {
				totalPoints += this.getCardPoints(cardEntry.card);
			}
		}
		return totalPoints;
	}

	getPlayableCards(
		hand: Card[],
		currentTrick: Trick,
		trump: Suit | "jacks" | "queens",
	): Card[] {
		// Erste Karte im Stich: Alle Karten spielbar
		if (currentTrick.cards.length === 0) {
			return hand;
		}

		// Bestimme angespielte Farbe/Trumpf
		const firstCard = currentTrick.cards[0]?.card;
		if (!firstCard) return hand;

		const firstCardIsTrump = this.isTrump(firstCard, trump);
		const leadSuit = firstCard.suit;

		// Prüfe, ob Spieler passende Karten hat
		if (firstCardIsTrump) {
			// Trumpf angespielt: Prüfe ob Spieler Trumpf hat
			const trumpCards = hand.filter((card) => this.isTrump(card, trump));
			if (trumpCards.length > 0) {
				return trumpCards;
			}
			// Keine Trumpf-Karten: Alle Karten spielbar
			return hand;
		} else {
			// Fehlfarbe angespielt: Prüfe ob Spieler diese Farbe hat
			const suitCards = hand.filter((card) => {
				// Nicht-Trumpf-Karten dieser Farbe
				return card.suit === leadSuit && !this.isTrump(card, trump);
			});
			if (suitCards.length > 0) {
				return suitCards;
			}
			// Keine passende Farbe: Alle Karten spielbar
			return hand;
		}
	}

	canPlayCard(
		card: Card,
		hand: Card[],
		currentTrick: Trick,
		trump: Suit | "jacks" | "queens",
	): boolean {
		const playableCards = this.getPlayableCards(hand, currentTrick, trump);
		return playableCards.some((c) => c.id === card.id);
	}

	async autoPlay(sender: Party.Connection) {
		const gameState = this.games.get(this.room.id);
		if (!gameState || !gameState.gameStarted || gameState.gameEnded) {
			this.sendGameError(sender, "Spiel läuft nicht.");
			return;
		}

		// Block auto-play during bidding phase
		if (gameState.biddingPhase?.active) {
			this.sendGameError(sender, "Vorbehaltsabfrage läuft noch.");
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

		const playableCards = this.getPlayableCards(
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
		const message: GameMessage = {
			type: "state",
			state: gameState,
		};
		this.room.broadcast(JSON.stringify(message));
	}
}

Server satisfies Party.Worker;
