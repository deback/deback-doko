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

const positionClasses = {
	bottom: "bottom-0 left-1/2 -translate-x-1/2",
	top: "top-0 left-1/2 -translate-x-1/2 rotate-180",
	left: "left-0 top-1/2 origin-bottom-left rotate-90",
	right: "right-0 top-1/2 origin-bottom-right -rotate-90",
};

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
				"absolute",
				positionClasses[position],

				className,
				{ "-translate-y-[3vw]": opponent },
			)}
		>
			{cardIds.map((id, index) => {
				const offset = (index - (cardCount - 1) / 2) * cardSpacing;
				const sign = offset >= 0 ? 1 : -1;
				const absOffset = Math.abs(offset);

				return (
					<Card
						cardId={id}
						faceDown={opponent}
						key={id}
						style={{
							bottom: 0,
							left: `calc(50% + ${sign} * min(${absOffset}vw, ${absOffset * 10}px))`,
							transform: `translateX(-50%) `,
						}}
					/>
				);
			})}
		</div>
	);
}
