"use client";

import { cn } from "@/lib/utils";
import Card, { CARD_SIZE } from "./card";

type Position = "top" | "left" | "right" | "bottom";

interface OpponentHandProps {
	cardCount: number;
	position: Position;
	className?: string;
}

const POSITION_STYLES: Record<Position, string> = {
	top: "rotate-180 top-0 -translate-x-1/2 portrait:-translate-y-2/3 left-1/2 -translate-y-4/5 lg:-translate-y-2/3",
	left: "left-0 top-1/2 -translate-y-1/2 rotate-90 -translate-x-4/5",
	right: "right-0 top-1/2 -translate-y-1/2 -rotate-90 translate-x-4/5",
	bottom:
		"bottom-0 translate-y-1/3 -translate-x-1/2 sm:translate-y-1/2 left-1/2 landscape:translate-y-2/3 lg:landscape:translate-y-1/2",
};

export function OpponentHand({
	cardCount,
	position,
	className,
}: OpponentHandProps) {
	return (
		<div className={cn("fixed", POSITION_STYLES[position], className)}>
			<div className={`@container relative ${CARD_SIZE}`}>
				{Array.from({ length: cardCount }).map((_, index) => {
					const t = index - (cardCount - 1) / 2;
					const angle = t * 1.2;

					return (
						<Card
							angle={angle}
							className="top-0 left-0 w-full h-full"
							// biome-ignore lint/suspicious/noArrayIndexKey: opponent cards are identical, no stable ID available
							key={`opponent-card-${index}`}
							showBack
						/>
					);
				})}
			</div>
		</div>
	);
}
