import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameResultPayload } from "../../lib/validations/game-results";

const mocks = vi.hoisted(() => {
	const gameResultTable = Symbol("gameResult");
	const playerGameResultTable = Symbol("playerGameResult");
	const userTable = {
		id: "id",
		balance: "balance",
		gamesPlayed: "gamesPlayed",
		gamesWon: "gamesWon",
	};

	return {
		transaction: vi.fn(),
		sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
			strings,
			values,
		})),
		gameResultTable,
		playerGameResultTable,
		userTable,
	};
});

vi.mock("drizzle-orm", () => ({
	sql: mocks.sql,
}));

vi.mock("../db", () => ({
	db: {
		transaction: mocks.transaction,
	},
}));

vi.mock("../db/schema", () => ({
	gameResult: mocks.gameResultTable,
	playerGameResult: mocks.playerGameResultTable,
	user: mocks.userTable,
}));

import { saveGameResultService } from "./game-results-service";

const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

const payload: GameResultPayload = {
	gameId: "game-1",
	tableId: "table-1",
	players: [
		{
			id: "user-1",
			name: "Alice",
			score: 120,
			team: "re",
			won: true,
			balanceChange: 150,
			gamePoints: 3,
		},
		{
			id: "user-2",
			name: "Bob",
			score: 90,
			team: "kontra",
			won: false,
			balanceChange: -50,
			gamePoints: -1,
		},
	],
	tricks: [],
	initialHands: {},
	announcements: {},
	contractType: "normal",
	schweinereiPlayers: [],
	gamePoints: {},
};

describe("game-results-service", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterAll(() => {
		consoleErrorSpy.mockRestore();
	});

	it("persists game results and updates player stats in one transaction", async () => {
		const insertValues = vi.fn().mockResolvedValue(undefined);
		const insert = vi.fn().mockReturnValue({ values: insertValues });
		const updateWhere = vi.fn().mockResolvedValue(undefined);
		const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
		const update = vi.fn().mockReturnValue({ set: updateSet });

		mocks.transaction.mockImplementation(async (callback) => {
			return await callback({
				insert,
				update,
			});
		});

		const result = await saveGameResultService(payload);

		expect(result).toEqual({ success: true });
		expect(mocks.transaction).toHaveBeenCalledTimes(1);
		expect(insert).toHaveBeenNthCalledWith(1, mocks.gameResultTable);
		expect(insert).toHaveBeenNthCalledWith(2, mocks.playerGameResultTable);
		expect(insert).toHaveBeenNthCalledWith(3, mocks.playerGameResultTable);
		expect(update).toHaveBeenCalledTimes(2);
		expect(update).toHaveBeenNthCalledWith(1, mocks.userTable);
		expect(update).toHaveBeenNthCalledWith(2, mocks.userTable);
		expect(updateWhere).toHaveBeenCalledTimes(2);
	});

	it("returns a failed result when transaction throws", async () => {
		mocks.transaction.mockRejectedValue(new Error("db unavailable"));

		const result = await saveGameResultService(payload);

		expect(result).toEqual({
			success: false,
			error: "Failed to save game results",
		});
	});
});
