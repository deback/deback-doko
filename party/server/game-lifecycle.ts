import type * as Party from "partykit/server";
import { env } from "@/env";
import { logger } from "../logger";
import { createPartykitHttpClient } from "../partykit-http";
import type { TableRoomContext } from "../table-room";
import type {
	AnnouncementType,
	ChatMessage,
	ContractType,
	GameEvent,
	GameMessage,
	GameState,
	Player,
	ReservationType,
	Table,
	TableMessage,
	TablesState,
	Trick,
} from "../types";
import type { ChatPresenceEntry } from "./chat-registry";
import {
	addSpectator as addSpectatorHandler,
	broadcastToSpectators as broadcastToSpectatorsHandler,
	clearWaitingPlayerDisconnectTimer as clearWaitingPlayerDisconnectTimerHandler,
	createSpectatorView as createSpectatorViewHandler,
	getSpectatorList as getSpectatorListHandler,
	getWaitingDisconnectKey as getWaitingDisconnectKeyHandler,
	handleWaitingPlayerDisconnect as handleWaitingPlayerDisconnectHandler,
	hasOtherActivePlayerConnection as hasOtherActivePlayerConnectionHandler,
	removePlayerAsSpectator as removePlayerAsSpectatorHandler,
	removeSpectator as removeSpectatorHandler,
	scheduleWaitingPlayerDisconnect as scheduleWaitingPlayerDisconnectHandler,
	sendSpectatorState as sendSpectatorStateHandler,
	updateTableSpectatorCount as updateTableSpectatorCountHandler,
} from "./connection-registry";
import {
	handleResetGame as handleResetGameHandler,
	handleToggleStandUp as handleToggleStandUpHandler,
	restartGame as restartGameHandler,
	startGame as startGameHandler,
	startGameRoom as startGameRoomHandler,
	updateGamePlayerInfo as updateGamePlayerInfoHandler,
} from "./game-lifecycle-handlers";
import {
	advanceBidding as advanceBiddingHandler,
	checkHochzeitPartner as checkHochzeitPartnerHandler,
	findAllUndeclaredVorbehalt as findAllUndeclaredVorbehaltHandler,
	handleBid as handleBidHandler,
	handleDeclareContract as handleDeclareContractHandler,
	resolveBidding as resolveBiddingHandler,
	setupHochzeit as setupHochzeitHandler,
	setupNormalGame as setupNormalGameHandler,
	setupSolo as setupSoloHandler,
} from "./message-handlers/bidding";
import {
	handleChatSend as handleChatSendHandler,
	onChatParticipantConnected as onChatParticipantConnectedHandler,
	onChatParticipantDisconnected as onChatParticipantDisconnectedHandler,
} from "./message-handlers/chat";
import {
	onClose as onCloseHandler,
	onConnect as onConnectHandler,
	onMessage as onMessageHandler,
} from "./message-handlers/connection";
import { handleGameEvent as handleGameEventHandler } from "./message-handlers/game-events";
import {
	autoPlayAll as autoPlayAllHandler,
	autoPlay as autoPlayHandler,
	completeTrick as completeTrickHandler,
	handleAnnouncement as handleAnnouncementHandler,
	playCard as playCardHandler,
} from "./message-handlers/gameplay";
import { onRequest as onRequestHandler } from "./message-handlers/http";
import {
	onStart as onStartHandler,
	persistAndBroadcastGame as persistAndBroadcastGameHandler,
	persistGameState as persistGameStateHandler,
	persistTables as persistTablesHandler,
	saveGameResults as saveGameResultsHandler,
} from "./persistence";

export default class Server implements Party.Server {
	static readonly WAITING_RECONNECT_GRACE_MS = 8_000;
	tables: Map<string, Table> = new Map();
	games: Map<string, GameState> = new Map();
	playerConnections: Map<string, Set<string>> = new Map();
	spectatorConnections: Map<string, Set<string>> = new Map();
	connectionToSpectator: Map<
		string,
		{
			gameId: string;
			spectatorId: string;
			spectatorName: string;
			spectatorImage?: string | null;
		}
	> = new Map();
	connectionToPlayer: Map<string, { gameId: string; playerId: string }> =
		new Map();
	connectionToTablePlayer: Map<string, string> = new Map();
	waitingPlayerDisconnectTimers: Map<string, ReturnType<typeof setTimeout>> =
		new Map();
	chatMessagesByTable: Map<string, ChatMessage[]> = new Map();
	chatPresenceByKey: Map<string, ChatPresenceEntry> = new Map();
	chatPresenceKeyByConnection: Map<string, string> = new Map();
	chatLastMessageAtByParticipant: Map<string, number> = new Map();
	readonly partykitHttp = createPartykitHttpClient({
		host: process.env.NEXT_PUBLIC_PARTYKIT_HOST || "localhost:1999",
		apiSecret: env.PARTYKIT_API_SECRET || "",
		logger,
	});

