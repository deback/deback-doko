"use client";

import PartySocket from "partysocket";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { onProfileUpdate } from "@/lib/profile-sync";
import {
	useAppendChatMessage,
	useSetChatCooldownUntil,
	useSetChatHistory,
	useSetChatLocalError,
	useSetConnected,
	useSetError,
	useSetGameActions,
	useSetGameState,
	useSetSpectatorMode,
} from "@/stores/game-selectors";
import type { GameEvent, GameMessage } from "@/types/game";
import type { Player, TableEvent, TableMessage } from "@/types/tables";

const CHAT_RATE_LIMIT_MESSAGE = "Bitte warte kurz, bevor du erneut schreibst.";
const CHAT_LOCAL_ERROR_MESSAGES = new Set([
	CHAT_RATE_LIMIT_MESSAGE,
	"Nachricht darf nicht leer sein.",
	"Nachricht ist zu lang (max. 500 Zeichen).",
	"Chat nicht verfügbar.",
]);

interface UseGameConnectionOptions {
	gameId: string;
	player: Player;
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
}: UseGameConnectionOptions): void {
	const socketRef = useRef<PartySocket | null>(null);
	const playerRef = useRef(player);
	const inviteJoinAttemptedRef = useRef(false);
	const playerId = player.id;

	// Store setters
	const setGameState = useSetGameState();
	const setError = useSetError();
	const setConnected = useSetConnected();
	const setSpectatorMode = useSetSpectatorMode();
	const setGameActions = useSetGameActions();
	const setChatHistory = useSetChatHistory();
	const appendChatMessage = useAppendChatMessage();
	const setChatCooldownUntil = useSetChatCooldownUntil();
	const setChatLocalError = useSetChatLocalError();

	useEffect(() => {
		playerRef.current = player;
	}, [player]);

	useEffect(() => {
		const host = process.env.NEXT_PUBLIC_PARTYKIT_HOST || "localhost:1999";
		const searchParams = new URLSearchParams(window.location.search);
		const inviteTableId =
			searchParams.get("invite") === "1" ? searchParams.get("tableId") : null;
		let inviteJoinSocket: PartySocket | null = null;

		const attemptInviteJoin = (tableId: string) => {
			if (inviteJoinAttemptedRef.current) return;
			inviteJoinAttemptedRef.current = true;

			const tablesSocket = new PartySocket({
				host,
				room: "tables-room",
			});
			inviteJoinSocket = tablesSocket;
			let timeoutId: ReturnType<typeof setTimeout> | undefined;

			const cleanup = () => {
				if (timeoutId !== undefined) {
					clearTimeout(timeoutId);
					timeoutId = undefined;
				}
				inviteJoinSocket = null;
				tablesSocket.close();
			};
			timeoutId = setTimeout(() => {
				cleanup();
			}, 10_000);

			tablesSocket.addEventListener("open", () => {
				const joinEvent: TableEvent = {
					type: "join-table",
					tableId,
					player: playerRef.current,
				};
				tablesSocket.send(JSON.stringify(joinEvent));
			});

			tablesSocket.addEventListener("message", (event) => {
				try {
					const message: TableMessage = JSON.parse(event.data as string);
					if (message.type === "error") {
						toast.error(message.message);
						cleanup();
						return;
					}
					if (message.type !== "state") return;

					const joined = message.state.tables.some(
						(table) =>
							table.id === tableId &&
							table.players.some((tablePlayer) => tablePlayer.id === playerId),
					);
					if (!joined) return;

					socket.send(
						JSON.stringify({
							type: "get-state",
							playerId: playerRef.current.id,
							playerName: playerRef.current.name,
							playerImage: playerRef.current.image,
						} satisfies GameEvent),
					);
					cleanup();
				} catch (error) {
					console.error("Error parsing tables-room message:", error);
				}
			});
		};

		const socket = new PartySocket({
			host,
			room: gameId,
		});

		socketRef.current = socket;

		// Connection opened
		socket.addEventListener("open", () => {
			setConnected(true);

			// Try to start game if we have game info in session storage
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

			// Request current state (server auto-detects player vs spectator)
			const playerSnapshot = playerRef.current;
			socket.send(
				JSON.stringify({
					type: "get-state",
					playerId: playerSnapshot.id,
					playerName: playerSnapshot.name,
					playerImage: playerSnapshot.image,
				} satisfies GameEvent),
			);
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
					setSpectatorMode(Boolean(message.isSpectator));
					setError(null);

					if (!inviteTableId || inviteJoinAttemptedRef.current) {
						return;
					}

					// Safety check: only honor invite links for the matching table.
					if (message.state.tableId !== inviteTableId) {
						inviteJoinAttemptedRef.current = true;
						toast.error("Ungültiger Einladungslink.");
						return;
					}

					const isAlreadyPlayer = message.state.players.some(
						(tablePlayer) => tablePlayer.id === playerId,
					);
					if (isAlreadyPlayer) {
						inviteJoinAttemptedRef.current = true;
						return;
					}

					// If game is live or table is full, stay spectator by design.
					if (message.state.gameStarted || message.state.players.length >= 4) {
						inviteJoinAttemptedRef.current = true;
						return;
					}

					attemptInviteJoin(inviteTableId);
				} else if (message.type === "redirect-to-lobby") {
					// Player has been removed from the game — redirect to tables
					window.location.href = "/tables";
				} else if (message.type === "chat-history") {
					setChatHistory(message.messages);
				} else if (message.type === "chat-message") {
					appendChatMessage(message.message);
				} else if (message.type === "error") {
					if (message.message === "Stich wird gerade ausgewertet.") {
						console.debug(
							"Ignoring transient trick-resolution error from server",
						);
						return;
					}
					if (CHAT_LOCAL_ERROR_MESSAGES.has(message.message)) {
						setChatLocalError(message.message);
						if (message.message === CHAT_RATE_LIMIT_MESSAGE) {
							setChatCooldownUntil(Date.now() + 1_000);
						}
						return;
					}
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
					playerId,
				};
				socket.send(JSON.stringify(event));
			},

			announce: (announcement) => {
				if (!socket) return;
				const event: GameEvent = {
					type: "announce",
					announcement,
					playerId,
				};
				socket.send(JSON.stringify(event));
			},

			bid: (bid) => {
				if (!socket) return;
				const event: GameEvent = {
					type: "bid",
					playerId,
					bid,
				};
				socket.send(JSON.stringify(event));
			},

			declareContract: (contract) => {
				if (!socket) return;
				const event: GameEvent = {
					type: "declare-contract",
					playerId,
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

			toggleStandUp: () => {
				if (!socket) return;
				const event: GameEvent = {
					type: "toggle-stand-up",
					playerId,
				};
				socket.send(JSON.stringify(event));
			},

			setBotControl: (action, targetPlayerId) => {
				if (!socket) return;
				const event: GameEvent = {
					type: "bot-control",
					action,
					targetPlayerId,
				};
				socket.send(JSON.stringify(event));
			},

			sendChatMessage: (text: string) => {
				if (!socket) return;
				const event: GameEvent = {
					type: "chat-send",
					text,
				};
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
			inviteJoinAttemptedRef.current = false;
			inviteJoinSocket?.close();
			socket.close();
			cleanupProfileSync();
		};
	}, [
		gameId,
		playerId,
		setGameState,
		setError,
		setConnected,
		setSpectatorMode,
		setGameActions,
		setChatHistory,
		appendChatMessage,
		setChatCooldownUntil,
		setChatLocalError,
	]);
}
