"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { Card } from "@/types/game";
import { CARD_SIZE, type CardOrigin } from "./card";
import { DraggableCard } from "./draggable-card";

// Delay before closing gap after card is played (ms)
const CLOSE_GAP_DELAY = 600;

interface PlayerHandProps {
	cards: Card[];
	playableCardIds: string[];
	isMyTurn: boolean;
	hasTrickStarted: boolean;
	activeDragCard?: string | null;
	onPlayCard: (cardId: string, origin: CardOrigin) => void;
	onRemoveCard?: (cardId: string) => void;
	className?: string;
}

export function PlayerHand({
	cards,
	playableCardIds,
	isMyTurn,
	hasTrickStarted,
	activeDragCard,
	onPlayCard,
	onRemoveCard,
	className,
}: PlayerHandProps) {
	const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
	const [ghostCardId, setGhostCardId] = useState<string | null>(null);
	const cardRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
	const ghostTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

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

				onPlayCard(selectedCardId, {
					x: rect.x,
					y: rect.y,
					width: rect.width,
					height: rect.height,
					rotate: angle,
				});

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
		onPlayCard,
		onRemoveCard,
		ghostCardId,
	]);

	// Wenn sich die spielbaren Karten ändern und die ausgewählte Karte nicht mehr spielbar ist,
	// deselektiere sie
	useEffect(() => {
		if (
			hasTrickStarted &&
			selectedCardId &&
			!playableCardIds.includes(selectedCardId)
		) {
			setSelectedCardId(null);
		}
	}, [hasTrickStarted, selectedCardId, playableCardIds]);

	const handleCardClick = (card: Card, index: number) => {
		if (ghostCardId !== null) return;

		const isCardPlayable = playableCardIds.includes(card.id);

		// Wenn Stich begonnen hat und Karte nicht spielbar: ignorieren
		if (hasTrickStarted && !isCardPlayable) {
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

			onPlayCard(card.id, {
				x: rect.x,
				y: rect.y,
				width: rect.width,
				height: rect.height,
				rotate: angle,
			});

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
				"fixed bottom-0 translate-y-1/3 -translate-x-1/2 sm:translate-y-1/2 left-1/2 landscape:translate-y-2/3 lg:landscape:translate-y-1/2",
				className,
			)}
		>
			<div className={`@container relative ${CARD_SIZE}`}>
				{cards.map((card, index) => {
					const t = index - (cards.length - 1) / 2;
					const angle = t * 1.2;

					const isCardPlayable = playableCardIds.includes(card.id);
					const isPlayable = isMyTurn && isCardPlayable;
					const isDisabled = hasTrickStarted && !isCardPlayable;
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
			</div>
		</div>
	);
}
