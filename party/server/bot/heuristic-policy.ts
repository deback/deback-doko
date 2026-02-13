import { canMakeAnnouncement } from "../../announcements";
import type {
	AnnouncementType,
	GameState,
	PointAnnouncementType,
	ReservationType,
} from "../../types";
import {
	getEmergencySpecialContract,
	getPreferredSpecialContract,
	hasSpecialContract,
} from "./contract-policy";
import {
	chooseCheapestWinningCard,
	chooseLowestRiskCard,
	estimateHandStrength,
	getBotHand,
	getBotPlayableCards,
	isCurrentTrickWonByTeam,
} from "./legal-view";
import type { BotDecision } from "./types";

function decideBid(gameState: GameState, playerId: string): ReservationType {
	return hasSpecialContract(gameState, playerId) ? "vorbehalt" : "gesund";
}

function decideAnnouncement(
	gameState: GameState,
	playerId: string,
): BotDecision | null {
	if (gameState.biddingPhase?.active) return null;

	const team = gameState.teams[playerId];
	if (!team) return null;

	const hand = getBotHand(gameState, playerId);
	const cardCount = hand.length;
	const strength = estimateHandStrength(gameState, hand);
	const baseAnnouncement: AnnouncementType = team === "re" ? "re" : "kontra";
	const teamAnnouncement =
		team === "re" ? gameState.announcements.re : gameState.announcements.kontra;

	if (!teamAnnouncement.announced && strength >= 86) {
		const validation = canMakeAnnouncement(
			gameState,
			playerId,
			baseAnnouncement,
		);
		if (validation.allowed) {
			return {
				type: "announce",
				announcement: baseAnnouncement,
				reasonCode: "announcement.team.safe-threshold",
			};
		}
	}

	if (!teamAnnouncement.announced) return null;

	const teamPointAnnouncements =
		team === "re"
			? gameState.announcements.rePointAnnouncements
			: gameState.announcements.kontraPointAnnouncements;

	const thresholds: Array<{
		type: PointAnnouncementType;
		requiredCardCount: number;
		minStrength: number;
	}> = [
		{ type: "no90", requiredCardCount: 10, minStrength: 110 },
		{ type: "no60", requiredCardCount: 9, minStrength: 122 },
		{ type: "no30", requiredCardCount: 8, minStrength: 134 },
		{ type: "schwarz", requiredCardCount: 7, minStrength: 146 },
	];

	const nextThreshold = thresholds.find(
		(threshold) =>
			!teamPointAnnouncements.some(
				(announcement) => announcement.type === threshold.type,
			),
	);
	if (!nextThreshold) return null;
	if (cardCount !== nextThreshold.requiredCardCount) return null;
	if (strength < nextThreshold.minStrength) return null;

	const validation = canMakeAnnouncement(
		gameState,
		playerId,
		nextThreshold.type,
	);
	if (!validation.allowed) return null;

	return {
		type: "announce",
		announcement: nextThreshold.type,
		reasonCode: `announcement.${nextThreshold.type}.safe-threshold`,
	};
}

function decideCard(
	gameState: GameState,
	playerId: string,
): BotDecision | null {
	const playableCards = getBotPlayableCards(gameState, playerId);
	if (playableCards.length === 0) return null;

	const trickPoints = gameState.currentTrick.cards.reduce(
		(sum, entry) =>
			sum +
			(entry.card.rank === "ace"
				? 11
				: entry.card.rank === "10"
					? 10
					: entry.card.rank === "king"
						? 4
						: entry.card.rank === "queen"
							? 3
							: entry.card.rank === "jack"
								? 2
								: 0),
		0,
	);

	const teamAlreadyWinning = isCurrentTrickWonByTeam(gameState, playerId);
	if (teamAlreadyWinning && gameState.currentTrick.cards.length > 0) {
		const lowRisk = chooseLowestRiskCard(gameState, playableCards);
		if (!lowRisk) return null;
		return {
			type: "play-card",
			cardId: lowRisk.id,
			reasonCode: "play-card.team-already-winning.dump-low-risk",
		};
	}

	const winningCard = chooseCheapestWinningCard(
		gameState,
		playerId,
		playableCards,
	);
	if (winningCard && trickPoints >= 8) {
		return {
			type: "play-card",
			cardId: winningCard.id,
			reasonCode: "play-card.capture-with-cheapest-winner",
		};
	}

	const lowRisk = chooseLowestRiskCard(gameState, playableCards);
	if (!lowRisk) return null;

	return {
		type: "play-card",
		cardId: lowRisk.id,
		reasonCode: "play-card.default-low-risk",
	};
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

	const announcementDecision = decideAnnouncement(gameState, playerId);
	if (announcementDecision) return announcementDecision;

	return decideCard(gameState, playerId);
}
