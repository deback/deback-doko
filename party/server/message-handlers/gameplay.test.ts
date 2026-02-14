import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TRICK_ANIMATION_DELAY } from "../../../src/lib/trick-animation";
import { calculateGamePoints } from "../../game-scoring";
import {
	calculateTrickPoints,
	determineTrickWinner,
} from "../../trick-scoring";
import type { GameState } from "../../types";
import type Server from "../game-lifecycle";
import { completeTrick } from "./gameplay";

vi.mock("../../game-scoring", () => ({
	calculateGamePoints: vi.fn(),
}));

vi.mock("../../trick-scoring", () => ({
	calculateTrickPoints: vi.fn(),
	determineTrickWinner: vi.fn(),
}));

const calculateGamePointsMock = vi.mocked(calculateGamePoints);
const calculateTrickPointsMock = vi.mocked(calculateTrickPoints);
const determineTrickWinnerMock = vi.mocked(determineTrickWinner);

const MOCK_GAME_POINTS_RESULT = {
	points: [],
	reWon: true,
	kontraWon: false,
	reCardPoints: 130,
	kontraCardPoints: 110,
	totalReGamePoints: 2,
	totalKontraGamePoints: 0,
	netGamePoints: 2,
	isSolo: false,
} as const;

function createGameState(completedTricksCount: number): GameState {
	const players = [
		{ id: "player-1", name: "P1" },
		{ id: "player-2", name: "P2" },
		{ id: "player-3", name: "P3" },
		{ id: "player-4", name: "P4" },
	];

	return {
		id: "game-1",
		tableId: "table-1",
		gameStarted: true,
		gameEnded: false,
		round: 1,
		currentPlayerIndex: 0,
		standingUpPlayers: [],
		players,
		hands: {
			"player-1": [],
			"player-2": [],
			"player-3": [],
			"player-4": [],
		},
		handCounts: {
			"player-1": 0,
			"player-2": 0,
			"player-3": 0,
			"player-4": 0,
		},
		teams: {
			"player-1": "re",
			"player-2": "kontra",
			"player-3": "re",
			"player-4": "kontra",
		},
		scores: {},
		schweinereiPlayers: [],
		currentTrick: {
			cards: [
				{
					card: { id: "c1", suit: "hearts", rank: "ace" },
					playerId: "player-1",
				},
				{
					card: { id: "c2", suit: "hearts", rank: "king" },
					playerId: "player-2",
				},
				{
					card: { id: "c3", suit: "hearts", rank: "queen" },
					playerId: "player-3",
				},
				{
					card: { id: "c4", suit: "hearts", rank: "jack" },
					playerId: "player-4",
				},
			],
			completed: false,
		},
		completedTricks: Array.from({ length: completedTricksCount }, () => ({
			cards: [],
			completed: true,
			winnerId: "player-1",
			points: 0,
		})),
		trump: "hearts",
		contractType: "normal",
		announcements: {
			re: { announced: false },
			kontra: { announced: false },
			rePointAnnouncements: [],
			kontraPointAnnouncements: [],
		},
		spectators: [],
		spectatorCount: 0,
		botControlByPlayer: {},
		presenceByPlayer: {},
		botRoundScope: "current-round",
	} as unknown as GameState;
}

function createServerHarness() {
	const persistedSnapshots: GameState[] = [];
	const server = {
		persistAndBroadcastGame: vi.fn(async (state: GameState) => {
			persistedSnapshots.push(structuredClone(state));
		}),
		saveGameResults: vi.fn(),
		restartGame: vi.fn(),
		checkHochzeitPartner: vi.fn(),
	} as unknown as Server;

	return { server, persistedSnapshots };
}

describe("message-handlers/gameplay completeTrick timing", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		determineTrickWinnerMock.mockReturnValue("player-1");
		calculateTrickPointsMock.mockReturnValue(26);
		calculateGamePointsMock.mockReturnValue(
			MOCK_GAME_POINTS_RESULT as unknown as ReturnType<
				typeof calculateGamePoints
			>,
		);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	it("sets gameEnded 1 second after trick animation and restarts 5 seconds later", async () => {
		const gameState = createGameState(11);
		const { server, persistedSnapshots } = createServerHarness();

		await completeTrick(server, gameState);

		expect(persistedSnapshots).toHaveLength(1);
		expect(persistedSnapshots[0]?.gameEnded).toBe(false);
		expect(persistedSnapshots[0]?.completedTricks).toHaveLength(11);
		expect(server.restartGame).not.toHaveBeenCalled();
		expect(server.saveGameResults).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(TRICK_ANIMATION_DELAY);
		expect(persistedSnapshots).toHaveLength(2);
		expect(persistedSnapshots[1]?.gameEnded).toBe(false);
		expect(persistedSnapshots[1]?.completedTricks).toHaveLength(12);
		expect(server.saveGameResults).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(999);
		expect(persistedSnapshots).toHaveLength(2);
		expect(server.saveGameResults).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);
		expect(persistedSnapshots).toHaveLength(3);
		expect(persistedSnapshots[2]?.gameEnded).toBe(true);
		expect(persistedSnapshots[2]?.completedTricks).toHaveLength(12);
		expect(server.saveGameResults).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(4_999);
		expect(server.restartGame).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);
		expect(server.restartGame).toHaveBeenCalledTimes(1);
		expect(server.restartGame).toHaveBeenCalledWith(gameState);
	});

	it("keeps non-final trick flow delayed by trick animation and does not restart", async () => {
		const gameState = createGameState(10);
		const { server, persistedSnapshots } = createServerHarness();

		await completeTrick(server, gameState);

		expect(persistedSnapshots).toHaveLength(1);
		expect(persistedSnapshots[0]?.gameEnded).toBe(false);
		expect(persistedSnapshots[0]?.completedTricks).toHaveLength(10);
		expect(server.restartGame).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(TRICK_ANIMATION_DELAY);

		expect(persistedSnapshots).toHaveLength(2);
		expect(persistedSnapshots[1]?.gameEnded).toBe(false);
		expect(persistedSnapshots[1]?.completedTricks).toHaveLength(11);
		expect(server.restartGame).not.toHaveBeenCalled();
	});

	it("saves game results only after the post-animation dialog delay", async () => {
		const gameState = createGameState(11);
		const { server } = createServerHarness();

		await completeTrick(server, gameState);
		expect(server.saveGameResults).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(TRICK_ANIMATION_DELAY);
		expect(server.saveGameResults).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(999);
		expect(server.saveGameResults).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);

		expect(server.saveGameResults).toHaveBeenCalledTimes(1);
		expect(server.saveGameResults).toHaveBeenCalledWith(gameState);
	});
});
