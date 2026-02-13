import type * as Party from "partykit/server";
import { describe, expect, it, vi } from "vitest";
import type { GameState } from "../../types";
import type Server from "../game-lifecycle";
import { onClose } from "./connection";

type PlayerConnectionInfo = { gameId: string; playerId: string };

function createConnection(id: string): Party.Connection {
	return {
		id,
		send: vi.fn(),
	} as unknown as Party.Connection;
}

function createServer(options?: { gameStarted?: boolean }) {
	const gameId = "game-1";
	const connectionToPlayer = new Map<string, PlayerConnectionInfo>();
	const playerConnections = new Map<string, Set<string>>([[gameId, new Set()]]);

	const server = {
		room: { id: gameId },
		games: new Map([
			[
				gameId,
				{
					id: gameId,
					gameStarted: options?.gameStarted ?? true,
				} as unknown as GameState,
			],
		]),
		tables: new Map(),
		connectionToTablePlayer: new Map<string, string>(),
		playerConnections,
		connectionToPlayer,
		connectionToSpectator: new Map<
			string,
			{
				gameId: string;
				spectatorId: string;
				spectatorName: string;
				spectatorImage?: string | null;
			}
		>(),
		getTableRoomContext: vi.fn(),
		hasOtherActivePlayerConnection: vi.fn(() => false),
		scheduleWaitingPlayerDisconnect: vi.fn(),
		markPlayerDisconnected: vi.fn(async () => {}),
		removeSpectator: vi.fn(async () => {}),
		onChatParticipantDisconnected: vi.fn(),
	} as unknown as Server;

	const detachPlayerConnection = vi.fn((connectionId: string) => {
		const playerInfo = connectionToPlayer.get(connectionId) ?? null;
		for (const players of playerConnections.values()) {
			players.delete(connectionId);
		}
		connectionToPlayer.delete(connectionId);
		return playerInfo;
	});
	(
		server as Server & {
			detachPlayerConnection: typeof detachPlayerConnection;
		}
	).detachPlayerConnection = detachPlayerConnection;

	return {
		server: server as Server & {
			detachPlayerConnection: typeof detachPlayerConnection;
		},
		detachPlayerConnection,
	};
}

describe("message-handlers/connection onClose", () => {
	it("does not mark player disconnected when closing spectator with stale player binding", async () => {
		const { server, detachPlayerConnection } = createServer({
			gameStarted: false,
		});
		const conn = createConnection("conn-1");

		server.connectionToPlayer.set(conn.id, {
			gameId: "game-1",
			playerId: "player-1",
		});
		server.playerConnections.get("game-1")?.add(conn.id);
		server.connectionToSpectator.set(conn.id, {
			gameId: "game-1",
			spectatorId: "spec-1",
			spectatorName: "Spectator",
		});

		await onClose(server, conn);

		expect(server.scheduleWaitingPlayerDisconnect).not.toHaveBeenCalled();
		expect(server.markPlayerDisconnected).not.toHaveBeenCalled();
		expect(server.removeSpectator).toHaveBeenCalledWith("game-1", conn.id);
		expect(detachPlayerConnection).toHaveBeenCalledWith(conn.id);
		expect(server.connectionToPlayer.has(conn.id)).toBe(false);
		expect(server.playerConnections.get("game-1")?.has(conn.id)).toBe(false);
		expect(server.connectionToSpectator.has(conn.id)).toBe(false);
		expect(server.onChatParticipantDisconnected).toHaveBeenCalledWith(conn.id);
	});

	it("marks player disconnected once for a real player connection close", async () => {
		const { server, detachPlayerConnection } = createServer({
			gameStarted: true,
		});
		const conn = createConnection("conn-2");

		server.connectionToPlayer.set(conn.id, {
			gameId: "game-1",
			playerId: "player-2",
		});
		server.playerConnections.get("game-1")?.add(conn.id);

		await onClose(server, conn);

		expect(detachPlayerConnection).toHaveBeenCalledWith(conn.id);
		expect(server.markPlayerDisconnected).toHaveBeenCalledTimes(1);
		expect(server.markPlayerDisconnected).toHaveBeenCalledWith(
			"game-1",
			"player-2",
		);
		expect(server.removeSpectator).not.toHaveBeenCalled();
	});
});
