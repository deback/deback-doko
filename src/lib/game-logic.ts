// lib/game-logic.ts
import type { Card } from "@/types/game";

const SUIT_ORDER_TRUMP = { clubs: 4, spades: 3, hearts: 2, diamonds: 1 };
const RANK_ORDER_PLAIN = {
	ace: 1,
	"10": 2,
	king: 3,
	jack: 4,
	queen: 5,
	"9": 6,
};

export function sortDoppelkopfHand(
	cards: Card[],
	hasSchweinerei = false,
): Card[] {
	// 1. Schweinerei-Check (wenn nicht von außen übergeben, hier prüfen)
	const diamondsAces = cards.filter(
		(c) => c.suit === "diamonds" && c.rank === "ace",
	);
	const isSchweinchenActive = hasSchweinerei || diamondsAces.length === 2;

	return [...cards].sort((a, b) => {
		const valA = getCardValue(a, isSchweinchenActive);
		const valB = getCardValue(b, isSchweinchenActive);

		// Wenn Werte unterschiedlich sind -> sortieren
		if (valA !== valB) return valB - valA; // Höchster Wert zuerst

		// Wenn Werte gleich sind (z.B. zwei Herz 10en), ist die Reihenfolge technisch egal,
		// aber für UX sortieren wir nach ID oder Suit für Stabilität
		return a.suit.localeCompare(b.suit);
	});
}

function getCardValue(card: Card, isSchweinchen: boolean): number {
	// --- TRÜMPFE (Werte > 1000) ---

	// 1. Schweinerei (Karo Ass)
	if (isSchweinchen && card.suit === "diamonds" && card.rank === "ace")
		return 2000;

	// 2. Herz 10
	if (card.suit === "hearts" && card.rank === "10") return 1900;

	// 3. Damen (Kreuz > Pik > Herz > Karo)
	if (card.rank === "queen") return 1800 + SUIT_ORDER_TRUMP[card.suit];

	// 4. Buben (Kreuz > Pik > Herz > Karo)
	if (card.rank === "jack") return 1700 + SUIT_ORDER_TRUMP[card.suit];

	// 5. Karo (Ass bis 9, außer Schweinchen)
	if (card.suit === "diamonds") {
		// Karo Ass ist hier ein normaler Trumpf, wenn KEINE Schweinerei
		const rankVal = { ace: 4, king: 3, "10": 2, "9": 1 }[card.rank] || 0;
		return 1600 + rankVal;
	}

	// --- FEHLFARBEN (Werte < 1000) ---
	// Gruppierung nach Farbe (Kreuz=300, Herz=200, Pik=100)
	// Achtung: Karo ist hier nicht mehr dabei, da immer Trumpf
	// Wir nutzen negative Logik für "Sortierung innerhalb der Farbe"

	// Basis-Offset pro Farbe damit sie gruppiert bleiben
	const suitBase =
		{ clubs: 300, hearts: 200, spades: 100, diamonds: 0 }[card.suit] || 0;

	// Innerhalb der Farbe: Ass(1) ... 9(6). Wir wollen Ass zuerst.
	// Also invertieren wir den Rank-Order-Plain
	const rankVal = 10 - (RANK_ORDER_PLAIN[card.rank] || 0);

	return suitBase + rankVal;
}
