import type * as Party from "partykit/server";

interface Player {
	id: string;
	name: string;
}

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

export default class GameServer implements Party.Server {
	state: GameState | null = null;

	constructor(readonly room: Party.Room) {}

	onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
		console.log(
			`Game connected: id: ${conn.id}, room: ${this.room.id}, url: ${new URL(ctx.request.url).pathname}`,
		);

		if (this.state) {
			this.sendState(conn);
		}
	}

	onMessage(message: string, sender: Party.Connection) {
		try {
			const event: GameEvent = JSON.parse(message);
			this.handleEvent(event, sender);
		} catch (error) {
			console.error("Error parsing message:", error);
			this.sendError(sender, "Invalid message format");
		}
	}

	handleEvent(event: GameEvent, sender: Party.Connection) {
		switch (event.type) {
			case "get-state":
				if (this.state) {
					this.sendState(sender);
				}
				break;

			case "start-game":
				this.startGame(event.players, event.tableId);
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
				// Doppelkopf has 2 of each card (48 cards total)
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

	startGame(players: Player[], tableId: string) {
		if (this.state?.gameStarted) {
			return;
		}

		const gameId = this.room.id;
		const deck = this.createDeck();
		const hands = this.dealCards(deck, players);

		// Determine trump (simplified: jacks are always trump in Doppelkopf)
		const trump: Suit | "jacks" | "queens" = "jacks";

		this.state = {
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

		this.broadcastState();
	}

	playCard(cardId: string, playerId: string, sender: Party.Connection) {
		if (!this.state || !this.state.gameStarted) {
			this.sendError(sender, "Spiel wurde noch nicht gestartet.");
			return;
		}

		const currentPlayer = this.state.players[this.state.currentPlayerIndex];

		if (!currentPlayer) {
			this.sendError(sender, "Spieler nicht gefunden.");
			return;
		}

		// Check if it's the current player's turn
		if (currentPlayer.id !== playerId) {
			this.sendError(sender, "Du bist nicht dran.");
			return;
		}

		const hand = this.state.hands[currentPlayer.id];

		if (!hand) {
			this.sendError(sender, "Spieler nicht gefunden.");
			return;
		}

		const cardIndex = hand.findIndex((c) => c.id === cardId);

		if (cardIndex === -1) {
			this.sendError(sender, "Karte nicht gefunden.");
			return;
		}

		// Validate card can be played (simplified - would need to check suit following rules)
		const card = hand[cardIndex];
		if (!card) {
			this.sendError(sender, "Karte nicht gefunden.");
			return;
		}

		// Remove card from hand
		hand.splice(cardIndex, 1);

		// Add to current trick
		this.state.currentTrick.cards.push({
			card,
			playerId: currentPlayer.id,
		});

		// Check if trick is complete (4 cards)
		if (this.state.currentTrick.cards.length === 4) {
			this.completeTrick();
		} else {
			// Move to next player
			this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % 4;
		}

		this.broadcastState();
	}

	completeTrick() {
		if (!this.state) return;

		const trick = this.state.currentTrick;
		const winner = this.determineTrickWinner(trick);
		trick.winnerId = winner;
		trick.completed = true;

		this.state.completedTricks.push(trick);
		this.state.currentPlayerIndex = this.state.players.findIndex(
			(p) => p.id === winner,
		);

		// Start new trick
		this.state.currentTrick = {
			cards: [],
			completed: false,
		};

		// Check if game is over (all tricks completed = 12 tricks)
		if (this.state.completedTricks.length >= 12) {
			this.state.gameEnded = true;
		}
	}

	determineTrickWinner(trick: Trick): string {
		if (trick.cards.length === 0) return trick.cards[0]?.playerId || "";

		// Get first card suit
		const firstCard = trick.cards[0]?.card;
		if (!firstCard) return trick.cards[0]?.playerId || "";

		const leadSuit = firstCard.suit;
		const trump = this.state?.trump || "jacks";

		// Find highest card
		const firstCardEntry = trick.cards[0];
		if (!firstCardEntry) return "";

		let winner = firstCardEntry;
		let highestValue = this.getCardValue(firstCardEntry.card, leadSuit, trump);

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
		// In Doppelkopf:
		// - Jacks (Buben) are always trump, highest value
		// - Queens (Damen) are also trump
		// - Diamonds (Karo) are also trump
		// - Ace is highest in non-trump suits
		// - Then King, Queen (if not trump), 10, 9

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

		return 0; // Card doesn't follow suit
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

	sendState(conn: Party.Connection) {
		if (!this.state) return;

		const message: GameMessage = {
			type: "state",
			state: this.state,
		};
		conn.send(JSON.stringify(message));
	}

	sendError(conn: Party.Connection, message: string) {
		const errorMessage: GameMessage = {
			type: "error",
			message,
		};
		conn.send(JSON.stringify(errorMessage));
	}

	broadcastState() {
		if (!this.state) return;

		const message: GameMessage = {
			type: "state",
			state: this.state,
		};
		this.room.broadcast(JSON.stringify(message));
	}
}

GameServer satisfies Party.Worker;