	constructor(readonly room: Party.Room) {}

	async onStart() {
		await onStartHandler(this);
	}

	async persistTables() {
		await persistTablesHandler(this);
	}

	async persistGameState(gameState: GameState) {
		await persistGameStateHandler(this, gameState);
	}

	async persistAndBroadcastGame(gameState: GameState) {
		await persistAndBroadcastGameHandler(this, gameState);
	}

	getWaitingDisconnectKey(gameId: string, playerId: string) {
		return getWaitingDisconnectKeyHandler(this, gameId, playerId);
	}

	clearWaitingPlayerDisconnectTimer(gameId: string, playerId: string) {
		clearWaitingPlayerDisconnectTimerHandler(this, gameId, playerId);
	}

	hasOtherActivePlayerConnection(
		gameId: string,
		playerId: string,
		excludeConnId?: string,
	): boolean {
		return hasOtherActivePlayerConnectionHandler(
			this,
			gameId,
			playerId,
			excludeConnId,
		);
	}

	scheduleWaitingPlayerDisconnect(gameId: string, playerId: string) {
		scheduleWaitingPlayerDisconnectHandler(this, gameId, playerId);
	}

	async handleWaitingPlayerDisconnect(gameId: string, playerId: string) {
		await handleWaitingPlayerDisconnectHandler(this, gameId, playerId);
	}

	async removePlayerAsSpectator(gameId: string, playerId: string) {
		await removePlayerAsSpectatorHandler(this, gameId, playerId);
	}

	getTableRoomContext(): TableRoomContext {
		return {
			room: this.room,
			tables: this.tables,
			connectionToTablePlayer: this.connectionToTablePlayer,
			persistTables: () => this.persistTables(),
			sendState: (conn) => this.sendState(conn),
			broadcastState: () => this.broadcastState(),
			sendError: (conn, message) => this.sendError(conn, message),
			startGame: (table) => this.startGame(table),
			initGameRoom: (gameId, tableId, player) =>
				this.partykitHttp.initGameRoom(gameId, tableId, player),
			addPlayerToGame: async (gameId, player) =>
				await this.partykitHttp.addPlayerToGame(gameId, player),
			updateGameRoomPlayerInfo: (gameId, playerId, name, image) =>
				this.partykitHttp.updateGameRoomPlayerInfo(
					gameId,
					playerId,
					name,
					image,
				),
		};
	}

	async onRequest(req: Party.Request) {
		return await onRequestHandler(this, req);
	}

	onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
		onConnectHandler(this, conn, ctx);
	}

	async onClose(conn: Party.Connection) {
		await onCloseHandler(this, conn);
	}

	onMessage(message: string, sender: Party.Connection) {
		onMessageHandler(this, message, sender);
	}

	async startGame(table: Table) {
		await startGameHandler(this, table);
	}

	async updateGamePlayerInfo(
		playerId: string,
		name: string,
		image?: string | null,
	) {
		await updateGamePlayerInfoHandler(this, playerId, name, image);
	}

	getState(): TablesState {
		return {
			tables: Array.from(this.tables.values()),
		};
	}

	sendState(conn: Party.Connection) {
		const message: TableMessage = {
			type: "state",
			state: this.getState(),
		};
		conn.send(JSON.stringify(message));
	}

	sendError(conn: Party.Connection, message: string) {
		const errorMessage: TableMessage = {
			type: "error",
			message,
		};
		conn.send(JSON.stringify(errorMessage));
	}

	broadcastState() {
		const message: TableMessage = {
			type: "state",
			state: this.getState(),
		};
		this.room.broadcast(JSON.stringify(message));
	}

	async handleGameEvent(event: GameEvent, sender: Party.Connection) {
		await handleGameEventHandler(this, event, sender);
	}

	handleChatSend(text: string, sender: Party.Connection) {
		handleChatSendHandler(this, text, sender);
	}

	onChatParticipantConnected(conn: Party.Connection) {
		onChatParticipantConnectedHandler(this, conn);
	}

	onChatParticipantDisconnected(connectionId: string) {
		onChatParticipantDisconnectedHandler(this, connectionId);
	}

	async handleResetGame(sender: Party.Connection) {
		await handleResetGameHandler(this, sender);
	}

	async handleToggleStandUp(playerId: string, sender: Party.Connection) {
		await handleToggleStandUpHandler(this, playerId, sender);
	}

	async handleBid(
		playerId: string,
		bid: ReservationType,
		sender: Party.Connection,
	) {
		await handleBidHandler(this, playerId, bid, sender);
	}

	async handleDeclareContract(
		playerId: string,
		contract: ContractType,
		sender: Party.Connection,
	) {
		await handleDeclareContractHandler(this, playerId, contract, sender);
	}

	findAllUndeclaredVorbehalt(gameState: GameState): string[] {
		return findAllUndeclaredVorbehaltHandler(this, gameState);
	}

	async advanceBidding(gameState: GameState) {
		await advanceBiddingHandler(this, gameState);
	}

	async resolveBidding(gameState: GameState) {
		await resolveBiddingHandler(this, gameState);
	}

	async setupNormalGame(gameState: GameState) {
		await setupNormalGameHandler(this, gameState);
	}

	async setupSolo(
		gameState: GameState,
		soloistId: string,
		contract: ContractType,
	) {
		await setupSoloHandler(this, gameState, soloistId, contract);
	}

	async setupHochzeit(gameState: GameState, seekerPlayerId: string) {
		await setupHochzeitHandler(this, gameState, seekerPlayerId);
	}

	checkHochzeitPartner(
		gameState: GameState,
		trick: Trick,
		winnerId: string,
		trickNumber: number,
	) {
		checkHochzeitPartnerHandler(this, gameState, trick, winnerId, trickNumber);
	}

	async handleAnnouncement(
		announcement: AnnouncementType,
		playerId: string,
		sender: Party.Connection,
	) {
		await handleAnnouncementHandler(this, announcement, playerId, sender);
	}

	async addSpectator(
		gameId: string,
		spectatorId: string,
		spectatorName: string,
		spectatorImage: string | null | undefined,
		conn: Party.Connection,
	) {
		await addSpectatorHandler(
			this,
			gameId,
			spectatorId,
			spectatorName,
			spectatorImage,
			conn,
		);
	}

	getSpectatorList(
		gameId: string,
	): Array<{ id: string; name: string; image?: string | null }> {
		return getSpectatorListHandler(this, gameId);
	}

	async removeSpectator(gameId: string, connectionId: string) {
		await removeSpectatorHandler(this, gameId, connectionId);
	}

	async updateTableSpectatorCount(tableId: string, count: number) {
		await updateTableSpectatorCountHandler(this, tableId, count);
	}

	createSpectatorView(gameState: GameState): GameState {
		return createSpectatorViewHandler(this, gameState);
	}

	sendSpectatorState(conn: Party.Connection, gameState: GameState) {
		sendSpectatorStateHandler(this, conn, gameState);
	}

	broadcastToSpectators(gameState: GameState) {
		broadcastToSpectatorsHandler(this, gameState);
	}

	async startGameRoom(players: Player[], tableId: string) {
		await startGameRoomHandler(this, players, tableId);
	}

	async playCard(cardId: string, playerId: string, sender: Party.Connection) {
		await playCardHandler(this, cardId, playerId, sender);
	}

	async completeTrick(gameState: GameState) {
		await completeTrickHandler(this, gameState);
	}

	async restartGame(oldGameState: GameState) {
		await restartGameHandler(this, oldGameState);
	}

	async saveGameResults(gameState: GameState) {
		await saveGameResultsHandler(this, gameState);
	}

	async autoPlay(sender: Party.Connection) {
		await autoPlayHandler(this, sender);
	}

	async autoPlayAll(sender: Party.Connection) {
		await autoPlayAllHandler(this, sender);
	}

	sendGameState(conn: Party.Connection, gameState: GameState) {
		const message: GameMessage = {
			type: "state",
			state: gameState,
		};
		conn.send(JSON.stringify(message));
	}

	sendGameError(conn: Party.Connection, message: string) {
		const errorMessage: GameMessage = {
			type: "error",
			message,
		};
		conn.send(JSON.stringify(errorMessage));
	}

	broadcastGameState(gameState: GameState) {
		const players = this.playerConnections.get(gameState.id);
		const message: GameMessage = {
			type: "state",
			state: gameState,
		};
		const messageStr = JSON.stringify(message);

		for (const conn of this.room.getConnections()) {
			if (players?.has(conn.id)) {
				conn.send(messageStr);
			}
		}
	}
}

Server satisfies Party.Worker;
