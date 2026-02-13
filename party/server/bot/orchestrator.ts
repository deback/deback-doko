import type * as Party from "partykit/server";
import { logger } from "../../logger";
import type {
	BotControlReason,
	GameState,
	PlayerBotControl,
	PlayerPresence,
} from "../../types";
import type Server from "../game-lifecycle";
import { decideFallbackBotAction } from "./fallback";
import { decideBotAction } from "./heuristic-policy";
import { logBotDecision } from "./logging";
import {
	BOT_DISCONNECT_GRACE_MS,
	BOT_TURN_DELAY_MS,
	BOT_TURN_TIMEOUT_MS,
	type BotDecision,
	getDecisionPhase,
} from "./types";

const BOT_AUTO_TAKEOVER_ENABLED = process.env.BOT_AUTO_TAKEOVER === "true";

function getPlayerKey(gameId: string, playerId: string): string {
	return `${gameId}:${playerId}`;
}

function createBotConnection(
	gameId: string,
	playerId: string,
): Party.Connection {
	return {
		id: `bot:${gameId}:${playerId}`,
		send: () => {},
	} as unknown as Party.Connection;
}

function defaultBotControl(): PlayerBotControl {
	return {
		mode: "human",
	};
}

function defaultPresence(): PlayerPresence {
	return {
		connected: false,
		lastSeenAt: Date.now(),
	};
}

export function ensureBotStateShape(gameState: GameState): void {
	if (
		!gameState.botControlByPlayer ||
		typeof gameState.botControlByPlayer !== "object"
	) {
		gameState.botControlByPlayer = {};
	}
	if (
		!gameState.presenceByPlayer ||
		typeof gameState.presenceByPlayer !== "object"
	) {
		gameState.presenceByPlayer = {};
	}
	if (gameState.botRoundScope !== "current-round") {
		gameState.botRoundScope = "current-round";
	}

	const activePlayerIds = new Set(gameState.players.map((player) => player.id));
	for (const playerId of Object.keys(gameState.botControlByPlayer)) {
		if (!activePlayerIds.has(playerId)) {
			delete gameState.botControlByPlayer[playerId];
		}
	}
	for (const playerId of Object.keys(gameState.presenceByPlayer)) {
		if (!activePlayerIds.has(playerId)) {
			delete gameState.presenceByPlayer[playerId];
		}
	}

	for (const player of gameState.players) {
		if (!gameState.botControlByPlayer[player.id]) {
			gameState.botControlByPlayer[player.id] = defaultBotControl();
		}
		if (!gameState.presenceByPlayer[player.id]) {
			gameState.presenceByPlayer[player.id] = defaultPresence();
		}
	}
}

function setBotControl(
	gameState: GameState,
	targetPlayerId: string,
	mode: "human" | "bot",
	reason?: BotControlReason,
	controlledBy?: string,
): boolean {
	ensureBotStateShape(gameState);

	const current =
		gameState.botControlByPlayer[targetPlayerId] ?? defaultBotControl();
	if (
		current.mode === mode &&
		current.reason === reason &&
		current.controlledBy === controlledBy
	) {
		return false;
	}

	gameState.botControlByPlayer[targetPlayerId] =
		mode === "human"
			? { mode: "human" }
			: {
					mode,
					reason,
					since: Date.now(),
					controlledBy,
				};
	return true;
}

function updatePresence(
	gameState: GameState,
	playerId: string,
	connected: boolean,
): boolean {
	ensureBotStateShape(gameState);

	const now = Date.now();
	const existing = gameState.presenceByPlayer[playerId] ?? defaultPresence();
	if (existing.connected === connected) {
		if (connected && existing.disconnectedAt !== undefined) {
			delete existing.disconnectedAt;
			gameState.presenceByPlayer[playerId] = existing;
			return true;
		}
		return false;
	}

	gameState.presenceByPlayer[playerId] = connected
		? {
				connected: true,
				lastSeenAt: now,
			}
		: {
				connected: false,
				lastSeenAt: existing.lastSeenAt,
				disconnectedAt: now,
			};
	return true;
}

