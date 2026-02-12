import type * as Party from "partykit/server";
import { env } from "@/env";
import { createWaitingGameState } from "../../game-state-factory";
import {
	findPlayerTable,
	leaveTable as leaveTableRoom,
	updatePlayerInfo as updateTableRoomPlayerInfo,
} from "../../table-room";
import type { Player } from "../../types";
import type Server from "../game-lifecycle";

export async function onRequest(server: Server, req: Party.Request) {
	if (req.method !== "POST") {
		return new Response("Method not allowed", { status: 405 });
	}

	const authHeader = req.headers.get("Authorization");
	const apiSecret = env.PARTYKIT_API_SECRET || "";
	if (authHeader !== `Bearer ${apiSecret}`) {
		return new Response("Unauthorized", { status: 401 });
	}

	try {
		const body = (await req.json()) as {
			type: string;
			playerId: string;
			name?: string;
			image?: string | null;
			tableId?: string;
			gameId?: string;
			player?: Player;
		};

		if (
			body.type === "ensure-player-at-table" &&
			server.room.id === "tables-room" &&
			body.tableId &&
			body.gameId &&
			body.player
		) {
			const table = server.tables.get(body.tableId);
			if (!table) {
				return new Response("OK", { status: 200 });
			}

			if (!table.gameId) {
				table.gameId = body.gameId;
			}

			if (table.gameId !== body.gameId) {
				return new Response("OK", { status: 200 });
			}

			const isAlreadyAtTable = table.players.some(
				(player) => player.id === body.player?.id,
			);
			if (isAlreadyAtTable) {
				return new Response("OK", { status: 200 });
			}

			const existingTable = findPlayerTable(server.tables, body.player.id);
			if (existingTable && existingTable.id !== table.id) {
				return new Response("OK", { status: 200 });
			}

			if (table.players.length >= 4) {
				return new Response("OK", { status: 200 });
			}

			table.players.push(body.player);
			await server.persistTables();
			server.broadcastState();
			return new Response("OK", { status: 200 });
		}

		if (
			body.type === "leave-table" &&
			server.room.id === "tables-room" &&
			body.tableId
		) {
			await leaveTableRoom(
				server.getTableRoomContext(),
				body.tableId,
				body.playerId,
			);
			return new Response("OK", { status: 200 });
		}

		if (body.type === "update-player-info") {
			if (server.room.id === "tables-room") {
				const gameIds = await updateTableRoomPlayerInfo(
					server.getTableRoomContext(),
					body.playerId,
					body.name ?? "",
					body.image,
				);
				return Response.json({ gameIds });
			}
			if (server.room.id.startsWith("game-")) {
				await server.updateGamePlayerInfo(
					body.playerId,
					body.name ?? "",
					body.image,
				);
			}
			return new Response("OK", { status: 200 });
		}

		if (
			body.type === "add-player" &&
			server.room.id.startsWith("game-") &&
			body.player
		) {
			const player = body.player;
			const gameState = server.games.get(server.room.id);
			if (!gameState) {
				return new Response("Game not found", { status: 404 });
			}

			if (gameState.players.some((p) => p.id === player.id)) {
				return new Response("OK", { status: 200 });
			}

			if (gameState.gameStarted || gameState.players.length >= 4) {
				return new Response("Game not joinable", { status: 409 });
			}

			gameState.players.push(player);
			if (gameState.players.length === 4) {
				await server.restartGame(gameState);
			} else {
				await server.persistAndBroadcastGame(gameState);
			}
			return new Response("OK", { status: 200 });
		}

		if (
			body.type === "init-game" &&
			server.room.id.startsWith("game-") &&
			body.player &&
			body.tableId
		) {
			if (!server.games.has(server.room.id)) {
				const waitingState = createWaitingGameState({
					gameId: server.room.id,
					tableId: body.tableId,
					players: [body.player],
					round: 1,
				});
				server.games.set(server.room.id, waitingState);
				await server.persistGameState(waitingState);
			}
			return new Response("OK", { status: 200 });
		}

		return new Response("Unknown event type", { status: 400 });
	} catch {
		return new Response("Invalid request body", { status: 400 });
	}
}
