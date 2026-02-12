import type * as Party from "partykit/server";
import { describe, expect, it, vi } from "vitest";
import {
	appendChatMessage,
	checkAndSetChatRateLimit,
	registerChatConnection,
	unregisterChatConnection,
} from "./chat-registry";
import type Server from "./game-lifecycle";

function createMockServer(): Server {
	return {
		games: new Map(),
		connectionToPlayer: new Map(),
		connectionToSpectator: new Map(),
		chatMessagesByTable: new Map(),
		chatPresenceByKey: new Map(),
		chatPresenceKeyByConnection: new Map(),
		chatLastMessageAtByParticipant: new Map(),
	} as unknown as Server;
}

function createConnection(id: string): Party.Connection {
	return {
		id,
		send: vi.fn(),
	} as unknown as Party.Connection;
}

describe("chat-registry", () => {
	it("keeps only the last 100 messages per table", () => {
		const server = createMockServer();

		for (let i = 0; i < 150; i++) {
			appendChatMessage(server, {
				id: `chat-${i}`,
				tableId: "table-1",
				text: `Nachricht ${i}`,
				createdAt: i,
				author: {
					id: "player-1",
					name: "Alice",
					role: "player",
					image: null,
				},
			});
		}

		const history = server.chatMessagesByTable.get("table-1");
		expect(history).toHaveLength(100);
		expect(history?.[0]?.text).toBe("Nachricht 50");
		expect(history?.[99]?.text).toBe("Nachricht 149");
	});

	it("rate-limits messages to one per second per participant", () => {
		const server = createMockServer();
		const nowSpy = vi.spyOn(Date, "now");

		nowSpy.mockReturnValue(1_000);
		expect(checkAndSetChatRateLimit(server, "table-1", "player-1")).toBe(true);

		nowSpy.mockReturnValue(1_500);
		expect(checkAndSetChatRateLimit(server, "table-1", "player-1")).toBe(false);

		nowSpy.mockReturnValue(2_001);
		expect(checkAndSetChatRateLimit(server, "table-1", "player-1")).toBe(true);

		nowSpy.mockRestore();
	});

	it("deduplicates join/leave across multiple tabs of the same participant", () => {
		const server = createMockServer();
		server.games.set("game-1", {
			id: "game-1",
			tableId: "table-1",
			players: [{ id: "player-1", name: "Alice", image: null }],
		} as never);

		server.connectionToPlayer.set("conn-1", {
			gameId: "game-1",
			playerId: "player-1",
		});
		server.connectionToPlayer.set("conn-2", {
			gameId: "game-1",
			playerId: "player-1",
		});

		const conn1 = createConnection("conn-1");
		const conn2 = createConnection("conn-2");

		const firstJoin = registerChatConnection(server, conn1);
		const secondJoin = registerChatConnection(server, conn2);
		const firstLeave = unregisterChatConnection(server, "conn-1");
		const secondLeave = unregisterChatConnection(server, "conn-2");

		expect(firstJoin.joinedParticipant?.participantId).toBe("player-1");
		expect(secondJoin.joinedParticipant).toBeNull();
		expect(firstLeave).toBeNull();
		expect(secondLeave?.participantId).toBe("player-1");
	});
});
