"use client";

import {
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	MouseSensor,
	TouchSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { Eye, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { getCardImagePath } from "@/lib/card-config";
import { cn } from "@/lib/utils";
import type { Card, GameState, Suit } from "@/types/game";
import type { Player } from "@/types/tables";
import { CARD_SIZE, type CardOrigin } from "./card";
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
	const dndContextId = useId();

	// Animation state
	const [playedCard, setPlayedCard] = useState<{
		card: Card;
		playerId: string;
	} | null>(null);
	const [cardOrigin, setCardOrigin] = useState<CardOrigin | null>(null);
	const [activeDragCard, setActiveDragCard] = useState<Card | null>(null);
	const [dragPlayedCard, setDragPlayedCard] = useState<string | null>(null);
	const [showGameEndDialog, setShowGameEndDialog] = useState(true);

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

	function handleDragStart(event: DragStartEvent) {
		const cardData = event.active.data.current?.card as Card | undefined;
		if (cardData) {
			setActiveDragCard(cardData);
		}
	}

	function handleDragEnd(event: DragEndEvent) {
		const { over, active, delta } = event;
		setActiveDragCard(null);

		if (over?.id !== "trick-area" || !active?.id) return;

		const cardId = active.id as string;
		if (!playableCardIds.includes(cardId)) return;

		const cardData = active.data.current?.card as Card | undefined;
		if (!cardData) return;

		const initialRect = active.rect.current.initial;
		if (!initialRect) return;

		const angle =
			(active.data.current as { angle?: number } | undefined)?.angle ?? 0;

		const dropOrigin: CardOrigin = {
			x: initialRect.left + delta.x,
			y: initialRect.top + delta.y,
			width: initialRect.width,
			height: initialRect.height,
			rotate: angle,
		};

		// Set animation state
		setCardOrigin(dropOrigin);
		setPlayedCard({ card: cardData, playerId: currentPlayer.id });
		setDragPlayedCard(cardId);

		// Actually play the card
		playCard(cardId);
	}

	const handlePlayCard = useCallback(
		(cardId: string, origin: CardOrigin) => {
			if (!playableCardIds.includes(cardId)) return;

			const card = sortedHand.find((c) => c.id === cardId);
			if (!card) return;

			// Set animation state
			setCardOrigin(origin);
			setPlayedCard({ card, playerId: currentPlayer.id });

			// Actually play the card
			playCard(cardId);
		},
		[playableCardIds, sortedHand, currentPlayer.id, playCard],
	);

	const handleRemoveCard = useCallback(() => {
		// Card removal is handled by server state update
		// Just clear the drag played card state
		setDragPlayedCard(null);
	}, []);

	// Track trick card count to detect when a new trick starts
	const prevTrickLengthRef = useRef(gameState.currentTrick.cards.length);

	// Reset animation state when trick is cleared (new trick starts)
	useEffect(() => {
		const currentLength = gameState.currentTrick.cards.length;
		const prevLength = prevTrickLengthRef.current;

		// If trick was reset (e.g., from 4 cards to 0), clear animation state
		if (currentLength < prevLength) {
			setPlayedCard(null);
			setCardOrigin(null);
		}

		prevTrickLengthRef.current = currentLength;
	}, [gameState.currentTrick.cards.length]);

	// Reset game end dialog when a new game starts
	useEffect(() => {
		if (!gameState.gameEnded) {
			setShowGameEndDialog(true);
		}
	}, [gameState.gameEnded]);

	return (
		<DndContext
			id={dndContextId}
			onDragEnd={handleDragEnd}
			onDragStart={handleDragStart}
			sensors={sensors}
		>
			{/* Oberer Gegner */}
			{topPlayer && (
				<>
					<div className="fixed top-4 left-1/2 z-10 -translate-x-1/2">
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
					</div>
					<OpponentHand
						cardCount={gameState.hands[topPlayer.id]?.length || 0}
						position="top"
					/>
				</>
			)}

			{/* Linker Gegner */}
			{leftPlayer && (
				<>
					<div className="fixed left-4 top-1/2 z-10 -translate-y-1/2">
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
					</div>
					<OpponentHand
						cardCount={gameState.hands[leftPlayer.id]?.length || 0}
						position="left"
					/>
				</>
			)}

			{/* Rechter Gegner */}
			{rightPlayer && (
				<>
					<div className="fixed right-4 top-1/2 z-10 -translate-y-1/2">
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
					</div>
					<OpponentHand
						cardCount={gameState.hands[rightPlayer.id]?.length || 0}
						position="right"
					/>
				</>
			)}

			{/* Stich-Bereich (Mitte) */}
			<TrickArea
				cardOrigin={cardOrigin}
				currentPlayerId={currentPlayer.id}
				playedCard={playedCard}
				players={gameState.players}
				trickCards={gameState.currentTrick.cards}
				trickWinnerId={gameState.currentTrick.winnerId}
			/>

			{/* Unterer Spieler (aktueller Benutzer) */}
			{bottomPlayer && (
				<>
					<div className="fixed bottom-[25%] left-1/2 z-10 -translate-x-1/2 landscape:bottom-[20%]">
						<PlayerInfo
							cardCount={sortedHand.length}
							isCurrentPlayer
							isCurrentTurn={isMyTurn}
							player={bottomPlayer}
							position="bottom"
							score={gameState.scores[bottomPlayer.id] || 0}
							team={gameState.teams[bottomPlayer.id]}
						/>
					</div>
					<PlayerHand
						activeDragCard={dragPlayedCard}
						cards={sortedHand}
						hasTrickStarted={hasTrickStarted && !hasPlayerPlayedInTrick}
						isMyTurn={isMyTurn}
						onPlayCard={handlePlayCard}
						onRemoveCard={handleRemoveCard}
						playableCardIds={playableCardIds}
					/>
				</>
			)}

			{/* Drag Overlay */}
			<DragOverlay dropAnimation={null}>
				{activeDragCard && (
					<div className={`relative ${CARD_SIZE}`}>
						<Image
							alt={`${activeDragCard.rank} of ${activeDragCard.suit}`}
							className="rounded-[1cqw] shadow-xl"
							draggable={false}
							fill
							src={getCardImagePath(activeDragCard.suit, activeDragCard.rank)}
						/>
					</div>
				)}
			</DragOverlay>

			{/* Turn-Indikator */}
			{!isMyTurn && (
				<div className="fixed top-1/2 left-1/2 z-20 -translate-x-1/2 translate-y-24">
					<div className="rounded-full bg-black/60 px-4 py-2 text-white/80 text-sm backdrop-blur-sm">
						Warte auf {gameState.players[gameState.currentPlayerIndex]?.name}
						...
					</div>
				</div>
			)}

			{/* Verbindungsstatus & Zuschauer */}
			<div className="fixed top-4 right-4 z-20 flex flex-col items-end gap-2">
				<div className="flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-sm">
					<div
						className={cn(
							"h-2 w-2 rounded-full",
							"bg-emerald-500", // Immer verbunden wenn GameBoard gerendert wird
						)}
					/>
					<span className="text-white/70 text-xs">Verbunden</span>
				</div>

				{/* Zuschauer-Liste */}
				{gameState.spectators && gameState.spectators.length > 0 && (
					<div className="rounded-lg bg-black/40 px-3 py-2 backdrop-blur-sm">
						<div className="mb-1.5 flex items-center gap-1.5 text-white/50 text-xs">
							<Eye className="h-3 w-3" />
							Zuschauer ({gameState.spectators.length})
						</div>
						<div className="flex flex-col gap-1.5">
							{gameState.spectators.map((spectator) => (
								<div className="flex items-center gap-2" key={spectator.id}>
									<Avatar
										alt={spectator.name}
										fallback={spectator.name.charAt(0).toUpperCase()}
										size="xs"
										src={spectator.image}
									/>
									<span className="text-white/70 text-xs">
										{spectator.name}
									</span>
								</div>
							))}
						</div>
					</div>
				)}
			</div>

			{/* Spielende */}
			{gameState.gameEnded && showGameEndDialog && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
					<div className="relative rounded-xl bg-white/90 p-8 text-center shadow-2xl">
						<button
							className="absolute top-2 right-2 rounded-full p-1 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
							onClick={() => setShowGameEndDialog(false)}
							type="button"
						>
							<X className="h-5 w-5" />
						</button>
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
		</DndContext>
	);
}
