import { canMakeAnnouncement } from "../../announcements";
import type {
	AnnouncementType,
	ContractType,
	GameState,
	PointAnnouncementType,
	ReservationType,
} from "../../types";
import {
	chooseCheapestWinningCard,
	chooseLowestRiskCard,
	countCardsBySuit,
	estimateHandStrength,
	getBotHand,
	getBotPlayableCards,
	hasBothClubsQueens,
	isCurrentTrickWonByTeam,
} from "./legal-view";
import type { BotDecision } from "./types";

function decideBid(gameState: GameState, playerId: string): ReservationType {
	const hand = getBotHand(gameState, playerId);
	const strength = estimateHandStrength(gameState, hand);
	if (hasBothClubsQueens(hand)) return "vorbehalt";
	if (strength >= 70) return "vorbehalt";
	return "gesund";
}

function decideContract(gameState: GameState, playerId: string): ContractType {
	const hand = getBotHand(gameState, playerId);
	if (hasBothClubsQueens(hand)) {
		return "hochzeit";
	}

	const suits = countCardsBySuit(hand);
	const suitOrder: Array<{
		suit: "clubs" | "spades" | "hearts" | "diamonds";
		contract: ContractType;
	}> = [
		{ suit: "clubs", contract: "solo-clubs" },
		{ suit: "spades", contract: "solo-spades" },
		{ suit: "hearts", contract: "solo-hearts" },
		{ suit: "diamonds", contract: "solo-diamonds" },
	];

	for (const { suit, contract } of suitOrder) {
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

	return "normal";
}

function decideAnnouncement(
	gameState: GameState,
	playerId: string,
): BotDecision | null {
	if (gameState.biddingPhase?.active) return null;

	const team = gameState.teams[playerId];
	if (!team) return null;

	const hand = getBotHand(gameState, playerId);
	const strength = estimateHandStrength(gameState, hand);
	const baseAnnouncement: AnnouncementType = team === "re" ? "re" : "kontra";
	const teamAnnouncement =
		team === "re" ? gameState.announcements.re : gameState.announcements.kontra;

	if (!teamAnnouncement.announced && strength >= 64) {
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

	const thresholds: Array<{
		type: PointAnnouncementType;
		minStrength: number;
	}> = [
		{ type: "no90", minStrength: 78 },
		{ type: "no60", minStrength: 88 },
		{ type: "no30", minStrength: 96 },
		{ type: "schwarz", minStrength: 104 },
	];

	for (const threshold of thresholds) {
		if (strength < threshold.minStrength) continue;
		const validation = canMakeAnnouncement(gameState, playerId, threshold.type);
		if (!validation.allowed) continue;
		return {
			type: "announce",
			announcement: threshold.type,
			reasonCode: `announcement.${threshold.type}.safe-threshold`,
		};
	}

	return null;
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
			const contract = decideContract(gameState, playerId);
			return {
				type: "declare-contract",
				contract,
				reasonCode:
					contract === "normal"
						? "contract.default-normal"
						: `contract.conservative.${contract}`,
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
