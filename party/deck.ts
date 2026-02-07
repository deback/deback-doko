import type { Card, Player, Rank, Suit } from "./types";

export function createDeck(): Card[] {
	const suits: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
	const ranks: Rank[] = ["9", "10", "jack", "queen", "king", "ace"];
	const deck: Card[] = [];

	for (const suit of suits) {
		for (const rank of ranks) {
			for (let i = 0; i < 2; i++) {
				deck.push({
					suit,
					rank,
					id: `${suit}-${rank}-${i}`,
				});
			}
		}
	}

	return shuffleDeck(deck);
}

export function shuffleDeck(deck: Card[]): Card[] {
	const shuffled = [...deck];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const temp = shuffled[i];
		if (temp && shuffled[j]) {
			shuffled[i] = shuffled[j];
			shuffled[j] = temp;
		}
	}
	return shuffled;
}

export function dealCards(
	deck: Card[],
	players: Player[],
): Record<string, Card[]> {
	const hands: Record<string, Card[]> = {};
	const cardsPerPlayer = 12;

	for (let i = 0; i < players.length; i++) {
		const player = players[i];
		if (player) {
			hands[player.id] = deck.slice(
				i * cardsPerPlayer,
				(i + 1) * cardsPerPlayer,
			);
		}
	}

	return hands;
}
