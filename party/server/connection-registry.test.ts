import type * as Party from "partykit/server";
import { describe, expect, it, vi } from "vitest";
import type { GameState } from "../types";
import { addSpectator, detachPlayerConnection } from "./connection-registry";
import type Server from "./game-lifecycle";

function createConnection(id: string): Party.Connection {
	return {
		id,
		send: vi.fn(),
	} as unknown as Party.Connection;
}

function createServer() {
	const gameId = "game-1";
	const gameState = {
		id: gameId,
		tableId: "table-1",
		spectatorCount: 0,
		spectators: [],
	} as unknown as GameState;

	const server = {
		room: { id: gameId },
		playerConnections: new Map<string, Set<string>>([
			[gameId, new Set()],
			["game-2", new Set()],
		]),
		connectionToPlayer: new Map<string, { gameId: string; playerId: string }>(),
		spectatorConnections: new Map<string, Set<string>>(),
		connectionToSpectator: new Map<
			string,
			{
				gameId: string;
				spectatorId: string;
				spectatorName: string;
				spectatorImage?: string | null;
			}
		>(),
		games: new Map([[gameId, gameState]]),
		markPlayerDisconnected: vi.fn(async () => {}),
		sendGameError: vi.fn(),
		sendSpectatorState: vi.fn(),
		onChatParticipantConnected: vi.fn(),
		broadcastGameState: vi.fn(),
		updateTableSpectatorCount: vi.fn(async () => {}),
	} as unknown as Server;

	const getSpectatorList = vi.fn((requestedGameId: string) => {
		const spectatorIds = server.spectatorConnections.get(requestedGameId);
		if (!spectatorIds) return [];

		const spectators: Array<{
			id: string;
			name: string;
			image?: string | null;
		}> = [];
		for (const connId of spectatorIds) {
			const info = server.connectionToSpectator.get(connId);
			if (!info) continue;
			spectators.push({
				id: info.spectatorId,
				name: info.spectatorName,
				image: info.spectatorImage,
			});
		}
		return spectators;
	});
	(
		server as Server & { getSpectatorList: typeof getSpectatorList }
	).getSpectatorList = getSpectatorList;

	const detachConnection = vi.fn((connectionId: string) =>
		detachPlayerConnection(server, connectionId),
	);
	(
		server as Server & {
			detachPlayerConnection: typeof detachConnection;
		}
	).detachPlayerConnection = detachConnection;

	return {
		server: server as Server & {
			detachPlayerConnection: typeof detachConnection;
			getSpectatorList: typeof getSpectatorList;
		},
		detachConnection,
		getSpectatorList,
	};
}

