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
	BotControlMode,
	BotControlReason,
	BotRoundScope,
	Card,
	CardBackDesign,
	CardRenderMode,
	ContractType,
	FullRank,
	GamePointEntry,
	GamePointsResult,
	HochzeitState,
	PlayerBotControl,
	PlayerPresence,
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
	BotState,
	GameBiddingState,
	GameFlowState,
	GameIdentity,
	PlayersState,
	SpectatorsState,
	TeamsState,
	TricksState,
} from "./game/state";

import type { ChatMessage } from "./game/chat";
// Import für GameState Definition
import type {
	AnnouncementsState,
	BotState,
	GameBiddingState,
	GameFlowState,
	GameIdentity,
	PlayersState,
	SpectatorsState,
	TeamsState,
	TricksState,
} from "./game/state";
import type { Player } from "./tables";

export type {
	ChatAuthorRole,
	ChatMessage,
	ChatMessageAuthor,
} from "./game/chat";

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
		BotState,
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
	| {
			type: "get-state";
			playerId?: string;
			playerName?: string;
			playerImage?: string | null;
	  }
	| { type: "play-card"; cardId: string; playerId: string }
	| { type: "auto-play" }
	| { type: "auto-play-all" }
	| { type: "reset-game" }
	| {
			type: "start-game";
			players: Player[];
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
	  }
	| { type: "toggle-stand-up"; playerId: string }
	| {
			type: "bot-control";
			action: "takeover" | "release";
			targetPlayerId: string;
	  }
	| {
			type: "update-player-info";
			playerId: string;
			name: string;
			image?: string | null;
	  }
	| {
			type: "chat-send";
			text: string;
	  };

// =============================================================================
// Game Messages - WebSocket-Nachrichten vom Server
// =============================================================================

export type GameMessage =
	| { type: "state"; state: GameState; isSpectator?: boolean }
	| { type: "error"; message: string }
	| { type: "game-started"; gameId: string }
	| { type: "spectator-count"; gameId: string; count: number }
	| { type: "redirect-to-lobby"; tableId: string }
	| { type: "chat-history"; messages: ChatMessage[] }
	| { type: "chat-message"; message: ChatMessage };
