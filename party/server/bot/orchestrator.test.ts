import type * as Party from "partykit/server";
import { describe, expect, it, vi } from "vitest";
import type { GameState, PlayerBotControl } from "../../types";
import type Server from "../game-lifecycle";
import * as heuristicPolicy from "./heuristic-policy";
import {
	handleBotControl,
	markPlayerConnected,
	markPlayerDisconnected,
	maybeScheduleBotTurn,
} from "./orchestrator";
import { BOT_TURN_DELAY_MS } from "./types";

function createGameState(botControl: PlayerBotControl): GameState {
	return {
		id: "game-1",
		tableId: "table-1",
		gameStarted: true,
		gameEnded: false,
		players: [{ id: "player-1", name: "Alice" }],
		botControlByPlayer: {
			"player-1": botControl,
		},
		presenceByPlayer: {
			"player-1": {
				connected: false,
				lastSeenAt: 123,
				disconnectedAt: 456,
			},
		},
	} as unknown as GameState;
}

function createConnection(id = "conn-1"): Party.Connection {
	return {
		id,
		send: vi.fn(),
	} as unknown as Party.Connection;
}

function createTrickCards(count: number): GameState["currentTrick"]["cards"] {
	return Array.from({ length: count }, (_, index) => ({
		playerId: "player-1",
		card: {
			id: `card-${index}`,
			suit: "clubs" as const,
			rank: "9" as const,
		},
	}));
}

function createSchedulingGameState(botControl: PlayerBotControl): GameState {
	const gameState = createGameState(botControl);
	gameState.currentPlayerIndex = 0;
	gameState.currentTrick = {
		cards: [],
		completed: false,
	};
	gameState.biddingPhase = undefined;
	return gameState;
}

function createServer(
	gameState: GameState,
	options?: {
		hasOtherActivePlayerConnection?: boolean;
	},
) {
	const sendSystemChatMessage = vi.fn();
	const persistAndBroadcastGame = vi.fn(async () => {});
	const sendGameError = vi.fn();
	const handleBid = vi.fn(async () => {});
	const handleDeclareContract = vi.fn(async () => {});
	const handleAnnouncement = vi.fn(async () => {});
	const playCard = vi.fn(async () => {});
	const hasOtherActivePlayerConnection = vi.fn(
		() => options?.hasOtherActivePlayerConnection ?? false,
	);
	const server = {
		room: { id: gameState.id },
		games: new Map([[gameState.id, gameState]]),
		botDisconnectTakeoverTimers: new Map<
			string,
			ReturnType<typeof setTimeout>
		>(),
		botTurnTimers: new Map<string, ReturnType<typeof setTimeout>>(),
		botTurnDeadlineTimers: new Map<string, ReturnType<typeof setTimeout>>(),
		hasOtherActivePlayerConnection,
		sendGameError,
		sendSystemChatMessage,
		persistAndBroadcastGame,
		handleBid,
		handleDeclareContract,
		handleAnnouncement,
		playCard,
	} as unknown as Server;
	server.maybeScheduleBotTurn = (gameId: string) => {
		maybeScheduleBotTurn(server, gameId);
	};

	return {
		server,
		sendSystemChatMessage,
		persistAndBroadcastGame,
		sendGameError,
		hasOtherActivePlayerConnection,
		handleBid,
		handleDeclareContract,
		handleAnnouncement,
		playCard,
	};
}

