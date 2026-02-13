import type * as Party from "partykit/server";
import type Server from "../game-lifecycle";

export function getAuthorizedSenderPlayerId(
	server: Server,
	sender: Party.Connection,
): string | null {
	const connectionInfo = server.connectionToPlayer.get(sender.id);
	if (!connectionInfo || connectionInfo.gameId !== server.room.id) {
		server.sendGameError(sender, "Nicht autorisiert.");
		return null;
	}

	const gameState = server.games.get(server.room.id);
	const isActivePlayer = gameState?.players.some(
		(player) => player.id === connectionInfo.playerId,
	);
	if (!isActivePlayer) {
		server.sendGameError(sender, "Nicht autorisiert.");
		return null;
	}

	return connectionInfo.playerId;
}

export function assertSenderOwnsPlayerId(
	server: Server,
	sender: Party.Connection,
	playerId: string,
): boolean {
	const senderPlayerId = getAuthorizedSenderPlayerId(server, sender);
	if (!senderPlayerId) return false;
	if (senderPlayerId !== playerId) {
		server.sendGameError(sender, "Nicht autorisiert.");
		return false;
	}
	return true;
}

export async function handleBotControl(
	server: Server,
	action: "takeover" | "release",
	targetPlayerId: string,
	sender: Party.Connection,
): Promise<void> {
	const senderPlayerId = getAuthorizedSenderPlayerId(server, sender);
	if (!senderPlayerId) return;

	await server.handleBotControl(action, targetPlayerId, senderPlayerId, sender);
}
