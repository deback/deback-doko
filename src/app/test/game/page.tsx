"use client";

import { GameBoard } from "@/components/game/game-board";
import type { Card, GameState } from "@/types/game";
import type { Player } from "@/types/tables";

// 4 Dummy-Spieler
const PLAYERS: Player[] = [
	{ id: "p1", name: "Alice", gamesPlayed: 10, gamesWon: 5, balance: 100 },
	{ id: "p2", name: "Bob", gamesPlayed: 8, gamesWon: 3, balance: 50 },
	{ id: "p3", name: "Charlie", gamesPlayed: 12, gamesWon: 6, balance: 150 },
	{ id: "p4", name: "Diana", gamesPlayed: 15, gamesWon: 9, balance: 200 },
];

// 12 Karten pro Spieler generieren
function generateHand(playerId: string, startIndex: number): Card[] {
	const suits = ["hearts", "diamonds", "clubs", "spades"] as const;
	const ranks = ["9", "10", "jack", "queen", "king", "ace"] as const;
	const cards: Card[] = [];

	for (let i = 0; i < 12; i++) {
		const suit = suits[(startIndex + i) % 4];
		const rank = ranks[i % 6];
		if (suit && rank) {
			cards.push({
				id: `${playerId}-card-${i}`,
				suit,
				rank,
			});
		}
	}
	return cards;
}

// GameState mit Dummy-Daten
const GAME_STATE: GameState = {
	id: "test-game",
	tableId: "test-table",
	players: PLAYERS,
	currentPlayerIndex: 0,
	hands: {
		p1: generateHand("p1", 0),
		p2: generateHand("p2", 1),
		p3: generateHand("p3", 2),
		p4: generateHand("p4", 3),
	},
	handCounts: { p1: 12, p2: 12, p3: 12, p4: 12 },
	currentTrick: {
		cards: [
			{ card: { id: "trick-1", suit: "hearts", rank: "ace" }, playerId: "p1" },
			{ card: { id: "trick-2", suit: "diamonds", rank: "king" }, playerId: "p2" },
			{ card: { id: "trick-3", suit: "clubs", rank: "queen" }, playerId: "p3" },
			{ card: { id: "trick-4", suit: "spades", rank: "jack" }, playerId: "p4" },
		],
		completed: false,
	},
	completedTricks: [],
	trump: "jacks",
	gameStarted: true,
	gameEnded: false,
	round: 1,
	scores: { p1: 0, p2: 0, p3: 0, p4: 0 },
	schweinereiPlayers: [],
	teams: { p1: "re", p2: "kontra", p3: "re", p4: "kontra" },
	spectatorCount: 0,
	spectators: [],
};

const CURRENT_PLAYER = PLAYERS[0];

export default function GameTestPage() {
	if (!CURRENT_PLAYER) return null;

	return (
		<div className="h-dvh w-screen bg-wood">
			<GameBoard
				currentPlayer={CURRENT_PLAYER}
				gameState={GAME_STATE}
				playCard={() => {}}
			/>
		</div>
	);
}
