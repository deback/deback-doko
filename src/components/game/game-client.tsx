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
		// Herz 10 ist immer der höchste Trumpf
		if (card.suit === "hearts" && card.rank === "10") return true;

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
			// Herz 10 ist immer Trumpf, auch wenn Herz angespielt wurde
			const suitCards = myHand.filter((card) => {
				// Nicht-Trumpf-Karten dieser Farbe (Herz 10 ist Trumpf!)
				return (
					card.suit === leadSuit &&
					!(card.suit === "hearts" && card.rank === "10") &&
					!isTrump(card)
				);
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

		// Check if cards are trump (Herz 10 ist immer Trumpf)
		const aIsHearts10 = a.suit === "hearts" && a.rank === "10";
		const bIsHearts10 = b.suit === "hearts" && b.rank === "10";
		const aIsTrump =
			aIsHearts10 ||
			(gameState.trump === "jacks"
				? a.rank === "jack" || a.rank === "queen" || a.suit === "diamonds"
				: a.rank === "queen" || a.suit === "diamonds");
		const bIsTrump =
			bIsHearts10 ||
			(gameState.trump === "jacks"
				? b.rank === "jack" || b.rank === "queen" || b.suit === "diamonds"
				: b.rank === "queen" || b.suit === "diamonds");

		// Trump cards come first
		if (aIsTrump && !bIsTrump) return -1;
		if (!aIsTrump && bIsTrump) return 1;

		// If both are trump, sort by trump value
		if (aIsTrump && bIsTrump) {
			// Schweinerei: Karo-Assen sind höher als Herz 10
			const aIsSchweinerei =
				a.suit === "diamonds" &&
				a.rank === "ace" &&
				gameState.schweinereiPlayers.includes(player.id);
			const bIsSchweinerei =
				b.suit === "diamonds" &&
				b.rank === "ace" &&
				gameState.schweinereiPlayers.includes(player.id);

			if (aIsSchweinerei && !bIsSchweinerei) return -1;
			if (!aIsSchweinerei && bIsSchweinerei) return 1;

			// Herz 10 ist höchster Trumpf (nach Schweinerei)
			if (aIsHearts10 && !bIsHearts10 && !bIsSchweinerei) return -1;
			if (!aIsHearts10 && bIsHearts10 && !aIsSchweinerei) return 1;

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
		// Schweinerei: Karo-Assen sind höher als Herz 10, wenn Spieler beide hat
		if (
			card.suit === "diamonds" &&
			card.rank === "ace" &&
			gameState?.schweinereiPlayers.includes(player.id)
		) {
			return 1200; // Höher als Herz 10 (1100)
		}
		// Trump values: Herz 10 (1100), Damen (1000), Buben (900), Karo (820-850)
		if (card.suit === "hearts" && card.rank === "10") return 1100;
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
									<div className="font-bold text-primary">
										{gameState.scores?.[p.id] || 0} Punkte
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
					<div className="relative flex items-center justify-center py-12">
						<div
							className="relative"
							style={{ height: "200px", width: "100%" }}
						>
							{sortedHand.map((card, index) => {
								// In Doppelkopf sind Herz 10, Buben, Damen und Karo Trumpf
								const isHearts10 = card.suit === "hearts" && card.rank === "10";
								const isTrump =
									isHearts10 ||
									(gameState.trump === "jacks"
										? card.rank === "jack" ||
											card.rank === "queen" ||
											card.suit === "diamonds"
										: card.rank === "queen" || card.suit === "diamonds");

								const isPlayable = playableCards.some((c) => c.id === card.id);
								const canClick = isMyTurn() && isPlayable;

								// Berechne Rotation und Position für Halbkreis-Effekt
								const totalCards = sortedHand.length;
								const maxRotation = 30; // Maximale Rotation in Grad
								const rotationStep = (maxRotation * 2) / (totalCards - 1 || 1);
								const rotation = -maxRotation + index * rotationStep;

								// Halbkreis-Form: Berechne Position auf einem Kreisbogen
								const radius = 200; // Radius des Halbkreises
								const angle = (rotation * Math.PI) / 180; // Winkel in Radiant
								const translateX = Math.sin(angle) * radius;
								const translateY = -Math.cos(angle) * radius + radius;

								const zIndex = index;

								return (
									<Button
										className={`absolute top-0 left-1/2 h-36 w-24 rounded-lg transition-all duration-200 hover:z-50 ${
											isHearts10
												? "border-2 border-red-600 bg-red-50 dark:bg-red-950"
												: isTrump
													? "border-2 border-yellow-500"
													: "bg-white dark:bg-gray-800"
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
										onMouseEnter={(e) => {
											e.currentTarget.style.transform = `translate(calc(-50% + ${translateX}px), ${translateY}px) rotate(${rotation}deg) scale(1.1)`;
										}}
										onMouseLeave={(e) => {
											e.currentTarget.style.transform = `translate(calc(-50% + ${translateX}px), ${translateY}px) rotate(${rotation}deg)`;
										}}
										style={{
											transform: `translate(calc(-50% + ${translateX}px), ${translateY}px) rotate(${rotation}deg)`,
											transformOrigin: "50% 50%",
											zIndex: zIndex,
										}}
										variant={canClick ? "default" : "outline"}
									>
										{/* Oben links */}
										<div
											className={`absolute top-1 left-1 flex flex-col items-start ${getSuitColor(card.suit)}`}
										>
											<span className="font-bold leading-none">
												{getRankDisplay(card.rank)}
											</span>
											<span className="text-xs leading-none">
												{getSuitSymbol(card.suit)}
											</span>
										</div>

										{/* Oben rechts */}
										<div
											className={`absolute top-1 right-1 flex flex-col items-end ${getSuitColor(card.suit)}`}
										>
											<span className="font-bold leading-none">
												{getRankDisplay(card.rank)}
											</span>
											<span className="text-xs leading-none">
												{getSuitSymbol(card.suit)}
											</span>
										</div>

										{/* Unten links */}
										<div
											className={`absolute bottom-1 left-1 flex rotate-180 flex-col items-start ${getSuitColor(card.suit)}`}
										>
											<span className="font-bold leading-none">
												{getRankDisplay(card.rank)}
											</span>
											<span className="text-xs leading-none">
												{getSuitSymbol(card.suit)}
											</span>
										</div>

										{/* Unten rechts */}
										<div
											className={`absolute right-1 bottom-1 flex rotate-180 flex-col items-end ${getSuitColor(card.suit)}`}
										>
											<span className="font-bold leading-none">
												{getRankDisplay(card.rank)}
											</span>
											<span className="text-xs leading-none">
												{getSuitSymbol(card.suit)}
											</span>
										</div>

										{/* Zentrum - größere Anzeige */}
										<div className="flex h-full items-center justify-center">
											<div
												className={`flex flex-col items-center ${getSuitColor(card.suit)}`}
											>
												<span className="font-bold text-2xl">
													{getSuitSymbol(card.suit)}
												</span>
												<span className="font-semibold text-sm">
													{getRankDisplay(card.rank)}
												</span>
											</div>
										</div>

										{/* Trumpf-Markierungen */}
										{isHearts10 && (
											<span className="absolute top-2 right-2 font-bold text-red-600 text-xs">
												★
											</span>
										)}
										{isTrump && !isHearts10 && (
											<span className="absolute top-2 right-2 text-xs text-yellow-500">
												T
											</span>
										)}
									</Button>
								);
							})}
						</div>
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
												Gewinner: {winner?.name || winner?.email}
												{trick.points !== undefined && (
													<span className="ml-2 font-bold text-primary">
														({trick.points} Punkte)
													</span>
												)}
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