describe("bot/orchestrator markPlayerConnected", () => {
	it("releases disconnect takeover on reconnect and sends return message", async () => {
		const gameState = createGameState({
			mode: "bot",
			reason: "disconnect",
			since: 1,
			controlledBy: "system",
		});
		const { server, sendSystemChatMessage, persistAndBroadcastGame } =
			createServer(gameState);

		await markPlayerConnected(server, gameState.id, "player-1");

		expect(gameState.botControlByPlayer["player-1"]).toEqual({ mode: "human" });
		expect(gameState.presenceByPlayer["player-1"]?.connected).toBe(true);
		expect(
			gameState.presenceByPlayer["player-1"]?.disconnectedAt,
		).toBeUndefined();
		expect(sendSystemChatMessage).toHaveBeenCalledWith(
			"game-1",
			"table-1",
			"Alice ist zurück.",
		);
		expect(persistAndBroadcastGame).toHaveBeenCalledTimes(1);
		expect(persistAndBroadcastGame).toHaveBeenCalledWith(gameState);
	});

	it("keeps manual takeover on reconnect and does not send return message", async () => {
		const gameState = createGameState({
			mode: "bot",
			reason: "manual",
			since: 1,
			controlledBy: "player-2",
		});
		const { server, sendSystemChatMessage, persistAndBroadcastGame } =
			createServer(gameState);

		await markPlayerConnected(server, gameState.id, "player-1");

		expect(gameState.botControlByPlayer["player-1"]).toEqual({
			mode: "bot",
			reason: "manual",
			since: 1,
			controlledBy: "player-2",
		});
		expect(gameState.presenceByPlayer["player-1"]?.connected).toBe(true);
		expect(sendSystemChatMessage).not.toHaveBeenCalled();
		expect(persistAndBroadcastGame).toHaveBeenCalledTimes(1);
		expect(persistAndBroadcastGame).toHaveBeenCalledWith(gameState);
	});

	it("releases legacy bot takeover without reason on reconnect", async () => {
		const gameState = createGameState({
			mode: "bot",
		});
		const { server, sendSystemChatMessage, persistAndBroadcastGame } =
			createServer(gameState);

		await markPlayerConnected(server, gameState.id, "player-1");

		expect(gameState.botControlByPlayer["player-1"]).toEqual({ mode: "human" });
		expect(gameState.presenceByPlayer["player-1"]?.connected).toBe(true);
		expect(sendSystemChatMessage).toHaveBeenCalledWith(
			"game-1",
			"table-1",
			"Alice ist zurück.",
		);
		expect(persistAndBroadcastGame).toHaveBeenCalledTimes(1);
		expect(persistAndBroadcastGame).toHaveBeenCalledWith(gameState);
	});

	it("does not persist again when an already connected player reconnects", async () => {
		const gameState = createGameState({
			mode: "human",
		});
		const { server, sendSystemChatMessage, persistAndBroadcastGame } =
			createServer(gameState);

		await markPlayerConnected(server, gameState.id, "player-1");
		expect(persistAndBroadcastGame).toHaveBeenCalledTimes(1);

		const lastSeenAtAfterFirstConnect =
			gameState.presenceByPlayer["player-1"]?.lastSeenAt;
		await markPlayerConnected(server, gameState.id, "player-1");

		expect(persistAndBroadcastGame).toHaveBeenCalledTimes(1);
		expect(sendSystemChatMessage).not.toHaveBeenCalled();
		expect(gameState.presenceByPlayer["player-1"]?.lastSeenAt).toBe(
			lastSeenAtAfterFirstConnect,
		);
	});

	it("heals stale disconnectedAt once for already connected players", async () => {
		const gameState = createGameState({
			mode: "human",
		});
		gameState.presenceByPlayer["player-1"] = {
			connected: true,
			lastSeenAt: 123,
			disconnectedAt: 456,
		};
		const { server, sendSystemChatMessage, persistAndBroadcastGame } =
			createServer(gameState);

		await markPlayerConnected(server, gameState.id, "player-1");

		expect(
			gameState.presenceByPlayer["player-1"]?.disconnectedAt,
		).toBeUndefined();
		expect(gameState.presenceByPlayer["player-1"]?.lastSeenAt).toBe(123);
		expect(persistAndBroadcastGame).toHaveBeenCalledTimes(1);
		expect(sendSystemChatMessage).not.toHaveBeenCalled();

		await markPlayerConnected(server, gameState.id, "player-1");
		expect(persistAndBroadcastGame).toHaveBeenCalledTimes(1);
	});
});

describe("bot/orchestrator markPlayerDisconnected", () => {
	it("is a no-op for non-player ids", async () => {
		const gameState = createGameState({
			mode: "human",
		});
		const { server, persistAndBroadcastGame, hasOtherActivePlayerConnection } =
			createServer(gameState);

		await markPlayerDisconnected(server, gameState.id, "spectator-1");

		expect(hasOtherActivePlayerConnection).not.toHaveBeenCalled();
		expect(gameState.presenceByPlayer["spectator-1"]).toBeUndefined();
		expect(persistAndBroadcastGame).not.toHaveBeenCalled();
	});
});

