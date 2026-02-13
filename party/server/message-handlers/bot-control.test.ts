import type * as Party from "partykit/server";
import { describe, expect, it, vi } from "vitest";
import type Server from "../game-lifecycle";
import {
	assertSenderOwnsPlayerId,
	getAuthorizedSenderPlayerId,
	handleBotControl,
} from "./bot-control";

function createConnection(id: string): Party.Connection {
	return {
		id,
		send: vi.fn(),
	} as unknown as Party.Connection;
}

function createServer(): Server {
	return {
		room: { id: "game-1" },
		games: new Map([
			[
				"game-1",
				{
					id: "game-1",
					players: [{ id: "player-1" }, { id: "player-2" }],
				},
			],
		]),
		connectionToPlayer: new Map<string, { gameId: string; playerId: string }>(),
		sendGameError: vi.fn(),
		handleBotControl: vi.fn(),
	} as unknown as Server;
}

describe("message-handlers/bot-control", () => {
	it("returns sender player id for active game players", () => {
		const server = createServer();
		server.connectionToPlayer.set("conn-1", {
			gameId: "game-1",
			playerId: "player-1",
		});

		const sender = createConnection("conn-1");
		const playerId = getAuthorizedSenderPlayerId(server, sender);

		expect(playerId).toBe("player-1");
		expect(server.sendGameError).not.toHaveBeenCalled();
	});

	it("rejects unknown or inactive senders", () => {
		const server = createServer();
		server.connectionToPlayer.set("conn-2", {
			gameId: "game-1",
			playerId: "player-999",
		});

		const sender = createConnection("conn-2");
		const playerId = getAuthorizedSenderPlayerId(server, sender);

		expect(playerId).toBeNull();
		expect(server.sendGameError).toHaveBeenCalledWith(
			sender,
			"Nicht autorisiert.",
		);
	});

	it("enforces sender ownership for player-bound events", () => {
		const server = createServer();
		server.connectionToPlayer.set("conn-1", {
			gameId: "game-1",
			playerId: "player-1",
		});
		const sender = createConnection("conn-1");

		expect(assertSenderOwnsPlayerId(server, sender, "player-1")).toBe(true);
		expect(assertSenderOwnsPlayerId(server, sender, "player-2")).toBe(false);
	});

	it("forwards authorized bot-control requests to server orchestrator", async () => {
		const server = createServer();
		server.connectionToPlayer.set("conn-1", {
			gameId: "game-1",
			playerId: "player-1",
		});
		const sender = createConnection("conn-1");

		await handleBotControl(server, "takeover", "player-2", sender);

		expect(server.handleBotControl).toHaveBeenCalledWith(
			"takeover",
			"player-2",
			"player-1",
			sender,
		);
	});
});
