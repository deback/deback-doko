"use client";

import PartySocket from "partysocket";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GameEvent, GameMessage, GameState } from "@/types/game";
import type { Player } from "@/types/tables";

interface UseGameConnectionOptions {
	gameId: string;
	player: Player;
}

interface UseGameConnectionReturn {
	gameState: GameState | null;
	error: string | null;
	isConnected: boolean;
	playCard: (cardId: string) => void;
}

export function useGameConnection({
	gameId,
	player,
}: UseGameConnectionOptions): UseGameConnectionReturn {
	const [gameState, setGameState] = useState<GameState | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isConnected, setIsConnected] = useState(false);
	const socketRef = useRef<PartySocket | null>(null);

	useEffect(() => {
		const host = process.env.NEXT_PUBLIC_PARTYKIT_HOST || "localhost:1999";

		const socket = new PartySocket({
			host,
			room: gameId,
		});

		socketRef.current = socket;

		socket.addEventListener("open", () => {
			setIsConnected(true);

			// Try to get game info from sessionStorage
			const gameInfoStr = sessionStorage.getItem(`game-${gameId}`);
			if (gameInfoStr) {
				try {
					const gameInfo = JSON.parse(gameInfoStr);
					// Start game if not already started
					socket.send(
						JSON.stringify({
							type: "start-game",
							players: gameInfo.players,
							tableId: gameInfo.tableId,
						} satisfies GameEvent),
					);
					// Clean up
					sessionStorage.removeItem(`game-${gameId}`);
				} catch (err) {
					console.error("Error parsing game info:", err);
				}
			}

			// Request current state
			socket.send(JSON.stringify({ type: "get-state" } satisfies GameEvent));
		});

		socket.addEventListener("close", () => {
			setIsConnected(false);
		});

		socket.addEventListener("message", (event) => {
			try {
				const message: GameMessage = JSON.parse(event.data as string);

				if (message.type === "state") {
					setGameState(message.state);
					setError(null);
				} else if (message.type === "error") {
					setError(message.message);
					console.error("Error from server:", message.message);
				}
			} catch (err) {
				console.error("Error parsing message:", err);
			}
		});

		return () => {
			socket.close();
		};
	}, [gameId]);

	const playCard = useCallback(
		(cardId: string) => {
			if (!socketRef.current || !gameState) return;

			const event: GameEvent = {
				type: "play-card",
				cardId,
				playerId: player.id,
			};

			socketRef.current.send(JSON.stringify(event));
		},
		[gameState, player.id],
	);

	return {
		gameState,
		error,
		isConnected,
		playCard,
	};
}