describe("bot/orchestrator maybeScheduleBotTurn", () => {
	it("does not schedule bot turn when current trick is completed", () => {
		const gameState = createSchedulingGameState({
			mode: "bot",
			reason: "manual",
			since: 1,
			controlledBy: "player-2",
		});
		gameState.currentTrick.completed = true;
		const { server } = createServer(gameState);

		maybeScheduleBotTurn(server, gameState.id);

		expect(server.botTurnTimers.size).toBe(0);
	});

	it("does not schedule bot turn when current trick already has four cards", () => {
		const gameState = createSchedulingGameState({
			mode: "bot",
			reason: "manual",
			since: 1,
			controlledBy: "player-2",
		});
		gameState.currentTrick.cards = createTrickCards(4);
		const { server } = createServer(gameState);

		maybeScheduleBotTurn(server, gameState.id);

		expect(server.botTurnTimers.size).toBe(0);
	});

	it("schedules bot turn when state is actionable", () => {
		const gameState = createSchedulingGameState({
			mode: "bot",
			reason: "manual",
			since: 1,
			controlledBy: "player-2",
		});
		const { server } = createServer(gameState);

		maybeScheduleBotTurn(server, gameState.id);

		expect(server.botTurnTimers.size).toBe(1);
		const timer = server.botTurnTimers.get(gameState.id);
		if (timer) {
			clearTimeout(timer);
			server.botTurnTimers.delete(gameState.id);
		}
	});

	it("does not reschedule after queued timer fires into completed-trick state", async () => {
		vi.useFakeTimers();
		try {
			const gameState = createSchedulingGameState({
				mode: "bot",
				reason: "manual",
				since: 1,
				controlledBy: "player-2",
			});
			const { server } = createServer(gameState);

			maybeScheduleBotTurn(server, gameState.id);
			expect(server.botTurnTimers.size).toBe(1);

			gameState.currentTrick.completed = true;
			await vi.advanceTimersByTimeAsync(BOT_TURN_DELAY_MS + 1);
			await vi.advanceTimersByTimeAsync(BOT_TURN_DELAY_MS * 2);

			expect(server.botTurnTimers.size).toBe(0);
		} finally {
			vi.useRealTimers();
		}
	});

	it("recovers from decision errors with fallback action and reschedules", async () => {
		vi.useFakeTimers();
		const decideBotActionSpy = vi
			.spyOn(heuristicPolicy, "decideBotAction")
			.mockImplementation(() => {
				throw new Error("decision failed");
			});
		try {
			const gameState = createSchedulingGameState({
				mode: "bot",
				reason: "manual",
				since: 1,
				controlledBy: "player-2",
			});
			gameState.biddingPhase = {
				active: true,
				currentBidderIndex: 0,
				bids: {},
				awaitingContractDeclaration: [],
				pendingContracts: {},
			} as GameState["biddingPhase"];
			const { server, handleBid } = createServer(gameState);

			maybeScheduleBotTurn(server, gameState.id);
			expect(server.botTurnTimers.has(gameState.id)).toBe(true);

			await vi.advanceTimersByTimeAsync(BOT_TURN_DELAY_MS + 1);

			expect(handleBid).toHaveBeenCalledTimes(1);
			expect(handleBid).toHaveBeenCalledWith(
				"player-1",
				"gesund",
				expect.anything(),
			);
			expect(server.botTurnTimers.has(gameState.id)).toBe(true);

			const timer = server.botTurnTimers.get(gameState.id);
			if (timer) {
				clearTimeout(timer);
				server.botTurnTimers.delete(gameState.id);
			}
		} finally {
			decideBotActionSpy.mockRestore();
			vi.useRealTimers();
		}
	});
});

