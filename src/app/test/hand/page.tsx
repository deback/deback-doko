import { Hand } from "@/components/cards";
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
	return (
		<>
			{/* Unten - eigene Hand */}
			<Hand
				cards={CARDS}
				className="fixed bottom-0 max-w-[1200px] mx-auto left-0 right-0"
				selectable
			/>
			{/* Oben - Gegner */}
			<Hand
				cards={CARDS}
				className="fixed top-0 max-w-[1200px] mx-auto left-0 right-0 rotate-180"
				showBack
			/>
			{/* Links - Gegner */}
			<Hand
				cards={CARDS}
				className="fixed top-1/2 left-0 -translate-y-1/2 max-w-[min(100vw,)1200px] w-full rotate-90 origin-center -translate-x-1/2"
				showBack
			/>
			{/* Rechts - Gegner */}
			<Hand
				cards={CARDS}
				className="fixed top-1/2 right-0 -translate-y-1/2 max-w-[min(100vw,)1200px] w-full -rotate-90 origin-center translate-x-1/2"
				showBack
			/>
		</>
	);
}
