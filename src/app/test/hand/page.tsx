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
	const cardCount = CARDS.length;
	const rotationStep = 2; // 2 degrees per card
	const translateXStep = 25; // 25% per card
	const translateYStep = 2; // 2% per card (only for right side)

	return (
		<div className="fixed bottom-0 max-w-[1200px] mx-auto left-0 right-0 flex items-center justify-center">
			{CARDS.map((card, index) => {
				// Center index (middle card)
				const centerIndex = (cardCount - 1) / 2;
				const offsetFromCenter = index - centerIndex;

				// Rotation: symmetric around center
				const rotation = offsetFromCenter * rotationStep;

				// Horizontal translation
				const translateX = offsetFromCenter * translateXStep;

				// Vertical translation: only for cards right of center (like original)
				const translateY =
					offsetFromCenter > 0 ? offsetFromCenter * translateYStep : 0;

				return (
					<CardImage
						className="absolute w-1/5"
						key={`${card.suit}-${card.rank}-${index}`}
						rank={card.rank}
						style={{
							transform: `translateX(${translateX}%) translateY(${translateY}%) rotate(${rotation}deg)`,
							zIndex: index,
							bottom: 0,
						}}
						suit={card.suit}
					/>
				);
			})}
		</div>
	);
}