describe("bot/orchestrator handleBotControl", () => {
	it("rejects release when only persisted presence says connected", async () => {
		const gameState = createGameState({
			mode: "bot",
			reason: "disconnect",
			since: 1,
			controlledBy: "system",
		});
		gameState.presenceByPlayer["player-1"] = {
			connected: true,
			lastSeenAt: 123,
		};
		const {
			server,
			sendSystemChatMessage,
			persistAndBroadcastGame,
			sendGameError,
		} = createServer(gameState);
		const sender = createConnection();
		const timerKey = `${gameState.id}:player-1`;
		const timer = setTimeout(() => {}, 60_000);
		server.botDisconnectTakeoverTimers.set(timerKey, timer);

		await handleBotControl(server, "release", "player-1", "player-2", sender);

		expect(sendGameError).toHaveBeenCalledWith(
			sender,
			"Alice ist aktuell nicht verbunden.",
		);
		expect(gameState.botControlByPlayer["player-1"]).toEqual({
			mode: "bot",
			reason: "disconnect",
			since: 1,
			controlledBy: "system",
		});
		expect(sendSystemChatMessage).not.toHaveBeenCalled();
		expect(persistAndBroadcastGame).not.toHaveBeenCalled();
		expect(server.botDisconnectTakeoverTimers.has(timerKey)).toBe(true);

		clearTimeout(timer);
		server.botDisconnectTakeoverTimers.delete(timerKey);
	});

	it("rejects release for disconnected target and keeps takeover timer", async () => {
		const gameState = createGameState({
			mode: "bot",
			reason: "disconnect",
			since: 1,
			controlledBy: "system",
		});
		const {
			server,
			sendSystemChatMessage,
			persistAndBroadcastGame,
			sendGameError,
		} = createServer(gameState);
		const sender = createConnection();
		const timerKey = `${gameState.id}:player-1`;
		const timer = setTimeout(() => {}, 60_000);
		server.botDisconnectTakeoverTimers.set(timerKey, timer);

		await handleBotControl(server, "release", "player-1", "player-2", sender);

		expect(sendGameError).toHaveBeenCalledWith(
			sender,
			"Alice ist aktuell nicht verbunden.",
		);
		expect(gameState.botControlByPlayer["player-1"]).toEqual({
			mode: "bot",
			reason: "disconnect",
			since: 1,
			controlledBy: "system",
		});
		expect(sendSystemChatMessage).not.toHaveBeenCalled();
		expect(persistAndBroadcastGame).not.toHaveBeenCalled();
		expect(server.botDisconnectTakeoverTimers.has(timerKey)).toBe(true);

		clearTimeout(timer);
		server.botDisconnectTakeoverTimers.delete(timerKey);
	});

	it("releases control for connected targets and clears pending timer", async () => {
		const gameState = createGameState({
			mode: "bot",
			reason: "manual",
			since: 1,
			controlledBy: "player-2",
		});
		const { server, sendSystemChatMessage, persistAndBroadcastGame } =
			createServer(gameState, {
				hasOtherActivePlayerConnection: true,
			});
		const sender = createConnection();
		const timerKey = `${gameState.id}:player-1`;
		const timer = setTimeout(() => {}, 60_000);
		server.botDisconnectTakeoverTimers.set(timerKey, timer);

		await handleBotControl(server, "release", "player-1", "player-2", sender);

		expect(gameState.botControlByPlayer["player-1"]).toEqual({ mode: "human" });
		expect(sendSystemChatMessage).toHaveBeenCalledWith(
			"game-1",
			"table-1",
			"Alice wird wieder manuell gespielt.",
		);
		expect(persistAndBroadcastGame).toHaveBeenCalledTimes(1);
		expect(persistAndBroadcastGame).toHaveBeenCalledWith(gameState);
		expect(server.botDisconnectTakeoverTimers.has(timerKey)).toBe(false);

		clearTimeout(timer);
	});

	it("clears pending disconnect timer on manual takeover", async () => {
		const gameState = createGameState({
			mode: "human",
		});
		const { server, sendSystemChatMessage, persistAndBroadcastGame } =
			createServer(gameState);
		const sender = createConnection();
		const timerKey = `${gameState.id}:player-1`;
		const timer = setTimeout(() => {}, 60_000);
		server.botDisconnectTakeoverTimers.set(timerKey, timer);

		await handleBotControl(server, "takeover", "player-1", "player-2", sender);

		expect(gameState.botControlByPlayer["player-1"]).toEqual({
			mode: "bot",
			reason: "manual",
			since: expect.any(Number),
			controlledBy: "player-2",
		});
		expect(sendSystemChatMessage).toHaveBeenCalledWith(
			"game-1",
			"table-1",
			"Bot übernimmt Alice.",
		);
		expect(persistAndBroadcastGame).toHaveBeenCalledTimes(1);
		expect(persistAndBroadcastGame).toHaveBeenCalledWith(gameState);
		expect(server.botDisconnectTakeoverTimers.has(timerKey)).toBe(false);

		clearTimeout(timer);
	});
});
