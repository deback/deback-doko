export interface Player {
	id: string;
	name: string;
}

export interface Table {
	id: string;
	name: string;
	players: Player[];
	createdAt: number;
}

export interface TablesState {
	tables: Table[];
}

export type TableEvent =
	| { type: "create-table"; name: string; player: Player }
	| { type: "join-table"; tableId: string; player: Player }
	| { type: "leave-table"; tableId: string; playerId: string }
	| { type: "delete-table"; tableId: string; playerId: string }
	| { type: "get-state" };

export type TableMessage =
	| { type: "state"; state: TablesState }
	| { type: "error"; message: string };
