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
import { Bot, Eye, RotateCcw } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { getCardImagePath } from "@/lib/card-config";
import { getPlayableCards, isTrump } from "@/lib/game/rules";
import { cn } from "@/lib/utils";
import type {
	AnnouncementType,
	Card,
	ContractType,
	GameState,
	ReservationType,
	Suit,
} from "@/types/game";
import type { Player } from "@/types/tables";
import { AnnouncementButtons } from "./announcement-buttons";
import { BiddingSelect } from "./bidding-select";
import { CARD_SIZE, type CardOrigin } from "./card";
import { GameSettingsMenu } from "./game-settings-menu";
import { OpponentHand } from "./opponent-hand";
import { PlayerHand } from "./player-hand";
import { PlayerInfo } from "./player-info";
import { TrickArea } from "./trick-area";
import { TurnIndicator } from "./turn-indicator";

interface GameBoardProps {
	gameState: GameState;
	currentPlayer: Player;
	playCard: (cardId: string) => void;
	autoPlay: () => void;
	announce: (announcement: AnnouncementType) => void;
	resetGame: () => void;
	bid: (bid: ReservationType) => void;
	declareContract: (contract: ContractType) => void;
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

			// Trump value sorting - Doppelkopf Reihenfolge
			const trumpValue = (card: Card): number => {
				// Schweinerei (beide Karo-Asse) sind höchster Trumpf
				if (card.suit === "diamonds" && card.rank === "ace" && hasSchweinerei)
					return 1200;
				// Herz 10 (Dulle) ist zweithöchster Trumpf
				if (card.suit === "hearts" && card.rank === "10") return 1100;

				// Damen nach Farbe: Kreuz > Pik > Herz > Karo
				if (card.rank === "queen") {
					if (card.suit === "clubs") return 1040;
					if (card.suit === "spades") return 1030;
					if (card.suit === "hearts") return 1020;
					if (card.suit === "diamonds") return 1010;
				}

				// Buben nach Farbe: Kreuz > Pik > Herz > Karo
				if (card.rank === "jack") {
					if (card.suit === "clubs") return 940;
					if (card.suit === "spades") return 930;
					if (card.suit === "hearts") return 920;
					if (card.suit === "diamonds") return 910;
				}

				// Karo-Karten (restlicher Trumpf)
				if (card.suit === "diamonds") {
					if (card.rank === "ace") return 850;
					if (card.rank === "10") return 840;
					if (card.rank === "king") return 830;
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
	autoPlay,
	announce,
	resetGame,
	bid,
	declareContract,
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
	const [cachedEndGameState, setCachedEndGameState] =
		useState<GameState | null>(null);

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

	// Helper-Funktion für Ansagen-Props (nur Ansagen die dieser Spieler gemacht hat)
	const getPlayerAnnouncements = (playerId: string) => {
		const team = gameState.teams[playerId];
		if (!team || !gameState.announcements) return undefined;

		// Punkt-Ansagen: Nur die, die dieser Spieler gemacht hat
		const allTeamPointAnnouncements =
			team === "re"
				? (gameState.announcements.rePointAnnouncements ?? [])
				: (gameState.announcements.kontraPointAnnouncements ?? []);

		// Filtere nur die Ansagen, die dieser Spieler gemacht hat
		const playerPointAnnouncements = allTeamPointAnnouncements
			.filter((pa) => pa.by === playerId)
			.map((pa) => pa.type);

		// Zeige Re/Kontra wenn:
		// 1. Dieser Spieler es selbst angesagt hat, ODER
		// 2. Dieser Spieler eine Punkt-Ansage gemacht hat (dann muss das Team sichtbar sein)
		const playerAnnouncedReKontra =
			(team === "re" && gameState.announcements.re?.by === playerId) ||
			(team === "kontra" && gameState.announcements.kontra?.by === playerId);

		const hasPointAnnouncements = playerPointAnnouncements.length > 0;

		// Zeige Re/Kontra Badge wenn der Spieler es angesagt hat ODER Punkt-Ansagen hat
		const reOrKontra =
			playerAnnouncedReKontra || hasPointAnnouncements
				? (team as "re" | "kontra")
				: undefined;

		if (!reOrKontra && !hasPointAnnouncements) return undefined;

		return {
			reOrKontra,
			pointAnnouncements: hasPointAnnouncements
				? playerPointAnnouncements
				: undefined,
		};
	};

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

	// Cache game state when game ends, reset dialog when new game starts
	useEffect(() => {
		if (gameState.gameEnded) {
			// Cache the game state when game ends
			setCachedEndGameState(gameState);
		} else if (cachedEndGameState?.gameEnded) {
			// Reset dialog visibility for next game end (but keep cached state for current dialog)
			setShowGameEndDialog(true);
		}
	}, [gameState.gameEnded, gameState, cachedEndGameState?.gameEnded]);

	// Clear cached state when dialog is closed
	const handleCloseGameEndDialog = useCallback(() => {
		setShowGameEndDialog(false);
		setCachedEndGameState(null);
	}, []);

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
					<PlayerInfo
						announcements={getPlayerAnnouncements(topPlayer.id)}
						isCurrentTurn={
							gameState.players[gameState.currentPlayerIndex]?.id ===
							topPlayer.id
						}
						player={topPlayer}
						position="top"
					/>
					<OpponentHand
						cardCount={gameState.hands[topPlayer.id]?.length || 0}
						position="top"
					/>
				</>
			)}

