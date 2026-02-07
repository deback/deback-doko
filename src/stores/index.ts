/**
 * Stores - Re-exports
 */

// Game Store
export {
	createGameStore,
	defaultInitState,
	type GameActions,
	type GameStore,
	type GameStoreActions,
	type GameStoreApi,
	type GameStoreState,
} from "./game-store";

// Game Selectors
export {
	// Basis-Selektoren
	useCurrentPlayer,
	useError,
	useGameState,
	useIsConnected,
	useIsSpectator,
	// Abgeleitete Selektoren
	useHasPlayerPlayedInTrick,
	useHasTrickStarted,
	useIsBiddingActive,
	useIsMyTurn,
	useMyHand,
	useMyTeam,
	usePlayableCardIds,
	usePlayerAnnouncements,
	usePlayerAtPosition,
	useSchweinereiPlayerId,
	useSortedHand,
	// Action Hooks
	useAnnounce,
	useAutoPlay,
	useBid,
	useDeclareContract,
	usePlayCard,
	useResetGame,
	// Store Setter Hooks
	useSetConnected,
	useSetCurrentPlayer,
	useSetError,
	useSetGameActions,
	useSetGameState,
	useSetSpectatorMode,
} from "./game-selectors";

// Sort Hand Utility
export { sortHand } from "./sort-hand";
