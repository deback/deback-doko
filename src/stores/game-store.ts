/**
 * Game Store - Zustand Store Factory für Next.js App Router
 *
 * Verwendet createStore aus zustand/vanilla für SSR-Kompatibilität.
 * Der Store wird pro Game-Session über einen Context Provider erstellt.
 */

import { createStore } from "zustand/vanilla";
import type {
	AnnouncementType,
	ContractType,
	GameState,
	ReservationType,
} from "@/types/game";
import type { Player } from "@/types/tables";

// =============================================================================
// State Types
// =============================================================================

export interface GameStoreState {
	/** Aktueller Spielzustand vom Server */
	gameState: GameState | null;
	/** Aktueller Spieler (der eingeloggte User) */
	currentPlayer: Player | null;
	/** Zuschauer-Modus aktiv */
	isSpectator: boolean;
	/** WebSocket verbunden */
	isConnected: boolean;
	/** Fehlermeldung */
	error: string | null;
}

// =============================================================================
// Action Types
// =============================================================================

export interface GameStoreActions {
	// State Setters (called by useGameConnection)
	setGameState: (state: GameState | null) => void;
	setCurrentPlayer: (player: Player | null) => void;
	setSpectatorMode: (mode: boolean) => void;
	setConnected: (connected: boolean) => void;
	setError: (error: string | null) => void;

	// Game Actions (WebSocket calls, set by useGameConnection)
	playCard: (cardId: string) => void;
	announce: (type: AnnouncementType) => void;
	bid: (bid: ReservationType) => void;
	declareContract: (contract: ContractType) => void;
	autoPlay: () => void;
	resetGame: () => void;

	// Action Setter (for useGameConnection to register WebSocket actions)
	setGameActions: (actions: Partial<GameActions>) => void;
}

/** Game actions that are set by useGameConnection */
export type GameActions = Pick<
	GameStoreActions,
	"playCard" | "announce" | "bid" | "declareContract" | "autoPlay" | "resetGame"
>;

// =============================================================================
// Store Type
// =============================================================================

export type GameStore = GameStoreState & GameStoreActions;

// =============================================================================
// Default Initial State
// =============================================================================

export const defaultInitState: GameStoreState = {
	gameState: null,
	currentPlayer: null,
	isSpectator: false,
	isConnected: false,
	error: null,
};

// =============================================================================
// Store Factory
// =============================================================================

/**
 * Creates a new Game Store instance.
 * Called once per game session by GameStoreProvider.
 */
export const createGameStore = (initState: Partial<GameStoreState> = {}) => {
	return createStore<GameStore>()((set) => ({
		// Initial State
		...defaultInitState,
		...initState,

		// State Setters
		setGameState: (gameState) => set({ gameState }),
		setCurrentPlayer: (currentPlayer) => set({ currentPlayer }),
		setSpectatorMode: (isSpectator) => set({ isSpectator }),
		setConnected: (isConnected) => set({ isConnected }),
		setError: (error) => set({ error }),

		// Game Actions (no-op until set by useGameConnection)
		playCard: () => {},
		announce: () => {},
		bid: () => {},
		declareContract: () => {},
		autoPlay: () => {},
		resetGame: () => {},

		// Action Setter
		setGameActions: (actions) => set(actions),
	}));
};

// =============================================================================
// Store API Type (for Context)
// =============================================================================

export type GameStoreApi = ReturnType<typeof createGameStore>;
