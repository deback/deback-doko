import type { GameState } from "../../types";
import { getEmergencySpecialContract } from "./contract-policy";
import { chooseLowestRiskCard, getBotPlayableCards } from "./legal-view";
import type { BotDecision } from "./types";

export function decideFallbackBotAction(
	gameState: GameState,
	playerId: string,
): BotDecision | null {
	if (gameState.biddingPhase?.active) {
		const awaiting = gameState.biddingPhase.awaitingContractDeclaration ?? [];
		if (awaiting.includes(playerId)) {
			return {
				type: "declare-contract",
				contract: getEmergencySpecialContract(gameState, playerId),
				reasonCode: "fallback.contract.emergency-special",
			};
		}

		const currentBidder =
			gameState.players[gameState.biddingPhase.currentBidderIndex];
		if (currentBidder?.id === playerId) {
			return {
				type: "bid",
				bid: "gesund",
				reasonCode: "fallback.bid.gesund",
			};
		}
		return null;
	}

	const currentPlayer = gameState.players[gameState.currentPlayerIndex];
	if (currentPlayer?.id !== playerId) return null;

	const playableCards = getBotPlayableCards(gameState, playerId);
	const firstLegal = chooseLowestRiskCard(gameState, playableCards);
	if (!firstLegal) return null;

	return {
		type: "play-card",
		cardId: firstLegal.id,
		reasonCode: "fallback.play-card.first-legal",
	};
}
