"use client";

import { useState } from "react";
import { CardImage } from "@/components/cards";
import type { Rank, Suit } from "@/types/game";

const CARDS: { rank: Rank; suit: Suit }[] = [
	{ rank: "9", suit: "hearts" },
	{ rank: "10", suit: "hearts" },
	{ rank: "jack", suit: "hearts" },
	{ rank: "queen", suit: "hearts" },
	{ rank: "king", suit: "hearts" },
	{ rank: "ace", suit: "hearts" },
	{ rank: "9", suit: "diamonds" },
	{ rank: "10", suit: "diamonds" },
	{ rank: "jack", suit: "diamonds" },
	{ rank: "queen", suit: "diamonds" },
	{ rank: "king", suit: "diamonds" },
	{ rank: "ace", suit: "diamonds" },
];

export default function HandTestPage() {
	const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

	const cardCount = CARDS.length;
	const rotationStep = 2;
	const translateXStep = 25;
	const translateYStep = 2;
	const selectedTranslateY = 12;

	return (
		<div className="fixed bottom-0 max-w-[1200px] mx-auto left-0 right-0 flex items-center justify-center">
			{CARDS.map((card, index) => {
				const centerIndex = (cardCount - 1) / 2;
				const offsetFromCenter = index - centerIndex;
				const rotation = offsetFromCenter * rotationStep;
				const translateX = offsetFromCenter * translateXStep;
				const translateY =
					offsetFromCenter > 0 ? offsetFromCenter * translateYStep : 0;

				const isSelected = selectedIndex === index;

				return (
					<button
						className="card-hand-item absolute w-1/5 cursor-pointer"
						data-selected={isSelected}
						key={`${card.suit}-${card.rank}-${index}`}
						onClick={() => setSelectedIndex(isSelected ? null : index)}
						style={{
							transform: `translateX(${translateX}%) translateY(${translateY - (isSelected ? selectedTranslateY : 0)}%) rotate(${rotation}deg)`,
						}}
						type="button"
					>
						<CardImage className="w-full" rank={card.rank} suit={card.suit} />
					</button>
				);
			})}
		</div>
	);
}
