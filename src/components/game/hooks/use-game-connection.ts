"use client";

import PartySocket from "partysocket";
import { useEffect, useRef } from "react";
import { onProfileUpdate } from "@/lib/profile-sync";
import {
	useSetConnected,
	useSetError,
	useSetGameActions,
	useSetGameState,
	useSetSpectatorMode,
} from "@/stores/game-selectors";
import type { GameEvent, GameMessage } from "@/types/game";
import type { Player } from "@/types/tables";

interface UseGameConnectionOptions {
	gameId: string;
	player: Player;
	isSpectator?: boolean;
}

/**
 * Hook to manage WebSocket connection to the game server.
 *
 * This hook:
 * 1. Establishes a PartySocket connection
 * 2. Syncs game state to the Zustand store
 * 3. Registers game actions in the store
 *
 * Components can then use store selectors to access state and actions.
 */
export function useGameConnection({
	gameId,
	player,
	isSpectator = false,
}: UseGameConnectionOptions): void {
	const socketRef = useRef<PartySocket | null>(null);

	// Store setters
	const setGameState = useSetGameState();
	const setError = useSetError();
	const setConnected = useSetConnected();
	const setSpectatorMode = useSetSpectatorMode();
	const setGameActions = useSetGameActions();

	useEffect(() => {
		const host = process.env.NEXT_PUBLIC_PARTYKIT_HOST || "localhost:1999";

		const socket = new PartySocket({
			host,
			room: gameId,
		});

		socketRef.current = socket;

		// Connection opened
		socket.addEventListener("open", () => {
			setConnected(true);

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

				// Request current state (include playerId so server can verify player membership)
				socket.send(
					JSON.stringify({
						type: "get-state",
						playerId: player.id,
					} satisfies GameEvent),
				);
			}
		});

		// Connection closed
		socket.addEventListener("close", () => {
			setConnected(false);
		});

		// Message received
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

		// Register game actions in store
		setGameActions({
			playCard: (cardId: string) => {
				if (!socket) return;
				const event: GameEvent = {
					type: "play-card",
					cardId,
					playerId: player.id,
				};
				socket.send(JSON.stringify(event));
			},

			announce: (announcement) => {
				if (!socket) return;
				const event: GameEvent = {
					type: "announce",
					announcement,
					playerId: player.id,
				};
				socket.send(JSON.stringify(event));
			},

			bid: (bid) => {
				if (!socket) return;
				const event: GameEvent = {
					type: "bid",
					playerId: player.id,
					bid,
				};
				socket.send(JSON.stringify(event));
			},

			declareContract: (contract) => {
				if (!socket) return;
				const event: GameEvent = {
					type: "declare-contract",
					playerId: player.id,
					contract,
				};
				socket.send(JSON.stringify(event));
			},

			autoPlay: () => {
				if (!socket) return;
				const event: GameEvent = { type: "auto-play" };
				socket.send(JSON.stringify(event));
			},

			autoPlayAll: () => {
				if (!socket) return;
				const event: GameEvent = { type: "auto-play-all" };
				socket.send(JSON.stringify(event));
			},

			resetGame: () => {
				if (!socket) return;
				const event: GameEvent = { type: "reset-game" };
				socket.send(JSON.stringify(event));
			},
		});

		const cleanupProfileSync = onProfileUpdate((update) => {
			const event: GameEvent = {
				type: "update-player-info",
				playerId: update.playerId,
				name: update.name,
				image: update.image,
			};
			socket.send(JSON.stringify(event));
		});

		// Cleanup
		return () => {
			socket.close();
			cleanupProfileSync();
		};
	}, [
		gameId,
		isSpectator,
		player.id,
		player.name,
		player.image,
		setGameState,
		setError,
		setConnected,
		setSpectatorMode,
		setGameActions,
	]);
}
