/**
 * Game Store - Zustand Store Factory für Next.js App Router
 *
 * Verwendet createStore aus zustand/vanilla für SSR-Kompatibilität.
 * Der Store wird pro Game-Session über einen Context Provider erstellt.
 */

import { createJSONStorage, persist } from "zustand/middleware";
import { createStore } from "zustand/vanilla";
import type {
	AnnouncementType,
	ChatMessage,
	ContractType,
	GameState,
	ReservationType,
	TrumpMode,
} from "@/types/game";
import type { Player } from "@/types/tables";

const CHAT_UI_PERSIST_KEY = "doko:game-chat-ui";

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
	/** Vorschau-Trumpfmodus (für Solo-Auswahl im Bidding) */
	previewTrumpMode: TrumpMode | null;
	/** Chat-Nachrichten für den aktuellen Tisch */
	chatMessages: ChatMessage[];
	/** Lokaler Chat-Cooldown bis Timestamp (ms) */
	chatCooldownUntil: number | null;
	/** Lokaler Chat-Fehler */
	chatLocalError: string | null;
	/** Chat-Panel Open-State (persistiert) */
	chatPanelOpen: boolean;
	/** Persist-Rehydration abgeschlossen */
	chatPanelHydrated: boolean;
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
	setPreviewTrumpMode: (mode: TrumpMode | null) => void;
	setChatHistory: (messages: ChatMessage[]) => void;
	appendChatMessage: (message: ChatMessage) => void;
	setChatCooldownUntil: (timestamp: number | null) => void;
	setChatLocalError: (message: string | null) => void;
	setChatPanelOpen: (open: boolean) => void;
	setChatPanelHydrated: (hydrated: boolean) => void;

	// Game Actions (WebSocket calls, set by useGameConnection)
	playCard: (cardId: string) => void;
	announce: (type: AnnouncementType) => void;
	bid: (bid: ReservationType) => void;
	declareContract: (contract: ContractType) => void;
	autoPlay: () => void;
	autoPlayAll: () => void;
	resetGame: () => void;
	toggleStandUp: () => void;
	sendChatMessage: (text: string) => void;

	// Action Setter (for useGameConnection to register WebSocket actions)
	setGameActions: (actions: Partial<GameActions>) => void;
}

/** Game actions that are set by useGameConnection */
export type GameActions = Pick<
	GameStoreActions,
	| "playCard"
	| "announce"
	| "bid"
	| "declareContract"
	| "autoPlay"
	| "autoPlayAll"
	| "resetGame"
	| "toggleStandUp"
	| "sendChatMessage"
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
	previewTrumpMode: null,
	chatMessages: [],
	chatCooldownUntil: null,
	chatLocalError: null,
	chatPanelOpen: false,
	chatPanelHydrated: false,
};

// =============================================================================
// Store Factory
// =============================================================================

/**
 * Creates a new Game Store instance.
 * Called once per game session by GameStoreProvider.
 */
export const createGameStore = (initState: Partial<GameStoreState> = {}) => {
	const resolvedInitState: GameStoreState = {
		...defaultInitState,
		...initState,
		chatPanelHydrated: false,
	};

	const store = createStore<GameStore>()(
		persist(
			(set) => ({
				// Initial State
				...resolvedInitState,

				// State Setters
				setGameState: (gameState) =>
					set((state) => ({
						gameState,
						// Clear preview trump when bidding phase ends (resolved by server)
						previewTrumpMode: gameState?.biddingPhase?.active
							? state.previewTrumpMode
							: null,
					})),
				setCurrentPlayer: (currentPlayer) => set({ currentPlayer }),
				setSpectatorMode: (isSpectator) => set({ isSpectator }),
				setConnected: (isConnected) => set({ isConnected }),
				setError: (error) => set({ error }),
				setPreviewTrumpMode: (previewTrumpMode) => set({ previewTrumpMode }),
				setChatHistory: (chatMessages) => set({ chatMessages }),
				appendChatMessage: (message) =>
					set((state) => ({
						chatMessages: [...state.chatMessages, message],
					})),
				setChatCooldownUntil: (chatCooldownUntil) => set({ chatCooldownUntil }),
				setChatLocalError: (chatLocalError) => set({ chatLocalError }),
				setChatPanelOpen: (chatPanelOpen) => set({ chatPanelOpen }),
				setChatPanelHydrated: (chatPanelHydrated) => set({ chatPanelHydrated }),

				// Game Actions (no-op until set by useGameConnection)
				playCard: () => {},
				announce: () => {},
				bid: () => {},
				declareContract: () => {},
				autoPlay: () => {},
				autoPlayAll: () => {},
				resetGame: () => {},
				toggleStandUp: () => {},
				sendChatMessage: () => {},

				// Action Setter
				setGameActions: (actions) => set(actions),
			}),
			{
				name: CHAT_UI_PERSIST_KEY,
				storage: createJSONStorage(() => localStorage),
				partialize: (state) => ({
					chatPanelOpen: state.chatPanelOpen,
				}),
				skipHydration: true,
				onRehydrateStorage: () => (state, error) => {
					state?.setChatPanelHydrated(true);
					if (error) {
						console.error("Failed to rehydrate chat panel state:", error);
					}
				},
			},
		),
	);

	if (typeof window !== "undefined") {
		void store.persist.rehydrate();
	}

	return store;
};

// =============================================================================
// Store API Type (for Context)
// =============================================================================

export type GameStoreApi = ReturnType<typeof createGameStore>;
