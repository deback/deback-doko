"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
	useGameState,
	useHasPlayerPlayedInTrick,
	useHasTrickStarted,
	useIsBiddingActive,
	useIsMyTurn,
	useMyHand,
	usePlayableCardIds,
	usePlayCard,
	useSortedHand,
} from "@/stores/game-selectors";
import type { Card } from "@/types/game";
import { CARD_SIZE, type CardOrigin } from "./card";
import { DraggableCard } from "./draggable-card";

// Delay before closing gap after card is played (ms)
const CLOSE_GAP_DELAY = 600;

function getDealHash(
	cardId: string,
	dealSessionId: number | undefined,
	salt: number,
): number {
	let hash = (dealSessionId ?? 0) + salt * 997;
	for (const ch of cardId) {
		hash = (hash * 33 + ch.charCodeAt(0) + salt) % 100_003;
	}
	return hash;
}

function getDealRangeValue(
	cardId: string,
	dealSessionId: number | undefined,
	salt: number,
	min: number,
	max: number,
): number {
	const hash = getDealHash(cardId, dealSessionId, salt);
	const normalized = (hash % 1_000) / 999;
	return min + normalized * (max - min);
}

function getDealStartRotationJitter(
	cardId: string,
	dealSessionId?: number,
): number {
	return getDealRangeValue(cardId, dealSessionId, 11, -8, 8);
}

function getDealStartOffsetX(cardId: string, dealSessionId?: number): number {
	return getDealRangeValue(cardId, dealSessionId, 17, -18, 18);
}

function getDealStartOffsetYVh(cardId: string, dealSessionId?: number): number {
	return getDealRangeValue(cardId, dealSessionId, 19, 0, 12);
}

function getDealTargetOffsetX(cardId: string, dealSessionId?: number): number {
	return getDealRangeValue(cardId, dealSessionId, 23, -16, 16);
}

function getDealTargetOffsetY(cardId: string, dealSessionId?: number): number {
	return getDealRangeValue(cardId, dealSessionId, 37, -10, 10);
}

function getDealTargetRotationJitter(
	cardId: string,
	dealSessionId?: number,
): number {
	return getDealRangeValue(cardId, dealSessionId, 53, -5.5, 5.5);
}

interface PlayerHandProps {
	/** Card being dragged (from DnD context) */
	activeDragCard?: string | null;
	/** Whether the trick area is currently animating (blocks auto-play) */
	isTrickAnimating?: boolean;
	/** Callback when ghost card should be removed (for DnD coordination) */
	onRemoveCard?: (cardId: string) => void;
	/** Callback when card is played with animation origin (for TrickArea animation) */
	onPlayCardWithOrigin?: (cardId: string, origin: CardOrigin) => void;
	/** Content rendered above the card fan (e.g. PlayerStatus) */
	statusSlot?: React.ReactNode;
	dealSessionId?: number;
	isDealAnimating?: boolean;
	dealStaggerMs?: number;
	dealCardDurationMs?: number;
	className?: string;
}

/**
 * PlayerHand - Die Hand des aktuellen Spielers
 *
 * Verwendet Store-Selektoren für Game-State.
 * UI-Animation Props werden weiterhin von GameBoard übergeben.
 */
