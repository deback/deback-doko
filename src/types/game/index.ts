/**
 * Game Types - Index
 *
 * Re-exportiert alle Typen aus dem game/-Verzeichnis.
 */

// Basis-Typen (Karten, Stiche, Ansagen, etc.)
export type {
	AnnouncementType,
	Announcements,
	BiddingPhase,
	Card,
	CardBackDesign,
	CardRenderMode,
	ContractType,
	FullRank,
	HochzeitState,
	PointAnnouncement,
	PointAnnouncementType,
	Rank,
	ReservationType,
	Suit,
	Trick,
} from "./base";

// Sub-Interfaces (logische Gruppierungen)
export type {
	AnnouncementsState,
	GameBiddingState,
	GameFlowState,
	GameIdentity,
	PlayersState,
	SpectatorsState,
	TeamsState,
	TricksState,
} from "./state";

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

// GameState und Events aus der Haupt-Datei
export type { GameEvent, GameMessage, GameState } from "../game";
