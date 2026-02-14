import { getOwnCardsPlayed } from "../../../src/lib/game/announcement-windows";
import { getCardPoints, isTrump } from "../../../src/lib/game/rules";
import { determineTrickWinner } from "../../trick-scoring";
import type { Card, GameState, Rank, Suit } from "../../types";
import { getBotHand, getBotPlayableCards } from "./legal-view";

const SUITS: Suit[] = ["clubs", "spades", "hearts", "diamonds"];
const RANKS: Rank[] = ["9", "10", "jack", "queen", "king", "ace"];

export interface BotHandProfile {
	trumpCount: number;
	highTrumpCount: number;
	dulleCount: number;
	alteCount: number;
	aceCount: number;
	singleAceSuits: Suit[];
	doubleAceSuits: Suit[];
	freeSuits: number;
	hasDoubleDulle: boolean;
	safePartnerSignal: boolean;
	hasStrongTrumpControl: boolean;
	suitCounts: Record<Suit, number>;
}

export interface TacticalSnapshot {
	playerId: string;
	team?: "re" | "kontra";
	hand: Card[];
	playableCards: Card[];
	handProfile: BotHandProfile;
	positionInTrick: 1 | 2 | 3 | 4;
	ownCardsPlayed: number;
	trickPoints: number;
	teamCurrentlyWinning: boolean;
	currentWinningPlayerId?: string;
	teamSecuredPoints: number;
	firstTrickSelfWinAtLeast25: boolean;
	suitOutsideEstimate: Record<Suit, number>;
}

export function isDulle(card: Card): boolean {
	return card.suit === "hearts" && card.rank === "10";
}

export function isAlte(card: Card): boolean {
	return card.suit === "clubs" && card.rank === "queen";
}

export function isHighTrumpCard(gameState: GameState, card: Card): boolean {
	return (
		isTrump(card, gameState.trump) && (isDulle(card) || card.rank === "queen")
	);
}

function buildSuitCounts(cards: Card[]): Record<Suit, number> {
	const suitCounts: Record<Suit, number> = {
		clubs: 0,
		spades: 0,
		hearts: 0,
		diamonds: 0,
	};
	for (const currentCard of cards) {
		suitCounts[currentCard.suit] += 1;
	}
	return suitCounts;
}

function collectSeenCards(gameState: GameState, hand: Card[]): Card[] {
	const completedCards = gameState.completedTricks.flatMap((trick) =>
		trick.cards.map((entry) => entry.card),
	);
	const currentTrickCards = gameState.currentTrick.cards.map(
		(entry) => entry.card,
	);
	return [...hand, ...completedCards, ...currentTrickCards];
}

function countSeenByCardKey(cards: Card[]): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const currentCard of cards) {
		const key = `${currentCard.suit}-${currentCard.rank}`;
		counts[key] = (counts[key] ?? 0) + 1;
	}
	return counts;
}

function getRemainingCopiesOutside(
	seenByCardKey: Record<string, number>,
	suit: Suit,
	rank: Rank,
): number {
	const seen = seenByCardKey[`${suit}-${rank}`] ?? 0;
	return Math.max(0, 2 - seen);
}

function getSuitOutsideEstimate(
	gameState: GameState,
	hand: Card[],
): Record<Suit, number> {
	const seenByCardKey = countSeenByCardKey(collectSeenCards(gameState, hand));
	const estimate: Record<Suit, number> = {
		clubs: 0,
		spades: 0,
		hearts: 0,
		diamonds: 0,
	};

	for (const currentSuit of SUITS) {
		let outsideCount = 0;
		for (const currentRank of RANKS) {
			const probe: Card = {
				id: `probe-${currentSuit}-${currentRank}`,
				suit: currentSuit,
				rank: currentRank,
			};
			if (isTrump(probe, gameState.trump)) continue;
			outsideCount += getRemainingCopiesOutside(
				seenByCardKey,
				currentSuit,
				currentRank,
			);
		}
		estimate[currentSuit] = outsideCount;
	}

	return estimate;
}

