// Table types
export interface Player {
	id: string;
	name: string;
	email?: string;
	image?: string | null;
	gamesPlayed: number;
	gamesWon: number;
	balance: number;
}

export interface Table {
	id: string;
	name: string;
	players: Player[];
	createdAt: number;
	gameId?: string;
	gameStarted: boolean;
	spectatorCount?: number;
}

export interface TablesState {
	tables: Table[];
}

export type TableEvent =
	| { type: "create-table"; name: string; player: Player }
	| { type: "join-table"; tableId: string; player: Player }
	| { type: "leave-table"; tableId: string; playerId: string }
	| { type: "delete-table"; tableId: string; playerId: string }
	| { type: "get-state" };

export type TableMessage =
	| { type: "state"; state: TablesState }
	| { type: "error"; message: string }
	| {
			type: "game-started";
			gameId: string;
			tableId: string;
			players: Player[];
	  };

// Game types
export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Rank = "9" | "10" | "jack" | "queen" | "king" | "ace";

// Ansagen-Typen
export type AnnouncementType =
	| "re"
	| "kontra"
	| "no90"
	| "no60"
	| "no30"
	| "schwarz";
export type PointAnnouncementType = "no90" | "no60" | "no30" | "schwarz";

// Vorbehaltsabfrage (Bidding) Typen
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

export type TrumpMode = Suit | "jacks" | "queens-only" | "jacks-only" | "none";

export interface BiddingPhase {
	active: boolean;
	currentBidderIndex: number;
	bids: Record<string, ReservationType>;
	awaitingContractDeclaration?: string;
	pendingContracts: Record<string, ContractType>;
}

export interface HochzeitState {
	active: boolean;
	seekerPlayerId: string;
	partnerPlayerId?: string;
	clarificationTrickNumber: number;
}

export interface PointAnnouncement {
	type: PointAnnouncementType;
	by: string; // playerId
}

export interface Announcements {
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
	hands: Record<string, Card[]>;
	handCounts: Record<string, number>; // For spectators: card count per player
	initialHands?: Record<string, Card[]>; // Initial hands at deal time - for game history
	currentTrick: Trick;
	completedTricks: Trick[];
	trump: TrumpMode;
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

export type GameEvent =
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

export type GameMessage =
	| { type: "state"; state: GameState; isSpectator?: boolean }
	| { type: "error"; message: string }
	| { type: "spectator-count"; gameId: string; count: number };
