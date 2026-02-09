/**
 * Basis-Typen für das Doppelkopf-Spiel
 *
 * Diese Datei enthält die grundlegenden Typen wie Karten, Stiche, Ansagen etc.
 */

// =============================================================================
// Karten-Typen
// =============================================================================

export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Rank = "9" | "10" | "jack" | "queen" | "king" | "ace";

/** Volles 52-Karten-Deck (für französisches Kartenspiel) */
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

export interface Card {
	suit: Suit;
	rank: Rank;
	id: string;
}

/** Kartenrücken-Designs */
export type CardBackDesign = "blue" | "red" | "pattern";

/** Darstellungsmodus */
export type CardRenderMode = "svg" | "text";

// =============================================================================
// Stich-Typen
// =============================================================================

export interface Trick {
	cards: Array<{ card: Card; playerId: string }>;
	winnerId?: string;
	completed: boolean;
	points?: number;
}

// =============================================================================
// Ansagen-Typen
// =============================================================================

export type AnnouncementType =
	| "re"
	| "kontra"
	| "no90"
	| "no60"
	| "no30"
	| "schwarz";

export type PointAnnouncementType = "no90" | "no60" | "no30" | "schwarz";

export interface PointAnnouncement {
	type: PointAnnouncementType;
	/** playerId */
	by: string;
}

export interface Announcements {
	re: {
		announced: boolean;
		/** playerId */
		by?: string;
	};
	kontra: {
		announced: boolean;
		by?: string;
	};
	/** z.B. [{type: "no90", by: "player1"}] */
	rePointAnnouncements: PointAnnouncement[];
	kontraPointAnnouncements: PointAnnouncement[];
}

// =============================================================================
// Vorbehaltsabfrage (Bidding) Typen
// =============================================================================

export type ReservationType = "gesund" | "vorbehalt";
export type ContractType =
	| "normal"
	| "hochzeit"
	| "solo-clubs"
	| "solo-spades"
	| "solo-hearts"
	| "solo-diamonds"
	| "solo-queens"
	| "solo-jacks"
	| "solo-aces";

export type SoloContractType = Exclude<ContractType, "normal" | "hochzeit">;

/** Trumpf-Modus: bestimmt welche Karten Trumpf sind */
export type TrumpMode = Suit | "jacks" | "queens-only" | "jacks-only" | "none";

export interface BiddingPhase {
	active: boolean;
	currentBidderIndex: number;
	/** playerId -> "gesund" | "vorbehalt" */
	bids: Record<string, ReservationType>;
	/** playerIds die noch Vorbehalt-Deklaration machen müssen */
	awaitingContractDeclaration?: string[];
	/** Ausstehende Verträge (playerId -> ContractType) für Vorbehalt-Spieler */
	pendingContracts: Record<string, ContractType>;
}

export interface HochzeitState {
	active: boolean;
	/** Spieler mit beiden Kreuz-Damen */
	seekerPlayerId: string;
	/** Partner (erster Fehl-Stich-Gewinner) */
	partnerPlayerId?: string;
	/** Spätestens im 3. Stich muss Partner gefunden sein */
	clarificationTrickNumber: number;
}
