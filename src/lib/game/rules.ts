import type { Card, ContractType, Trick, TrumpMode } from "@/types/game";

/**
 * Prüft ob eine Karte Trumpf ist
 *
 * Modi:
 * - "jacks" (Normalspiel): Herz 10 + Damen + Buben + Karo
 * - Suit (Farbsolo): Herz 10 + Damen + Buben + gewählte Farbe
 * - "queens-only" (Damensolo): Nur Damen
 * - "jacks-only" (Bubensolo): Nur Buben
 * - "none" (Fleischloser): Kein Trumpf
 */
export function isTrump(card: Card, trump: TrumpMode): boolean {
	// Fleischloser: Kein Trumpf
	if (trump === "none") return false;

	// Bubensolo: Nur Buben sind Trumpf
	if (trump === "jacks-only") {
		return card.rank === "jack";
	}

	// Damensolo: Nur Damen sind Trumpf
	if (trump === "queens-only") {
		return card.rank === "queen";
	}

	// Normalspiel ("jacks"): Herz 10, Damen, Buben, Karo
	if (trump === "jacks") {
		if (card.suit === "hearts" && card.rank === "10") return true;
		return (
			card.rank === "jack" || card.rank === "queen" || card.suit === "diamonds"
		);
	}

	// Farbsolo (trump ist eine Suit): Herz 10, Damen, Buben, gewählte Farbe
	if (card.suit === "hearts" && card.rank === "10") return true;
	if (card.rank === "queen" || card.rank === "jack") return true;
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
	trump: TrumpMode,
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
	trump: TrumpMode,
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

/**
 * Wandelt einen ContractType in den entsprechenden TrumpMode um
 */
export function contractToTrumpMode(contract: ContractType): TrumpMode {
	switch (contract) {
		case "normal":
		case "hochzeit":
			return "jacks";
		case "solo-hearts":
			return "hearts";
		case "solo-diamonds":
			return "diamonds";
		case "solo-clubs":
			return "clubs";
		case "solo-spades":
			return "spades";
		case "solo-queens":
			return "queens-only";
		case "solo-jacks":
			return "jacks-only";
		case "solo-aces":
			return "none";
	}
}

/**
 * Prüft ob ein ContractType ein Solo ist
 */
export function isSoloContract(contract: ContractType): boolean {
	return contract.startsWith("solo-");
}

/**
 * Prüft ob ein Spiel als Solo gewertet wird (inkl. stille Hochzeit).
 * Stille Hochzeit: Nur 1 Spieler im Re-Team (beide Kreuz-Damen, kein Partner gefunden).
 */
export function isSoloGame(
	contractType: ContractType,
	teams: Record<string, "re" | "kontra">,
): boolean {
	if (isSoloContract(contractType)) return true;
	const rePlayerCount = Object.values(teams).filter((t) => t === "re").length;
	return (
		(contractType === "normal" || contractType === "hochzeit") &&
		rePlayerCount === 1
	);
}

/**
 * Berechnet die Balance-Änderung eines Spielers in Cents.
 * Solo: Solist bekommt/verliert 3x, jeder Gegner 1x.
 * Normal: Jeder bekommt/verliert 1x.
 */
export function calculateBalanceChange(
	netGamePoints: number,
	team: "re" | "kontra",
	isSolo: boolean,
): number {
	const pointsPerPlayer = Math.abs(netGamePoints) * 50;
	const teamWins =
		(team === "re" && netGamePoints > 0) ||
		(team === "kontra" && netGamePoints < 0);
	const sign = teamWins ? 1 : -1;
	// Solo: Solist (Re, allein) zahlt/bekommt 3x
	if (isSolo && team === "re") {
		return sign * pointsPerPlayer * 3;
	}
	return sign * pointsPerPlayer;
}