			{/* Linker Gegner */}
			{leftPlayer && (
				<>
					<PlayerInfo
						announcements={getPlayerAnnouncements(leftPlayer.id)}
						isCurrentTurn={
							gameState.players[gameState.currentPlayerIndex]?.id ===
							leftPlayer.id
						}
						player={leftPlayer}
						position="left"
					/>

					<OpponentHand
						cardCount={gameState.hands[leftPlayer.id]?.length || 0}
						position="left"
					/>
				</>
			)}

			{/* Rechter Gegner */}
			{rightPlayer && (
				<>
					<PlayerInfo
						announcements={getPlayerAnnouncements(rightPlayer.id)}
						isCurrentTurn={
							gameState.players[gameState.currentPlayerIndex]?.id ===
							rightPlayer.id
						}
						player={rightPlayer}
						position="right"
					/>

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
					<PlayerInfo
						announcements={getPlayerAnnouncements(bottomPlayer.id)}
						isCurrentTurn={isMyTurn}
						player={bottomPlayer}
						position="bottom"
					/>
					<PlayerHand
						activeDragCard={dragPlayedCard}
						cards={sortedHand}
						disabled={gameState.biddingPhase?.active}
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

			{/* Turn-Indikator (ein-/ausblendbar) */}
			<TurnIndicator
				currentPlayerName={
					gameState.players[gameState.currentPlayerIndex]?.name ?? ""
				}
				isMyTurn={isMyTurn}
			/>

			{/* Verbindungsstatus & Zuschauer */}
			<div className="fixed top-4 right-4 z-20 flex flex-col items-end gap-2">
				<div className="flex items-center gap-2">
					<div className="flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-sm">
						<div
							className={cn(
								"h-2 w-2 rounded-full",
								"bg-emerald-500", // Immer verbunden wenn GameBoard gerendert wird
							)}
						/>
						<span className="text-white/70 text-xs">Verbunden</span>
					</div>
					<GameSettingsMenu />
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

			{/* Ansagen-Buttons (nicht während Vorbehaltsabfrage) */}
			{!gameState.biddingPhase?.active && (
				<AnnouncementButtons
					className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2"
					currentPlayer={currentPlayer}
					gameState={gameState}
					onAnnounce={announce}
				/>
			)}

			{/* Auto-Play & Reset Game Buttons */}
			{process.env.NODE_ENV === "development" && (
				<div className="fixed bottom-4 left-4 z-50 flex items-center gap-2">
					<button
						className="flex items-center gap-2 rounded-full bg-amber-500/90 px-4 py-2 font-medium text-sm text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-amber-600"
						onClick={autoPlay}
						type="button"
					>
						<Bot className="h-4 w-4" />
						Auto-Play
					</button>
					<button
						className="flex items-center gap-2 rounded-full bg-slate-500/90 px-4 py-2 font-medium text-sm text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-slate-600"
						onClick={resetGame}
						type="button"
					>
						<RotateCcw className="h-4 w-4" />
						Reset
					</button>
				</div>
			)}

			{/* Spielende - use cached state to keep dialog open during new game start */}
			<Dialog
				onOpenChange={(open) => !open && handleCloseGameEndDialog()}
				open={!!cachedEndGameState && showGameEndDialog}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="text-center text-2xl text-emerald-600">
							Spiel beendet!
						</DialogTitle>
					</DialogHeader>
					{cachedEndGameState && (
						<div className="space-y-3">
							{(() => {
								const reScore = cachedEndGameState.players
									.filter((p) => cachedEndGameState.teams[p.id] === "re")
									.reduce(
										(sum, p) => sum + (cachedEndGameState.scores[p.id] || 0),
										0,
									);

								const kontraScore = cachedEndGameState.players
									.filter((p) => cachedEndGameState.teams[p.id] === "kontra")
									.reduce(
										(sum, p) => sum + (cachedEndGameState.scores[p.id] || 0),
										0,
									);

								const reWon = reScore > kontraScore;

								return (
									<>
										<div
											className={cn(
												"rounded-lg p-3",
												reWon ? "bg-emerald-500/20" : "bg-muted",
											)}
										>
											<div className="mb-1 flex items-center justify-between">
												<span
													className={cn(
														"font-bold",
														reWon && "text-emerald-600",
													)}
												>
													Re {reWon && "🏆"}
												</span>
												<span className="font-bold text-lg">
													{reScore} Pkt.
												</span>
											</div>
											<div className="text-muted-foreground text-sm">
												{cachedEndGameState.players
													.filter(
														(p) => cachedEndGameState.teams[p.id] === "re",
													)
													.map((p) => p.name)
													.join(", ")}
											</div>
										</div>

										<div
											className={cn(
												"rounded-lg p-3",
												!reWon ? "bg-emerald-500/20" : "bg-muted",
											)}
										>
											<div className="mb-1 flex items-center justify-between">
												<span
													className={cn(
														"font-bold",
														!reWon && "text-emerald-600",
													)}
												>
													Kontra {!reWon && "🏆"}
												</span>
												<span className="font-bold text-lg">
													{kontraScore} Pkt.
												</span>
											</div>
											<div className="text-muted-foreground text-sm">
												{cachedEndGameState.players
													.filter(
														(p) => cachedEndGameState.teams[p.id] === "kontra",
													)
													.map((p) => p.name)
													.join(", ")}
											</div>
										</div>
									</>
								);
							})()}
						</div>
					)}
				</DialogContent>
			</Dialog>
			{/* Bidding Select */}
			{gameState.biddingPhase?.active && (
				<BiddingSelect
					biddingPhase={gameState.biddingPhase}
					currentPlayerId={currentPlayer.id}
					onBid={bid}
					onDeclareContract={declareContract}
					playerHand={sortedHand}
					players={gameState.players}
				/>
			)}
		</DndContext>
	);
}