describe("connection-registry", () => {
	it("detaches a connection from player role maps", () => {
		const server = {
			playerConnections: new Map<string, Set<string>>([
				["game-1", new Set(["conn-1", "conn-2"])],
				["game-2", new Set(["conn-1"])],
			]),
			connectionToPlayer: new Map<string, { gameId: string; playerId: string }>(
				[["conn-1", { gameId: "game-1", playerId: "player-1" }]],
			),
		} as unknown as Server;

		const playerInfo = detachPlayerConnection(server, "conn-1");

		expect(playerInfo).toEqual({ gameId: "game-1", playerId: "player-1" });
		expect(server.connectionToPlayer.has("conn-1")).toBe(false);
		expect(server.playerConnections.get("game-1")?.has("conn-1")).toBe(false);
		expect(server.playerConnections.get("game-2")?.has("conn-1")).toBe(false);
	});

	it("switches a player-bound connection to spectator and marks prior player disconnected", async () => {
		const { server, detachConnection } = createServer();
		const conn = createConnection("conn-1");

		server.connectionToPlayer.set(conn.id, {
			gameId: "game-1",
			playerId: "player-1",
		});
		server.playerConnections.get("game-1")?.add(conn.id);
		server.playerConnections.get("game-2")?.add(conn.id);

		await addSpectator(server, "game-1", "spec-1", "Spectator", null, conn);

		expect(detachConnection).toHaveBeenCalledWith(conn.id);
		expect(server.markPlayerDisconnected).toHaveBeenCalledTimes(1);
		expect(server.markPlayerDisconnected).toHaveBeenCalledWith(
			"game-1",
			"player-1",
		);
		expect(server.connectionToPlayer.has(conn.id)).toBe(false);
		expect(server.playerConnections.get("game-1")?.has(conn.id)).toBe(false);
		expect(server.playerConnections.get("game-2")?.has(conn.id)).toBe(false);
		expect(server.connectionToSpectator.get(conn.id)).toMatchObject({
			gameId: "game-1",
			spectatorId: "spec-1",
			spectatorName: "Spectator",
		});
		expect(server.spectatorConnections.get("game-1")?.has(conn.id)).toBe(true);
		expect(server.sendSpectatorState).toHaveBeenCalledTimes(1);
		expect(server.updateTableSpectatorCount).toHaveBeenCalledWith("table-1", 1);
	});

	it("rejects mismatched gameId without detaching an active player binding", async () => {
		const { server, detachConnection } = createServer();
		const conn = createConnection("conn-1");

		server.connectionToPlayer.set(conn.id, {
			gameId: "game-1",
			playerId: "player-1",
		});
		server.playerConnections.get("game-1")?.add(conn.id);
		server.playerConnections.get("game-2")?.add(conn.id);

		await addSpectator(server, "game-2", "spec-1", "Spectator", null, conn);

		expect(server.sendGameError).toHaveBeenCalledTimes(1);
		expect(server.sendGameError).toHaveBeenCalledWith(
			conn,
			"Kein Spiel gefunden.",
		);
		expect(detachConnection).not.toHaveBeenCalled();
		expect(server.markPlayerDisconnected).not.toHaveBeenCalled();
		expect(server.connectionToPlayer.get(conn.id)).toEqual({
			gameId: "game-1",
			playerId: "player-1",
		});
		expect(server.playerConnections.get("game-1")?.has(conn.id)).toBe(true);
		expect(server.playerConnections.get("game-2")?.has(conn.id)).toBe(true);
		expect(server.connectionToSpectator.has(conn.id)).toBe(false);
		expect(server.spectatorConnections.get("game-2")).toBeUndefined();
		expect(server.sendSpectatorState).not.toHaveBeenCalled();
		expect(server.broadcastGameState).not.toHaveBeenCalled();
		expect(server.updateTableSpectatorCount).not.toHaveBeenCalled();
	});

	it("rejects missing game without detaching an active player binding", async () => {
		const { server, detachConnection } = createServer();
		const conn = createConnection("conn-1");

		server.games.delete("game-1");
		server.connectionToPlayer.set(conn.id, {
			gameId: "game-1",
			playerId: "player-1",
		});
		server.playerConnections.get("game-1")?.add(conn.id);

		await addSpectator(server, "game-1", "spec-1", "Spectator", null, conn);

		expect(server.sendGameError).toHaveBeenCalledTimes(1);
		expect(server.sendGameError).toHaveBeenCalledWith(
			conn,
			"Kein Spiel gefunden.",
		);
		expect(detachConnection).not.toHaveBeenCalled();
		expect(server.markPlayerDisconnected).not.toHaveBeenCalled();
		expect(server.connectionToPlayer.get(conn.id)).toEqual({
			gameId: "game-1",
			playerId: "player-1",
		});
		expect(server.playerConnections.get("game-1")?.has(conn.id)).toBe(true);
		expect(server.connectionToSpectator.has(conn.id)).toBe(false);
		expect(server.sendSpectatorState).not.toHaveBeenCalled();
		expect(server.broadcastGameState).not.toHaveBeenCalled();
		expect(server.updateTableSpectatorCount).not.toHaveBeenCalled();
	});
});
