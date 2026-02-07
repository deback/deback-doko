/**
 * Hand Sorting Logic für Doppelkopf
 *
 * Extrahiert aus game-board.tsx für Wiederverwendung in Selektoren.
 */

import { isTrump } from "@/lib/game/rules";
import type { Card, Suit } from "@/types/game";

/**
 * Sortiert eine Hand nach Doppelkopf-Regeln:
 * 1. Trumpf zuerst (höchster zu niedrigster)
 * 2. Dann Fehlfarben (Kreuz, Herz, Pik, Karo)
 * 3. Innerhalb der Farbe: Ass, 10, König, Bube, Dame, 9
 */
export function sortHand(
	hand: Card[],
	trump: Suit | "jacks" | "queens",
	schweinereiPlayerId: string | null,
	playerId: string,
): Card[] {
	return [...hand].sort((a, b) => {
		const aIsHearts10 = a.suit === "hearts" && a.rank === "10";
		const bIsHearts10 = b.suit === "hearts" && b.rank === "10";
		const aIsTrump = isTrump(a, trump);
		const bIsTrump = isTrump(b, trump);

		// Trump cards come first
		if (aIsTrump && !bIsTrump) return -1;
		if (!aIsTrump && bIsTrump) return 1;

		if (aIsTrump && bIsTrump) {
			// Schweinerei
			const hasSchweinerei = schweinereiPlayerId === playerId;
			const aIsSchweinerei =
				a.suit === "diamonds" && a.rank === "ace" && hasSchweinerei;
			const bIsSchweinerei =
				b.suit === "diamonds" && b.rank === "ace" && hasSchweinerei;

			if (aIsSchweinerei && !bIsSchweinerei) return -1;
			if (!aIsSchweinerei && bIsSchweinerei) return 1;

			// Herz 10 ist höchster Trumpf
			if (aIsHearts10 && !bIsHearts10 && !bIsSchweinerei) return -1;
			if (!aIsHearts10 && bIsHearts10 && !aIsSchweinerei) return 1;

			// Trump value sorting - Doppelkopf Reihenfolge
			const trumpValue = (card: Card): number => {
				// Schweinerei (beide Karo-Asse) sind höchster Trumpf
				if (card.suit === "diamonds" && card.rank === "ace" && hasSchweinerei)
					return 1200;
				// Herz 10 (Dulle) ist zweithöchster Trumpf
				if (card.suit === "hearts" && card.rank === "10") return 1100;

				// Damen nach Farbe: Kreuz > Pik > Herz > Karo
				if (card.rank === "queen") {
					if (card.suit === "clubs") return 1040;
					if (card.suit === "spades") return 1030;
					if (card.suit === "hearts") return 1020;
					if (card.suit === "diamonds") return 1010;
				}

				// Buben nach Farbe: Kreuz > Pik > Herz > Karo
				if (card.rank === "jack") {
					if (card.suit === "clubs") return 940;
					if (card.suit === "spades") return 930;
					if (card.suit === "hearts") return 920;
					if (card.suit === "diamonds") return 910;
				}

				// Karo-Karten (restlicher Trumpf)
				if (card.suit === "diamonds") {
					if (card.rank === "ace") return 850;
					if (card.rank === "10") return 840;
					if (card.rank === "king") return 830;
					if (card.rank === "9") return 820;
				}
				return 0;
			};

			return trumpValue(b) - trumpValue(a);
		}

		// Nicht-Trumpf Sortierung
		const suitOrder: Record<Suit, number> = {
			clubs: 1,
			hearts: 2,
			spades: 3,
			diamonds: 4,
		};

		if (a.suit !== b.suit) {
			return (suitOrder[a.suit] ?? 99) - (suitOrder[b.suit] ?? 99);
		}

		const rankOrder: Record<string, number> = {
			ace: 1,
			"10": 2,
			king: 3,
			jack: 4,
			queen: 5,
			"9": 6,
		};

		return (rankOrder[a.rank] ?? 99) - (rankOrder[b.rank] ?? 99);
	});
}
