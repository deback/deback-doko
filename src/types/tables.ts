export interface Player {
	id: string;
	name: string;
	email?: string;
	image?: string | null;
	gamesPlayed: number;
	gamesWon: number;
	balance: number;
}

export interface Table {
	id: string;
	name: string;
	players: Player[];
	createdAt: number;
	gameId?: string;
	gameStarted: boolean;
	spectatorCount?: number;
}

export interface TablesState {
	tables: Table[];
}

export type TableEvent =
	| { type: "create-table"; name: string; player: Player }
	| { type: "join-table"; tableId: string; player: Player }
	| { type: "leave-table"; tableId: string; playerId: string }
	| { type: "delete-table"; tableId: string; playerId: string }
	| { type: "get-state" }
	| {
			type: "update-player-info";
			playerId: string;
			name: string;
			image?: string | null;
	  };

export type TableMessage =
	| { type: "state"; state: TablesState }
	| { type: "error"; message: string }
	| {
			type: "game-started";
			gameId: string;
			tableId: string;
			players: Player[];
	  };
