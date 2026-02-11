import type * as Party from "partykit/server";
import type { Player, Table, TableEvent, TableMessage } from "./types";

export interface TableRoomContext {
	room: Party.Room;
	tables: Map<string, Table>;
	connectionToTablePlayer: Map<string, string>;
	persistTables: () => Promise<void>;
	sendState: (conn: Party.Connection) => void;
	broadcastState: () => void;
	sendError: (conn: Party.Connection, message: string) => void;
	startGame: (table: Table) => Promise<void>;
	initGameRoom: (gameId: string, tableId: string, player: Player) => void;
	addPlayerToGame: (gameId: string, player: Player) => void;
	updateGameRoomPlayerInfo: (
		gameId: string,
		playerId: string,
		name: string,
		image?: string | null,
	) => void;
}

export function findPlayerTable(
	tables: Map<string, Table>,
	playerId: string,
): Table | undefined {
	for (const table of tables.values()) {
		if (table.players.some((p) => p.id === playerId)) {
			return table;
		}
	}
	return undefined;
}

export async function createTable(
	ctx: TableRoomContext,
	name: string,
	player: Player,
	sender: Party.Connection,
) {
	const existingTable = findPlayerTable(ctx.tables, player.id);
	if (existingTable) {
		ctx.sendError(
			sender,
			"Du sitzt bereits an einem Tisch. Verlasse zuerst den anderen Tisch.",
		);
		return;
	}

	const tableId = `table-${crypto.randomUUID()}`;
	const table: Table = {
		id: tableId,
		name,
		players: [player],
		createdAt: Date.now(),
		gameStarted: false,
	};

	const gameId = `game-${Date.now()}-${Math.random().toString(36).substring(7)}`;
	table.gameId = gameId;

	ctx.tables.set(tableId, table);
	await ctx.persistTables();
	ctx.broadcastState();
	ctx.initGameRoom(gameId, tableId, player);
}

export async function joinTable(
	ctx: TableRoomContext,
	tableId: string,
	player: Player,
	sender: Party.Connection,
) {
	const table = ctx.tables.get(tableId);
	if (!table) {
		ctx.sendError(sender, "Tisch nicht gefunden.");
		return;
	}

	if (table.players.length >= 4) {
		ctx.sendError(sender, "Der Tisch ist bereits voll.");
		return;
	}

	if (table.players.some((p) => p.id === player.id)) {
		return;
	}

	const existingTable = findPlayerTable(ctx.tables, player.id);
	if (existingTable) {
		ctx.sendError(
			sender,
			"Du sitzt bereits an einem Tisch. Verlasse zuerst den anderen Tisch.",
		);
		return;
	}

	table.players.push(player);
	await ctx.persistTables();
	ctx.broadcastState();

	if (table.players.length === 4 && !table.gameStarted) {
		await ctx.startGame(table);
		return;
	}

	if (!table.gameId) return;

	if (table.players.length === 4) {
		const message: TableMessage = {
			type: "game-started",
			gameId: table.gameId,
			tableId: table.id,
			players: table.players,
		};
		ctx.room.broadcast(JSON.stringify(message));
		ctx.broadcastState();
		return;
	}

	ctx.addPlayerToGame(table.gameId, player);
}

export async function leaveTable(
	ctx: TableRoomContext,
	tableId: string,
	playerId: string,
) {
	const table = ctx.tables.get(tableId);
	if (!table) {
		return;
	}

	table.players = table.players.filter((p) => p.id !== playerId);
	if (table.players.length === 0) {
		ctx.tables.delete(tableId);
	}

	await ctx.persistTables();
	ctx.broadcastState();
}

export async function deleteTable(
	ctx: TableRoomContext,
	tableId: string,
	playerId: string,
) {
	const table = ctx.tables.get(tableId);
	if (!table) {
		return;
	}

	if (table.players.length > 0 && table.players[0]?.id === playerId) {
		ctx.tables.delete(tableId);
		await ctx.persistTables();
		ctx.broadcastState();
	}
}

export async function updatePlayerInfo(
	ctx: TableRoomContext,
	playerId: string,
	name: string,
	image?: string | null,
): Promise<string[]> {
	let changed = false;
	const gameIds: string[] = [];

	for (const table of ctx.tables.values()) {
		const player = table.players.find((p) => p.id === playerId);
		if (!player) continue;

		player.name = name;
		if (image !== undefined) player.image = image;
		changed = true;
		if (table.gameId) {
			gameIds.push(table.gameId);
		}
	}

	if (changed) {
		await ctx.persistTables();
		ctx.broadcastState();
	}

	return gameIds;
}

export async function handleTableEvent(
	ctx: TableRoomContext,
	event: TableEvent,
	sender: Party.Connection,
) {
	switch (event.type) {
		case "get-state":
			ctx.sendState(sender);
			return;
		case "create-table":
			ctx.connectionToTablePlayer.set(sender.id, event.player.id);
			await createTable(ctx, event.name, event.player, sender);
			return;
		case "join-table":
			ctx.connectionToTablePlayer.set(sender.id, event.player.id);
			await joinTable(ctx, event.tableId, event.player, sender);
			return;
		case "leave-table":
			await leaveTable(ctx, event.tableId, event.playerId);
			return;
		case "delete-table":
			await deleteTable(ctx, event.tableId, event.playerId);
			return;
		case "update-player-info": {
			const gameIds = await updatePlayerInfo(
				ctx,
				event.playerId,
				event.name,
				event.image,
			);
			for (const gameId of gameIds) {
				ctx.updateGameRoomPlayerInfo(
					gameId,
					event.playerId,
					event.name,
					event.image,
				);
			}
			return;
		}
	}
}
