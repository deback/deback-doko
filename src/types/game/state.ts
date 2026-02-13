/**
 * GameState Sub-Interfaces
 *
 * Diese Datei definiert logische Gruppierungen der GameState-Felder.
 * Die Interfaces werden per Intersection Type zu GameState zusammengeführt.
 */

import type { Player } from "../tables";
import type {
	Announcements,
	BiddingPhase,
	BotRoundScope,
	Card,
	ContractType,
	GamePointsResult,
	HochzeitState,
	PlayerBotControl,
	PlayerPresence,
	Trick,
	TrumpMode,
} from "./base";

// =============================================================================
// Spiel-Identifikation
// =============================================================================

/** Eindeutige Identifikation eines Spiels */
export interface GameIdentity {
	/** Eindeutige Spiel-ID */
	id: string;
	/** Zugehörige Tisch-ID */
	tableId: string;
}

// =============================================================================
// Spielfluss-Status
// =============================================================================

/** Status des Spielablaufs */
export interface GameFlowState {
	/** Spiel wurde gestartet */
	gameStarted: boolean;
	/** Spiel ist beendet */
	gameEnded: boolean;
	/** Aktuelle Runde (1-12) */
	round: number;
	/** Index des aktuellen Spielers (0-3) */
	currentPlayerIndex: number;
	/** Spieler-IDs, die nach der Runde aufstehen wollen */
	standingUpPlayers: string[];
}

// =============================================================================
// Spieler und Hände
// =============================================================================

/** Spieler und deren Karten */
export interface PlayersState {
	/** Liste der 4 Spieler */
	players: Player[];
	/** Karten auf der Hand (playerId -> Card[]) */
	hands: Record<string, Card[]>;
	/** Anzahl Karten auf der Hand - für Zuschauer (playerId -> count) */
	handCounts: Record<string, number>;
	/** Startblätter beim Austeilen - für Spielhistorie (playerId -> Card[]) */
	initialHands?: Record<string, Card[]>;
}

// =============================================================================
// Teams und Punkte
// =============================================================================

/** Team-Zuordnung und Punktestand */
export interface TeamsState {
	/** Team-Zuordnung (playerId -> "re" | "kontra") */
	teams: Record<string, "re" | "kontra">;
	/** Punktestand pro Spieler (playerId -> Punkte) */
	scores: Record<string, number>;
	/** Spieler mit Schweinerei (beide Karo-Asse) */
	schweinereiPlayers: string[];
	/** DDV-Spielpunkte nach Spielende */
	gamePointsResult?: GamePointsResult;
}

// =============================================================================
// Stich-Verwaltung
// =============================================================================

/** Aktueller und abgeschlossene Stiche */
export interface TricksState {
	/** Aktueller Stich */
	currentTrick: Trick;
	/** Liste der abgeschlossenen Stiche */
	completedTricks: Trick[];
	/** Trumpffarbe / Spielmodus */
	trump: TrumpMode;
}

// =============================================================================
// Vorbehaltsabfrage (Bidding)
// =============================================================================

/** Vorbehaltsabfrage und Spielart */
export interface GameBiddingState {
	/** Aktive Vorbehaltsabfrage */
	biddingPhase?: BiddingPhase;
	/** Gewählte Spielart */
	contractType: ContractType;
	/** Hochzeit-Status (falls aktiv) */
	hochzeit?: HochzeitState;
}

// =============================================================================
// Zuschauer
// =============================================================================

/** Zuschauer-Informationen */
export interface SpectatorsState {
	/** Liste der Zuschauer */
	spectators: Array<{ id: string; name: string; image?: string | null }>;
	/** Anzahl Zuschauer */
	spectatorCount: number;
}

// =============================================================================
// Ansagen
// =============================================================================

/** Ansagen (Re, Kontra, keine 90, etc.) */
export interface AnnouncementsState {
	/** Alle Ansagen */
	announcements: Announcements;
}

// =============================================================================
// Bot-Steuerung / Präsenz
// =============================================================================

/** Bot-/Präsenzstatus pro Spieler */
export interface BotState {
	/** Spielersteuerung (playerId -> Modus/Metadaten) */
	botControlByPlayer: Record<string, PlayerBotControl>;
	/** Verbindungsstatus (playerId -> Presence) */
	presenceByPlayer: Record<string, PlayerPresence>;
	/** Gültigkeitsbereich der Bot-Steuerung */
	botRoundScope: BotRoundScope;
}
