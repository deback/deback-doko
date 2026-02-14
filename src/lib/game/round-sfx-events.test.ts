import { describe, expect, it } from "vitest";
import type { GameState } from "@/types/game";
import { getRoundSfxEvent } from "./round-sfx-events";

const testPlayers: GameState["players"] = [
	{
		id: "player-1",
		name: "Player 1",
		gamesPlayed: 0,
		gamesWon: 0,
		balance: 0,
	},
	{
		id: "player-2",
		name: "Player 2",
		gamesPlayed: 0,
		gamesWon: 0,
		balance: 0,
	},
	{
		id: "player-3",
		name: "Player 3",
		gamesPlayed: 0,
		gamesWon: 0,
		balance: 0,
	},
	{
		id: "player-4",
		name: "Player 4",
		gamesPlayed: 0,
		gamesWon: 0,
		balance: 0,
	},
];

function createState(overrides: Partial<GameState> = {}): GameState {
	return {
		id: "game-1",
		tableId: "table-1",
		gameStarted: true,
		gameEnded: false,
		round: 1,
		currentPlayerIndex: 0,
		standingUpPlayers: [],
		players: testPlayers,
		hands: {},
		handCounts: {
			"player-1": 12,
			"player-2": 12,
			"player-3": 12,
			"player-4": 12,
		},
		teams: {},
		scores: {},
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
		announcements: {
			re: { announced: false },
			kontra: { announced: false },
			rePointAnnouncements: [],
			kontraPointAnnouncements: [],
		},
		botControlByPlayer: {},
		presenceByPlayer: {},
		botRoundScope: "current-round",
		...overrides,
	};
}

describe("round sfx events", () => {
	it("returns null on baseline snapshot", () => {
		const nextState = createState();
		expect(getRoundSfxEvent(null, nextState)).toBeNull();
	});

	it("detects game-start transition", () => {
		const prevState = createState({
			gameStarted: false,
			handCounts: {},
		});
		const nextState = createState({
			gameStarted: true,
		});

		expect(getRoundSfxEvent(prevState, nextState)).toEqual({
			roundId: "game-1-r1",
		});
	});

	it("detects round increments", () => {
		const prevState = createState({ round: 1 });
		const nextState = createState({ round: 2 });

		expect(getRoundSfxEvent(prevState, nextState)).toEqual({
			roundId: "game-1-r2",
		});
	});

	it("returns null when state changes without new round", () => {
		const prevState = createState({ currentPlayerIndex: 0 });
		const nextState = createState({ currentPlayerIndex: 1 });

		expect(getRoundSfxEvent(prevState, nextState)).toBeNull();
	});

	it("returns null when hands are not fully distributed", () => {
		const prevState = createState({ round: 1 });
		const nextState = createState({
			round: 2,
			handCounts: {
				"player-1": 12,
				"player-2": 12,
				"player-3": 12,
				"player-4": 0,
			},
		});

		expect(getRoundSfxEvent(prevState, nextState)).toBeNull();
	});
});
