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
	onClick?: () => void;
	className?: string;
	style?: React.CSSProperties;
}

// Farben für Text-Rendering
const SUIT_COLORS: Record<Suit, string> = {
	hearts: "text-red-600",
	diamonds: "text-red-500",
	clubs: "text-slate-900",
	spades: "text-slate-900",
};

export function CardImage({
	suit,
	rank,
	showBack = false,
	backDesign = "blue",
	joker,
	renderMode = "svg",
	playable,
	selected,
	disabled,
	onClick,
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

	// Text-Fallback Rendering
	if (renderMode === "text" && suit && rank && !showBack && !joker) {
		return (
			<CardText
				className={className}
				disabled={disabled}
				onClick={onClick}
				playable={playable}
				rank={rank}
				selected={selected}
				style={style}
				suit={suit}
			/>
		);
	}

	const altText = showBack
		? "Kartenrücken"
		: joker
			? `Joker ${joker}`
			: suit && rank
				? `${RANK_DISPLAY[rank] || rank} ${SUIT_SYMBOLS[suit]}`
				: "Karte";

	// SVG Rendering mit Next.js Image
	if (onClick && !disabled) {
		return (
			<button
				className={cn(
					"relative aspect-5/7 w-full cursor-pointer",
					playable && "ring-2 ring-emerald-500 ring-offset-2",
					selected && "ring-2 ring-primary ring-offset-2",
					className,
				)}
				onClick={onClick}
				style={style}
				type="button"
			>
				<Image
					alt={altText}
					className="object-contain"
					fill
					priority={false}
					src={imagePath}
				/>
			</button>
		);
	}

	return (
		<div
			className={cn(
				"relative aspect-5/7 w-full",
				disabled && "cursor-not-allowed opacity-50",
				className,
			)}
			style={style}
		>
			<Image
				alt={altText}
				className="object-contain"
				fill
				priority={false}
				src={imagePath}
			/>
		</div>
	);
}

// Text-basierte Karten-Darstellung (Fallback)
interface CardTextProps {
	suit: Suit;
	rank: Rank | FullRank;
	playable?: boolean;
	selected?: boolean;
	disabled?: boolean;
	onClick?: () => void;
	className?: string;
	style?: React.CSSProperties;
}

function CardText({
	suit,
	rank,
	playable,
	selected,
	disabled,
	onClick,
	className,
	style,
}: CardTextProps) {
	const displayRank = RANK_DISPLAY[rank] || rank;
	const suitSymbol = SUIT_SYMBOLS[suit];
	const colorClass = SUIT_COLORS[suit];

	const content = (
		<>
			{/* Ecke oben links */}
			<div
				className={cn("absolute top-1 left-1 font-bold text-xs", colorClass)}
			>
				<div>{displayRank}</div>
				<div>{suitSymbol}</div>
			</div>

			{/* Ecke oben rechts */}
			<div
				className={cn("absolute top-1 right-1 font-bold text-xs", colorClass)}
			>
				<div>{displayRank}</div>
				<div>{suitSymbol}</div>
			</div>

			{/* Zentrales Symbol */}
			<div
				className={cn(
					"absolute inset-0 flex items-center justify-center text-4xl",
					colorClass,
				)}
			>
				{suitSymbol}
			</div>

			{/* Ecke unten links (gedreht) */}
			<div
				className={cn(
					"absolute bottom-1 left-1 rotate-180 font-bold text-xs",
					colorClass,
				)}
			>
				<div>{displayRank}</div>
				<div>{suitSymbol}</div>
			</div>

			{/* Ecke unten rechts (gedreht) */}
			<div
				className={cn(
					"absolute right-1 bottom-1 rotate-180 font-bold text-xs",
					colorClass,
				)}
			>
				<div>{displayRank}</div>
				<div>{suitSymbol}</div>
			</div>
		</>
	);

	if (onClick && !disabled) {
		return (
			<button
				className={cn(
					"relative aspect-5/7 w-full cursor-pointer rounded-lg border-2 border-slate-300 bg-white shadow-md transition-transform hover:scale-105",
					playable && "ring-2 ring-emerald-500 ring-offset-2",
					selected && "ring-2 ring-primary ring-offset-2",
					className,
				)}
				onClick={onClick}
				style={style}
				type="button"
			>
				{content}
			</button>
		);
	}

	return (
		<div
			className={cn(
				"relative aspect-5/7 w-full rounded-lg border-2 border-slate-300 bg-white shadow-md",
				disabled && "cursor-not-allowed opacity-50",
				className,
			)}
			style={style}
		>
			{content}
		</div>
	);
}

export { CardText };
