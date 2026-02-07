/**
 * Stores - Re-exports
 */

// Game Selectors
export {
	// Action Hooks
	useAnnounce,
	useAutoPlay,
	useBid,
	// Basis-Selektoren
	useCurrentPlayer,
	useDeclareContract,
	useError,
	useGameState,
	// Abgeleitete Selektoren
	useHasPlayerPlayedInTrick,
	useHasTrickStarted,
	useIsBiddingActive,
	useIsConnected,
	useIsMyTurn,
	useIsSpectator,
	useMyHand,
	useMyTeam,
	usePlayableCardIds,
	usePlayCard,
	usePlayerAnnouncements,
	usePlayerAtPosition,
	useResetGame,
	useSchweinereiPlayerId,
	// Store Setter Hooks
	useSetConnected,
	useSetCurrentPlayer,
	useSetError,
	useSetGameActions,
	useSetGameState,
	useSetSpectatorMode,
	useSortedHand,
} from "./game-selectors";
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

// Sort Hand Utility
export { sortHand } from "./sort-hand";
