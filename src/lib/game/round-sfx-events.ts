import type { GameState } from "@/types/game";

export interface RoundSfxEvent {
	roundId: string;
}

function hasDistributedHands(state: GameState): boolean {
	if (state.players.length === 0) return false;

	return state.players.every((player) => {
		const count = state.handCounts[player.id] ?? 0;
		return count > 0;
	});
}

export function getRoundSfxEvent(
	prevState: GameState | null,
	nextState: GameState,
): RoundSfxEvent | null {
	if (!prevState) return null;
	if (!nextState.gameStarted) return null;
	if (!hasDistributedHands(nextState)) return null;

	const startedNow = !prevState.gameStarted && nextState.gameStarted;
	const roundAdvanced = nextState.round > prevState.round;

	if (!startedNow && !roundAdvanced) return null;

	return {
		roundId: `${nextState.id}-r${nextState.round}`,
	};
}
