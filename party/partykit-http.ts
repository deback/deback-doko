import type { Player } from "./types";

interface PartykitLogger {
	error: (message: string, error: unknown) => void;
}

export function createPartykitHttpClient(params: {
	host: string;
	apiSecret: string;
	logger: PartykitLogger;
}) {
	const protocol = params.host.includes("localhost") ? "http" : "https";
	const baseUrl = `${protocol}://${params.host}/parties/main`;
	const headers = {
		"Content-Type": "application/json",
		Authorization: `Bearer ${params.apiSecret}`,
	};

	const post = (
		roomId: string,
		body: Record<string, unknown>,
		errorMsg: string,
	) => {
		fetch(`${baseUrl}/${roomId}`, {
			method: "POST",
			headers,
			body: JSON.stringify(body),
		}).catch((error) => {
			params.logger.error(errorMsg, error);
		});
	};

	return {
		initGameRoom(gameId: string, tableId: string, player: Player) {
			post(
				gameId,
				{ type: "init-game", tableId, player },
				"Failed to init game room:",
			);
		},
		addPlayerToGame(gameId: string, player: Player) {
			post(
				gameId,
				{ type: "add-player", player },
				"Failed to add player to game:",
			);
		},
		removePlayerFromTable(tableId: string, playerId: string) {
			post(
				"tables-room",
				{ type: "leave-table", tableId, playerId },
				"Failed to remove player from table:",
			);
		},
		updateGameRoomPlayerInfo(
			gameId: string,
			playerId: string,
			name: string,
			image?: string | null,
		) {
			post(
				gameId,
				{ type: "update-player-info", playerId, name, image },
				"Failed to update player info in game room:",
			);
		},
	};
}
