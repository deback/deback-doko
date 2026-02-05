"use client";

import PartySocket from "partysocket";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GameEvent, GameMessage, GameState } from "@/types/game";
import type { Player } from "@/types/tables";

interface UseGameConnectionOptions {
	gameId: string;
	player: Player;
	isSpectator?: boolean;
}

interface UseGameConnectionReturn {
	gameState: GameState | null;
	error: string | null;
	isConnected: boolean;
	isSpectator: boolean;
	playCard: (cardId: string) => void;
	autoPlay: () => void;
}

export function useGameConnection({
	gameId,
	player,
	isSpectator = false,
}: UseGameConnectionOptions): UseGameConnectionReturn {
	const [gameState, setGameState] = useState<GameState | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isConnected, setIsConnected] = useState(false);
	const [spectatorMode, setSpectatorMode] = useState(isSpectator);
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

			if (isSpectator) {
				// Spectator mode: send spectate-game event
				socket.send(
					JSON.stringify({
						type: "spectate-game",
						gameId,
						spectatorId: player.id,
						spectatorName: player.name,
						spectatorImage: player.image,
					} satisfies GameEvent),
				);
			} else {
				// Player mode: try to start game or get state
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
			}
		});

		socket.addEventListener("close", () => {
			setIsConnected(false);
		});

		socket.addEventListener("message", (event) => {
			try {
				const message: GameMessage = JSON.parse(event.data as string);

				if (message.type === "state") {
					setGameState(message.state);
					// Update spectator mode based on server response
					if (message.isSpectator !== undefined) {
						setSpectatorMode(message.isSpectator);
					}
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
	}, [gameId, isSpectator, player.id, player.name, player.image]);

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

	const autoPlay = useCallback(() => {
		if (!socketRef.current || !gameState) return;

		const event: GameEvent = { type: "auto-play" };
		socketRef.current.send(JSON.stringify(event));
	}, [gameState]);

	return {
		gameState,
		error,
		isConnected,
		isSpectator: spectatorMode,
		playCard,
		autoPlay,
	};
}
