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

	const post = async (
		roomId: string,
		body: Record<string, unknown>,
		errorMsg: string,
	): Promise<Response | null> => {
		try {
			return await fetch(`${baseUrl}/${roomId}`, {
				method: "POST",
				headers,
				body: JSON.stringify(body),
			});
		} catch (error) {
			params.logger.error(errorMsg, error);
			return null;
		}
	};

	return {
		initGameRoom(gameId: string, tableId: string, player: Player) {
			void post(
				gameId,
				{ type: "init-game", tableId, player },
				"Failed to init game room:",
			);
		},
		async addPlayerToGame(gameId: string, player: Player): Promise<boolean> {
			const response = await post(
				gameId,
				{ type: "add-player", player },
				"Failed to add player to game:",
			);
			if (!response) {
				return false;
			}
			if (!response.ok) {
				params.logger.error(
					"Failed to add player to game:",
					new Error(`HTTP ${response.status}`),
				);
				return false;
			}
			return true;
		},
		ensurePlayerAtTable(tableId: string, gameId: string, player: Player) {
			void post(
				"tables-room",
				{ type: "ensure-player-at-table", tableId, gameId, player },
				"Failed to ensure player at table:",
			);
		},
		removePlayerFromTable(tableId: string, playerId: string) {
			void post(
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
			void post(
				gameId,
				{ type: "update-player-info", playerId, name, image },
				"Failed to update player info in game room:",
			);
		},
	};
}
