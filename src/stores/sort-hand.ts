/**
 * Hand Sorting Logic für Doppelkopf
 *
 * Extrahiert aus game-board.tsx für Wiederverwendung in Selektoren.
 */

import { isTrump } from "@/lib/game/rules";
import type { Card, Suit, TrumpMode } from "@/types/game";

// Fehlfarben-Sortierung: Kreuz, Herz, Pik, Karo
const SUIT_ORDER: Record<Suit, number> = {
	clubs: 1,
	hearts: 2,
	spades: 3,
	diamonds: 4,
};

// Trumpf-Hierarchie: Kreuz > Pik > Herz > Karo (höchster Wert = stärkster Trumpf)
const TRUMP_SUIT_ORDER: Record<Suit, number> = {
	clubs: 4,
	spades: 3,
	hearts: 2,
	diamonds: 1,
};

/**
 * Sortiert eine Hand nach Doppelkopf-Regeln:
 * 1. Trumpf zuerst (höchster zu niedrigster)
 * 2. Dann Fehlfarben (Kreuz, Herz, Pik, Karo)
 * 3. Innerhalb der Farbe nach Rang
 */
export function sortHand(
	hand: Card[],
	trump: TrumpMode,
	schweinereiPlayerId: string | null,
	playerId: string,
): Card[] {
	return [...hand].sort((a, b) => {
		const aIsTrump = isTrump(a, trump);
		const bIsTrump = isTrump(b, trump);

		// Trump cards come first
		if (aIsTrump && !bIsTrump) return -1;
		if (!aIsTrump && bIsTrump) return 1;

		if (aIsTrump && bIsTrump) {
			return (
				trumpValue(b, trump, schweinereiPlayerId, playerId) -
				trumpValue(a, trump, schweinereiPlayerId, playerId)
			);
		}

		// Nicht-Trumpf Sortierung
		if (a.suit !== b.suit) {
			return (SUIT_ORDER[a.suit] ?? 99) - (SUIT_ORDER[b.suit] ?? 99);
		}

		return sideRankOrder(a, trump) - sideRankOrder(b, trump);
	});
}

function trumpValue(
	card: Card,
	trump: TrumpMode,
	schweinereiPlayerId: string | null,
	playerId: string,
): number {
	const hasSchweinerei = schweinereiPlayerId === playerId;

	switch (trump) {
		case "none":
			return 0;

		case "jacks-only":
			// Bubensolo: Buben nach Farbe
			if (card.rank === "jack") {
				return 900 + (TRUMP_SUIT_ORDER[card.suit] ?? 0) * 10;
			}
			return 0;

		case "queens-only":
			// Damensolo: Damen nach Farbe
			if (card.rank === "queen") {
				return 1000 + (TRUMP_SUIT_ORDER[card.suit] ?? 0) * 10;
			}
			return 0;

		case "jacks":
			// Normalspiel: Schweinerei, Herz 10, Damen, Buben, Karo
			if (card.suit === "diamonds" && card.rank === "ace" && hasSchweinerei)
				return 1200;
			if (card.suit === "hearts" && card.rank === "10") return 1100;
			if (card.rank === "queen") {
				if (card.suit === "clubs") return 1040;
				if (card.suit === "spades") return 1030;
				if (card.suit === "hearts") return 1020;
				if (card.suit === "diamonds") return 1010;
			}
			if (card.rank === "jack") {
				if (card.suit === "clubs") return 940;
				if (card.suit === "spades") return 930;
				if (card.suit === "hearts") return 920;
				if (card.suit === "diamonds") return 910;
			}
			if (card.suit === "diamonds") {
				if (card.rank === "ace") return 850;
				if (card.rank === "10") return 840;
				if (card.rank === "king") return 830;
				if (card.rank === "9") return 820;
			}
			return 0;

		default: {
			// Farbsolo (trump ist eine Suit)
			if (card.suit === "hearts" && card.rank === "10") return 1100;
			if (card.rank === "queen") {
				if (card.suit === "clubs") return 1040;
				if (card.suit === "spades") return 1030;
				if (card.suit === "hearts") return 1020;
				if (card.suit === "diamonds") return 1010;
			}
			if (card.rank === "jack") {
				if (card.suit === "clubs") return 940;
				if (card.suit === "spades") return 930;
				if (card.suit === "hearts") return 920;
				if (card.suit === "diamonds") return 910;
			}
			// Karten der gewählten Trumpffarbe
			if (card.suit === trump) {
				if (card.rank === "ace") return 850;
				if (card.rank === "10") return 840;
				if (card.rank === "king") return 830;
				if (card.rank === "9") return 820;
			}
			return 0;
		}
	}
}

/**
 * Rang-Reihenfolge für Fehlfarben (je nach Spielmodus)
 */
function sideRankOrder(card: Card, trump: TrumpMode): number {
	if (trump === "jacks-only") {
		// Bubensolo: A, 10, K, D, 9 (Buben sind Trumpf, Damen in Fehlfarbe)
		const order: Record<string, number> = {
			ace: 1,
			"10": 2,
			king: 3,
			queen: 4,
			"9": 5,
		};
		return order[card.rank] ?? 99;
	}
	if (trump === "queens-only") {
		// Damensolo: A, 10, K, B, 9 (Damen sind Trumpf, Buben in Fehlfarbe)
		const order: Record<string, number> = {
			ace: 1,
			"10": 2,
			king: 3,
			jack: 4,
			"9": 5,
		};
		return order[card.rank] ?? 99;
	}
	if (trump === "none") {
		// Fleischloser: A, 10, K, D, B, 9
		const order: Record<string, number> = {
			ace: 1,
			"10": 2,
			king: 3,
			queen: 4,
			jack: 5,
			"9": 6,
		};
		return order[card.rank] ?? 99;
	}
	// Normalspiel / Farbsolo: A, 10, K, 9
	const order: Record<string, number> = {
		ace: 1,
		"10": 2,
		king: 3,
		"9": 4,
	};
	return order[card.rank] ?? 99;
}
