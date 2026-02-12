import type * as Party from "partykit/server";
import type { ChatMessage, GameMessage } from "../types";
import type Server from "./game-lifecycle";

const CHAT_HISTORY_LIMIT = 100;
const CHAT_RATE_LIMIT_MS = 1_000;

export interface ChatParticipant {
	gameId: string;
	tableId: string;
	participantId: string;
	name: string;
	image?: string | null;
	role: "player" | "spectator";
}

export interface ChatPresenceEntry extends ChatParticipant {
	count: number;
}

interface ChatConnectionRegistrationResult {
	participant: ChatParticipant | null;
	joinedParticipant: ChatParticipant | null;
	leftParticipant: ChatParticipant | null;
}

function makePresenceKey(tableId: string, participantId: string): string {
	return `${tableId}:${participantId}`;
}

function makeRateLimitKey(tableId: string, participantId: string): string {
	return `${tableId}:${participantId}`;
}

function cloneParticipant(entry: ChatPresenceEntry): ChatParticipant {
	return {
		gameId: entry.gameId,
		tableId: entry.tableId,
		participantId: entry.participantId,
		name: entry.name,
		image: entry.image,
		role: entry.role,
	};
}

function decrementPresenceByKey(
	server: Server,
	presenceKey: string,
): ChatParticipant | null {
	const entry = server.chatPresenceByKey.get(presenceKey);
	if (!entry) return null;

	if (entry.count > 1) {
		entry.count -= 1;
		server.chatPresenceByKey.set(presenceKey, entry);
		return null;
	}

	server.chatPresenceByKey.delete(presenceKey);
	server.chatLastMessageAtByParticipant.delete(
		makeRateLimitKey(entry.tableId, entry.participantId),
	);
	return cloneParticipant(entry);
}

export function resolveChatParticipant(
	server: Server,
	connectionId: string,
): ChatParticipant | null {
	const playerInfo = server.connectionToPlayer.get(connectionId);
	if (playerInfo) {
		const gameState = server.games.get(playerInfo.gameId);
		if (!gameState) return null;

		const player = gameState.players.find((p) => p.id === playerInfo.playerId);
		if (!player) return null;

		return {
			gameId: gameState.id,
			tableId: gameState.tableId,
			participantId: player.id,
			name: player.name,
			image: player.image,
			role: "player",
		};
	}

	const spectatorInfo = server.connectionToSpectator.get(connectionId);
	if (!spectatorInfo) return null;

	const gameState = server.games.get(spectatorInfo.gameId);
	if (!gameState) return null;

	return {
		gameId: spectatorInfo.gameId,
		tableId: gameState.tableId,
		participantId: spectatorInfo.spectatorId,
		name: spectatorInfo.spectatorName,
		image: spectatorInfo.spectatorImage,
		role: "spectator",
	};
}

export function appendChatMessage(server: Server, message: ChatMessage): void {
	const existing = server.chatMessagesByTable.get(message.tableId) ?? [];
	existing.push(message);

	if (existing.length > CHAT_HISTORY_LIMIT) {
		existing.splice(0, existing.length - CHAT_HISTORY_LIMIT);
	}

	server.chatMessagesByTable.set(message.tableId, existing);
}

export function sendChatHistory(
	server: Server,
	conn: Party.Connection,
	tableId: string,
): void {
	const messages = server.chatMessagesByTable.get(tableId) ?? [];
	const payload: GameMessage = {
		type: "chat-history",
		messages,
	};
	conn.send(JSON.stringify(payload));
}

export function broadcastChatMessage(
	server: Server,
	gameId: string,
	message: ChatMessage,
): void {
	const playerConnections = server.playerConnections.get(gameId);
	const spectatorConnections = server.spectatorConnections.get(gameId);
	const payload: GameMessage = {
		type: "chat-message",
		message,
	};
	const serializedPayload = JSON.stringify(payload);

	for (const conn of server.room.getConnections()) {
		if (playerConnections?.has(conn.id) || spectatorConnections?.has(conn.id)) {
			conn.send(serializedPayload);
		}
	}
}

export function createChatMessage(
	tableId: string,
	text: string,
	author: {
		id: string;
		name: string;
		image?: string | null;
		role: "player" | "spectator" | "system";
	},
): ChatMessage {
	return {
		id: `chat-${crypto.randomUUID()}`,
		tableId,
		text,
		createdAt: Date.now(),
		author,
	};
}

export function registerChatConnection(
	server: Server,
	conn: Party.Connection,
): ChatConnectionRegistrationResult {
	const participant = resolveChatParticipant(server, conn.id);
	if (!participant) {
		return {
			participant: null,
			joinedParticipant: null,
			leftParticipant: null,
		};
	}

	const presenceKey = makePresenceKey(
		participant.tableId,
		participant.participantId,
	);
	const previousPresenceKey = server.chatPresenceKeyByConnection.get(conn.id);
	let leftParticipant: ChatParticipant | null = null;

	if (previousPresenceKey && previousPresenceKey !== presenceKey) {
		leftParticipant = decrementPresenceByKey(server, previousPresenceKey);
	}

	if (previousPresenceKey === presenceKey) {
		const existingEntry = server.chatPresenceByKey.get(presenceKey);
		if (existingEntry) {
			existingEntry.gameId = participant.gameId;
			existingEntry.name = participant.name;
			existingEntry.image = participant.image;
			existingEntry.role = participant.role;
			server.chatPresenceByKey.set(presenceKey, existingEntry);
		}
		sendChatHistory(server, conn, participant.tableId);
		return {
			participant,
			joinedParticipant: null,
			leftParticipant,
		};
	}

	const existingEntry = server.chatPresenceByKey.get(presenceKey);
	if (existingEntry) {
		existingEntry.count += 1;
		existingEntry.gameId = participant.gameId;
		existingEntry.name = participant.name;
		existingEntry.image = participant.image;
		existingEntry.role = participant.role;
		server.chatPresenceByKey.set(presenceKey, existingEntry);
		server.chatPresenceKeyByConnection.set(conn.id, presenceKey);
		sendChatHistory(server, conn, participant.tableId);
		return {
			participant,
			joinedParticipant: null,
			leftParticipant,
		};
	}

	server.chatPresenceByKey.set(presenceKey, {
		...participant,
		count: 1,
	});
	server.chatPresenceKeyByConnection.set(conn.id, presenceKey);
	sendChatHistory(server, conn, participant.tableId);
	return {
		participant,
		joinedParticipant: participant,
		leftParticipant,
	};
}

export function unregisterChatConnection(
	server: Server,
	connectionId: string,
): ChatParticipant | null {
	const presenceKey = server.chatPresenceKeyByConnection.get(connectionId);
	if (!presenceKey) return null;

	server.chatPresenceKeyByConnection.delete(connectionId);
	return decrementPresenceByKey(server, presenceKey);
}

export function checkAndSetChatRateLimit(
	server: Server,
	tableId: string,
	participantId: string,
): boolean {
	const rateLimitKey = makeRateLimitKey(tableId, participantId);
	const now = Date.now();
	const lastSentAt = server.chatLastMessageAtByParticipant.get(rateLimitKey);
	if (lastSentAt && now - lastSentAt < CHAT_RATE_LIMIT_MS) {
		return false;
	}

	server.chatLastMessageAtByParticipant.set(rateLimitKey, now);
	return true;
}
