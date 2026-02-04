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

function calculateCardTransform(
	index: number,
	totalCards: number,
	isHovered: boolean,
	isSelected: boolean,
) {
	const centerIndex = (totalCards - 1) / 2;
	const offsetFromCenter = index - centerIndex;

	// Rotation: max ±30°, dynamisch basierend auf Kartenanzahl
	const maxRotation = Math.min(30, 2.5 * totalCards);
	const rotationStep =
		totalCards > 1 ? (maxRotation * 2) / (totalCards - 1) : 0;
	const rotation = offsetFromCenter * rotationStep;

	// Vertikaler Bogen (Parabel) - Karten in der Mitte sind höher
	const normalizedOffset =
		totalCards > 1 ? offsetFromCenter / (totalCards / 2) : 0;
	const verticalOffset = normalizedOffset ** 2 * 30;

	// Horizontale Verteilung
	const horizontalSpread = offsetFromCenter * 55;

	// Hover/Selection Anpassungen
	let translateY = verticalOffset;
	if (isHovered) translateY -= 35;
	if (isSelected) translateY -= 45;

	return {
		transform: `translateX(${horizontalSpread}px) translateY(${translateY}px) rotate(${rotation}deg)`,
		zIndex: isHovered || isSelected ? 50 : index,
	};
}

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

	// Wenn der Spieler am Zug ist und eine vorher ausgewählte Karte spielbar ist,
	// spiele sie automatisch
	useEffect(() => {
		if (isMyTurn && selectedCardId && playableCardIds.includes(selectedCardId)) {
			onPlayCard(selectedCardId);
			setSelectedCardId(null);
		}
	}, [isMyTurn, selectedCardId, playableCardIds, onPlayCard]);

	// Wenn sich die spielbaren Karten ändern und die ausgewählte Karte nicht mehr spielbar ist,
	// deselektiere sie
	useEffect(() => {
		if (hasTrickStarted && selectedCardId && !playableCardIds.includes(selectedCardId)) {
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
		<div className={cn("relative flex items-end justify-center", className)}>
			<div
				className="relative flex items-end justify-center"
				style={{ height: "180px", width: "100%" }}
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

					const { transform, zIndex } = calculateCardTransform(
						index,
						cards.length,
						isHovered,
						isSelected,
					);

					return (
						<DraggableCard
							card={card}
							className="absolute bottom-0 left-1/2 w-20 transition-all duration-200 sm:w-24 md:w-28"
							isDisabled={isDisabled}
							isDraggingDisabled={!isMyTurn || isDisabled}
							isPlayable={isPlayable}
							isSelectable={isSelectable}
							isSelected={isSelected}
							key={card.id}
							onClick={isSelectable ? () => handleCardClick(card.id) : undefined}
							onMouseEnter={isSelectable ? () => setHoveredCardId(card.id) : undefined}
							onMouseLeave={() => setHoveredCardId(null)}
							style={{
								transform,
								zIndex,
								transformOrigin: "bottom center",
							}}
						/>
					);
				})}
			</div>
		</div>
	);
}
