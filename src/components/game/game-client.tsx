"use client";

import PartySocket from "partysocket";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type {
	Card as GameCard,
	GameEvent,
	GameMessage,
	GameState,
	Suit,
} from "@/types/game";
import type { Player } from "@/types/tables";

interface GameClientProps {
	player: Player;
	gameId: string;
}

export function GameClient({ player, gameId }: GameClientProps) {
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
				} catch (error) {
					console.error("Error parsing game info:", error);
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
			} catch (error) {
				console.error("Error parsing message:", error);
			}
		});

		return () => {
			socket.close();
		};
	}, [gameId]);

	const playCard = (cardId: string) => {
		if (!socketRef.current || !gameState) return;

		const event: GameEvent = {
			type: "play-card",
			cardId,
			playerId: player.id,
		};

		socketRef.current.send(JSON.stringify(event));
	};

	const getSuitColor = (suit: string) => {
		switch (suit) {
			case "hearts":
				return "text-red-600";
			case "diamonds":
				return "text-red-500";
			case "clubs":
				return "text-black";
			case "spades":
				return "text-black";
			default:
				return "text-gray-600";
		}
	};

	const getSuitSymbol = (suit: string) => {
		switch (suit) {
			case "hearts":
				return "♥";
			case "diamonds":
				return "♦";
			case "clubs":
				return "♣";
			case "spades":
				return "♠";
			default:
				return "";
		}
	};

	const getRankDisplay = (rank: string) => {
		switch (rank) {
			case "jack":
				return "B";
			case "queen":
				return "D";
			case "king":
				return "K";
			case "ace":
				return "A";
			default:
				return rank;
		}
	};

	const isMyTurn = () => {
		if (!gameState) return false;
		const currentPlayer = gameState.players[gameState.currentPlayerIndex];
		return currentPlayer?.id === player.id;
	};

	const isTrump = (card: GameCard): boolean => {
		if (!gameState) return false;
		const trump = gameState.trump;
		if (trump === "jacks") {
			return (
				card.rank === "jack" ||
				card.rank === "queen" ||
				card.suit === "diamonds"
			);
		}
		if (trump === "queens") {
			return card.rank === "queen" || card.suit === "diamonds";
		}
		return card.suit === trump;
	};

	const getPlayableCards = (): GameCard[] => {
		if (!gameState) return [];
		const myHand = gameState.hands[player.id] || [];
		const currentTrick = gameState.currentTrick;

		// Erste Karte im Stich: Alle Karten spielbar
		if (currentTrick.cards.length === 0) {
			return myHand;
		}

		// Bestimme angespielte Farbe/Trumpf
		const firstCard = currentTrick.cards[0]?.card;
		if (!firstCard) return myHand;

		const firstCardIsTrump = isTrump(firstCard);
		const leadSuit = firstCard.suit;

		// Prüfe, ob Spieler passende Karten hat
		if (firstCardIsTrump) {
			// Trumpf angespielt: Prüfe ob Spieler Trumpf hat
			const trumpCards = myHand.filter((card) => isTrump(card));
			if (trumpCards.length > 0) {
				return trumpCards;
			}
			// Keine Trumpf-Karten: Alle Karten spielbar
			return myHand;
		} else {
			// Fehlfarbe angespielt: Prüfe ob Spieler diese Farbe hat
			const suitCards = myHand.filter((card) => {
				// Nicht-Trumpf-Karten dieser Farbe
				return card.suit === leadSuit && !isTrump(card);
			});
			if (suitCards.length > 0) {
				return suitCards;
			}
			// Keine passende Farbe: Alle Karten spielbar
			return myHand;
		}
	};

	const myHand = gameState?.hands[player.id] || [];
	const currentPlayer = gameState?.players[gameState.currentPlayerIndex || 0];
	const playableCards = isMyTurn() ? getPlayableCards() : [];

	// Sort cards: Trumpf first, then by suit and rank
	const sortedHand = [...myHand].sort((a, b) => {
		if (!gameState) return 0;

		// Check if cards are trump
		const aIsTrump =
			gameState.trump === "jacks"
				? a.rank === "jack" || a.rank === "queen" || a.suit === "diamonds"
				: a.rank === "queen" || a.suit === "diamonds";
		const bIsTrump =
			gameState.trump === "jacks"
				? b.rank === "jack" || b.rank === "queen" || b.suit === "diamonds"
				: b.rank === "queen" || b.suit === "diamonds";

		// Trump cards come first
		if (aIsTrump && !bIsTrump) return -1;
		if (!aIsTrump && bIsTrump) return 1;

		// If both are trump, sort by trump value
		if (aIsTrump && bIsTrump) {
			const aValue = getCardValueForSort(a, gameState.trump);
			const bValue = getCardValueForSort(b, gameState.trump);
			return bValue - aValue; // Higher value first
		}

		// If neither is trump, sort by suit then rank
		// Doppelkopf Farb-Reihenfolge: Kreuz, Herz, Pik, Karo
		const suitOrder: Record<Suit, number> = {
			clubs: 1,
			hearts: 2,
			spades: 3,
			diamonds: 4,
		};

		if (a.suit !== b.suit) {
			const aOrder = suitOrder[a.suit] ?? 99;
			const bOrder = suitOrder[b.suit] ?? 99;
			return aOrder - bOrder;
		}

		// Same suit, sort by rank (Doppelkopf order: Ass, 10, König, Bube, Dame, 9)
		const rankOrder: Record<string, number> = {
			ace: 1,
			"10": 2,
			king: 3,
			jack: 4,
			queen: 5,
			"9": 6,
		};

		const aRankOrder = rankOrder[a.rank] ?? 99;
		const bRankOrder = rankOrder[b.rank] ?? 99;
		return aRankOrder - bRankOrder;
	});

	function getCardValueForSort(
		card: GameCard,
		_trump: Suit | "jacks" | "queens",
	): number {
		// Trump values: Damen (1000), Buben (900), Karo (820-850)
		if (card.rank === "queen") return 1000;
		if (card.rank === "jack") return 900;
		if (card.suit === "diamonds") {
			if (card.rank === "ace") return 850;
			if (card.rank === "king") return 840;
			if (card.rank === "10") return 830;
			if (card.rank === "9") return 820;
		}
		return 0;
	}

	if (!gameState) {
		return (
			<div className="container mx-auto p-6">
				<Card>
					<CardContent className="pt-6">
						<p className="text-center text-muted-foreground">
							{isConnected ? "Warte auf Spielstart..." : "Verbinde..."}
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="container mx-auto space-y-6 p-6">
			<div className="flex items-center justify-between">
				<h1 className="font-bold text-3xl">Doppelkopf Spiel</h1>
				<div className="flex items-center gap-2">
					<div
						className={`h-3 w-3 rounded-full ${
							isConnected ? "bg-green-500" : "bg-red-500"
						}`}
					/>
					<span className="text-muted-foreground text-sm">
						{isConnected ? "Verbunden" : "Getrennt"}
					</span>
				</div>
			</div>

			{error && (
				<Card className="border-destructive">
					<CardContent className="pt-6">
						<p className="text-center text-destructive">{error}</p>
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle>Spieler</CardTitle>
					<CardDescription>
						Trumpf:{" "}
						{gameState.trump === "jacks" ? "Damen, Buben, Karo" : "Damen, Karo"}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
						{gameState.players.map((p, index) => {
							const isCurrent = index === gameState.currentPlayerIndex;
							const isMe = p.id === player.id;

							return (
								<div
									className={`rounded-lg border p-4 ${
										isCurrent ? "border-primary bg-primary/10" : "border-border"
									}`}
									key={p.id}
								>
									<div className="font-semibold">
										{p.name} {isMe && "(Du)"}
									</div>
									{isCurrent && (
										<div className="text-primary text-sm">ist dran</div>
									)}
									<div className="text-muted-foreground text-sm">
										{gameState.hands[p.id]?.length || 0} Karten
									</div>
								</div>
							);
						})}
					</div>
				</CardContent>
			</Card>

			{gameState.currentTrick.cards.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Aktueller Stich</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
							{gameState.currentTrick.cards.map((trickCard) => {
								const trickPlayer = gameState.players.find(
									(p) => p.id === trickCard.playerId,
								);
								return (
									<div
										className="rounded-lg border border-border bg-card p-4"
										key={`${trickCard.playerId}-${trickCard.card.id}`}
									>
										<div className="text-muted-foreground text-sm">
											{trickPlayer?.name}
										</div>
										<div
											className={`font-bold text-2xl ${getSuitColor(trickCard.card.suit)}`}
										>
											{getSuitSymbol(trickCard.card.suit)}{" "}
											{getRankDisplay(trickCard.card.rank)}
										</div>
									</div>
								);
							})}
						</div>
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle>Deine Karten</CardTitle>
					<CardDescription>
						{isMyTurn()
							? "Du bist dran - wähle eine Karte"
							: `Warte auf ${currentPlayer?.name || "Spieler"}...`}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-wrap gap-2">
						{sortedHand.map((card) => {
							// In Doppelkopf sind Buben, Damen und Karo Trumpf
							const isTrump =
								gameState.trump === "jacks"
									? card.rank === "jack" ||
										card.rank === "queen" ||
										card.suit === "diamonds"
									: card.rank === "queen" || card.suit === "diamonds";

							const isPlayable = playableCards.some((c) => c.id === card.id);
							const canClick = isMyTurn() && isPlayable;

							return (
								<Button
									className={`h-20 w-14 flex-col gap-1 p-2 ${
										isTrump ? "border-2 border-yellow-500" : ""
									} ${
										isMyTurn() && isPlayable
											? "ring-2 ring-green-500 ring-offset-2"
											: ""
									} ${
										isMyTurn() && !isPlayable
											? "cursor-not-allowed opacity-50"
											: ""
									}`}
									disabled={!canClick}
									key={card.id}
									onClick={() => playCard(card.id)}
									variant={canClick ? "default" : "outline"}
								>
									<span
										className={`font-bold text-lg ${getSuitColor(card.suit)}`}
									>
										{getSuitSymbol(card.suit)}
									</span>
									<span className="text-xs">{getRankDisplay(card.rank)}</span>
									{isTrump && (
										<span className="text-xs text-yellow-500">T</span>
									)}
								</Button>
							);
						})}
					</div>
				</CardContent>
			</Card>

			{gameState.completedTricks.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Abgeschlossene Stiche</CardTitle>
						<CardDescription>
							{gameState.completedTricks.length} / 12 Stiche
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							{gameState.completedTricks
								.slice()
								.reverse()
								.map((trick, index) => {
									const winner = gameState.players.find(
										(p) => p.id === trick.winnerId,
									);
									return (
										<div
											className="rounded-lg border border-border bg-muted/50 p-2"
											key={`trick-${trick.winnerId}-${index}-${gameState.completedTricks.length - index}`}
										>
											<div className="text-muted-foreground text-sm">
												Stich {gameState.completedTricks.length - index} -{" "}
												Gewinner: {winner?.name}
											</div>
										</div>
									);
								})}
						</div>
					</CardContent>
				</Card>
			)}

			{gameState.gameEnded && (
				<Card className="border-green-500">
					<CardContent className="pt-6">
						<p className="text-center font-bold text-green-600 text-lg">
							Spiel beendet!
						</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
