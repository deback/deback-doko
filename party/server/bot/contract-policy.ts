import type { ContractType, GameState } from "../../types";
import { countCardsBySuit, getBotHand, hasBothClubsQueens } from "./legal-view";

type SpecialContract = Exclude<ContractType, "normal">;

const SUIT_SOLO_PRIORITY: Array<{
	suit: "clubs" | "spades" | "hearts" | "diamonds";
	contract: SpecialContract;
}> = [
	{ suit: "clubs", contract: "solo-clubs" },
	{ suit: "spades", contract: "solo-spades" },
	{ suit: "hearts", contract: "solo-hearts" },
	{ suit: "diamonds", contract: "solo-diamonds" },
];

export function getPreferredSpecialContract(
	gameState: GameState,
	playerId: string,
): SpecialContract | null {
	const hand = getBotHand(gameState, playerId);

	if (hasBothClubsQueens(hand)) {
		return "hochzeit";
	}

	const suits = countCardsBySuit(hand);
	for (const { suit, contract } of SUIT_SOLO_PRIORITY) {
		if (suits[suit] >= 8) {
			return contract;
		}
	}

	const queens = hand.filter((card) => card.rank === "queen").length;
	if (queens >= 5) return "solo-queens";

	const jacks = hand.filter((card) => card.rank === "jack").length;
	if (jacks >= 5) return "solo-jacks";

	const aces = hand.filter((card) => card.rank === "ace").length;
	if (aces >= 6) return "solo-aces";

	return null;
}

export function hasSpecialContract(
	gameState: GameState,
	playerId: string,
): boolean {
	return getPreferredSpecialContract(gameState, playerId) !== null;
}

export function getEmergencySpecialContract(
	gameState: GameState,
	playerId: string,
): SpecialContract {
	const preferred = getPreferredSpecialContract(gameState, playerId);
	if (preferred) return preferred;

	const hand = getBotHand(gameState, playerId);
	const suits = countCardsBySuit(hand);

	const firstSuit = SUIT_SOLO_PRIORITY[0];
	if (!firstSuit) return "solo-clubs";

	let bestSuit = firstSuit;
	let bestCount = suits[bestSuit.suit];

	for (const currentSuit of SUIT_SOLO_PRIORITY.slice(1)) {
		const currentCount = suits[currentSuit.suit];
		if (currentCount > bestCount) {
			bestSuit = currentSuit;
			bestCount = currentCount;
		}
	}

	return bestSuit.contract;
}