export function PlayerHand({
	activeDragCard,
	isTrickAnimating,
	onRemoveCard,
	onPlayCardWithOrigin,
	statusSlot,
	dealSessionId,
	isDealAnimating = false,
	dealStaggerMs = 70,
	dealCardDurationMs = 450,
	className,
}: PlayerHandProps) {
	// Store Selectors - Game State
	const sortedCards = useSortedHand();
	const dealOrderCards = useMyHand();
	const cards = sortedCards;
	const playableCardIds = usePlayableCardIds();
	const isMyTurn = useIsMyTurn();
	const gameState = useGameState();
	const hasTrickStarted = useHasTrickStarted();
	const hasPlayerPlayedInTrick = useHasPlayerPlayedInTrick();
	const isBiddingActive = useIsBiddingActive();
	const playCard = usePlayCard();
	const isServerTrickResolving =
		gameState?.currentTrick.completed ||
		gameState?.currentTrick.cards.length === 4;

	// Local UI State
	const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
	const [ghostCardId, setGhostCardId] = useState<string | null>(null);
	const [revealedDealCardIds, setRevealedDealCardIds] = useState<Set<string>>(
		() => new Set(),
	);
	const cardRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
	const ghostTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	const dealRevealTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

	// Computed: Should show trick-started restrictions
	const showTrickRestrictions = hasTrickStarted && !hasPlayerPlayedInTrick;

	const setCardRef = useCallback(
		(cardId: string) => (el: HTMLButtonElement | null) => {
			if (el) cardRefs.current.set(cardId, el);
			else cardRefs.current.delete(cardId);
		},
		[],
	);

	const scheduleGhostCleanup = useCallback(
		(cardId: string) => {
			clearTimeout(ghostTimerRef.current);
			setGhostCardId(cardId);
			ghostTimerRef.current = setTimeout(() => {
				onRemoveCard?.(cardId);
				setGhostCardId((prev) => (prev === cardId ? null : prev));
			}, CLOSE_GAP_DELAY);
		},
		[onRemoveCard],
	);

	// Cleanup ghost timer on unmount
	useEffect(() => {
		return () => {
			clearTimeout(ghostTimerRef.current);
		};
	}, []);

	const clearDealRevealTimers = useCallback(() => {
		for (const timer of dealRevealTimersRef.current) {
			clearTimeout(timer);
		}
		dealRevealTimersRef.current = [];
	}, []);

	useEffect(() => {
		clearDealRevealTimers();
		if (!isDealAnimating) {
			setRevealedDealCardIds(() => new Set());
			return;
		}

		setRevealedDealCardIds(() => new Set());
		for (const [index, card] of dealOrderCards.entries()) {
			const arrivalMs = dealCardDurationMs + index * dealStaggerMs;
			const timer = setTimeout(() => {
				setRevealedDealCardIds((prev) => {
					if (prev.has(card.id)) return prev;
					const next = new Set(prev);
					next.add(card.id);
					return next;
				});
			}, arrivalMs);
			dealRevealTimersRef.current.push(timer);
		}

		return clearDealRevealTimers;
	}, [
		clearDealRevealTimers,
		dealOrderCards,
		dealCardDurationMs,
		dealSessionId,
		dealStaggerMs,
		isDealAnimating,
	]);

	// When a card is played via drag, trigger ghost + removal
	useEffect(() => {
		if (!activeDragCard) return;
		setSelectedCardId(null);
		scheduleGhostCleanup(activeDragCard);
	}, [activeDragCard, scheduleGhostCleanup]);

	// Wenn der Spieler am Zug ist und eine vorher ausgewählte Karte spielbar ist,
	// spiele sie automatisch
	useEffect(() => {
		if (
			isMyTurn &&
			!isTrickAnimating &&
			!isDealAnimating &&
			!isServerTrickResolving &&
			selectedCardId &&
			playableCardIds.includes(selectedCardId) &&
			ghostCardId === null
		) {
			const el = cardRefs.current.get(selectedCardId);
			if (el) {
				const rect = el.getBoundingClientRect();
				const index = cards.findIndex((c) => c.id === selectedCardId);
				const t = index - (cards.length - 1) / 2;
				const angle = t * 1.2;

				const origin: CardOrigin = {
					x: rect.x,
					y: rect.y,
					width: rect.width,
					height: rect.height,
					rotate: angle,
				};

				// Notify parent for animation
				onPlayCardWithOrigin?.(selectedCardId, origin);
				// Actually play the card
				playCard(selectedCardId);
				scheduleGhostCleanup(selectedCardId);
			}
			setSelectedCardId(null);
		}
	}, [
		isMyTurn,
		isTrickAnimating,
		isDealAnimating,
		isServerTrickResolving,
		selectedCardId,
		playableCardIds,
		cards,
		playCard,
		onPlayCardWithOrigin,
		ghostCardId,
		scheduleGhostCleanup,
	]);

	// Wenn sich die spielbaren Karten ändern und die ausgewählte Karte nicht mehr spielbar ist,
	// deselektiere sie
	useEffect(() => {
		if (
			showTrickRestrictions &&
			selectedCardId &&
			!playableCardIds.includes(selectedCardId)
		) {
			setSelectedCardId(null);
		}
	}, [showTrickRestrictions, selectedCardId, playableCardIds]);

	const handleCardClick = (card: Card, index: number) => {
		if (ghostCardId !== null) return;
		if (isDealAnimating) return;
		if (isServerTrickResolving) {
			setSelectedCardId(card.id);
			return;
		}

		const isCardPlayable = playableCardIds.includes(card.id);

		// Wenn Stich begonnen hat und Karte nicht spielbar: ignorieren
		if (showTrickRestrictions && !isCardPlayable) {
			return;
		}

		// Wenn bereits selektiert: deselektieren
		if (selectedCardId === card.id) {
			setSelectedCardId(null);
			return;
		}

		if (!isMyTurn) {
			// Nicht am Zug: Karte vormerken für später
			setSelectedCardId(card.id);
			return;
		}

		if (!isCardPlayable) {
			// Karte nicht spielbar: nur auswählen
			setSelectedCardId(card.id);
			return;
		}

		// Karte ist spielbar: sofort spielen
		const el = cardRefs.current.get(card.id);
		if (el) {
			const rect = el.getBoundingClientRect();
			const t = index - (cards.length - 1) / 2;
			const angle = t * 1.2;

			const origin: CardOrigin = {
				x: rect.x,
				y: rect.y,
				width: rect.width,
				height: rect.height,
				rotate: angle,
			};

			// Notify parent for animation
			onPlayCardWithOrigin?.(card.id, origin);
			// Actually play the card
			playCard(card.id);
			scheduleGhostCleanup(card.id);
		}
		setSelectedCardId(null);
	};

	return (
		<div
			className={cn(
				"fixed bottom-0 left-1/2 z-10 -translate-x-1/2 translate-y-1/3 sm:translate-y-1/2 landscape:translate-y-2/5 lg:landscape:translate-y-1/2",
				className,
			)}
		>
			<div
				className={cn(
					`@container relative ${CARD_SIZE}`,
					isBiddingActive && "pointer-events-none",
				)}
				>
					{statusSlot && <div className="pointer-events-auto">{statusSlot}</div>}
					{(() => {
						const dealIndexByCardId = new Map(
							dealOrderCards.map((card, dealIndex) => [card.id, dealIndex]),
						);
						const revealedCards = cards.filter((c) =>
							revealedDealCardIds.has(c.id),
						);
						const revealedIndexByCardId = new Map(
							revealedCards.map((card, revealedIndex) => [
								card.id,
								revealedIndex,
							]),
						);
						return cards.map((card, index) => {
							const dealIndex = dealIndexByCardId.get(card.id) ?? index;
							const t = index - (cards.length - 1) / 2;
							const angle = t * 1.2;
							const isInFlight =
								isDealAnimating && !revealedDealCardIds.has(card.id);
							const revealedIndex = revealedIndexByCardId.get(card.id) ?? -1;
							const revealedT =
								revealedIndex >= 0
									? revealedIndex - (revealedCards.length - 1) / 2
									: t;
							const handAngle =
								isDealAnimating && !isInFlight ? revealedT * 1.2 : angle;
							const handIndex =
								isDealAnimating && revealedIndex >= 0 ? revealedIndex : index;
							const cardZIndex = isInFlight ? 10 + dealIndex : 100 + handIndex;
							const startRotationJitter = getDealStartRotationJitter(
								card.id,
								dealSessionId,
							);
							const startOffsetX = getDealStartOffsetX(card.id, dealSessionId);
							const startOffsetYVh = getDealStartOffsetYVh(card.id, dealSessionId);
							const targetOffsetX = getDealTargetOffsetX(card.id, dealSessionId);
							const targetOffsetY = getDealTargetOffsetY(card.id, dealSessionId);
							const targetRotationJitter = getDealTargetRotationJitter(
								card.id,
								dealSessionId,
							);

							const isCardPlayable = playableCardIds.includes(card.id);
							const isPlayable =
								isMyTurn &&
								isCardPlayable &&
								!isServerTrickResolving &&
								!isDealAnimating;
							const isDisabled = showTrickRestrictions && !isCardPlayable;
							const isSelected = selectedCardId === card.id;
							const isGhost = ghostCardId === card.id;
							const isDragging =
								activeDragCard === card.id && ghostCardId !== card.id;
							const dealInitial = isInFlight
								? {
										x: startOffsetX,
										y: `-${110 + startOffsetYVh}vh`,
										rotate: 180 + startRotationJitter,
										opacity: 1,
									}
								: false;
							const settledAnimate = {
								x: 0,
								y: 0,
								rotate: handAngle,
								opacity: 1,
							};
							const dealAnimate = isInFlight
								? {
										x: targetOffsetX,
										y: targetOffsetY,
										rotate: angle + targetRotationJitter,
										opacity: 1,
									}
								: settledAnimate;
							const dealTransition = isDealAnimating
								? isInFlight
									? {
											duration: dealCardDurationMs / 1000,
											delay: (dealIndex * dealStaggerMs) / 1000,
											ease: [0.25, 0.1, 0.25, 1] as const,
										}
									: {
											type: "tween" as const,
											duration: 0.16,
											delay: 0,
											ease: [0.22, 1, 0.36, 1] as const,
										}
								: undefined;

							return (
								<DraggableCard
									angle={handAngle}
									animate={isDealAnimating ? dealAnimate : settledAnimate}
									card={card}
									className={cn(
										"top-0 left-0 h-full w-full touch-none",
										isInFlight && "origin-center!",
										(isGhost || isDragging) && "pointer-events-none invisible",
									)}
									initial={dealInitial}
									isDisabled={isDisabled}
									isDraggingDisabled={
										!isMyTurn ||
										isDisabled ||
										isDealAnimating ||
										ghostCardId !== null ||
										isServerTrickResolving
									}
									isGhost={isGhost}
									isPlayable={isPlayable}
									isSelected={isSelected}
									key={`${dealSessionId ?? 0}-${card.id}`}
									onClick={
										!isDisabled ? () => handleCardClick(card, index) : undefined
									}
									onRef={setCardRef(card.id)}
									showBack={isInFlight}
									style={{ zIndex: cardZIndex }}
									transition={dealTransition}
								/>
							);
						});
					})()}
				</div>
			</div>
		);
	}
