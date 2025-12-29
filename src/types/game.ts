import type { Player } from "./tables";

export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Rank = "9" | "10" | "jack" | "queen" | "king" | "ace";

export interface Card {
	suit: Suit;
	rank: Rank;
	id: string;
}

export interface Trick {
	cards: Array<{ card: Card; playerId: string }>;
	winnerId?: string;
	completed: boolean;
}

export interface GameState {
	id: string;
	tableId: string;
	players: Player[];
	currentPlayerIndex: number;
	hands: Record<string, Card[]>; // playerId -> cards
	currentTrick: Trick;
	completedTricks: Trick[];
	trump: Suit | "jacks" | "queens"; // In Doppelkopf: Buben oder Damen sind Trumpf
	gameStarted: boolean;
	gameEnded: boolean;
	round: number;
}

export type GameEvent =
	| { type: "get-state" }
	| { type: "play-card"; cardId: string; playerId: string }
	| { type: "start-game"; players: Array<{ id: string; name: string }>; tableId: string };

export type GameMessage =
	| { type: "state"; state: GameState }
	| { type: "error"; message: string }
	| { type: "game-started"; gameId: string };

