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
	GameBiddingState,
	GameFlowState,
	GameIdentity,
	PlayersState,
	SpectatorsState,
	TeamsState,
	TricksState,
} from "./state";
