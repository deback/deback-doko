import type { AnnouncementType, GameState } from "../../types/game";

const BASE_MIN_CARDS: Record<AnnouncementType, number> = {
	re: 11,
	kontra: 11,
	no90: 10,
	no60: 9,
	no30: 8,
	schwarz: 7,
};

function clampToAnnouncementScale(value: number): number {
	return Math.max(0, Math.min(12, value));
}

function getHochzeitWindowReduction(gameState: GameState): 0 | 1 | 2 {
	if (gameState.contractType !== "hochzeit") return 0;
	const resolved = gameState.hochzeit?.resolvedClarificationTrickNumber;
	if (resolved === 2) return 1;
	if (resolved === 3) return 2;
	return 0;
}

export function getOwnCardsPlayed(
	gameState: GameState,
	playerId: string,
): number {
	const handCount = gameState.hands[playerId]?.length ?? 0;
	const initialCount = gameState.initialHands?.[playerId]?.length ?? 12;
	return clampToAnnouncementScale(initialCount - handCount);
}

export function isAnnouncementBlockedByHochzeitWindow(
	gameState: GameState,
	announcement: AnnouncementType,
): boolean {
	if (gameState.contractType !== "hochzeit") return false;
	if (announcement !== "re" && announcement !== "kontra") return false;
	const hochzeit = gameState.hochzeit;
	if (!hochzeit) return false;
	return (
		hochzeit.active && hochzeit.resolvedClarificationTrickNumber === undefined
	);
}

export function canCounterWithOneLess(
	gameState: GameState,
	announcement: AnnouncementType,
): boolean {
	if (announcement === "re") {
		return (
			gameState.announcements.kontra.announced &&
			!gameState.announcements.re.announced
		);
	}
	if (announcement === "kontra") {
		return (
			gameState.announcements.re.announced &&
			!gameState.announcements.kontra.announced
		);
	}
	return false;
}

export function getBaseMinCardsForAnnouncement(
	announcement: AnnouncementType,
): number {
	return BASE_MIN_CARDS[announcement];
}

export function getAnnouncementMinCards(
	gameState: GameState,
	_playerId: string,
	announcement: AnnouncementType,
): number {
	if (isAnnouncementBlockedByHochzeitWindow(gameState, announcement)) {
		return Number.POSITIVE_INFINITY;
	}

	let minCards = getBaseMinCardsForAnnouncement(announcement);
	minCards -= getHochzeitWindowReduction(gameState);

	if (canCounterWithOneLess(gameState, announcement)) {
		minCards -= 1;
	}

	return Math.max(0, minCards);
}
