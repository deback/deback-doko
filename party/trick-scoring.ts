import { getTrickPoints, isTrump } from "../src/lib/game/rules";
import type { Card, Suit, Trick } from "./types";

export function determineTrickWinner(
	trick: Trick,
	trump: Suit | "jacks" | "queens",
	schweinereiPlayers: string[],
	isLastTrick = false,
): string {
	if (trick.cards.length === 0) return "";

	const firstCardEntry = trick.cards[0];
	if (!firstCardEntry) return "";

	const firstCard = firstCardEntry.card;
	if (!firstCard) return firstCardEntry.playerId || "";

	const leadSuit = firstCard.suit;
	let winner = firstCardEntry;
	const firstPlayerId = firstCardEntry.playerId || "";
	let highestValue = getCardValue(
		firstCard,
		leadSuit,
		trump,
		firstPlayerId,
		schweinereiPlayers,
	);

	// Sonderregel für letzten Stich: Wenn beide Herz 10 sind, gewinnt die zweite
	if (isLastTrick) {
		const hearts10Cards = trick.cards.filter(
			(entry) => entry.card.suit === "hearts" && entry.card.rank === "10",
		);
		if (hearts10Cards.length === 2) {
			// Zweite Herz 10 gewinnt im letzten Stich
			return hearts10Cards[1]?.playerId || winner.playerId;
		}
	}

	for (let i = 1; i < trick.cards.length; i++) {
		const cardEntry = trick.cards[i];
		if (!cardEntry) continue;

		const playerId = cardEntry.playerId || "";
		const value = getCardValue(
			cardEntry.card,
			leadSuit,
			trump,
			playerId,
			schweinereiPlayers,
		);
		if (value > highestValue) {
			highestValue = value;
			winner = cardEntry;
		}
	}

	return winner.playerId;
}

export function getCardValue(
	card: Card,
	leadSuit: Suit,
	trump: Suit | "jacks" | "queens",
	playerId: string,
	schweinereiPlayers: string[],
): number {
	const cardIsTrump = isTrump(card, trump);
	const isLeadSuit = card.suit === leadSuit;

	if (cardIsTrump) {
		// Schweinerei: Karo-Assen sind höher als Herz 10, wenn Spieler beide hat
		if (
			card.suit === "diamonds" &&
			card.rank === "ace" &&
			schweinereiPlayers.includes(playerId)
		) {
			return 1200; // Höher als Herz 10 (1100)
		}
		// In Doppelkopf: Herz 10 ist höchster Trumpf, dann Damen, dann Buben, dann Karo
		if (card.suit === "hearts" && card.rank === "10") return 1100;
		if (card.rank === "queen") {
			const queenSuitOrder = { clubs: 4, spades: 3, hearts: 2, diamonds: 1 };
			return 1000 + queenSuitOrder[card.suit];
		}
		if (card.rank === "jack") {
			const jackSuitOrder = { clubs: 4, spades: 3, hearts: 2, diamonds: 1 };
			return 900 + jackSuitOrder[card.suit];
		}
		// Karo (Diamonds) ist auch Trumpf
		if (card.suit === "diamonds") {
			if (card.rank === "ace") return 850;
			if (card.rank === "king") return 840;
			if (card.rank === "10") return 830;
			if (card.rank === "9") return 820;
		}
	}

	if (isLeadSuit && !cardIsTrump) {
		if (card.rank === "ace") return 800;
		if (card.rank === "king") return 700;
		if (card.rank === "queen") return 600;
		if (card.rank === "10") return 500;
		if (card.rank === "9") return 400;
	}

	return 0;
}

export function calculateTrickPoints(trick: Trick): number {
	return getTrickPoints(trick);
}
