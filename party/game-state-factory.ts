import { createDeck, dealCards } from "./deck";
import type { GameState, Player } from "./types";

function createScores(players: Player[]): Record<string, number> {
	const scores: Record<string, number> = {};
	for (const player of players) {
		scores[player.id] = 0;
	}
	return scores;
}

function createHandCounts(
	hands: GameState["hands"],
	players: Player[],
): Record<string, number> {
	const handCounts: Record<string, number> = {};
	for (const player of players) {
		handCounts[player.id] = hands[player.id]?.length || 0;
	}
	return handCounts;
}

function deriveSchweinereiPlayers(
	hands: GameState["hands"],
	players: Player[],
): string[] {
	const schweinereiPlayers: string[] = [];
	for (const player of players) {
		const hand = hands[player.id];
		if (!hand) continue;

		const diamondsAces = hand.filter(
			(card) => card.suit === "diamonds" && card.rank === "ace",
		);
		if (diamondsAces.length === 2) {
			schweinereiPlayers.push(player.id);
		}
	}
	return schweinereiPlayers;
}

function deriveTeams(
	hands: GameState["hands"],
	players: Player[],
): Record<string, "re" | "kontra"> {
	const teams: Record<string, "re" | "kontra"> = {};
	for (const player of players) {
		const hand = hands[player.id];
		if (!hand) continue;

		const hasClubsQueen = hand.some(
			(card) => card.suit === "clubs" && card.rank === "queen",
		);
		teams[player.id] = hasClubsQueen ? "re" : "kontra";
	}
	return teams;
}

function createDefaultAnnouncements(): GameState["announcements"] {
	return {
		re: { announced: false },
		kontra: { announced: false },
		rePointAnnouncements: [],
		kontraPointAnnouncements: [],
	};
}

function createDefaultBotControl(
	players: Player[],
): GameState["botControlByPlayer"] {
	const control: GameState["botControlByPlayer"] = {};
	for (const player of players) {
		control[player.id] = {
			mode: "human",
		};
	}
	return control;
}

function createDefaultPresence(
	players: Player[],
): GameState["presenceByPlayer"] {
	const now = Date.now();
	const presence: GameState["presenceByPlayer"] = {};
	for (const player of players) {
		presence[player.id] = {
			connected: false,
			lastSeenAt: now,
		};
	}
	return presence;
}

export function createWaitingGameState(params: {
	gameId: string;
	tableId: string;
	players: Player[];
	round: number;
	spectatorCount?: number;
	spectators?: GameState["spectators"];
}): GameState {
	return {
		id: params.gameId,
		tableId: params.tableId,
		players: params.players,
		currentPlayerIndex: 0,
		hands: {},
		handCounts: {},
		currentTrick: { cards: [], completed: false },
		completedTricks: [],
		trump: "jacks",
		gameStarted: false,
		gameEnded: false,
		round: params.round,
		scores: {},
		schweinereiPlayers: [],
		standingUpPlayers: [],
		teams: {},
		spectatorCount: params.spectatorCount ?? 0,
		spectators: params.spectators ?? [],
		announcements: createDefaultAnnouncements(),
		contractType: "normal",
		botControlByPlayer: createDefaultBotControl(params.players),
		presenceByPlayer: createDefaultPresence(params.players),
		botRoundScope: "current-round",
	};
}

export function createStartedGameState(params: {
	gameId: string;
	tableId: string;
	players: Player[];
	round: number;
	currentPlayerIndex?: number;
	spectatorCount?: number;
	spectators?: GameState["spectators"];
}): GameState {
	const deck = createDeck();
	const hands = dealCards(deck, params.players);
	const effectiveCurrentPlayerIndex =
		params.currentPlayerIndex ?? (params.round - 1) % 4;

	return {
		id: params.gameId,
		tableId: params.tableId,
		players: params.players,
		currentPlayerIndex: effectiveCurrentPlayerIndex,
		hands,
		handCounts: createHandCounts(hands, params.players),
		initialHands: structuredClone(hands),
		currentTrick: {
			cards: [],
			completed: false,
		},
		completedTricks: [],
		trump: "jacks",
		gameStarted: true,
		gameEnded: false,
		round: params.round,
		scores: createScores(params.players),
		schweinereiPlayers: deriveSchweinereiPlayers(hands, params.players),
		standingUpPlayers: [],
		teams: deriveTeams(hands, params.players),
		spectatorCount: params.spectatorCount ?? 0,
		spectators: params.spectators ?? [],
		announcements: createDefaultAnnouncements(),
		biddingPhase: {
			active: true,
			currentBidderIndex: effectiveCurrentPlayerIndex,
			bids: {},
			pendingContracts: {},
		},
		contractType: "normal",
		botControlByPlayer: createDefaultBotControl(params.players),
		presenceByPlayer: createDefaultPresence(params.players),
		botRoundScope: "current-round",
	};
}
