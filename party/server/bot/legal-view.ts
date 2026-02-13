import {
	getCardPoints,
	getPlayableCards,
	isTrump,
} from "../../../src/lib/game/rules";
import { determineTrickWinner } from "../../trick-scoring";
import type { Card, GameState, Suit, Trick } from "../../types";

const RANK_STRENGTH: Record<Card["rank"], number> = {
	ace: 6,
	"10": 5,
	king: 4,
	queen: 3,
	jack: 2,
	"9": 1,
};

export function getBotHand(gameState: GameState, playerId: string): Card[] {
	return gameState.hands[playerId] ?? [];
}

export function getBotPlayableCards(
	gameState: GameState,
	playerId: string,
): Card[] {
	const hand = getBotHand(gameState, playerId);
	return getPlayableCards(hand, gameState.currentTrick, gameState.trump);
}

export function hasBothClubsQueens(hand: Card[]): boolean {
	const clubsQueens = hand.filter(
		(card) => card.suit === "clubs" && card.rank === "queen",
	);
	return clubsQueens.length === 2;
}

export function countTrumpCards(gameState: GameState, hand: Card[]): number {
	return hand.filter((card) => isTrump(card, gameState.trump)).length;
}

export function countCardsBySuit(hand: Card[]): Record<Suit, number> {
	const counts: Record<Suit, number> = {
		hearts: 0,
		diamonds: 0,
		clubs: 0,
		spades: 0,
	};
	for (const card of hand) {
		counts[card.suit] += 1;
	}
	return counts;
}

export function estimateHandStrength(
	gameState: GameState,
	hand: Card[],
): number {
	const totalPoints = hand.reduce((sum, card) => sum + getCardPoints(card), 0);
	const trumpCount = countTrumpCards(gameState, hand);
	const aces = hand.filter((card) => card.rank === "ace").length;
	const tens = hand.filter((card) => card.rank === "10").length;
	const queens = hand.filter((card) => card.rank === "queen").length;
	const jacks = hand.filter((card) => card.rank === "jack").length;

	return (
		totalPoints +
		trumpCount * 2 +
		aces * 3 +
		tens * 2 +
		queens +
		jacks +
		(hasBothClubsQueens(hand) ? 8 : 0)
	);
}

function compareCardsByRisk(gameState: GameState, a: Card, b: Card): number {
	const pointsDiff = getCardPoints(a) - getCardPoints(b);
	if (pointsDiff !== 0) return pointsDiff;

	const trumpDiff =
		Number(isTrump(a, gameState.trump)) - Number(isTrump(b, gameState.trump));
	if (trumpDiff !== 0) return trumpDiff;

	const rankDiff = RANK_STRENGTH[a.rank] - RANK_STRENGTH[b.rank];
	if (rankDiff !== 0) return rankDiff;

	if (a.suit !== b.suit) {
		return a.suit.localeCompare(b.suit);
	}
	return a.id.localeCompare(b.id);
}

export function chooseLowestRiskCard(
	gameState: GameState,
	cards: Card[],
): Card | undefined {
	return cards.slice().sort((a, b) => compareCardsByRisk(gameState, a, b))[0];
}

function simulateTrickWinner(
	gameState: GameState,
	playerId: string,
	candidate: Card,
): string | undefined {
	const simulatedTrick: Trick = {
		...gameState.currentTrick,
		cards: [...gameState.currentTrick.cards, { card: candidate, playerId }],
	};

	return determineTrickWinner(
		simulatedTrick,
		gameState.trump,
		gameState.schweinereiPlayers,
		gameState.completedTricks.length === 11,
	);
}

export function chooseCheapestWinningCard(
	gameState: GameState,
	playerId: string,
	cards: Card[],
): Card | undefined {
	const winning = cards.filter(
		(card) => simulateTrickWinner(gameState, playerId, card) === playerId,
	);
	if (winning.length === 0) return undefined;
	return chooseLowestRiskCard(gameState, winning);
}

export function isCurrentTrickWonByTeam(
	gameState: GameState,
	playerId: string,
): boolean {
	if (gameState.currentTrick.cards.length === 0) return false;
	const currentWinner = determineTrickWinner(
		gameState.currentTrick,
		gameState.trump,
		gameState.schweinereiPlayers,
		gameState.completedTricks.length === 11,
	);
	if (!currentWinner) return false;
	return gameState.teams[currentWinner] === gameState.teams[playerId];
}
