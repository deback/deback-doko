"use client";
import { useState } from "react";
import { CardImage } from "@/components/cards/card-image";
import type { Rank, Suit } from "@/types/game";

export default function RelativeCardsPage() {
	const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

	const cards: { rank: Rank; suit: Suit }[] = [
		{ rank: "9", suit: "hearts" },
		{ rank: "10", suit: "hearts" },
		{ rank: "jack", suit: "hearts" },
		{ rank: "queen", suit: "hearts" },
		{ rank: "king", suit: "hearts" },
		{ rank: "ace", suit: "hearts" },
	];
	return (
		<div className="">
			<div className="w-screen absolute bottom-0 left-0 right-0 bg-red-500 flex justify-center items-center">
				{cards.map((card, index) => (
					<button
						className="bottom-0 left-0 w-[calc(100vw/12)] bg-transparent border-none p-0"
						key={`${card.rank}-${card.suit}-${index}`}
						onClick={() => setSelectedIndex(index)}
						type="button"
					>
						<CardImage
							rank={card.rank}
							selected={selectedIndex === index}
							suit={card.suit}
						/>
					</button>
				))}
			</div>
		</div>
	);
}
