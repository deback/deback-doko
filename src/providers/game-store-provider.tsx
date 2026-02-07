"use client";

/**
 * Game Store Provider - Context Provider für den Zustand Game Store
 *
 * Erstellt eine Store-Instanz pro Game-Session und stellt sie über Context bereit.
 * Basiert auf dem empfohlenen Next.js Pattern aus der Zustand-Dokumentation.
 *
 * @see https://zustand.docs.pmnd.rs/guides/nextjs
 */

import { createContext, useContext, useRef, type ReactNode } from "react";
import { useStore } from "zustand";
import {
	createGameStore,
	type GameStore,
	type GameStoreApi,
	type GameStoreState,
} from "@/stores/game-store";

// =============================================================================
// Context
// =============================================================================

const GameStoreContext = createContext<GameStoreApi | undefined>(undefined);

// =============================================================================
// Provider Props
// =============================================================================

interface GameStoreProviderProps {
	children: ReactNode;
	/** Initial state values (e.g., currentPlayer from server) */
	initialState?: Partial<GameStoreState>;
}

// =============================================================================
// Provider Component
// =============================================================================

/**
 * Provides the Game Store to all child components.
 *
 * Usage:
 * ```tsx
 * <GameStoreProvider initialState={{ currentPlayer: player }}>
 *   <GameBoard />
 * </GameStoreProvider>
 * ```
 */
export function GameStoreProvider({
	children,
	initialState,
}: GameStoreProviderProps) {
	// Use ref to ensure store is only created once per mount
	const storeRef = useRef<GameStoreApi | null>(null);

	if (!storeRef.current) {
		storeRef.current = createGameStore(initialState);
	}

	return (
		<GameStoreContext.Provider value={storeRef.current}>
			{children}
		</GameStoreContext.Provider>
	);
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to access the Game Store with a selector.
 *
 * @example
 * ```tsx
 * // Get specific state
 * const gameState = useGameStore((s) => s.gameState);
 *
 * // Get multiple values
 * const { gameState, currentPlayer } = useGameStore((s) => ({
 *   gameState: s.gameState,
 *   currentPlayer: s.currentPlayer,
 * }));
 *
 * // Get action
 * const playCard = useGameStore((s) => s.playCard);
 * ```
 */
export function useGameStore<T>(selector: (store: GameStore) => T): T {
	const storeContext = useContext(GameStoreContext);

	if (!storeContext) {
		throw new Error("useGameStore must be used within GameStoreProvider");
	}

	return useStore(storeContext, selector);
}
