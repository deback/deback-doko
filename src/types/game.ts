import type { Player } from "./tables";

export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Rank = "9" | "10" | "jack" | "queen" | "king" | "ace";

// Volles 52-Karten-Deck (für französisches Kartenspiel)
export type FullRank =
	| "2"
	| "3"
	| "4"
	| "5"
	| "6"
	| "7"
	| "8"
	| "9"
	| "10"
	| "jack"
	| "queen"
	| "king"
	| "ace";

// Kartenrücken-Designs
export type CardBackDesign = "blue" | "red" | "pattern";

// Darstellungsmodus
export type CardRenderMode = "svg" | "text";

export interface Card {
	suit: Suit;
	rank: Rank;
	id: string;
}

export interface Trick {
	cards: Array<{ card: Card; playerId: string }>;
	winnerId?: string;
	completed: boolean;
	points?: number;
}

export interface GameState {
	id: string;
	tableId: string;
	players: Player[];
	currentPlayerIndex: number;
	hands: Record<string, Card[]>; // playerId -> cards
	handCounts: Record<string, number>; // playerId -> card count (for spectators)
	currentTrick: Trick;
	completedTricks: Trick[];
	trump: Suit | "jacks" | "queens"; // In Doppelkopf: Buben oder Damen sind Trumpf
	gameStarted: boolean;
	gameEnded: boolean;
	round: number;
	scores: Record<string, number>; // playerId -> Gesamtpunkte
	schweinereiPlayers: string[]; // Spieler-IDs, die beide Karo-Assen haben
	teams: Record<string, "re" | "kontra">; // playerId -> Team-Zuordnung
	spectatorCount: number; // Number of spectators watching the game
	spectators: Array<{ id: string; name: string; image?: string | null }>; // List of spectators
}

export type GameEvent =
	| { type: "get-state" }
	| { type: "play-card"; cardId: string; playerId: string }
	| { type: "auto-play" }
	| {
			type: "start-game";
			players: Array<{ id: string; name: string }>;
			tableId: string;
	  }
	| {
			type: "spectate-game";
			gameId: string;
			spectatorId: string;
			spectatorName: string;
			spectatorImage?: string | null;
	  };

export type GameMessage =
	| { type: "state"; state: GameState; isSpectator?: boolean }
	| { type: "error"; message: string }
	| { type: "game-started"; gameId: string }
	| { type: "spectator-count"; gameId: string; count: number };
