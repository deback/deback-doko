import type * as Party from "partykit/server";

interface Player {
	id: string;
	name: string;
}

interface Table {
	id: string;
	name: string;
	players: Player[];
	createdAt: number;
}

interface TablesState {
	tables: Table[];
}

type TableEvent =
	| { type: "create-table"; name: string; player: Player }
	| { type: "join-table"; tableId: string; player: Player }
	| { type: "leave-table"; tableId: string; playerId: string }
	| { type: "delete-table"; tableId: string; playerId: string }
	| { type: "get-state" };

type TableMessage =
	| { type: "state"; state: TablesState }
	| { type: "error"; message: string };

export default class Server implements Party.Server {
	tables: Map<string, Table> = new Map();

	constructor(readonly room: Party.Room) {}

	onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
		console.log(
			`Connected: id: ${conn.id}, room: ${this.room.id}, url: ${new URL(ctx.request.url).pathname}`,
		);

		// Send current state to newly connected client
		this.sendState(conn);
	}

	onMessage(message: string, sender: Party.Connection) {
		try {
			const event: TableEvent = JSON.parse(message);
			this.handleEvent(event, sender);
		} catch (error) {
			console.error("Error parsing message:", error);
			this.sendError(sender, "Invalid message format");
		}
	}

	handleEvent(event: TableEvent, sender: Party.Connection) {
		switch (event.type) {
			case "get-state":
				this.sendState(sender);
				break;

			case "create-table":
				this.createTable(event.name, event.player);
				break;

			case "join-table":
				this.joinTable(event.tableId, event.player);
				break;

			case "leave-table":
				this.leaveTable(event.tableId, event.playerId);
				break;

			case "delete-table":
				this.deleteTable(event.tableId, event.playerId);
				break;
		}
	}

	createTable(name: string, player: Player) {
		const tableId = `table-${Date.now()}-${Math.random().toString(36).substring(7)}`;
		const table: Table = {
			id: tableId,
			name,
			players: [player],
			createdAt: Date.now(),
		};

		this.tables.set(tableId, table);
		this.broadcastState();
	}

	joinTable(tableId: string, player: Player) {
		const table = this.tables.get(tableId);
		if (!table) {
			return;
		}

		// Check if table is full (4 players for Doppelkopf)
		if (table.players.length >= 4) {
			return;
		}

		// Check if player is already at the table
		if (table.players.some((p) => p.id === player.id)) {
			return;
		}

		table.players.push(player);
		this.broadcastState();
	}

	leaveTable(tableId: string, playerId: string) {
		const table = this.tables.get(tableId);
		if (!table) {
			return;
		}

		table.players = table.players.filter((p) => p.id !== playerId);

		// Delete table if empty
		if (table.players.length === 0) {
			this.tables.delete(tableId);
		}

		this.broadcastState();
	}

	deleteTable(tableId: string, playerId: string) {
		const table = this.tables.get(tableId);
		if (!table) {
			return;
		}

		// Only allow deletion if the player is the creator (first player)
		if (table.players.length > 0 && table.players[0]?.id === playerId) {
			this.tables.delete(tableId);
			this.broadcastState();
		}
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
}

Server satisfies Party.Worker;
