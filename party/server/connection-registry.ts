import type * as Party from "partykit/server";
import type { GameMessage, GameState } from "../types";
import type Server from "./game-lifecycle";

const WAITING_RECONNECT_GRACE_MS = 8_000;

export function getWaitingDisconnectKey(
	_server: Server,
	gameId: string,
	playerId: string,
) {
	return `${gameId}:${playerId}`;
}

export function clearWaitingPlayerDisconnectTimer(
	server: Server,
	gameId: string,
	playerId: string,
) {
	const key = server.getWaitingDisconnectKey(gameId, playerId);
	const timer = server.waitingPlayerDisconnectTimers.get(key);
	if (!timer) return;

	clearTimeout(timer);
	server.waitingPlayerDisconnectTimers.delete(key);
}

export function hasOtherActivePlayerConnection(
	server: Server,
	gameId: string,
	playerId: string,
	excludeConnId?: string,
): boolean {
	for (const [connId, info] of server.connectionToPlayer.entries()) {
		if (excludeConnId && connId === excludeConnId) continue;
		if (info.gameId === gameId && info.playerId === playerId) {
			return true;
		}
	}
	return false;
}

export function scheduleWaitingPlayerDisconnect(
	server: Server,
	gameId: string,
	playerId: string,
) {
	const key = server.getWaitingDisconnectKey(gameId, playerId);
	if (server.waitingPlayerDisconnectTimers.has(key)) return;

	const timer = setTimeout(() => {
		void server.handleWaitingPlayerDisconnect(gameId, playerId);
	}, WAITING_RECONNECT_GRACE_MS);

	server.waitingPlayerDisconnectTimers.set(key, timer);
}

export async function handleWaitingPlayerDisconnect(
	server: Server,
	gameId: string,
	playerId: string,
) {
	server.clearWaitingPlayerDisconnectTimer(gameId, playerId);

	if (server.hasOtherActivePlayerConnection(gameId, playerId)) {
		return;
	}

	const gameState = server.games.get(gameId);
	if (!gameState || gameState.gameStarted) {
		return;
	}

	const wasPlayer = gameState.players.some((player) => player.id === playerId);
	if (!wasPlayer) {
		return;
	}

	gameState.players = gameState.players.filter((p) => p.id !== playerId);
	if (gameState.players.length === 0) {
		server.games.delete(gameId);
		await server.room.storage.delete("gameState");
	} else {
		await server.persistAndBroadcastGame(gameState);
	}

	server.partykitHttp.removePlayerFromTable(gameState.tableId, playerId);
}

export async function removePlayerAsSpectator(
	server: Server,
	gameId: string,
	playerId: string,
) {
	const spectators = server.spectatorConnections.get(gameId);
	if (!spectators || spectators.size === 0) return;

	let removed = false;
	for (const connId of Array.from(spectators)) {
		const info = server.connectionToSpectator.get(connId);
		if (info?.spectatorId !== playerId) continue;

		spectators.delete(connId);
		server.connectionToSpectator.delete(connId);
		removed = true;
	}

	if (!removed) return;

	const gameState = server.games.get(gameId);
	if (!gameState) return;

	gameState.spectatorCount = spectators.size;
	gameState.spectators = server.getSpectatorList(gameId);
	server.broadcastGameState(gameState);
	await server.updateTableSpectatorCount(
		gameState.tableId,
		gameState.spectatorCount,
	);
}

export async function addSpectator(
	server: Server,
	gameId: string,
	spectatorId: string,
	spectatorName: string,
	spectatorImage: string | null | undefined,
	conn: Party.Connection,
) {
	if (!server.spectatorConnections.has(gameId)) {
		server.spectatorConnections.set(gameId, new Set());
	}
	const spectators = server.spectatorConnections.get(gameId);
	if (spectators) {
		spectators.add(conn.id);
	}
	server.connectionToSpectator.set(conn.id, {
		gameId,
		spectatorId,
		spectatorName,
		spectatorImage,
	});

	const gameState = server.games.get(gameId);
	if (gameState) {
		gameState.spectatorCount =
			server.spectatorConnections.get(gameId)?.size || 0;
		gameState.spectators = server.getSpectatorList(gameId);

		server.sendSpectatorState(conn, gameState);
		server.onChatParticipantConnected(conn);
		server.broadcastGameState(gameState);
		await server.updateTableSpectatorCount(
			gameState.tableId,
			gameState.spectatorCount,
		);
	}
}

export function getSpectatorList(
	server: Server,
	gameId: string,
): Array<{ id: string; name: string; image?: string | null }> {
	const spectatorList: Array<{
		id: string;
		name: string;
		image?: string | null;
	}> = [];
	const spectatorConnIds = server.spectatorConnections.get(gameId);
	if (spectatorConnIds) {
		for (const connId of spectatorConnIds) {
			const info = server.connectionToSpectator.get(connId);
			if (info) {
				spectatorList.push({
					id: info.spectatorId,
					name: info.spectatorName,
					image: info.spectatorImage,
				});
			}
		}
	}
	return spectatorList;
}

export async function removeSpectator(
	server: Server,
	gameId: string,
	connectionId: string,
) {
	const spectators = server.spectatorConnections.get(gameId);
	if (spectators) {
		spectators.delete(connectionId);

		const gameState = server.games.get(gameId);
		if (gameState) {
			gameState.spectatorCount = spectators.size;
			gameState.spectators = server.getSpectatorList(gameId);

			server.broadcastGameState(gameState);
			await server.updateTableSpectatorCount(
				gameState.tableId,
				gameState.spectatorCount,
			);
		}
	}
}

export async function updateTableSpectatorCount(
	server: Server,
	tableId: string,
	count: number,
) {
	const table = server.tables.get(tableId);
	if (table) {
		table.spectatorCount = count;
		await server.persistTables();
		server.broadcastState();
	}
}

export function createSpectatorView(
	_server: Server,
	gameState: GameState,
): GameState {
	const handCounts: Record<string, number> = {};
	for (const [playerId, hand] of Object.entries(gameState.hands)) {
		handCounts[playerId] = hand.length;
	}

	return {
		...gameState,
		hands: {},
		handCounts,
		initialHands: {},
	};
}

export function sendSpectatorState(
	server: Server,
	conn: Party.Connection,
	gameState: GameState,
) {
	const spectatorView = server.createSpectatorView(gameState);
	const message: GameMessage = {
		type: "state",
		state: spectatorView,
		isSpectator: true,
	};
	conn.send(JSON.stringify(message));
}

export function broadcastToSpectators(server: Server, gameState: GameState) {
	const spectators = server.spectatorConnections.get(gameState.id);
	if (!spectators || spectators.size === 0) return;

	const spectatorView = server.createSpectatorView(gameState);
	const message: GameMessage = {
		type: "state",
		state: spectatorView,
		isSpectator: true,
	};
	const messageStr = JSON.stringify(message);

	for (const conn of server.room.getConnections()) {
		if (spectators.has(conn.id)) {
			conn.send(messageStr);
		}
	}
}
