import type * as Party from "partykit/server";
import { logger } from "../../logger";
import { gameEventSchema, tableEventSchema } from "../../schemas";
import {
	findPlayerTable,
	handleTableEvent,
	leaveTable as leaveTableRoom,
} from "../../table-room";
import type { GameEvent, TableEvent } from "../../types";
import type Server from "../game-lifecycle";

export function onConnect(
	server: Server,
	conn: Party.Connection,
	ctx: Party.ConnectionContext,
) {
	logger.debug(
		`Connected: id: ${conn.id}, room: ${server.room.id}, url: ${new URL(ctx.request.url).pathname}`,
	);

	if (server.room.id === "tables-room") {
		server.sendState(conn);
	}
}

export async function onClose(server: Server, conn: Party.Connection) {
	const closingPlayerInfo = server.connectionToPlayer.get(conn.id);
	const closingSpectatorInfo = server.connectionToSpectator.get(conn.id);

	if (server.room.id === "tables-room") {
		const playerId = server.connectionToTablePlayer.get(conn.id);
		if (playerId) {
			server.connectionToTablePlayer.delete(conn.id);
			const table = findPlayerTable(server.tables, playerId);
			if (table && !table.gameStarted && !table.gameId) {
				await leaveTableRoom(server.getTableRoomContext(), table.id, playerId);
			}
		}
	}

	if (
		server.room.id.startsWith("game-") &&
		closingPlayerInfo &&
		!closingSpectatorInfo
	) {
		const gameState = server.games.get(closingPlayerInfo.gameId);
		if (gameState && !gameState.gameStarted) {
			const hasOtherConnection = server.hasOtherActivePlayerConnection(
				closingPlayerInfo.gameId,
				closingPlayerInfo.playerId,
				conn.id,
			);
			if (!hasOtherConnection) {
				server.scheduleWaitingPlayerDisconnect(
					closingPlayerInfo.gameId,
					closingPlayerInfo.playerId,
				);
			}
		}
	}

	server.detachPlayerConnection(conn.id);

	if (
		closingPlayerInfo &&
		!closingSpectatorInfo &&
		server.room.id.startsWith("game-")
	) {
		await server.markPlayerDisconnected(
			closingPlayerInfo.gameId,
			closingPlayerInfo.playerId,
		);
	}

	if (closingSpectatorInfo) {
		await server.removeSpectator(closingSpectatorInfo.gameId, conn.id);
		server.connectionToSpectator.delete(conn.id);
	}

	if (server.room.id.startsWith("game-")) {
		server.onChatParticipantDisconnected(conn.id);
	}
}

export function onMessage(
	server: Server,
	message: string,
	sender: Party.Connection,
) {
	if (server.room.id.startsWith("game-")) {
		try {
			const parsed = gameEventSchema.safeParse(JSON.parse(message));
			if (!parsed.success) {
				server.sendGameError(sender, "Ungültiges Nachrichtenformat");
				return;
			}
			server.handleGameEvent(parsed.data as GameEvent, sender);
		} catch (error) {
			logger.error("Error parsing message:", error);
			server.sendGameError(sender, "Ungültiges Nachrichtenformat");
		}
		return;
	}

	if (server.room.id === "tables-room") {
		try {
			const parsed = tableEventSchema.safeParse(JSON.parse(message));
			if (!parsed.success) {
				server.sendError(sender, "Ungültiges Nachrichtenformat");
				return;
			}
			handleTableEvent(
				server.getTableRoomContext(),
				parsed.data as TableEvent,
				sender,
			);
		} catch (error) {
			logger.error("Error parsing message:", error);
			server.sendError(sender, "Ungültiges Nachrichtenformat");
		}
	}
}