function buildHandProfile(gameState: GameState, hand: Card[]): BotHandProfile {
	const trumpCards = hand.filter((card) => isTrump(card, gameState.trump));
	const dulleCount = hand.filter(isDulle).length;
	const alteCount = hand.filter(isAlte).length;
	const highTrumpCount = hand.filter((card) =>
		isHighTrumpCard(gameState, card),
	).length;
	const aceCount = hand.filter((card) => card.rank === "ace").length;
	const suitCounts = buildSuitCounts(hand);

	const singleAceSuits: Suit[] = [];
	const doubleAceSuits: Suit[] = [];
	for (const currentSuit of SUITS) {
		const aceCountBySuit = hand.filter(
			(card) => card.suit === currentSuit && card.rank === "ace",
		).length;
		if (aceCountBySuit === 1) singleAceSuits.push(currentSuit);
		if (aceCountBySuit >= 2) doubleAceSuits.push(currentSuit);
	}

	const freeSuits = SUITS.filter(
		(currentSuit) => suitCounts[currentSuit] === 0,
	).length;

	return {
		trumpCount: trumpCards.length,
		highTrumpCount,
		dulleCount,
		alteCount,
		aceCount,
		singleAceSuits,
		doubleAceSuits,
		freeSuits,
		hasDoubleDulle: dulleCount >= 2,
		safePartnerSignal: highTrumpCount >= 3 && aceCount >= 1,
		hasStrongTrumpControl: trumpCards.length >= 8 && highTrumpCount >= 4,
		suitCounts,
	};
}

function resolveCurrentWinner(gameState: GameState): string | undefined {
	if (gameState.currentTrick.cards.length === 0) return undefined;
	const winner = determineTrickWinner(
		gameState.currentTrick,
		gameState.trump,
		gameState.schweinereiPlayers,
		gameState.completedTricks.length === 11,
	);
	return winner || undefined;
}

function getTrickPointsFromCardList(cards: Card[]): number {
	return cards.reduce((sum, card) => sum + getCardPoints(card), 0);
}

function getTeamSecuredPoints(
	gameState: GameState,
	team: "re" | "kontra",
): number {
	let points = 0;
	for (const trick of gameState.completedTricks) {
		if (!trick.winnerId) continue;
		if (gameState.teams[trick.winnerId] !== team) continue;
		points +=
			typeof trick.points === "number"
				? trick.points
				: getTrickPointsFromCardList(trick.cards.map((entry) => entry.card));
	}
	return points;
}

function didPlayerWinFirstTrickWithAtLeast25(
	gameState: GameState,
	playerId: string,
): boolean {
	const firstTrick = gameState.completedTricks[0];
	if (!firstTrick || firstTrick.winnerId !== playerId) return false;
	const points =
		typeof firstTrick.points === "number"
			? firstTrick.points
			: getTrickPointsFromCardList(firstTrick.cards.map((entry) => entry.card));
	return points >= 25;
}

export function buildTacticalSnapshot(
	gameState: GameState,
	playerId: string,
	playableCards?: Card[],
): TacticalSnapshot {
	const hand = getBotHand(gameState, playerId);
	const team = gameState.teams[playerId];
	const resolvedPlayableCards =
		playableCards ?? getBotPlayableCards(gameState, playerId);
	const currentWinningPlayerId = resolveCurrentWinner(gameState);
	const teamCurrentlyWinning = Boolean(
		currentWinningPlayerId &&
			team &&
			gameState.teams[currentWinningPlayerId] === team,
	);

	return {
		playerId,
		team,
		hand,
		playableCards: resolvedPlayableCards,
		handProfile: buildHandProfile(gameState, hand),
		positionInTrick: (gameState.currentTrick.cards.length + 1) as 1 | 2 | 3 | 4,
		ownCardsPlayed: getOwnCardsPlayed(gameState, playerId),
		trickPoints: getTrickPointsFromCardList(
			gameState.currentTrick.cards.map((entry) => entry.card),
		),
		teamCurrentlyWinning,
		currentWinningPlayerId,
		teamSecuredPoints: team ? getTeamSecuredPoints(gameState, team) : 0,
		firstTrickSelfWinAtLeast25: didPlayerWinFirstTrickWithAtLeast25(
			gameState,
			playerId,
		),
		suitOutsideEstimate: getSuitOutsideEstimate(gameState, hand),
	};
}
