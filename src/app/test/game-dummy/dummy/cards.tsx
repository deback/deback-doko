import { cn } from "@/lib/utils";
import Card from "./card";

interface CardsProps {
	cardIds?: string[];
	opponent?: boolean;
	cardSpacing?: number;
	className?: string;
	position?: "bottom" | "top" | "left" | "right";
}

const DEFAULT_CARD_IDS = [
	"AH",
	"2H",
	"3H",
	"4H",
	"5H",
	"6H",
	"7H",
	"8H",
	"9H",
	"TH",
	"JH",
	"QH",
];

export default function Cards({
	opponent = false,
	position = "bottom",
	cardIds = DEFAULT_CARD_IDS,
	cardSpacing = 5,
	className,
}: CardsProps) {
	const cardCount = cardIds.length;

	return (
		<div
			className={cn(
				"absolute bottom-0 left-1/2 -translate-x-1/2",
				{ "rotate-180 top-0": position === "top" },
				{ "rotate-90 left-0": position === "left" },
				{ "rotate-270 right-0": position === "right" },
				className,
			)}
		>
			{cardIds.map((id, index) => {
				const offset = (index - (cardCount - 1) / 2) * cardSpacing;

				return (
					<Card
						cardId={id}
						faceDown={opponent}
						key={id}
						style={{
							bottom: 0,
							left: `calc(50% - ${offset}vw)`,
							transform: `translateX(-50%)`,
						}}
					/>
				);
			})}
		</div>
	);
}
