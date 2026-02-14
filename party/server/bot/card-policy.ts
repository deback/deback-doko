import { getCardPoints, isTrump } from "../../../src/lib/game/rules";
import { determineTrickWinner } from "../../trick-scoring";
import type { Card, GameState, Suit } from "../../types";
import {
	chooseCheapestWinningCard,
	chooseLowestRiskCard,
	getBotPlayableCards,
} from "./legal-view";
import {
	buildTacticalSnapshot,
	isAlte,
	isDulle,
	type TacticalSnapshot,
} from "./tactical-view";
import type { BotDecision } from "./types";

const BLACK_SUIT_BONUS: Record<Suit, number> = {
	clubs: 12,
	spades: 10,
	hearts: -6,
	diamonds: 0,
};

function simulateWinner(
	gameState: GameState,
	playerId: string,
	card: Card,
): string | undefined {
	const simulatedTrick = {
		...gameState.currentTrick,
		cards: [...gameState.currentTrick.cards, { card, playerId }],
	};
	const winner = determineTrickWinner(
		simulatedTrick,
		gameState.trump,
		gameState.schweinereiPlayers,
		gameState.completedTricks.length === 11,
	);
	return winner || undefined;
}

function applyHardFilters(
	gameState: GameState,
	playerId: string,
	cards: Card[],
	snapshot: TacticalSnapshot,
): { cards: Card[]; reason?: string } {
	let filtered = cards.slice();
	let reason: string | undefined;

	// Partnerstich schützen: wenn Partner aktuell sicher führt, nicht übernehmen,
	// sofern eine legale Alternative existiert.
	if (
		gameState.currentTrick.cards.length > 0 &&
		snapshot.currentWinningPlayerId &&
		snapshot.currentWinningPlayerId !== playerId &&
		snapshot.team &&
		gameState.teams[snapshot.currentWinningPlayerId] === snapshot.team
	) {
		const nonOvertaking = filtered.filter(
			(card) => simulateWinner(gameState, playerId, card) !== playerId,
		);
		if (nonOvertaking.length > 0) {
			filtered = nonOvertaking;
			reason = "play-card.rule.partner-protect";
		}
	}

	// Kontra spielt Dulle nicht vor.
	if (gameState.currentTrick.cards.length === 0 && snapshot.team === "kontra") {
		const alternatives = filtered.filter((card) => !isDulle(card));
		if (alternatives.length > 0 && alternatives.length !== filtered.length) {
			filtered = alternatives;
			reason ??= "play-card.rule.avoid-kontra-dulle-lead";
		}
	}

	// Keine Alte an Position 2 in Trumpfstich, wenn ein anderer Trumpf legal ist.
	if (gameState.currentTrick.cards.length === 1) {
		const leadCard = gameState.currentTrick.cards[0]?.card;
		if (leadCard && isTrump(leadCard, gameState.trump)) {
			const hasAlternativeTrump = filtered.some(
				(card) => isTrump(card, gameState.trump) && !isAlte(card),
			);
			if (hasAlternativeTrump) {
				const nonAlteTrump = filtered.filter(
					(card) => !(isTrump(card, gameState.trump) && isAlte(card)),
				);
				if (nonAlteTrump.length > 0) {
					filtered = nonAlteTrump;
					reason ??= "play-card.rule.avoid-alte-pos2";
				}
			}
		}
	}

	// Dulle nicht zum bloßen Vollmachen/Doko, wenn billiger Gewinner existiert.
	if (gameState.currentTrick.cards.length > 0) {
		const dulleWouldWin = filtered.some(
			(card) =>
				isDulle(card) && simulateWinner(gameState, playerId, card) === playerId,
		);
		const cheaperWinnerExists = filtered.some(
			(card) =>
				!isDulle(card) &&
				simulateWinner(gameState, playerId, card) === playerId,
		);
		if (dulleWouldWin && cheaperWinnerExists) {
			const withoutDulle = filtered.filter((card) => !isDulle(card));
			if (withoutDulle.length > 0) {
				filtered = withoutDulle;
				reason ??= "play-card.rule.save-dulle";
			}
		}
	}

	return { cards: filtered, reason };
}

function shouldLeadTrump(snapshot: TacticalSnapshot): boolean {
	return (
		snapshot.handProfile.trumpCount >= 8 ||
		(snapshot.handProfile.trumpCount >= 7 &&
			snapshot.handProfile.freeSuits >= 1)
	);
}

