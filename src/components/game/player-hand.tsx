"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { Card } from "@/types/game";
import { DraggableCard } from "./draggable-card";

interface PlayerHandProps {
	cards: Card[];
	playableCardIds: string[];
	isMyTurn: boolean;
	hasTrickStarted: boolean;
	onPlayCard: (cardId: string) => void;
	className?: string;
}

// Transform-Konstanten wie in /test/hand (prozentual)
const ROTATION_STEP = 2; // Grad pro Karte
const TRANSLATE_X_STEP = 25; // % pro Karte
const TRANSLATE_Y_STEP = 2; // % pro Karte (für Bogen bei Karten rechts von der Mitte)
const SELECTED_TRANSLATE_Y = 12; // % Anhebung bei Selection
const HOVER_TRANSLATE_Y = 8; // % Anhebung bei Hover

export function PlayerHand({
	cards,
	playableCardIds,
	isMyTurn,
	hasTrickStarted,
	onPlayCard,
	className,
}: PlayerHandProps) {
	const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
	const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

	const cardCount = cards.length;
	const centerIndex = (cardCount - 1) / 2;

	// Wenn der Spieler am Zug ist und eine vorher ausgewählte Karte spielbar ist,
	// spiele sie automatisch
	useEffect(() => {
		if (
			isMyTurn &&
			selectedCardId &&
			playableCardIds.includes(selectedCardId)
		) {
			onPlayCard(selectedCardId);
			setSelectedCardId(null);
		}
	}, [isMyTurn, selectedCardId, playableCardIds, onPlayCard]);

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

	const handleCardClick = (cardId: string) => {
		const isCardPlayable = playableCardIds.includes(cardId);

		// Wenn Stich begonnen hat und Karte nicht spielbar: ignorieren
		if (hasTrickStarted && !isCardPlayable) {
			return;
		}

		// Wenn bereits selektiert: deselektieren
		if (selectedCardId === cardId) {
			setSelectedCardId(null);
			return;
		}

		if (!isMyTurn) {
			// Nicht am Zug: Karte vormerken für später (nur wenn spielbar oder Stich noch nicht begonnen)
			setSelectedCardId(cardId);
			return;
		}

		if (!isCardPlayable) {
			// Karte nicht spielbar: nur auswählen
			setSelectedCardId(cardId);
			return;
		}

		// Karte ist spielbar: sofort spielen
		onPlayCard(cardId);
		setSelectedCardId(null);
	};

	return (
		<div
			className={cn("@container flex items-center justify-center", className)}
		>
			{cards.map((card, index) => {
				const isCardPlayable = playableCardIds.includes(card.id);
				// Karte ist nur dann wirklich "playable" (grün markiert) wenn am Zug
				const isPlayable = isMyTurn && isCardPlayable;
				// Karte ist deaktiviert wenn Stich begonnen hat und nicht spielbar
				const isDisabled = hasTrickStarted && !isCardPlayable;
				// Karte ist selektierbar wenn nicht deaktiviert
				const isSelectable = !isDisabled;
				const isSelected = selectedCardId === card.id;
				const isHovered = hoveredCardId === card.id && isSelectable;

				// Transform-Berechnung wie in /test/hand (prozentual)
				const offsetFromCenter = index - centerIndex;
				const rotation = offsetFromCenter * ROTATION_STEP;
				const translateX = offsetFromCenter * TRANSLATE_X_STEP;
				// Bogen-Effekt: nur Karten rechts von der Mitte gehen nach unten
				const baseTranslateY =
					offsetFromCenter > 0 ? offsetFromCenter * TRANSLATE_Y_STEP : 0;

				// Hover/Selection Anpassungen
				let translateY = baseTranslateY;
				if (isHovered) translateY -= HOVER_TRANSLATE_Y;
				if (isSelected) translateY -= SELECTED_TRANSLATE_Y;

				return (
					<DraggableCard
						card={card}
						className={cn(
							"absolute w-1/5 transition-transform duration-200",
							isSelectable && !isSelected && "hover:-translate-y-[8%]",
						)}
						isDisabled={isDisabled}
						isDraggingDisabled={!isMyTurn || isDisabled}
						isPlayable={isPlayable}
						isSelectable={isSelectable}
						isSelected={isSelected}
						key={card.id}
						onClick={isSelectable ? () => handleCardClick(card.id) : undefined}
						onMouseEnter={
							isSelectable ? () => setHoveredCardId(card.id) : undefined
						}
						onMouseLeave={() => setHoveredCardId(null)}
						style={{
							transform: `translateX(${translateX}%) translateY(${translateY}%) rotate(${rotation}deg)`,
						}}
					/>
				);
			})}
		</div>
	);
}
