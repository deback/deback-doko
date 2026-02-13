import type * as Party from "partykit/server";
import {
	createStartedGameState,
	createWaitingGameState,
} from "../game-state-factory";
import { logger } from "../logger";
import type {
	GameMessage,
	GameState,
	Player,
	Table,
	TableMessage,
} from "../types";
import type Server from "./game-lifecycle";

export async function startGame(server: Server, table: Table) {
	const gameId =
		table.gameId ??
		`game-${Date.now()}-${Math.random().toString(36).substring(7)}`;
	table.gameId = gameId;
	table.gameStarted = true;

	await server.persistTables();

	const message: TableMessage = {
		type: "game-started",
		gameId,
		tableId: table.id,
		players: table.players,
	};
	server.room.broadcast(JSON.stringify(message));

	server.broadcastState();
}

export async function updateGamePlayerInfo(
	server: Server,
	playerId: string,
	name: string,
	image?: string | null,
) {
	const gameState = server.games.get(server.room.id);
	if (!gameState) return;

	let changed = false;

	const player = gameState.players.find((p) => p.id === playerId);
	if (player) {
		player.name = name;
		if (image !== undefined) player.image = image;
		changed = true;
	}

	const spectator = gameState.spectators.find((s) => s.id === playerId);
	if (spectator) {
		spectator.name = name;
		if (image !== undefined) spectator.image = image;
		changed = true;
	}

	for (const info of server.connectionToSpectator.values()) {
		if (info.spectatorId === playerId) {
			info.spectatorName = name;
			if (image !== undefined) info.spectatorImage = image;
			changed = true;
		}
	}

	if (changed) {
		await server.persistAndBroadcastGame(gameState);
	}
}

export async function handleResetGame(
	server: Server,
	sender: Party.Connection,
) {
	const gameState = server.games.get(server.room.id);
	if (!gameState) {
		server.sendGameError(sender, "Kein Spiel gefunden.");
		return;
	}

	await server.restartGame(gameState);
}

export async function handleToggleStandUp(
	server: Server,
	playerId: string,
	sender: Party.Connection,
) {
	const gameState = server.games.get(server.room.id);
	if (!gameState) {
		server.sendGameError(sender, "Kein Spiel gefunden.");
		return;
	}

	const isPlayer = gameState.players.some((p) => p.id === playerId);
	if (!isPlayer) return;

	if (!gameState.gameStarted) {
		gameState.players = gameState.players.filter((p) => p.id !== playerId);

		const msg: GameMessage = {
			type: "redirect-to-lobby",
			tableId: gameState.tableId,
		};
		sender.send(JSON.stringify(msg));

		const connId = sender.id;
		server.playerConnections.get(server.room.id)?.delete(connId);
		server.connectionToPlayer.delete(connId);

		server.partykitHttp.removePlayerFromTable(gameState.tableId, playerId);

		await server.persistAndBroadcastGame(gameState);
		return;
	}

	const idx = gameState.standingUpPlayers.indexOf(playerId);
	if (idx === -1) {
		gameState.standingUpPlayers.push(playerId);
	} else {
		gameState.standingUpPlayers.splice(idx, 1);
	}

	await server.persistAndBroadcastGame(gameState);
}

export async function startGameRoom(
	server: Server,
	players: Player[],
	tableId: string,
) {
	const gameId = server.room.id;
	const existingGame = server.games.get(gameId);
	if (existingGame) {
		if (!existingGame.gameStarted && existingGame.players.length < 4) {
			await server.restartGame({
				...existingGame,
				players,
			});
		}
		return;
	}
	const gameState = createStartedGameState({
		gameId,
		tableId,
		players,
		round: 1,
		currentPlayerIndex: 0,
	});

	server.games.set(gameId, gameState);
	await server.persistAndBroadcastGame(gameState);
}

export async function restartGame(server: Server, oldGameState: GameState) {
	logger.debug("[restartGame] Starting restart for game:", oldGameState.id);
	const gameId = server.room.id;
	const tableId = oldGameState.tableId;
	const newRound = oldGameState.round + 1;
	server.clearBotRuntimeForGame(gameId);

	const standingPlayers = oldGameState.standingUpPlayers ?? [];
	const remainingPlayers = oldGameState.players.filter(
		(p) => !standingPlayers.includes(p.id),
	);

	for (const playerId of standingPlayers) {
		for (const [connId, info] of server.connectionToPlayer.entries()) {
			if (info.gameId === gameId && info.playerId === playerId) {
				const conn = server.room.getConnection(connId);
				if (conn) {
					const msg: GameMessage = {
						type: "redirect-to-lobby",
						tableId,
					};
					conn.send(JSON.stringify(msg));
				}
				server.playerConnections.get(gameId)?.delete(connId);
				server.connectionToPlayer.delete(connId);
			}
		}

		server.partykitHttp.removePlayerFromTable(tableId, playerId);
	}

	if (remainingPlayers.length < 4) {
		logger.info(
			`[restartGame] Only ${remainingPlayers.length} players remaining, entering waiting state`,
		);
		const waitingState = createWaitingGameState({
			gameId,
			tableId,
			players: remainingPlayers,
			round: newRound,
			spectatorCount: oldGameState.spectatorCount,
			spectators: oldGameState.spectators,
		});
		server.games.set(gameId, waitingState);
		await server.persistAndBroadcastGame(waitingState);
		return;
	}

	const gameState = createStartedGameState({
		gameId,
		tableId,
		players: remainingPlayers,
		round: newRound,
		currentPlayerIndex: (newRound - 1) % 4,
		spectatorCount: oldGameState.spectatorCount,
		spectators: oldGameState.spectators,
	});

	server.games.set(gameId, gameState);
	await server.persistAndBroadcastGame(gameState);
}
