"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Rank, Suit } from "@/types/game";
import { CardImage } from "./card-image";

interface Card {
	rank: Rank;
	suit: Suit;
}

interface HandProps {
	cards: Card[];
	showBack?: boolean;
	selectable?: boolean;
	className?: string;
}

export function Hand({
	cards,
	showBack = false,
	selectable = false,
	className,
}: HandProps) {
	const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

	const cardCount = cards.length;
	const rotationStep = 2;
	const translateXStep = 25;
	const translateYStep = 2;
	const selectedTranslateY = 12;

	return (
		<div
			className={cn("@container flex items-center justify-center", className)}
		>
			{cards.map((card, index) => {
				const centerIndex = (cardCount - 1) / 2;
				const offsetFromCenter = index - centerIndex;
				const rotation = offsetFromCenter * rotationStep;
				const translateX = offsetFromCenter * translateXStep;
				const baseTranslateY =
					offsetFromCenter > 0 ? offsetFromCenter * translateYStep : 0;

				const isSelected = selectedIndex === index;
				const translateY =
					baseTranslateY - (isSelected && selectable ? selectedTranslateY : 0);

				if (selectable) {
					return (
						<button
							className={cn(
								"absolute w-[20%] landscape:w-[15%] transition-transform duration-200 bg-transparent border-none p-0",
								!isSelected && "hover:-translate-y-[8%]",
							)}
							key={`${card.suit}-${card.rank}-${index}`}
							onClick={() => setSelectedIndex(isSelected ? null : index)}
							style={{
								transform: `translateX(${translateX}%) translateY(${translateY}%) rotate(${rotation}deg)`,
							}}
							type="button"
						>
							<CardImage
								rank={card.rank}
								selected={isSelected}
								showBack={showBack}
								suit={card.suit}
							/>
						</button>
					);
				}

				return (
					<CardImage
						className="absolute w-[20%] landscape:w-[15%] transition-transform duration-200"
						key={`${card.suit}-${card.rank}-${index}`}
						rank={card.rank}
						showBack={showBack}
						style={{
							transform: `translateX(${translateX}%) translateY(${translateY}%) rotate(${rotation}deg)`,
						}}
						suit={card.suit}
					/>
				);
			})}
		</div>
	);
}
