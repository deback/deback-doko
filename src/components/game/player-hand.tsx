"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
	useHasPlayerPlayedInTrick,
	useHasTrickStarted,
	useIsBiddingActive,
	useIsMyTurn,
	usePlayableCardIds,
	usePlayCard,
	useSortedHand,
} from "@/stores/game-selectors";
import type { Card } from "@/types/game";
import { CARD_SIZE, type CardOrigin } from "./card";
import { DraggableCard } from "./draggable-card";

// Delay before closing gap after card is played (ms)
const CLOSE_GAP_DELAY = 600;

interface PlayerHandProps {
	/** Card being dragged (from DnD context) */
	activeDragCard?: string | null;
	/** Callback when ghost card should be removed (for DnD coordination) */
	onRemoveCard?: (cardId: string) => void;
	/** Callback when card is played with animation origin (for TrickArea animation) */
	onPlayCardWithOrigin?: (cardId: string, origin: CardOrigin) => void;
	/** Content rendered above the card fan (e.g. PlayerStatus) */
	statusSlot?: React.ReactNode;
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
	onRemoveCard,
	onPlayCardWithOrigin,
	statusSlot,
	className,
}: PlayerHandProps) {
	// Store Selectors - Game State
	const cards = useSortedHand();
	const playableCardIds = usePlayableCardIds();
	const isMyTurn = useIsMyTurn();
	const hasTrickStarted = useHasTrickStarted();
	const hasPlayerPlayedInTrick = useHasPlayerPlayedInTrick();
	const isBiddingActive = useIsBiddingActive();
	const playCard = usePlayCard();

	// Local UI State
	const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
	const [ghostCardId, setGhostCardId] = useState<string | null>(null);
	const cardRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
	const ghostTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

	// Computed: Should show trick-started restrictions
	const showTrickRestrictions = hasTrickStarted && !hasPlayerPlayedInTrick;

	const setCardRef = useCallback(
		(cardId: string) => (el: HTMLButtonElement | null) => {
			if (el) cardRefs.current.set(cardId, el);
			else cardRefs.current.delete(cardId);
		},
		[],
	);

	// Cleanup ghost timer on unmount
	useEffect(() => {
		return () => {
			clearTimeout(ghostTimerRef.current);
		};
	}, []);

	// When a card is played via drag, trigger ghost + removal
	useEffect(() => {
		if (!activeDragCard) return;
		const card = cards.find((c) => c.id === activeDragCard);
		if (!card) return;

		setGhostCardId(activeDragCard);
		setSelectedCardId(null);
		ghostTimerRef.current = setTimeout(() => {
			onRemoveCard?.(activeDragCard);
			setGhostCardId(null);
		}, CLOSE_GAP_DELAY);
	}, [activeDragCard, cards, onRemoveCard]);

	// Wenn der Spieler am Zug ist und eine vorher ausgewählte Karte spielbar ist,
	// spiele sie automatisch
	useEffect(() => {
		if (
			isMyTurn &&
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

				setGhostCardId(selectedCardId);
				ghostTimerRef.current = setTimeout(() => {
					onRemoveCard?.(selectedCardId);
					setGhostCardId(null);
				}, CLOSE_GAP_DELAY);
			}
			setSelectedCardId(null);
		}
	}, [
		isMyTurn,
		selectedCardId,
		playableCardIds,
		cards,
		playCard,
		onPlayCardWithOrigin,
		onRemoveCard,
		ghostCardId,
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

			setGhostCardId(card.id);
			ghostTimerRef.current = setTimeout(() => {
				onRemoveCard?.(card.id);
				setGhostCardId(null);
			}, CLOSE_GAP_DELAY);
		}
		setSelectedCardId(null);
	};

	return (
		<div
			className={cn(
				"fixed bottom-0 translate-y-1/3 -translate-x-1/2 sm:translate-y-1/2 left-1/2 landscape:translate-y-2/5 lg:landscape:translate-y-1/2",
				isBiddingActive && "pointer-events-none",
				className,
			)}
		>
			<div className={`@container relative ${CARD_SIZE}`}>
				{cards.map((card, index) => {
					const t = index - (cards.length - 1) / 2;
					const angle = t * 1.2;

					const isCardPlayable = playableCardIds.includes(card.id);
					const isPlayable = isMyTurn && isCardPlayable;
					const isDisabled = showTrickRestrictions && !isCardPlayable;
					const isSelected = selectedCardId === card.id;
					const isGhost = ghostCardId === card.id;
					const isDragging =
						activeDragCard === card.id && ghostCardId !== card.id;

					return (
						<DraggableCard
							angle={angle}
							card={card}
							className={cn(
								"top-0 left-0 w-full h-full touch-none",
								(isGhost || isDragging) && "invisible pointer-events-none",
							)}
							isDisabled={isDisabled}
							isDraggingDisabled={
								!isMyTurn || isDisabled || ghostCardId !== null
							}
							isGhost={isGhost}
							isPlayable={isPlayable}
							isSelected={isSelected}
							key={card.id}
							onClick={
								!isDisabled ? () => handleCardClick(card, index) : undefined
							}
							onRef={setCardRef(card.id)}
						/>
					);
				})}
				{statusSlot}
			</div>
		</div>
	);
}
