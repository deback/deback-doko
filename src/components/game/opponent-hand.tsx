"use client";

import { CardImage } from "@/components/cards/card-image";
import { cn } from "@/lib/utils";

interface OpponentHandProps {
	cardCount: number;
	position: "top" | "left" | "right" | "bottom";
	className?: string;
}

function calculateOpponentCardTransform(
	index: number,
	totalCards: number,
	position: "top" | "left" | "right" | "bottom",
) {
	const centerIndex = (totalCards - 1) / 2;
	const offsetFromCenter = index - centerIndex;

	// Kleinerer Fächer für Gegner
	const maxRotation = Math.min(20, 2 * totalCards);
	const rotationStep =
		totalCards > 1 ? (maxRotation * 2) / (totalCards - 1) : 0;
	let rotation = offsetFromCenter * rotationStep;

	// Horizontale Verteilung
	let horizontalSpread = offsetFromCenter * 20;

	// Vertikaler Bogen
	const normalizedOffset =
		totalCards > 1 ? offsetFromCenter / (totalCards / 2) : 0;
	let verticalOffset = normalizedOffset ** 2 * 10;

	// Position-spezifische Anpassungen
	if (position === "top") {
		// Oben: Karten sind umgedreht (180°)
		rotation = -rotation;
		verticalOffset = -verticalOffset;
	} else if (position === "left") {
		// Links: 90° gedreht
		const temp = horizontalSpread;
		horizontalSpread = verticalOffset;
		verticalOffset = temp;
		rotation += 90;
	} else if (position === "right") {
		// Rechts: -90° gedreht
		const temp = horizontalSpread;
		horizontalSpread = -verticalOffset;
		verticalOffset = temp;
		rotation -= 90;
	} else if (position === "bottom") {
		// Unten: Normale Ausrichtung (wie Spieler, aber Kartenrücken)
		// Keine Änderung nötig
	}

	return {
		transform: `translateX(${horizontalSpread}px) translateY(${verticalOffset}px) rotate(${rotation}deg)`,
		zIndex: index,
	};
}

export function OpponentHand({
	cardCount,
	position,
	className,
}: OpponentHandProps) {
	const isVertical = position === "left" || position === "right";
	const isBottom = position === "bottom";

	return (
		<div
			className={cn(
				"relative flex items-center justify-center",
				isVertical ? "h-48 w-16" : isBottom ? "h-24 w-64" : "h-20 w-48",
				className,
			)}
		>
			{Array.from({ length: cardCount }).map((_, index) => {
				const { transform, zIndex } = calculateOpponentCardTransform(
					index,
					cardCount,
					position,
				);

				return (
					<div
						className={cn("absolute", isVertical ? "h-12 w-8" : "h-16 w-11")}
						key={`opponent-card-${index}`}
						style={{
							transform,
							zIndex,
							transformOrigin: "center center",
						}}
					>
						<CardImage backDesign="blue" className="h-full w-full" showBack />
					</div>
				);
			})}
		</div>
	);
}
