import type { GameState, ReservationType } from "../../types";
import { decideAnnouncementAction } from "./announcement-policy";
import { decideCardAction } from "./card-policy";
import {
	getEmergencySpecialContract,
	getPreferredSpecialContract,
	hasSpecialContract,
} from "./contract-policy";
import type { BotDecision } from "./types";

function decideBid(gameState: GameState, playerId: string): ReservationType {
	return hasSpecialContract(gameState, playerId) ? "vorbehalt" : "gesund";
}

export function decideBotAction(
	gameState: GameState,
	playerId: string,
): BotDecision | null {
	if (gameState.gameEnded || !gameState.gameStarted) return null;

	if (gameState.biddingPhase?.active) {
		const awaiting = gameState.biddingPhase.awaitingContractDeclaration ?? [];
		if (awaiting.includes(playerId)) {
			const contract =
				getPreferredSpecialContract(gameState, playerId) ??
				getEmergencySpecialContract(gameState, playerId);
			return {
				type: "declare-contract",
				contract,
				reasonCode: `contract.conservative.${contract}`,
			};
		}

		const currentBidder =
			gameState.players[gameState.biddingPhase.currentBidderIndex];
		if (currentBidder?.id !== playerId) return null;

		const bid = decideBid(gameState, playerId);
		return {
			type: "bid",
			bid,
			reasonCode:
				bid === "vorbehalt"
					? "bid.conservative.vorbehalt-threshold"
					: "bid.default.gesund",
		};
	}

	const currentPlayer = gameState.players[gameState.currentPlayerIndex];
	if (currentPlayer?.id !== playerId) return null;

	const announcementDecision = decideAnnouncementAction(gameState, playerId);
	if (announcementDecision) return announcementDecision;

	return decideCardAction(gameState, playerId);
}
