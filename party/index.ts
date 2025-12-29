import type * as Party from "partykit/server";

interface Player {
	id: string;
	name: string;
	email?: string;
}

interface Table {
	id: string;
	name: string;
	players: Player[];
	createdAt: number;
	gameId?: string;
	gameStarted: boolean;
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

interface Card {
	suit: Suit;
	rank: Rank;
	id: string;
}

interface Trick {
	cards: Array<{ card: Card; playerId: string }>;
	winnerId?: string;
	completed: boolean;
}

interface GameState {
	id: string;
	tableId: string;
	players: Player[];
	currentPlayerIndex: number;
	hands: Record<string, Card[]>;
	currentTrick: Trick;
	completedTricks: Trick[];
	trump: Suit | "jacks" | "queens";
	gameStarted: boolean;
	gameEnded: boolean;
	round: number;
}

type GameEvent =
	| { type: "get-state" }
	| { type: "play-card"; cardId: string; playerId: string }
	| { type: "start-game"; players: Player[]; tableId: string };

type GameMessage =
	| { type: "state"; state: GameState }
	| { type: "error"; message: string };

export default class Server implements Party.Server {
	tables: Map<string, Table> = new Map();
	games: Map<string, GameState> = new Map();

	constructor(readonly room: Party.Room) {}

	onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
		console.log(
			`Connected: id: ${conn.id}, room: ${this.room.id}, url: ${new URL(ctx.request.url).pathname}`,
		);

		if (this.room.id === "tables-room") {
			// Send current state to newly connected client
			this.sendState(conn);
		} else if (this.room.id.startsWith("game-")) {
			// Handle game room
			const gameState = this.games.get(this.room.id);
			if (gameState) {
				this.sendGameState(conn, gameState);
			}
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

	handleEvent(event: TableEvent, sender: Party.Connection) {
		switch (event.type) {
			case "get-state":
				this.sendState(sender);
				break;

			case "create-table":
				this.createTable(event.name, event.player, sender);
				break;

			case "join-table":
				this.joinTable(event.tableId, event.player, sender);
				break;

			case "leave-table":
				this.leaveTable(event.tableId, event.playerId);
				break;

			case "delete-table":
				this.deleteTable(event.tableId, event.playerId);
				break;
		}
	}

	createTable(name: string, player: Player, sender: Party.Connection) {
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
		this.broadcastState();
	}

	joinTable(tableId: string, player: Player, sender: Party.Connection) {
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
		this.broadcastState();

		// Check if table is full (4 players) and start game
		if (table.players.length === 4 && !table.gameStarted) {
			this.startGame(table);
		}
	}

	startGame(table: Table) {
		// Generate game ID
		const gameId = `game-${Date.now()}-${Math.random().toString(36).substring(7)}`;
		table.gameId = gameId;
		table.gameStarted = true;

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

	leaveTable(tableId: string, playerId: string) {
		const table = this.tables.get(tableId);
		if (!table) {
			return;
		}

		table.players = table.players.filter((p) => p.id !== playerId);

		// Delete table if empty
		if (table.players.length === 0) {
			this.tables.delete(tableId);
		}

		this.broadcastState();
	}

	deleteTable(tableId: string, playerId: string) {
		const table = this.tables.get(tableId);
		if (!table) {
			return;
		}

		// Only allow deletion if the player is the creator (first player)
		if (table.players.length > 0 && table.players[0]?.id === playerId) {
			this.tables.delete(tableId);
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
	handleGameEvent(event: GameEvent, sender: Party.Connection) {
		switch (event.type) {
			case "get-state": {
				const gameState = this.games.get(this.room.id);
				if (gameState) {
					this.sendGameState(sender, gameState);
				}
				break;
			}

			case "start-game":
				this.startGameRoom(event.players, event.tableId);
				break;

			case "play-card":
				this.playCard(event.cardId, event.playerId, sender);
				break;
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

	startGameRoom(players: Player[], tableId: string) {
		const gameId = this.room.id;
		if (this.games.has(gameId)) {
			return;
		}

		const deck = this.createDeck();
		const hands = this.dealCards(deck, players);
		const trump: Suit | "jacks" | "queens" = "jacks";

		const gameState: GameState = {
			id: gameId,
			tableId,
			players,
			currentPlayerIndex: 0,
			hands,
			currentTrick: {
				cards: [],
				completed: false,
			},
			completedTricks: [],
			trump,
			gameStarted: true,
			gameEnded: false,
			round: 1,
		};

		this.games.set(gameId, gameState);
		this.broadcastGameState(gameState);
	}

	playCard(cardId: string, playerId: string, sender: Party.Connection) {
		const gameState = this.games.get(this.room.id);
		if (!gameState || !gameState.gameStarted) {
			this.sendGameError(sender, "Spiel wurde noch nicht gestartet.");
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

		gameState.currentTrick.cards.push({
			card,
			playerId: currentPlayer.id,
		});

		if (gameState.currentTrick.cards.length === 4) {
			this.completeTrick(gameState);
		} else {
			gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % 4;
		}

		this.broadcastGameState(gameState);
	}

	completeTrick(gameState: GameState) {
		const trick = gameState.currentTrick;
		const winner = this.determineTrickWinner(trick, gameState.trump);
		trick.winnerId = winner;
		trick.completed = true;

		gameState.completedTricks.push(trick);
		gameState.currentPlayerIndex = gameState.players.findIndex(
			(p) => p.id === winner,
		);

		gameState.currentTrick = {
			cards: [],
			completed: false,
		};

		if (gameState.completedTricks.length >= 12) {
			gameState.gameEnded = true;
		}
	}

	determineTrickWinner(trick: Trick, trump: Suit | "jacks" | "queens"): string {
		if (trick.cards.length === 0) return "";

		const firstCardEntry = trick.cards[0];
		if (!firstCardEntry) return "";

		const firstCard = firstCardEntry.card;
		if (!firstCard) return firstCardEntry.playerId || "";

		const leadSuit = firstCard.suit;
		let winner = firstCardEntry;
		let highestValue = this.getCardValue(firstCard, leadSuit, trump);

		for (let i = 1; i < trick.cards.length; i++) {
			const cardEntry = trick.cards[i];
			if (!cardEntry) continue;

			const value = this.getCardValue(cardEntry.card, leadSuit, trump);
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
	): number {
		const isTrump = this.isTrump(card, trump);
		const isLeadSuit = card.suit === leadSuit;

		if (isTrump) {
			// In Doppelkopf: Damen sind höchster Trumpf, dann Buben, dann Karo
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
		// In Doppelkopf sind Buben, Damen und Karo Trumpf
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
