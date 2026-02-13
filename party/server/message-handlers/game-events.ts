import type * as Party from "partykit/server";
import type { GameEvent } from "../../types";
import type Server from "../game-lifecycle";
import {
	handleResetGame as handleResetGameHandler,
	handleToggleStandUp as handleToggleStandUpHandler,
} from "../game-lifecycle-handlers";
import {
	assertSenderOwnsPlayerId,
	handleBotControl as handleBotControlEvent,
} from "./bot-control";

export async function handleGameEvent(
	server: Server,
	event: GameEvent,
	sender: Party.Connection,
) {
	switch (event.type) {
		case "get-state": {
			const gameState = server.games.get(server.room.id);
			if (gameState) {
				const isPlayer =
					event.playerId &&
					gameState.players.some((p) => p.id === event.playerId);
				if (isPlayer) {
					server.clearWaitingPlayerDisconnectTimer(
						gameState.id,
						event.playerId as string,
					);
					await server.removePlayerAsSpectator(
						gameState.id,
						event.playerId as string,
					);

					const gamePlayer = gameState.players.find(
						(player) => player.id === event.playerId,
					);
					if (gamePlayer) {
						server.partykitHttp.ensurePlayerAtTable(
							gameState.tableId,
							gameState.id,
							gamePlayer,
						);
					}

					if (server.connectionToSpectator.has(sender.id)) {
						await server.removeSpectator(gameState.id, sender.id);
						server.connectionToSpectator.delete(sender.id);
					}

					if (!server.playerConnections.has(gameState.id)) {
						server.playerConnections.set(gameState.id, new Set());
					}
					server.playerConnections.get(gameState.id)?.add(sender.id);
					server.connectionToPlayer.set(sender.id, {
						gameId: gameState.id,
						playerId: event.playerId as string,
					});

					await server.markPlayerConnected(
						gameState.id,
						event.playerId as string,
					);
					server.sendGameState(sender, gameState);
					server.onChatParticipantConnected(sender);
				} else {
					await server.addSpectator(
						gameState.id,
						event.playerId ?? sender.id,
						event.playerName ?? "Zuschauer",
						event.playerImage ?? null,
						sender,
					);
				}
			}
			break;
		}

		case "start-game":
			await server.startGameRoom(event.players, event.tableId);
			break;

		case "play-card":
			if (!assertSenderOwnsPlayerId(server, sender, event.playerId)) {
				return;
			}
			await server.playCard(event.cardId, event.playerId, sender);
			break;

		case "auto-play":
			await server.autoPlay(sender);
			break;

		case "auto-play-all":
			await server.autoPlayAll(sender);
			break;

		case "spectate-game":
			await server.addSpectator(
				event.gameId,
				event.spectatorId,
				event.spectatorName,
				event.spectatorImage,
				sender,
			);
			break;

		case "announce":
			if (!assertSenderOwnsPlayerId(server, sender, event.playerId)) {
				return;
			}
			await server.handleAnnouncement(
				event.announcement,
				event.playerId,
				sender,
			);
			break;

		case "reset-game":
			await handleResetGameHandler(server, sender);
			break;

		case "bid":
			if (!assertSenderOwnsPlayerId(server, sender, event.playerId)) {
				return;
			}
			await server.handleBid(event.playerId, event.bid, sender);
			break;

		case "declare-contract":
			if (!assertSenderOwnsPlayerId(server, sender, event.playerId)) {
				return;
			}
			await server.handleDeclareContract(
				event.playerId,
				event.contract,
				sender,
			);
			break;

		case "toggle-stand-up":
			if (!assertSenderOwnsPlayerId(server, sender, event.playerId)) {
				return;
			}
			await handleToggleStandUpHandler(server, event.playerId, sender);
			break;

		case "bot-control":
			await handleBotControlEvent(
				server,
				event.action,
				event.targetPlayerId,
				sender,
			);
			break;

		case "update-player-info":
			await server.updateGamePlayerInfo(
				event.playerId,
				event.name,
				event.image,
			);
			break;

		case "chat-send":
			server.handleChatSend(event.text, sender);
			break;
	}
}

export async function handleResetGame(
	server: Server,
	sender: Party.Connection,
) {
	await handleResetGameHandler(server, sender);
}

export async function handleToggleStandUp(
	server: Server,
	playerId: string,
	sender: Party.Connection,
) {
	await handleToggleStandUpHandler(server, playerId, sender);
}
