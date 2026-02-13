/**
 * Game Types - Index
 *
 * Re-exportiert alle Typen aus dem game/-Verzeichnis.
 */

// GameState und Events aus der Haupt-Datei
export type { GameEvent, GameMessage, GameState } from "../game";
// Basis-Typen (Karten, Stiche, Ansagen, etc.)
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
	Suit,
	Trick,
} from "./base";
export type { ChatAuthorRole, ChatMessage, ChatMessageAuthor } from "./chat";

// Helper Types für Components
export type {
	AnnouncementButtonsProps,
	BiddingSelectProps,
	GameBoardProps,
	GameFlowUpdate,
	PlayerInfoProps,
	ScoreUpdate,
	SpectatorViewProps,
	TrickAreaProps,
	TrickUpdate,
} from "./props";
// Sub-Interfaces (logische Gruppierungen)
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
} from "./state";