function chooseFehlAceLead(
	gameState: GameState,
	cards: Card[],
	snapshot: TacticalSnapshot,
): Card | undefined {
	const aceLeads = cards.filter(
		(card) => card.rank === "ace" && !isTrump(card, gameState.trump),
	);
	if (aceLeads.length === 0) return undefined;

	const singleAceSuitSet = new Set(snapshot.handProfile.singleAceSuits);
	const scored = aceLeads.map((card) => {
		const singleAceBonus = singleAceSuitSet.has(card.suit) ? 80 : 20;
		const outside = snapshot.suitOutsideEstimate[card.suit] ?? 0;
		const colorBonus = BLACK_SUIT_BONUS[card.suit];
		return {
			card,
			score: singleAceBonus + outside * 5 + colorBonus,
		};
	});

	scored.sort((left, right) => right.score - left.score);
	const topScore = scored[0]?.score;
	if (topScore === undefined) return undefined;
	const bestCards = scored
		.filter((entry) => entry.score === topScore)
		.map((entry) => entry.card);
	return chooseLowestRiskCard(gameState, bestCards);
}

function chooseKontraSmearCard(
	gameState: GameState,
	cards: Card[],
): Card | undefined {
	const sorted = cards.slice().sort((left, right) => {
		const pointDiff = getCardPoints(right) - getCardPoints(left);
		if (pointDiff !== 0) return pointDiff;

		const leftTrump = isTrump(left, gameState.trump);
		const rightTrump = isTrump(right, gameState.trump);
		if (leftTrump !== rightTrump) {
			return Number(leftTrump) - Number(rightTrump);
		}
		return left.id.localeCompare(right.id);
	});
	return sorted[0];
}

function chooseLeadCard(
	gameState: GameState,
	cards: Card[],
	snapshot: TacticalSnapshot,
): { card?: Card; reason: string } {
	const aceLead = chooseFehlAceLead(gameState, cards, snapshot);
	if (aceLead) {
		return { card: aceLead, reason: "play-card.rule.fehl-priority" };
	}

	const leadTrump = shouldLeadTrump(snapshot);
	if (leadTrump) {
		const trumps = cards.filter((card) => isTrump(card, gameState.trump));
		if (trumps.length > 0) {
			return {
				card: chooseLowestRiskCard(gameState, trumps),
				reason: "play-card.rule.trump-from-strength",
			};
		}
	}

	const nonTrumpCards = cards.filter((card) => !isTrump(card, gameState.trump));
	if (nonTrumpCards.length > 0) {
		return {
			card: chooseLowestRiskCard(gameState, nonTrumpCards),
			reason: "play-card.rule.fehl-priority",
		};
	}

	return {
		card: chooseLowestRiskCard(gameState, cards),
		reason: "play-card.rule.default-low-risk",
	};
}

function chooseBySituation(
	gameState: GameState,
	playerId: string,
	cards: Card[],
	snapshot: TacticalSnapshot,
): { card?: Card; reason: string } {
	if (gameState.currentTrick.cards.length === 0) {
		return chooseLeadCard(gameState, cards, snapshot);
	}

	if (
		snapshot.teamCurrentlyWinning &&
		snapshot.currentWinningPlayerId &&
		snapshot.currentWinningPlayerId !== playerId
	) {
		if (snapshot.team === "kontra") {
			return {
				card: chooseKontraSmearCard(gameState, cards),
				reason: "play-card.rule.kontra-smear",
			};
		}
		return {
			card: chooseLowestRiskCard(gameState, cards),
			reason: "play-card.rule.re-hold-points",
		};
	}

	if (gameState.currentTrick.cards.length === 1) {
		return {
			card: chooseLowestRiskCard(gameState, cards),
			reason: "play-card.rule.second-hand-small",
		};
	}

	const winningCard = chooseCheapestWinningCard(gameState, playerId, cards);
	if (winningCard && snapshot.trickPoints >= 8) {
		return {
			card: winningCard,
			reason: "play-card.rule.capture-cheapest-winner",
		};
	}

	return {
		card: chooseLowestRiskCard(gameState, cards),
		reason: "play-card.rule.default-low-risk",
	};
}

export function decideCardAction(
	gameState: GameState,
	playerId: string,
): BotDecision | null {
	const playableCards = getBotPlayableCards(gameState, playerId);
	if (playableCards.length === 0) return null;

	const snapshot = buildTacticalSnapshot(gameState, playerId, playableCards);
	const filtered = applyHardFilters(
		gameState,
		playerId,
		playableCards,
		snapshot,
	);
	const strategy = chooseBySituation(
		gameState,
		playerId,
		filtered.cards,
		snapshot,
	);
	if (!strategy.card) return null;

	return {
		type: "play-card",
		cardId: strategy.card.id,
		reasonCode: filtered.reason ?? strategy.reason,
	};
}
