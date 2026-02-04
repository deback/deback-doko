"use client";

import {
	DndContext,
	type DragEndEvent,
	MouseSensor,
	TouchSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { Card, GameState, Suit } from "@/types/game";
import type { Player } from "@/types/tables";
import { OpponentHand } from "./opponent-hand";
import { PlayerHand } from "./player-hand";
import { PlayerInfo } from "./player-info";
import { TrickArea } from "./trick-area";

interface GameBoardProps {
	gameState: GameState;
	currentPlayer: Player;
	playCard: (cardId: string) => void;
}

// Sortier- und Spiellogik aus game-client.tsx
function isTrump(card: Card, trump: Suit | "jacks" | "queens"): boolean {
	// Herz 10 ist immer der höchste Trumpf
	if (card.suit === "hearts" && card.rank === "10") return true;

	if (trump === "jacks") {
		return (
			card.rank === "jack" || card.rank === "queen" || card.suit === "diamonds"
		);
	}
	if (trump === "queens") {
		return card.rank === "queen" || card.suit === "diamonds";
	}
	return card.suit === trump;
}

function getPlayableCards(
	hand: Card[],
	currentTrick: GameState["currentTrick"],
	trump: Suit | "jacks" | "queens",
): Card[] {
	// Erste Karte im Stich: Alle Karten spielbar
	if (currentTrick.cards.length === 0) {
		return hand;
	}

	const firstCard = currentTrick.cards[0]?.card;
	if (!firstCard) return hand;

	const firstCardIsTrump = isTrump(firstCard, trump);
	const leadSuit = firstCard.suit;

	if (firstCardIsTrump) {
		// Trumpf angespielt: Prüfe ob Spieler Trumpf hat
		const trumpCards = hand.filter((card) => isTrump(card, trump));
		if (trumpCards.length > 0) {
			return trumpCards;
		}
		return hand;
	}

	// Fehlfarbe angespielt
	const suitCards = hand.filter((card) => {
		return (
			card.suit === leadSuit &&
			!(card.suit === "hearts" && card.rank === "10") &&
			!isTrump(card, trump)
		);
	});

	if (suitCards.length > 0) {
		return suitCards;
	}
	return hand;
}

function sortHand(
	hand: Card[],
	trump: Suit | "jacks" | "queens",
	schweinereiPlayerId: string | null,
	playerId: string,
): Card[] {
	return [...hand].sort((a, b) => {
		const aIsHearts10 = a.suit === "hearts" && a.rank === "10";
		const bIsHearts10 = b.suit === "hearts" && b.rank === "10";
		const aIsTrump = isTrump(a, trump);
		const bIsTrump = isTrump(b, trump);

		// Trump cards come first
		if (aIsTrump && !bIsTrump) return -1;
		if (!aIsTrump && bIsTrump) return 1;

		if (aIsTrump && bIsTrump) {
			// Schweinerei
			const hasSchweinerei = schweinereiPlayerId === playerId;
			const aIsSchweinerei =
				a.suit === "diamonds" && a.rank === "ace" && hasSchweinerei;
			const bIsSchweinerei =
				b.suit === "diamonds" && b.rank === "ace" && hasSchweinerei;

			if (aIsSchweinerei && !bIsSchweinerei) return -1;
			if (!aIsSchweinerei && bIsSchweinerei) return 1;

			// Herz 10 ist höchster Trumpf
			if (aIsHearts10 && !bIsHearts10 && !bIsSchweinerei) return -1;
			if (!aIsHearts10 && bIsHearts10 && !aIsSchweinerei) return 1;

			// Trump value sorting
			const trumpValue = (card: Card): number => {
				if (card.suit === "diamonds" && card.rank === "ace" && hasSchweinerei)
					return 1200;
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
			};

			return trumpValue(b) - trumpValue(a);
		}

		// Nicht-Trumpf Sortierung
		const suitOrder: Record<Suit, number> = {
			clubs: 1,
			hearts: 2,
			spades: 3,
			diamonds: 4,
		};

		if (a.suit !== b.suit) {
			return (suitOrder[a.suit] ?? 99) - (suitOrder[b.suit] ?? 99);
		}

		const rankOrder: Record<string, number> = {
			ace: 1,
			"10": 2,
			king: 3,
			jack: 4,
			queen: 5,
			"9": 6,
		};

		return (rankOrder[a.rank] ?? 99) - (rankOrder[b.rank] ?? 99);
	});
}

export function GameBoard({
	gameState,
	currentPlayer,
	playCard,
}: GameBoardProps) {
	const mouseSensor = useSensor(MouseSensor, {
		activationConstraint: {
			distance: 10,
		},
	});

	const touchSensor = useSensor(TouchSensor, {
		activationConstraint: {
			delay: 150,
			tolerance: 5,
		},
	});

	const sensors = useSensors(mouseSensor, touchSensor);

	// Spieler-Positionen berechnen (aktueller Spieler ist immer unten)
	const currentPlayerIndex = gameState.players.findIndex(
		(p) => p.id === currentPlayer.id,
	);

	const getPlayerAtPosition = (
		relativePosition: number,
	): Player | undefined => {
		const index =
			(currentPlayerIndex + relativePosition) % gameState.players.length;
		return gameState.players[index];
	};

	const bottomPlayer = getPlayerAtPosition(0); // Aktueller Spieler
	const leftPlayer = getPlayerAtPosition(1);
	const topPlayer = getPlayerAtPosition(2);
	const rightPlayer = getPlayerAtPosition(3);

	// Spiellogik
	const myHand = gameState.hands[currentPlayer.id] || [];
	const isMyTurn =
		gameState.players[gameState.currentPlayerIndex]?.id === currentPlayer.id;
	const schweinereiPlayerId = gameState.schweinereiPlayers[0] || null;

	const sortedHand = sortHand(
		myHand,
		gameState.trump,
		schweinereiPlayerId,
		currentPlayer.id,
	);

	// Berechne spielbare Karten immer (auch wenn nicht am Zug),
	// damit der Spieler sehen kann welche Karten er spielen könnte
	const playableCards = getPlayableCards(
		sortedHand,
		gameState.currentTrick,
		gameState.trump,
	);
	const playableCardIds = playableCards.map((c) => c.id);

	// Prüfe ob bereits eine Karte im Stich liegt
	const hasTrickStarted = gameState.currentTrick.cards.length > 0;

	// Prüfe ob der Spieler bereits im aktuellen Stich gespielt hat
	const hasPlayerPlayedInTrick = gameState.currentTrick.cards.some(
		(tc) => tc.playerId === currentPlayer.id,
	);

	const handleDragEnd = (event: DragEndEvent) => {
		const { over, active } = event;

		if (over?.id === "trick-area" && active?.id) {
			const cardId = active.id as string;
			if (playableCardIds.includes(cardId)) {
				playCard(cardId);
			}
		}
	};

	const handlePlayCard = (cardId: string) => {
		if (playableCardIds.includes(cardId)) {
			playCard(cardId);
		}
	};

	return (
		<DndContext onDragEnd={handleDragEnd} sensors={sensors}>
			<div className="relative h-dvh w-screen overflow-hidden bg-wood">
				{/* Oberer Gegner */}
				{topPlayer && (
					<div className="absolute top-4 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
						<PlayerInfo
							cardCount={gameState.hands[topPlayer.id]?.length || 0}
							isCurrentPlayer={false}
							isCurrentTurn={
								gameState.players[gameState.currentPlayerIndex]?.id ===
								topPlayer.id
							}
							player={topPlayer}
							position="top"
							score={gameState.scores[topPlayer.id] || 0}
							team={gameState.teams[topPlayer.id]}
						/>
						<OpponentHand
							cardCount={gameState.hands[topPlayer.id]?.length || 0}
							position="top"
						/>
					</div>
				)}

				{/* Linker Gegner */}
				{leftPlayer && (
					<div className="absolute top-1/2 left-4 flex -translate-y-1/2 flex-col items-center gap-2">
						<PlayerInfo
							cardCount={gameState.hands[leftPlayer.id]?.length || 0}
							isCurrentPlayer={false}
							isCurrentTurn={
								gameState.players[gameState.currentPlayerIndex]?.id ===
								leftPlayer.id
							}
							player={leftPlayer}
							position="left"
							score={gameState.scores[leftPlayer.id] || 0}
							team={gameState.teams[leftPlayer.id]}
						/>
						<OpponentHand
							cardCount={gameState.hands[leftPlayer.id]?.length || 0}
							position="left"
						/>
					</div>
				)}

				{/* Rechter Gegner */}
				{rightPlayer && (
					<div className="absolute top-1/2 right-4 flex -translate-y-1/2 flex-col items-center gap-2">
						<PlayerInfo
							cardCount={gameState.hands[rightPlayer.id]?.length || 0}
							isCurrentPlayer={false}
							isCurrentTurn={
								gameState.players[gameState.currentPlayerIndex]?.id ===
								rightPlayer.id
							}
							player={rightPlayer}
							position="right"
							score={gameState.scores[rightPlayer.id] || 0}
							team={gameState.teams[rightPlayer.id]}
						/>
						<OpponentHand
							cardCount={gameState.hands[rightPlayer.id]?.length || 0}
							position="right"
						/>
					</div>
				)}

				{/* Stich-Bereich (Mitte) */}
				<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
					<TrickArea
						currentPlayerId={currentPlayer.id}
						players={gameState.players}
						trickCards={gameState.currentTrick.cards}
					/>
				</div>

				{/* Unterer Spieler (aktueller Benutzer) */}
				{bottomPlayer && (
					<div className="absolute bottom-4 left-1/2 flex w-full max-w-3xl -translate-x-1/2 flex-col items-center gap-2 px-4">
						<PlayerInfo
							cardCount={sortedHand.length}
							isCurrentPlayer
							isCurrentTurn={isMyTurn}
							player={bottomPlayer}
							position="bottom"
							score={gameState.scores[bottomPlayer.id] || 0}
							team={gameState.teams[bottomPlayer.id]}
						/>
						<PlayerHand
							cards={sortedHand}
							className="w-full"
							hasTrickStarted={hasTrickStarted && !hasPlayerPlayedInTrick}
							isMyTurn={isMyTurn}
							onPlayCard={handlePlayCard}
							playableCardIds={playableCardIds}
						/>
					</div>
				)}

				{/* Turn-Indikator */}
				{!isMyTurn && (
					<div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-24">
						<div className="rounded-full bg-black/60 px-4 py-2 text-white/80 text-sm backdrop-blur-sm">
							Warte auf {gameState.players[gameState.currentPlayerIndex]?.name}
							...
						</div>
					</div>
				)}

				{/* Verbindungsstatus */}
				<div className="absolute top-4 right-4 flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-sm">
					<div
						className={cn(
							"h-2 w-2 rounded-full",
							"bg-emerald-500", // Immer verbunden wenn GameBoard gerendert wird
						)}
					/>
					<span className="text-white/70 text-xs">Verbunden</span>
				</div>

				{/* Spielende */}
				{gameState.gameEnded && (
					<div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
						<div className="rounded-xl bg-white/90 p-8 text-center shadow-2xl">
							<h2 className="mb-4 font-bold text-2xl text-emerald-600">
								Spiel beendet!
							</h2>
							<div className="space-y-2">
								{gameState.players
									.sort(
										(a, b) =>
											(gameState.scores[b.id] || 0) -
											(gameState.scores[a.id] || 0),
									)
									.map((player, index) => (
										<div
											className="flex items-center justify-between gap-4"
											key={player.id}
										>
											<span
												className={cn(
													"font-medium",
													index === 0 && "text-yellow-600",
												)}
											>
												{index + 1}. {player.name}
											</span>
											<span className="font-bold">
												{gameState.scores[player.id] || 0} Pkt.
											</span>
										</div>
									))}
							</div>
						</div>
					</div>
				)}
			</div>
		</DndContext>
	);
}
