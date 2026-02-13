import type {
	Announcements,
	Card,
	GameState,
	Player,
	Rank,
	Suit,
	Trick,
} from "../types";

export function player(id: string, overrides: Partial<Player> = {}): Player {
	return {
		id,
		name: `Player ${id}`,
		email: `${id}@example.com`,
		image: null,
		gamesPlayed: 0,
		gamesWon: 0,
		balance: 0,
		...overrides,
	};
}

export function card(suit: Suit, rank: Rank, id?: string): Card {
	return {
		suit,
		rank,
		id: id ?? `${suit}-${rank}`,
	};
}

export function trick(
	cards: Array<{ playerId: string; card: Card }>,
	overrides: Partial<Trick> = {},
): Trick {
	return {
		cards,
		completed: true,
		...overrides,
	};
}

export function announcements(
	overrides: Partial<Announcements> = {},
): Announcements {
	const base: Announcements = {
		re: { announced: false },
		kontra: { announced: false },
		rePointAnnouncements: [],
		kontraPointAnnouncements: [],
	};

	return {
		...base,
		...overrides,
		re: {
			...base.re,
			...overrides.re,
		},
		kontra: {
			...base.kontra,
			...overrides.kontra,
		},
		rePointAnnouncements:
			overrides.rePointAnnouncements ?? base.rePointAnnouncements,
		kontraPointAnnouncements:
			overrides.kontraPointAnnouncements ?? base.kontraPointAnnouncements,
	};
}

function createDefaultPlayers(): Player[] {
	return [player("p1"), player("p2"), player("p3"), player("p4")];
}

function createDefaultHands(players: Player[]): Record<string, Card[]> {
	const hands: Record<string, Card[]> = {};
	for (const currentPlayer of players) {
		hands[currentPlayer.id] = [];
	}
	return hands;
}

function createDefaultHandCounts(players: Player[]): Record<string, number> {
	const handCounts: Record<string, number> = {};
	for (const currentPlayer of players) {
		handCounts[currentPlayer.id] = 0;
	}
	return handCounts;
}

function createDefaultScores(players: Player[]): Record<string, number> {
	const scores: Record<string, number> = {};
	for (const currentPlayer of players) {
		scores[currentPlayer.id] = 0;
	}
	return scores;
}

function createDefaultTeams(
	players: Player[],
): Record<string, "re" | "kontra"> {
	const teams: Record<string, "re" | "kontra"> = {};
	for (const [index, currentPlayer] of players.entries()) {
		teams[currentPlayer.id] = index < 2 ? "re" : "kontra";
	}
	return teams;
}

function createDefaultBotControl(
	players: Player[],
): GameState["botControlByPlayer"] {
	const control: GameState["botControlByPlayer"] = {};
	for (const currentPlayer of players) {
		control[currentPlayer.id] = {
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
	for (const currentPlayer of players) {
		presence[currentPlayer.id] = {
			connected: false,
			lastSeenAt: now,
		};
	}
	return presence;
}

export function baseGameState(overrides: Partial<GameState> = {}): GameState {
	const players = overrides.players ?? createDefaultPlayers();
	const base: GameState = {
		id: "game-1",
		tableId: "table-1",
		gameStarted: true,
		gameEnded: false,
		round: 1,
		currentPlayerIndex: 0,
		standingUpPlayers: [],
		players,
		hands: createDefaultHands(players),
		handCounts: createDefaultHandCounts(players),
		teams: createDefaultTeams(players),
		scores: createDefaultScores(players),
		schweinereiPlayers: [],
		currentTrick: {
			cards: [],
			completed: false,
		},
		completedTricks: [],
		trump: "jacks",
		contractType: "normal",
		spectators: [],
		spectatorCount: 0,
		announcements: announcements(),
		botControlByPlayer: createDefaultBotControl(players),
		presenceByPlayer: createDefaultPresence(players),
		botRoundScope: "current-round",
	};

	return {
		...base,
		...overrides,
		players,
	};
}
