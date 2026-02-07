/**
 * Helper Types für Game Components
 *
 * Diese Typen definieren die minimalen GameState-Felder,
 * die einzelne Components benötigen.
 */

import type { GameState } from "../game";

// =============================================================================
// Component Props Helper Types
// =============================================================================

/**
 * Props für TrickArea Component
 * Benötigt Stich-Informationen und Spieler-Daten
 */
export type TrickAreaProps = Pick<
	GameState,
	| "currentTrick"
	| "completedTricks"
	| "trump"
	| "players"
	| "schweinereiPlayers"
>;

/**
 * Props für BiddingSelect Component
 * Benötigt Bidding-Phase und Spieler-Liste
 */
export type BiddingSelectProps = Pick<
	GameState,
	"biddingPhase" | "players" | "contractType"
>;

/**
 * Props für AnnouncementButtons Component
 * Benötigt Ansagen, Teams und Stich-Informationen
 */
export type AnnouncementButtonsProps = Pick<
	GameState,
	"announcements" | "teams" | "currentTrick" | "completedTricks"
>;

/**
 * Props für PlayerInfo Component
 * Benötigt Spieler, Teams, Punkte und Ansagen
 */
export type PlayerInfoProps = Pick<
	GameState,
	"players" | "teams" | "scores" | "announcements"
>;

/**
 * Props für SpectatorBoard Component
 * Benötigt alle Felder außer sensitive Daten (hands)
 */
export type SpectatorViewProps = Pick<
	GameState,
	| "id"
	| "tableId"
	| "players"
	| "currentPlayerIndex"
	| "handCounts"
	| "currentTrick"
	| "completedTricks"
	| "trump"
	| "gameStarted"
	| "gameEnded"
	| "round"
	| "scores"
	| "teams"
	| "spectatorCount"
	| "spectators"
	| "announcements"
	| "biddingPhase"
	| "contractType"
>;

/**
 * Props für GameBoard Component
 * Vollständiger GameState
 */
export type GameBoardProps = GameState;

// =============================================================================
// Partial State Types (für Updates)
// =============================================================================

/**
 * Partielle Spielfluss-Updates
 */
export type GameFlowUpdate = Partial<
	Pick<GameState, "gameStarted" | "gameEnded" | "round" | "currentPlayerIndex">
>;

/**
 * Partielle Stich-Updates
 */
export type TrickUpdate = Partial<
	Pick<GameState, "currentTrick" | "completedTricks">
>;

/**
 * Partielle Punkte-Updates
 */
export type ScoreUpdate = Partial<Pick<GameState, "scores" | "teams">>;
