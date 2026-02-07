import type { Announcements, Card, ContractType } from "./game";

/** Stored trick data (serialized to JSONB) */
export interface StoredTrick {
	cards: Array<{ card: Card; playerId: string }>;
	winnerId: string;
	points: number;
}

/** Stored initial hands (serialized to JSONB) */
export type StoredInitialHands = Record<string, Card[]>;

/** Player result for game history display */
export interface GamePlayerResult {
	userId: string;
	userName: string;
	userImage: string | null;
	score: number;
	team: "re" | "kontra";
	won: boolean;
	balanceChange: number;
}

/** Full game history detail for the review page */
export interface GameHistoryDetail {
	id: string;
	tableId: string;
	createdAt: Date;
	tricks: StoredTrick[];
	initialHands: StoredInitialHands;
	announcements: Announcements | null;
	contractType: ContractType | null;
	schweinereiPlayers: string[];
	playerResults: GamePlayerResult[];
}

/** Summary for the game history list */
export interface GameHistorySummary {
	id: string;
	createdAt: Date;
	contractType: string | null;
	playerResults: GamePlayerResult[];
}
