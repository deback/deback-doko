"use client";

import { CardImage } from "@/components/cards/card-image";
import { cn } from "@/lib/utils";

interface OpponentHandProps {
	cardCount: number;
	className?: string;
}

// Transform-Konstanten wie in Hand-Komponente (prozentual)
const ROTATION_STEP = 2; // Grad pro Karte
const TRANSLATE_X_STEP = 25; // % pro Karte
const TRANSLATE_Y_STEP = 2; // % pro Karte (für Bogen bei Karten rechts von der Mitte)

export function OpponentHand({ cardCount, className }: OpponentHandProps) {
	const centerIndex = (cardCount - 1) / 2;

	return (
		<div className={cn("@container flex items-center justify-center", className)}>
			{Array.from({ length: cardCount }).map((_, index) => {
				const offsetFromCenter = index - centerIndex;
				const rotation = offsetFromCenter * ROTATION_STEP;
				const translateX = offsetFromCenter * TRANSLATE_X_STEP;
				// Bogen-Effekt: nur Karten rechts von der Mitte gehen nach unten
				const translateY = offsetFromCenter > 0 ? offsetFromCenter * TRANSLATE_Y_STEP : 0;

				return (
					<CardImage
						backDesign="blue"
						className="absolute w-1/5 transition-transform duration-200"
						key={`opponent-card-${index}`}
						showBack
						style={{
							transform: `translateX(${translateX}%) translateY(${translateY}%) rotate(${rotation}deg)`,
						}}
					/>
				);
			})}
		</div>
	);
}