function sendBotSystemMessage(
	server: Server,
	gameState: GameState,
	text: string,
): void {
	server.sendSystemChatMessage(gameState.id, gameState.tableId, text);
}

export function clearDisconnectTakeoverTimer(
	server: Server,
	gameId: string,
	playerId: string,
): void {
	const key = getPlayerKey(gameId, playerId);
	const timer = server.botDisconnectTakeoverTimers.get(key);
	if (!timer) return;
	clearTimeout(timer);
	server.botDisconnectTakeoverTimers.delete(key);
}

async function activateDisconnectTakeover(
	server: Server,
	gameId: string,
	playerId: string,
): Promise<void> {
	clearDisconnectTakeoverTimer(server, gameId, playerId);

	const gameState = server.games.get(gameId);
	if (!gameState || !gameState.gameStarted || gameState.gameEnded) return;
	ensureBotStateShape(gameState);

	if (server.hasOtherActivePlayerConnection(gameId, playerId)) {
		const changed = updatePresence(gameState, playerId, true);
		if (changed) {
			await server.persistAndBroadcastGame(gameState);
		}
		return;
	}

	const targetPlayer = gameState.players.find(
		(player) => player.id === playerId,
	);
	if (!targetPlayer) return;

	const presence = gameState.presenceByPlayer[playerId];
	if (presence?.connected) return;

	const changed = setBotControl(
		gameState,
		playerId,
		"bot",
		"disconnect",
		"system",
	);
	if (!changed) return;

	sendBotSystemMessage(
		server,
		gameState,
		`Bot übernimmt ${targetPlayer.name}.`,
	);
	await server.persistAndBroadcastGame(gameState);
}

export function scheduleDisconnectTakeover(
	server: Server,
	gameId: string,
	playerId: string,
): void {
	if (!BOT_AUTO_TAKEOVER_ENABLED) return;

	const key = getPlayerKey(gameId, playerId);
	if (server.botDisconnectTakeoverTimers.has(key)) return;

	const timer = setTimeout(() => {
		void activateDisconnectTakeover(server, gameId, playerId);
	}, BOT_DISCONNECT_GRACE_MS);

	server.botDisconnectTakeoverTimers.set(key, timer);
}

export async function handleBotControl(
	server: Server,
	action: "takeover" | "release",
	targetPlayerId: string,
	controllerPlayerId: string,
	sender: Party.Connection,
): Promise<void> {
	const gameState = server.games.get(server.room.id);
	if (!gameState || !gameState.gameStarted || gameState.gameEnded) {
		server.sendGameError(sender, "Spiel läuft nicht.");
		return;
	}
	ensureBotStateShape(gameState);

	const targetPlayer = gameState.players.find(
		(player) => player.id === targetPlayerId,
	);
	if (!targetPlayer) {
		server.sendGameError(sender, "Spieler nicht gefunden.");
		return;
	}

	let changed = false;
	if (action === "takeover") {
		clearDisconnectTakeoverTimer(server, gameState.id, targetPlayerId);
		changed = setBotControl(
			gameState,
			targetPlayerId,
			"bot",
			"manual",
			controllerPlayerId,
		);
		if (changed) {
			sendBotSystemMessage(
				server,
				gameState,
				`Bot übernimmt ${targetPlayer.name}.`,
			);
		}
	} else {
		const hasActiveConnection = server.hasOtherActivePlayerConnection(
			gameState.id,
			targetPlayerId,
		);
		if (!hasActiveConnection) {
			server.sendGameError(
				sender,
				`${targetPlayer.name} ist aktuell nicht verbunden.`,
			);
			return;
		}

		clearDisconnectTakeoverTimer(server, gameState.id, targetPlayerId);
		changed = setBotControl(gameState, targetPlayerId, "human");
		if (changed) {
			sendBotSystemMessage(
				server,
				gameState,
				`${targetPlayer.name} wird wieder manuell gespielt.`,
			);
		}
	}

	if (!changed) return;
	await server.persistAndBroadcastGame(gameState);
}

