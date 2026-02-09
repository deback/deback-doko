import { getTrickPoints, isTrump } from "../src/lib/game/rules";
import type { Card, Suit, Trick, TrumpMode } from "./types";

const SUIT_ORDER: Record<Suit, number> = {
	clubs: 4,
	spades: 3,
	hearts: 2,
	diamonds: 1,
};

export function determineTrickWinner(
	trick: Trick,
	trump: TrumpMode,
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
	// Gilt nur wenn Herz 10 Trumpf ist (Normalspiel + Farbsolo)
	if (
		isLastTrick &&
		trump !== "queens-only" &&
		trump !== "jacks-only" &&
		trump !== "none"
	) {
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
	trump: TrumpMode,
	playerId: string,
	schweinereiPlayers: string[],
): number {
	const cardIsTrump = isTrump(card, trump);
	const isLeadSuit = card.suit === leadSuit;

	if (cardIsTrump) {
		switch (trump) {
			case "none":
				// Sollte nie passieren (isTrump gibt false zurück)
				break;

			case "jacks-only":
				// Bubensolo: Nur Buben sind Trumpf
				if (card.rank === "jack") {
					return 900 + SUIT_ORDER[card.suit];
				}
				break;

			case "queens-only":
				// Damensolo: Nur Damen sind Trumpf
				if (card.rank === "queen") {
					return 1000 + SUIT_ORDER[card.suit];
				}
				break;

			case "jacks":
				// Normalspiel: Schweinerei, Herz 10, Damen, Buben, Karo
				if (
					card.suit === "diamonds" &&
					card.rank === "ace" &&
					schweinereiPlayers.includes(playerId)
				) {
					return 1200;
				}
				if (card.suit === "hearts" && card.rank === "10") return 1100;
				if (card.rank === "queen") {
					return 1000 + SUIT_ORDER[card.suit];
				}
				if (card.rank === "jack") {
					return 900 + SUIT_ORDER[card.suit];
				}
				if (card.suit === "diamonds") {
					if (card.rank === "ace") return 850;
					if (card.rank === "10") return 840;
					if (card.rank === "king") return 830;
					if (card.rank === "9") return 820;
				}
				break;

			default: {
				// Farbsolo (trump ist eine Suit)
				if (card.suit === "hearts" && card.rank === "10") return 1100;
				if (card.rank === "queen") {
					return 1000 + SUIT_ORDER[card.suit];
				}
				if (card.rank === "jack") {
					return 900 + SUIT_ORDER[card.suit];
				}
				// Karten der gewählten Trumpffarbe
				if (card.suit === trump) {
					if (card.rank === "ace") return 850;
					if (card.rank === "10") return 840;
					if (card.rank === "king") return 830;
					if (card.rank === "9") return 820;
				}
				break;
			}
		}
	}

	// Nicht-Trumpf / Angespieltefarbe
	if (isLeadSuit && !cardIsTrump) {
		if (trump === "jacks-only") {
			// Bubensolo Fehlfarben: A, 10, K, D, 9
			if (card.rank === "ace") return 800;
			if (card.rank === "10") return 700;
			if (card.rank === "king") return 600;
			if (card.rank === "queen") return 500;
			if (card.rank === "9") return 400;
		} else if (trump === "queens-only") {
			// Damensolo Fehlfarben: A, 10, K, B, 9
			if (card.rank === "ace") return 800;
			if (card.rank === "10") return 700;
			if (card.rank === "king") return 600;
			if (card.rank === "jack") return 500;
			if (card.rank === "9") return 400;
		} else if (trump === "none") {
			// Fleischloser Fehlfarben: A, 10, K, D, B, 9
			if (card.rank === "ace") return 800;
			if (card.rank === "10") return 700;
			if (card.rank === "king") return 600;
			if (card.rank === "queen") return 500;
			if (card.rank === "jack") return 400;
			if (card.rank === "9") return 300;
		} else {
			// Normalspiel / Farbsolo Fehlfarben: A, 10, K, 9
			if (card.rank === "ace") return 800;
			if (card.rank === "10") return 700;
			if (card.rank === "king") return 600;
			if (card.rank === "9") return 400;
		}
	}

	return 0;
}

export function calculateTrickPoints(trick: Trick): number {
	return getTrickPoints(trick);
}
