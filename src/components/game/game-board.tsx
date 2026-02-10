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
import { Bot, Eye, FastForward, RotateCcw } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCardImagePath } from "@/lib/card-config";
import { cn } from "@/lib/utils";
import {
	useAutoPlay,
	useAutoPlayAll,
	useBid,
	useContractDeclarer,
	useCurrentPlayer,
	useDeclareContract,
	useGameState,
	useIsBiddingActive,
	useIsMyTurn,
	useIsSpectator,
	usePlayableCardIds,
	usePlayCard,
	usePlayerAnnouncements,
	usePlayerAtPosition,
	useResetGame,
	useSortedHand,
} from "@/stores/game-selectors";
import type { Card, GameState } from "@/types/game";
import { AnnouncementButtons } from "./announcement-buttons";
import { BiddingSelect } from "./bidding-select";
import { CARD_SIZE, type CardOrigin } from "./card";
import { GameEndDialog } from "./game-end-dialog";
import { GameSettingsMenu } from "./game-settings-menu";
import { OpponentHand } from "./opponent-hand";
import { PlayerHand } from "./player-hand";
import { PlayerInfo } from "./player-info";
import { PlayerStatus } from "./player-status";
import { TrickArea } from "./trick-area";
import { TurnIndicator } from "./turn-indicator";

/**
 * GameBoard - Hauptspielfeld
 *
 * Verwendet Zustand Store-Selektoren für State-Management.
 * Kein Prop Drilling mehr - alle Daten kommen aus dem Store.
 */