export async function markPlayerConnected(
	server: Server,
	gameId: string,
	playerId: string,
): Promise<void> {
	const gameState = server.games.get(gameId);
	if (!gameState) return;
	ensureBotStateShape(gameState);

	clearDisconnectTakeoverTimer(server, gameId, playerId);

	const changedPresence = updatePresence(gameState, playerId, true);
	const botControl = gameState.botControlByPlayer[playerId];
	const shouldReleaseBotControlOnReconnect =
		botControl?.mode === "bot" && botControl.reason !== "manual";
	const changedControl = shouldReleaseBotControlOnReconnect
		? setBotControl(gameState, playerId, "human")
		: false;

	if (changedControl) {
		const player = gameState.players.find(
			(candidate) => candidate.id === playerId,
		);
		if (player) {
			sendBotSystemMessage(server, gameState, `${player.name} ist zurück.`);
		}
	}

	if (!changedPresence && !changedControl) return;
	await server.persistAndBroadcastGame(gameState);
}

export async function markPlayerDisconnected(
	server: Server,
	gameId: string,
	playerId: string,
): Promise<void> {
	const gameState = server.games.get(gameId);
	if (!gameState) return;
	ensureBotStateShape(gameState);
	const isActivePlayer = gameState.players.some(
		(player) => player.id === playerId,
	);
	if (!isActivePlayer) return;

	if (server.hasOtherActivePlayerConnection(gameId, playerId)) {
		const changedConnected = updatePresence(gameState, playerId, true);
		if (changedConnected) {
			await server.persistAndBroadcastGame(gameState);
		}
		return;
	}

	const changed = updatePresence(gameState, playerId, false);
	if (changed) {
		await server.persistAndBroadcastGame(gameState);
	}

	if (!gameState.gameStarted || gameState.gameEnded) return;
	scheduleDisconnectTakeover(server, gameId, playerId);
}

export function clearBotRuntimeForGame(server: Server, gameId: string): void {
	const turnTimer = server.botTurnTimers.get(gameId);
	if (turnTimer) {
		clearTimeout(turnTimer);
		server.botTurnTimers.delete(gameId);
	}

	const deadlineTimer = server.botTurnDeadlineTimers.get(gameId);
	if (deadlineTimer) {
		clearTimeout(deadlineTimer);
		server.botTurnDeadlineTimers.delete(gameId);
	}

	for (const [key, timer] of server.botDisconnectTakeoverTimers.entries()) {
		if (!key.startsWith(`${gameId}:`)) continue;
		clearTimeout(timer);
		server.botDisconnectTakeoverTimers.delete(key);
	}
}

async function withDecisionTimeout(
	server: Server,
	gameId: string,
	compute: () => BotDecision | null,
): Promise<BotDecision | null> {
	const timeoutPromise = new Promise<BotDecision | null>((resolve) => {
		const timer = setTimeout(() => resolve(null), BOT_TURN_TIMEOUT_MS);
		server.botTurnDeadlineTimers.set(gameId, timer);
	});

	try {
		const decisionPromise = Promise.resolve().then(compute);
		return await Promise.race([decisionPromise, timeoutPromise]);
	} finally {
		const timer = server.botTurnDeadlineTimers.get(gameId);
		if (timer) {
			clearTimeout(timer);
			server.botTurnDeadlineTimers.delete(gameId);
		}
	}
}

async function executeDecision(
	server: Server,
	gameState: GameState,
	playerId: string,
	decision: BotDecision,
): Promise<void> {
	const botConnection = createBotConnection(gameState.id, playerId);

	switch (decision.type) {
		case "bid":
			await server.handleBid(playerId, decision.bid, botConnection);
			return;
		case "declare-contract":
			await server.handleDeclareContract(
				playerId,
				decision.contract,
				botConnection,
			);
			return;
		case "announce":
			await server.handleAnnouncement(
				decision.announcement,
				playerId,
				botConnection,
			);
			return;
		case "play-card":
			await server.playCard(decision.cardId, playerId, botConnection);
			return;
	}
}

