import type * as Party from "partykit/server";
import {
	appendChatMessage,
	broadcastChatMessage,
	checkAndSetChatRateLimit,
	createChatMessage,
	registerChatConnection,
	resolveChatParticipant,
	unregisterChatConnection,
} from "../chat-registry";
import type Server from "../game-lifecycle";

export function broadcastSystemMessage(
	server: Server,
	params: { gameId: string; tableId: string; text: string },
): void {
	const systemMessage = createChatMessage(params.tableId, params.text, {
		id: "system",
		name: "System",
		image: null,
		role: "system",
	});
	appendChatMessage(server, systemMessage);
	broadcastChatMessage(server, params.gameId, systemMessage);
}

export function sendSystemChatMessage(
	server: Server,
	gameId: string,
	tableId: string,
	text: string,
): void {
	broadcastSystemMessage(server, {
		gameId,
		tableId,
		text,
	});
}

export function onChatParticipantConnected(
	server: Server,
	conn: Party.Connection,
): void {
	const registration = registerChatConnection(server, conn);

	if (registration.leftParticipant) {
		broadcastSystemMessage(server, {
			gameId: registration.leftParticipant.gameId,
			tableId: registration.leftParticipant.tableId,
			text: `${registration.leftParticipant.name} hat den Tisch verlassen.`,
		});
	}

	if (registration.joinedParticipant) {
		broadcastSystemMessage(server, {
			gameId: registration.joinedParticipant.gameId,
			tableId: registration.joinedParticipant.tableId,
			text: `${registration.joinedParticipant.name} ist dem Tisch beigetreten.`,
		});
	}
}

export function onChatParticipantDisconnected(
	server: Server,
	connectionId: string,
): void {
	const leftParticipant = unregisterChatConnection(server, connectionId);
	if (!leftParticipant) return;

	broadcastSystemMessage(server, {
		gameId: leftParticipant.gameId,
		tableId: leftParticipant.tableId,
		text: `${leftParticipant.name} hat den Tisch verlassen.`,
	});
}

export function handleChatSend(
	server: Server,
	text: string,
	sender: Party.Connection,
): void {
	const participant = resolveChatParticipant(server, sender.id);
	if (!participant) {
		server.sendGameError(sender, "Chat nicht verfügbar.");
		return;
	}

	const normalizedText = text.trim();
	if (!normalizedText) {
		server.sendGameError(sender, "Nachricht darf nicht leer sein.");
		return;
	}

	if (normalizedText.length > 500) {
		server.sendGameError(sender, "Nachricht ist zu lang (max. 500 Zeichen).");
		return;
	}

	const canSend = checkAndSetChatRateLimit(
		server,
		participant.tableId,
		participant.participantId,
	);
	if (!canSend) {
		server.sendGameError(
			sender,
			"Bitte warte kurz, bevor du erneut schreibst.",
		);
		return;
	}

	const message = createChatMessage(participant.tableId, normalizedText, {
		id: participant.participantId,
		name: participant.name,
		image: participant.image,
		role: participant.role,
	});
	appendChatMessage(server, message);
	broadcastChatMessage(server, participant.gameId, message);
}
