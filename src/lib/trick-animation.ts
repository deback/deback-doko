// Trick animation phase durations (ms)
export const TRICK_WAIT_DURATION = 2000;
export const TRICK_COLLECT_DURATION = 500;
export const TRICK_FLIP_DURATION = 400;
export const TRICK_TO_WINNER_DURATION = 600;

// Total trick animation delay — used by server to sync trick clearing
export const TRICK_ANIMATION_DELAY =
	TRICK_WAIT_DURATION +
	TRICK_COLLECT_DURATION +
	TRICK_FLIP_DURATION +
	TRICK_TO_WINNER_DURATION;