function resolveActionablePlayer(
	gameState: GameState,
): GameState["players"][number] | null {
	if (gameState.biddingPhase?.active) {
		const declarationPlayerId =
			gameState.biddingPhase.awaitingContractDeclaration?.[0];
		if (declarationPlayerId) {
			return (
				gameState.players.find((player) => player.id === declarationPlayerId) ??
				null
			);
		}
		return gameState.players[gameState.biddingPhase.currentBidderIndex] ?? null;
	}
	return gameState.players[gameState.currentPlayerIndex] ?? null;
}

function isBotTurnActionable(gameState: GameState): boolean {
	if (gameState.biddingPhase?.active) return true;
	return (
		!gameState.currentTrick.completed && gameState.currentTrick.cards.length < 4
	);
}

async function runBotTurn(server: Server, gameId: string): Promise<void> {
	server.botTurnTimers.delete(gameId);

	const gameState = server.games.get(gameId);
	if (!gameState || !gameState.gameStarted || gameState.gameEnded) return;
	ensureBotStateShape(gameState);
	if (!isBotTurnActionable(gameState)) return;

	const actionablePlayer = resolveActionablePlayer(gameState);
	if (!actionablePlayer) return;

	const control = gameState.botControlByPlayer[actionablePlayer.id];
	if (control?.mode !== "bot") return;

	let shouldReschedule = false;
	const startedAt = Date.now();

	try {
		let decision: BotDecision | null = null;
		try {
			decision = await withDecisionTimeout(server, gameId, () =>
				decideBotAction(gameState, actionablePlayer.id),
			);
		} catch (error) {
			shouldReschedule = true;
			logger.error("[bot] Failed to decide bot action:", error);
		}
		let fallbackUsed = false;

		if (!decision) {
			decision = decideFallbackBotAction(gameState, actionablePlayer.id);
			fallbackUsed = true;
		}

		if (!decision) return;
		shouldReschedule = true;

		logBotDecision({
			gameId,
			playerId: actionablePlayer.id,
			phase: getDecisionPhase(gameState),
			decision: decision.type,
			reasonCode: decision.reasonCode,
			durationMs: Date.now() - startedAt,
			fallbackUsed,
		});

		try {
			await executeDecision(server, gameState, actionablePlayer.id, decision);
		} catch (error) {
			logger.error("[bot] Failed to execute bot decision:", error);
			if (!fallbackUsed) {
				const fallbackDecision = decideFallbackBotAction(
					gameState,
					actionablePlayer.id,
				);
				if (fallbackDecision) {
					logBotDecision({
						gameId,
						playerId: actionablePlayer.id,
						phase: getDecisionPhase(gameState),
						decision: fallbackDecision.type,
						reasonCode: fallbackDecision.reasonCode,
						durationMs: Date.now() - startedAt,
						fallbackUsed: true,
					});
					await executeDecision(
						server,
						gameState,
						actionablePlayer.id,
						fallbackDecision,
					);
				}
			}
		}
	} catch (error) {
		logger.error("[bot] Unexpected bot turn failure:", error);
	} finally {
		if (shouldReschedule) {
			server.maybeScheduleBotTurn(gameId);
		}
	}
}

export function maybeScheduleBotTurn(server: Server, gameId: string): void {
	if (server.botTurnTimers.has(gameId)) return;

	const gameState = server.games.get(gameId);
	if (!gameState || !gameState.gameStarted || gameState.gameEnded) return;
	ensureBotStateShape(gameState);
	if (!isBotTurnActionable(gameState)) return;

	const actionablePlayer = resolveActionablePlayer(gameState);
	if (!actionablePlayer) return;

	const control = gameState.botControlByPlayer[actionablePlayer.id];
	if (control?.mode !== "bot") return;

	const timer = setTimeout(() => {
		void runBotTurn(server, gameId);
	}, BOT_TURN_DELAY_MS);
	server.botTurnTimers.set(gameId, timer);
}
