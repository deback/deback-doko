/**
 * Game Types - Hauptexport-Datei
 *
 * Diese Datei exportiert alle Spiel-bezogenen Typen und definiert GameState
 * als Intersection Type der logischen Sub-Interfaces.
 */

// Re-export aller Basis-Typen
export type {
	Announcements,
	AnnouncementType,
	BiddingPhase,
	Card,
	CardBackDesign,
	CardRenderMode,
	ContractType,
	FullRank,
	GamePointEntry,
	GamePointsResult,
	HochzeitState,
	PointAnnouncement,
	PointAnnouncementType,
	Rank,
	ReservationType,
	SoloContractType,
	Suit,
	Trick,
	TrumpMode,
} from "./game/base";

// Re-export der Sub-Interfaces (für Dokumentation und Selektoren)
export type {
	AnnouncementsState,
	GameBiddingState,
	GameFlowState,
	GameIdentity,
	PlayersState,
	SpectatorsState,
	TeamsState,
	TricksState,
} from "./game/state";

// Import für GameState Definition
import type {
	AnnouncementsState,
	GameBiddingState,
	GameFlowState,
	GameIdentity,
	PlayersState,
	SpectatorsState,
	TeamsState,
	TricksState,
} from "./game/state";

// =============================================================================
// GameState - Vollständiger Spielzustand
// =============================================================================

/**
 * Vollständiger Spielzustand
 *
 * Zusammengesetzt aus logischen Sub-Interfaces:
 * - GameIdentity: Spiel- und Tisch-ID
 * - GameFlowState: Spielfluss (started, ended, round, currentPlayer)
 * - PlayersState: Spieler und Hände
 * - TeamsState: Teams, Punkte, Schweinerei
 * - TricksState: Aktueller und abgeschlossene Stiche
 * - GameBiddingState: Vorbehaltsabfrage, Spielart, Hochzeit
 * - SpectatorsState: Zuschauer
 * - AnnouncementsState: Ansagen
 */
export interface GameState
	extends GameIdentity,
		GameFlowState,
		PlayersState,
		TeamsState,
		TricksState,
		GameBiddingState,
		SpectatorsState,
		AnnouncementsState {}

// =============================================================================
// Game Events - WebSocket-Nachrichten vom Client
// =============================================================================

import type {
	AnnouncementType,
	ContractType,
	ReservationType,
} from "./game/base";

export type GameEvent =
	| { type: "get-state" }
	| { type: "play-card"; cardId: string; playerId: string }
	| { type: "auto-play" }
	| { type: "reset-game" }
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
	  }
	| {
			type: "announce";
			announcement: AnnouncementType;
			playerId: string;
	  }
	| {
			type: "bid";
			playerId: string;
			bid: ReservationType;
	  }
	| {
			type: "declare-contract";
			playerId: string;
			contract: ContractType;
	  };

// =============================================================================
// Game Messages - WebSocket-Nachrichten vom Server
// =============================================================================

export type GameMessage =
	| { type: "state"; state: GameState; isSpectator?: boolean }
	| { type: "error"; message: string }
	| { type: "game-started"; gameId: string }
	| { type: "spectator-count"; gameId: string; count: number };
