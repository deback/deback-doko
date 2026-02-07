import type { Card, Suit, Trick } from "@/types/game";

/**
 * Prüft ob eine Karte Trumpf ist (Doppelkopf-Regeln)
 * - Herz 10 (Dulle) ist immer Trumpf
 * - Damen und Buben sind Trumpf
 * - Karo ist Trumpffarbe
 */
export function isTrump(
	card: Card,
	trump: Suit | "jacks" | "queens",
): boolean {
	// Herz 10 ist immer der höchste Trumpf
	if (card.suit === "hearts" && card.rank === "10") return true;

	if (trump === "jacks") {
		// Buben und Damen sind immer Trumpf, Karo ist auch Trumpf
		return (
			card.rank === "jack" || card.rank === "queen" || card.suit === "diamonds"
		);
	}
	if (trump === "queens") {
		return card.rank === "queen" || card.suit === "diamonds";
	}
	return card.suit === trump;
}

/**
 * Gibt spielbare Karten zurück (Bedienpflicht)
 * - Erste Karte im Stich: Alle Karten spielbar
 * - Trumpf angespielt: Muss Trumpf bedienen falls vorhanden
 * - Fehlfarbe angespielt: Muss Farbe bedienen falls vorhanden
 */
export function getPlayableCards(
	hand: Card[],
	currentTrick: Trick,
	trump: Suit | "jacks" | "queens",
): Card[] {
	// Erste Karte im Stich: Alle Karten spielbar
	if (currentTrick.cards.length === 0) {
		return hand;
	}

	const firstCard = currentTrick.cards[0]?.card;
	if (!firstCard) return hand;

	const firstCardIsTrump = isTrump(firstCard, trump);
	const leadSuit = firstCard.suit;

	if (firstCardIsTrump) {
		// Trumpf angespielt: Prüfe ob Spieler Trumpf hat
		const trumpCards = hand.filter((card) => isTrump(card, trump));
		if (trumpCards.length > 0) {
			return trumpCards;
		}
		// Keine Trumpf-Karten: Alle Karten spielbar
		return hand;
	}

	// Fehlfarbe angespielt: Prüfe ob Spieler diese Farbe hat
	const suitCards = hand.filter((card) => {
		// Nicht-Trumpf-Karten dieser Farbe
		return card.suit === leadSuit && !isTrump(card, trump);
	});
	if (suitCards.length > 0) {
		return suitCards;
	}
	// Keine passende Farbe: Alle Karten spielbar
	return hand;
}

/**
 * Punktwert einer Karte (Doppelkopf)
 * 9=0, Bube=2, Dame=3, König=4, 10=10, Ass=11
 * Gesamt im Spiel: 240 Punkte
 */
export function getCardPoints(card: Card): number {
	const points: Record<string, number> = {
		"9": 0,
		jack: 2,
		queen: 3,
		king: 4,
		"10": 10,
		ace: 11,
	};
	return points[card.rank] ?? 0;
}

/**
 * Prüft ob eine Karte gespielt werden darf
 */
export function canPlayCard(
	card: Card,
	hand: Card[],
	currentTrick: Trick,
	trump: Suit | "jacks" | "queens",
): boolean {
	const playableCards = getPlayableCards(hand, currentTrick, trump);
	return playableCards.some((c) => c.id === card.id);
}

/**
 * Berechnet die Gesamtpunkte eines Stichs
 */
export function getTrickPoints(trick: Trick): number {
	let totalPoints = 0;
	for (const cardEntry of trick.cards) {
		if (cardEntry.card) {
			totalPoints += getCardPoints(cardEntry.card);
		}
	}
	return totalPoints;
}
