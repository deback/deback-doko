"use client";

import Image from "next/image";
import {
	getCardBackPath,
	getCardImagePath,
	getJokerPath,
	RANK_DISPLAY,
	SUIT_SYMBOLS,
} from "@/lib/card-config";
import { cn } from "@/lib/utils";
import type {
	CardBackDesign,
	CardRenderMode,
	FullRank,
	Rank,
	Suit,
} from "@/types/game";

interface CardImageProps {
	suit?: Suit;
	rank?: Rank | FullRank;
	showBack?: boolean;
	backDesign?: CardBackDesign;
	joker?: "red" | "black";
	renderMode?: CardRenderMode;
	playable?: boolean;
	selected?: boolean;
	disabled?: boolean;
	className?: string;
	style?: React.CSSProperties;
}

export function CardImage({
	suit,
	rank,
	showBack = false,
	backDesign = "blue",
	joker,
	playable,
	selected,
	disabled,
	className,
	style,
}: CardImageProps) {
	// SVG Pfad ermitteln
	let imagePath: string;

	if (showBack) {
		imagePath = getCardBackPath(backDesign);
	} else if (joker) {
		imagePath = getJokerPath(joker);
	} else if (suit && rank) {
		imagePath = getCardImagePath(suit, rank);
	} else {
		// Fallback: Kartenrücken anzeigen
		imagePath = getCardBackPath(backDesign);
	}

	const altText = showBack
		? "Kartenrücken"
		: joker
			? `Joker ${joker}`
			: suit && rank
				? `${RANK_DISPLAY[rank] || rank} ${SUIT_SYMBOLS[suit]}`
				: "Karte";

	return (
		<div
			className={cn(
				"relative aspect-5/7 w-full rounded-[1cqw]",
				{ "ring-2 ring-emerald-500": playable },
				{ "ring-2 ring-primary": selected },
				{ "cursor-not-allowed opacity-50": disabled },
				className,
			)}
			style={style}
		>
			<Image
				alt={altText}
				className="object-contain"
				draggable={false}
				fill
				priority={false}
				src={imagePath}
			/>
		</div>
	);
}
