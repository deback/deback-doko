"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Card } from "@/types/game";
import { DraggableCard } from "./draggable-card";

interface PlayerHandProps {
	cards: Card[];
	playableCardIds: string[];
	isMyTurn: boolean;
	onCardClick: (cardId: string) => void;
	onCardDoubleClick: (cardId: string) => void;
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
	onCardClick,
	onCardDoubleClick,
	className,
}: PlayerHandProps) {
	const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
	const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

	const handleCardClick = (cardId: string) => {
		if (!isMyTurn) return;
		if (!playableCardIds.includes(cardId)) return;

		if (selectedCardId === cardId) {
			// Doppelklick/zweiter Klick spielt die Karte
			onCardDoubleClick(cardId);
			setSelectedCardId(null);
		} else {
			// Erster Klick wählt die Karte aus
			setSelectedCardId(cardId);
			onCardClick(cardId);
		}
	};

	return (
		<div className={cn("relative flex items-end justify-center", className)}>
			<div
				className="relative flex items-end justify-center"
				style={{ height: "180px", width: "100%" }}
			>
				{cards.map((card, index) => {
					const isPlayable = isMyTurn && playableCardIds.includes(card.id);
					const isSelected = selectedCardId === card.id;
					const isHovered = hoveredCardId === card.id;

					const { transform, zIndex } = calculateCardTransform(
						index,
						cards.length,
						isHovered && isPlayable,
						isSelected,
					);

					return (
						<DraggableCard
							card={card}
							className="absolute bottom-0 left-1/2 w-20 transition-all duration-200 sm:w-24 md:w-28"
							isDraggingDisabled={!isMyTurn}
							isPlayable={isPlayable}
							isSelected={isSelected}
							key={card.id}
							onClick={() => handleCardClick(card.id)}
							onMouseEnter={() => setHoveredCardId(card.id)}
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
