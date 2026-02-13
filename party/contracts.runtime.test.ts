import { describe, expect, it } from "vitest";
import type { ZodType } from "zod";
import { gameEventSchema, gameMessageSchema } from "./schemas";

const validPlayer = {
	id: "player-1",
	name: "Alice",
	email: "alice@example.com",
	image: null,
	gamesPlayed: 12,
	gamesWon: 7,
	balance: 150,
};

const validChatMessage = {
	id: "chat-1",
	tableId: "table-1",
	text: "Hallo zusammen!",
	createdAt: Date.now(),
	author: {
		id: "player-1",
		name: "Alice",
		image: null,
		role: "player" as const,
	},
};

function expectValid(schema: ZodType, payload: unknown) {
	const result = schema.safeParse(payload);
	expect(result.success).toBe(true);
}

function expectInvalid(schema: ZodType, payload: unknown) {
	const result = schema.safeParse(payload);
	expect(result.success).toBe(false);
}

describe("GameEvent runtime contract", () => {
	it("accepts valid payloads for all event variants", () => {
		const validEvents = [
			{
				type: "get-state",
				playerId: "player-1",
				playerName: "Alice",
				playerImage: null,
			},
			{ type: "play-card", cardId: "card-1", playerId: "player-1" },
			{ type: "auto-play" },
			{ type: "auto-play-all" },
			{ type: "reset-game" },
			{
				type: "start-game",
				players: [validPlayer],
				tableId: "table-1",
			},
			{
				type: "spectate-game",
				gameId: "game-1",
				spectatorId: "spec-1",
				spectatorName: "Spectator",
				spectatorImage: null,
			},
			{
				type: "announce",
				announcement: "re",
				playerId: "player-1",
			},
			{ type: "bid", playerId: "player-1", bid: "gesund" },
			{
				type: "declare-contract",
				playerId: "player-1",
				contract: "solo-hearts",
			},
			{ type: "toggle-stand-up", playerId: "player-1" },
			{
				type: "bot-control",
				action: "takeover",
				targetPlayerId: "player-2",
			},
			{
				type: "update-player-info",
				playerId: "player-1",
				name: "Alice Updated",
				image: "https://example.com/avatar.png",
			},
			{
				type: "chat-send",
				text: "Hallo Tisch!",
			},
		];

		for (const payload of validEvents) {
			expectValid(gameEventSchema, payload);
		}
	});

	it("rejects critical invalid payloads across all event variants", () => {
		const invalidEvents = [
			// get-state
			{ type: "get-state", playerId: 123 },
			// play-card
			{ type: "play-card", playerId: "player-1" },
			// auto-play (command-only variant: invalid discriminant)
			{ type: "auto-play-invalid" },
			// auto-play-all (command-only variant: invalid discriminant)
			{ type: "auto-play-all-invalid" },
			// reset-game (command-only variant: invalid discriminant)
			{ type: "reset-game-invalid" },
			// start-game
			{
				type: "start-game",
				players: [
					{
						id: "player-1",
						name: "Alice",
						gamesPlayed: 1,
						gamesWon: 1,
						// missing balance
					},
				],
				tableId: "table-1",
			},
			// spectate-game
			{ type: "spectate-game", gameId: "game-1" },
			// announce
			{
				type: "announce",
				announcement: "invalid-announcement",
				playerId: "player-1",
			},
			// bid
			{ type: "bid", playerId: "player-1", bid: "maybe" },
			// declare-contract
			{
				type: "declare-contract",
				playerId: "player-1",
				contract: "solo-invalid",
			},
			// toggle-stand-up
			{ type: "toggle-stand-up" },
			// bot-control
			{ type: "bot-control", action: "pause", targetPlayerId: "player-1" },
			// update-player-info
			{ type: "update-player-info", playerId: "player-1" },
			// chat-send
			{ type: "chat-send" },
		];

		for (const payload of invalidEvents) {
			expectInvalid(gameEventSchema, payload);
		}
	});

	it("tolerates unknown keys on events (forward-compat)", () => {
		const result = gameEventSchema.safeParse({
			type: "auto-play",
			extraField: "forward-compatible",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect("extraField" in result.data).toBe(false);
		}
	});
});

describe("GameMessage runtime contract", () => {
	it("accepts valid payloads for all message variants", () => {
		const validMessages = [
			{
				type: "state",
				state: {
					id: "game-1",
					tableId: "table-1",
					botControlByPlayer: {},
					presenceByPlayer: {},
					botRoundScope: "current-round",
				},
				isSpectator: true,
			},
			{ type: "error", message: "Fehler" },
			{ type: "game-started", gameId: "game-1" },
			{ type: "spectator-count", gameId: "game-1", count: 3 },
			{ type: "redirect-to-lobby", tableId: "table-1" },
			{ type: "chat-history", messages: [validChatMessage] },
			{ type: "chat-message", message: validChatMessage },
		];

		for (const payload of validMessages) {
			expectValid(gameMessageSchema, payload);
		}
	});

	it("rejects payloads with missing required fields", () => {
		expectInvalid(gameMessageSchema, { type: "error" });
		expectInvalid(gameMessageSchema, { type: "game-started" });
		expectInvalid(gameMessageSchema, {
			type: "spectator-count",
			gameId: "game-1",
		});
		expectInvalid(gameMessageSchema, { type: "redirect-to-lobby" });
	});

	it("rejects payloads with invalid field types", () => {
		expectInvalid(gameMessageSchema, {
			type: "spectator-count",
			gameId: "game-1",
			count: "3",
		});
		expectInvalid(gameMessageSchema, {
			type: "state",
			state: null,
		});
		expectInvalid(gameMessageSchema, {
			type: "state",
			state: "not-an-object",
		});
		expectInvalid(gameMessageSchema, {
			type: "chat-history",
			messages: [{ ...validChatMessage, createdAt: "now" }],
		});
		expectInvalid(gameMessageSchema, {
			type: "chat-message",
			message: {
				...validChatMessage,
				author: { ...validChatMessage.author, role: "invalid" },
			},
		});
	});
});
