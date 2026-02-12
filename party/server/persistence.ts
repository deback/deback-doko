import { env } from "@/env";
import { calculateBalanceChange, isSoloGame } from "../../src/lib/game/rules";
import { logger } from "../logger";
import type { GameState, Table } from "../types";
import type Server from "./game-lifecycle";

export async function onStart(server: Server) {
	logger.debug("[onStart] Room:", server.room.id);
	if (server.room.id === "tables-room") {
		const storedTables = await server.room.storage.get<Table[]>("tables");
		if (storedTables) {
			server.tables = new Map(storedTables.map((t) => [t.id, t]));
		}
	} else if (server.room.id.startsWith("game-")) {
		const storedGame = await server.room.storage.get<GameState>("gameState");
		logger.debug(
			"[onStart] Loaded game:",
			storedGame?.id,
			"gameEnded:",
			storedGame?.gameEnded,
		);
		if (storedGame) {
			server.games.set(server.room.id, storedGame);

			if (storedGame.gameEnded) {
				logger.info("[onStart] Game is ended, scheduling restart in 5 seconds");
				const RESTART_DELAY = 5000;
				setTimeout(() => {
					logger.info("[onStart] Restarting game now...");
					server.restartGame(storedGame);
				}, RESTART_DELAY);
			}
		}
	}
}

export async function persistTables(server: Server) {
	if (server.room.id === "tables-room") {
		await server.room.storage.put("tables", Array.from(server.tables.values()));
	}
}

export async function persistGameState(server: Server, gameState: GameState) {
	await server.room.storage.put("gameState", gameState);
}

export async function persistAndBroadcastGame(
	server: Server,
	gameState: GameState,
) {
	await server.persistGameState(gameState);
	server.broadcastGameState(gameState);
	server.broadcastToSpectators(gameState);
}

export async function saveGameResults(_server: Server, gameState: GameState) {
	const gpr = gameState.gamePointsResult;
	if (!gpr) return;

	const isSolo = isSoloGame(gameState.contractType, gameState.teams);

	const playerResults = gameState.players.map((player) => {
		const team = gameState.teams[player.id] || "kontra";
		const won = team === "re" ? gpr.reWon : gpr.kontraWon;
		const balanceChange = calculateBalanceChange(
			gpr.netGamePoints,
			team,
			isSolo,
		);

		return {
			id: player.id,
			name: player.name,
			score: gameState.scores[player.id] || 0,
			team,
			won,
			balanceChange,
			gamePoints: team === "re" ? gpr.netGamePoints : -gpr.netGamePoints,
		};
	});

	const apiUrl = env.BETTER_AUTH_URL || "http://localhost:3000";
	const apiSecret = env.PARTYKIT_API_SECRET || "";

	try {
		await fetch(`${apiUrl}/api/game-results`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiSecret}`,
			},
			body: JSON.stringify({
				gameId: `${gameState.id}-r${gameState.round}`,
				tableId: gameState.tableId,
				players: playerResults,
				tricks: gameState.completedTricks.map((trick) => ({
					cards: trick.cards,
					winnerId: trick.winnerId,
					points: trick.points ?? 0,
				})),
				initialHands: gameState.initialHands ?? {},
				announcements: gameState.announcements,
				contractType: gameState.contractType,
				schweinereiPlayers: gameState.schweinereiPlayers,
				gamePoints: gpr,
			}),
		});
	} catch (error) {
		logger.error("Failed to save game results:", error);
	}
}