export function GameBoard() {
	const dndContextId = useId();

	// =========================================================================
	// Store Selectors - State
	// =========================================================================
	const gameState = useGameState();
	const currentPlayer = useCurrentPlayer();
	const isSpectator = useIsSpectator();
	const sortedHand = useSortedHand();
	const playableCardIds = usePlayableCardIds();
	const isMyTurn = useIsMyTurn();
	const isBiddingActive = useIsBiddingActive();

	// Player positions (relative to current player)
	const bottomPlayer = usePlayerAtPosition(0);
	const leftPlayer = usePlayerAtPosition(1);
	const topPlayer = usePlayerAtPosition(2);
	const rightPlayer = usePlayerAtPosition(3);

	// Player announcements
	const bottomAnnouncements = usePlayerAnnouncements(bottomPlayer?.id ?? "");
	const leftAnnouncements = usePlayerAnnouncements(leftPlayer?.id ?? "");
	const topAnnouncements = usePlayerAnnouncements(topPlayer?.id ?? "");
	const rightAnnouncements = usePlayerAnnouncements(rightPlayer?.id ?? "");

	// Contract declarer (solo/hochzeit)
	const contractDeclarer = useContractDeclarer();

	// =========================================================================
	// Store Selectors - Actions
	// =========================================================================
	const playCard = usePlayCard();
	const bid = useBid();
	const declareContract = useDeclareContract();
	const autoPlay = useAutoPlay();
	const autoPlayAll = useAutoPlayAll();
	const resetGame = useResetGame();

	// =========================================================================
	// Local State (UI-only)
	// =========================================================================
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

	// =========================================================================
	// DnD Sensors
	// =========================================================================
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

	// =========================================================================
	// Event Handlers
	// =========================================================================
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
		if (!cardData || !currentPlayer) return;

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

	/**
	 * Handler for animation origin when card is played from PlayerHand.
	 * Only sets animation state - the actual playCard is called by PlayerHand.
	 */
	const handlePlayCardWithOrigin = useCallback(
		(cardId: string, origin: CardOrigin) => {
			if (!currentPlayer) return;

			const card = sortedHand.find((c) => c.id === cardId);
			if (!card) return;

			// Set animation state
			setCardOrigin(origin);
			setPlayedCard({ card, playerId: currentPlayer.id });
		},
		[sortedHand, currentPlayer],
	);

	const handleRemoveCard = useCallback(() => {
		setDragPlayedCard(null);
	}, []);

	const handleCloseGameEndDialog = useCallback(() => {
		setShowGameEndDialog(false);
		setCachedEndGameState(null);
	}, []);

	// =========================================================================
	// Effects
	// =========================================================================

	// Track trick card count to detect when a new trick starts
	const prevTrickLengthRef = useRef(gameState?.currentTrick.cards.length ?? 0);

	useEffect(() => {
		if (!gameState) return;
		const currentLength = gameState.currentTrick.cards.length;
		const prevLength = prevTrickLengthRef.current;

		// If trick was reset (e.g., from 4 cards to 0), clear animation state
		if (currentLength < prevLength) {
			setPlayedCard(null);
			setCardOrigin(null);
		}

		prevTrickLengthRef.current = currentLength;
	}, [gameState?.currentTrick.cards.length, gameState]);

	// Cache game state when game ends
	useEffect(() => {
		if (!gameState) return;

		if (gameState.gameEnded) {
			setCachedEndGameState(gameState);
		} else if (cachedEndGameState?.gameEnded) {
			setShowGameEndDialog(true);
		}
	}, [gameState?.gameEnded, gameState, cachedEndGameState?.gameEnded]);

	// =========================================================================
	// Helper Functions
	// =========================================================================

	// Format announcements for PlayerStatus component
	const formatAnnouncementsForStatus = (
		announcements: ReturnType<typeof usePlayerAnnouncements>,
	) => {
		if (!announcements) return undefined;
		return {
			reOrKontra:
				announcements.hasAnnounced ||
				announcements.pointAnnouncements.length > 0
					? (announcements.team as "re" | "kontra")
					: undefined,
			pointAnnouncements:
				announcements.pointAnnouncements.length > 0
					? announcements.pointAnnouncements.map((a) => a.type)
					: undefined,
		};
	};

	// =========================================================================
	// Early Return if no data
	// =========================================================================
	if (!gameState || (!isSpectator && !currentPlayer)) {
		return null;
	}

	// Card count helper: uses handCounts (available for spectators) with fallback to hands array
	const getCardCount = (playerId: string) =>
		gameState.handCounts[playerId] ?? gameState.hands[playerId]?.length ?? 0;

	// =========================================================================
	// Render
	// =========================================================================
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
						isCurrentTurn={
							gameState.players[gameState.currentPlayerIndex]?.id ===
							topPlayer.id
						}
						player={topPlayer}
						position="top"
					/>
					<OpponentHand
						cardCount={getCardCount(topPlayer.id)}
						position="top"
						statusSlot={
							<PlayerStatus
								announcements={formatAnnouncementsForStatus(topAnnouncements)}
								declaredContract={
									contractDeclarer?.playerId === topPlayer.id
										? contractDeclarer.contractType
										: undefined
								}
								position="top"
							/>
						}
					/>
				</>
			)}

			{/* Linker Gegner */}
			{leftPlayer && (
				<>
					<PlayerInfo
						isCurrentTurn={
							gameState.players[gameState.currentPlayerIndex]?.id ===
							leftPlayer.id
						}
						player={leftPlayer}
						position="left"
					/>
					<OpponentHand
						cardCount={getCardCount(leftPlayer.id)}
						position="left"
						statusSlot={
							<PlayerStatus
								announcements={formatAnnouncementsForStatus(leftAnnouncements)}
								declaredContract={
									contractDeclarer?.playerId === leftPlayer.id
										? contractDeclarer.contractType
										: undefined
								}
								position="left"
							/>
						}
					/>
				</>
			)}

			{/* Rechter Gegner */}
			{rightPlayer && (
				<>
					<PlayerInfo
						isCurrentTurn={
							gameState.players[gameState.currentPlayerIndex]?.id ===
							rightPlayer.id
						}
						player={rightPlayer}
						position="right"
					/>
					<OpponentHand
						cardCount={getCardCount(rightPlayer.id)}
						position="right"
						statusSlot={
							<PlayerStatus
								announcements={formatAnnouncementsForStatus(rightAnnouncements)}
								declaredContract={
									contractDeclarer?.playerId === rightPlayer.id
										? contractDeclarer.contractType
										: undefined
								}
								position="right"
							/>
						}
					/>
				</>
			)}

			{/* Stich-Bereich (Mitte) */}
			<TrickArea
				cardOrigin={cardOrigin}
				currentPlayerId={
					isSpectator ? (bottomPlayer?.id ?? "") : (currentPlayer?.id ?? "")
				}
				playedCard={playedCard}
				players={gameState.players}
				trickCards={gameState.currentTrick.cards}
				trickWinnerId={gameState.currentTrick.winnerId}
			/>

			{/* Unterer Spieler (aktueller Benutzer / Spectator-Ansicht) */}
			{bottomPlayer && (
				<>
					<PlayerInfo
						isCurrentTurn={
							isSpectator
								? gameState.players[gameState.currentPlayerIndex]?.id ===
									bottomPlayer.id
								: isMyTurn
						}
						player={bottomPlayer}
						position="bottom"
					/>
					{isSpectator ? (
						<OpponentHand
							cardCount={getCardCount(bottomPlayer.id)}
							position="bottom"
							statusSlot={
								<PlayerStatus
									announcements={formatAnnouncementsForStatus(
										bottomAnnouncements,
									)}
									declaredContract={
										contractDeclarer?.playerId === bottomPlayer.id
											? contractDeclarer.contractType
											: undefined
									}
									position="bottom"
								/>
							}
						/>
					) : (
						<PlayerHand
							activeDragCard={dragPlayedCard}
							onPlayCardWithOrigin={handlePlayCardWithOrigin}
							onRemoveCard={handleRemoveCard}
							statusSlot={
								<PlayerStatus
									announcements={formatAnnouncementsForStatus(
										bottomAnnouncements,
									)}
									declaredContract={
										contractDeclarer?.playerId === bottomPlayer.id
											? contractDeclarer.contractType
											: undefined
									}
									position="bottom"
								/>
							}
						/>
					)}
				</>
			)}

			{/* Drag Overlay (nur für Spieler) */}
			{!isSpectator && (
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
			)}

			{/* Turn-Indikator */}
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

			{/* Spectator Badge */}
			{isSpectator && (
				<div className="fixed top-4 left-1/2 z-50 -translate-x-1/2">
					<Badge
						className="gap-2 bg-amber-500/20 px-4 py-2 text-amber-700 dark:text-amber-400"
						variant="secondary"
					>
						<Eye className="h-4 w-4" />
						Zuschauer-Modus
					</Badge>
				</div>
			)}

			{/* Ansagen-Buttons (nicht während Vorbehaltsabfrage, nicht für Zuschauer) */}
			{!isSpectator && !isBiddingActive && (
				<AnnouncementButtons className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2" />
			)}

			{/* Auto-Play & Reset Game Buttons (Development only, nicht für Zuschauer) */}
			{!isSpectator && process.env.NODE_ENV === "development" && (
				<div className="fixed bottom-4 left-4 z-50 flex items-center gap-1">
					<Button
						className="flex size-8 items-center gap-2 rounded-full bg-amber-500/90 px-4 py-2 font-medium text-sm text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-amber-600"
						onClick={autoPlay}
						size="icon"
						variant="ghost"
					>
						<Bot className="size-4" />
						<span className="hidden">Auto-Play</span>
					</Button>
					<Button
						className="flex size-8 items-center justify-center gap-2 rounded-full bg-purple-500/90 font-medium text-sm text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-purple-600"
						onClick={autoPlayAll}
						size="icon"
						variant="ghost"
					>
						<FastForward className="size-4" />
						<span className="hidden">Alle spielen</span>
					</Button>
					<Button
						className="flex size-8 items-center gap-2 rounded-full bg-slate-500/90 px-4 py-2 font-medium text-sm text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-slate-600"
						onClick={resetGame}
						size="icon"
						variant="ghost"
					>
						<RotateCcw className="h-4 w-4" />
						<span className="hidden">Reset</span>
					</Button>
				</div>
			)}

			{/* Spielende Dialog */}
			{cachedEndGameState && (
				<GameEndDialog
					currentPlayer={isSpectator ? null : currentPlayer}
					gameState={cachedEndGameState}
					onClose={handleCloseGameEndDialog}
					open={showGameEndDialog}
				/>
			)}

			{/* Bidding Select */}
			{gameState.biddingPhase?.active &&
				(isSpectator ? (
					<BiddingSelect
						biddingPhase={gameState.biddingPhase}
						players={gameState.players}
						readOnly
						startingPlayerIndex={gameState.currentPlayerIndex}
					/>
				) : (
					currentPlayer && (
						<BiddingSelect
							biddingPhase={gameState.biddingPhase}
							currentPlayerId={currentPlayer.id}
							onBid={bid}
							onDeclareContract={declareContract}
							playerHand={sortedHand}
							players={gameState.players}
							startingPlayerIndex={gameState.currentPlayerIndex}
						/>
					)
				))}
		</DndContext>
	);
}
