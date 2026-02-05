"use client";

import type {
	DraggableAttributes,
	DraggableSyntheticListeners,
} from "@dnd-kit/core";
import { motion, type TargetAndTransition } from "framer-motion";
import Image from "next/image";
import type { Ref } from "react";
import { getCardBackPath, getCardImagePath } from "@/lib/card-config";
import { cn } from "@/lib/utils";
import type { Card as CardType, Rank, Suit } from "@/types/game";

export const CARD_SIZE =
	"w-[30vw] max-w-40 lg:max-w-56 landscape:w-[30vh] landscape:max-w-28 lg:landscape:max-w-56 aspect-5/7";

export const THROW_TRANSITION = {
	type: "tween" as const,
	duration: 0.5,
	ease: [0.25, 0.1, 0.25, 1] as const,
};

export interface CardOrigin {
	x: number;
	y: number;
	width: number;
	height: number;
	rotate: number;
}

interface CardProps {
	// Either provide a Card object or suit+rank
	card?: CardType;
	suit?: Suit;
	rank?: Rank;
	// Or a file path directly (for backward compatibility with test/game)
	file?: string;
	// Display options
	showBack?: boolean;
	backDesign?: "blue" | "red";
	angle?: number;
	// State
	playable?: boolean;
	selected?: boolean;
	disabled?: boolean;
	isGhost?: boolean;
	isDragging?: boolean;
	// Animation
	initial?: false | TargetAndTransition;
	animate?: TargetAndTransition;
	// Interaction
	onClick?: () => void;
	ref?: Ref<HTMLButtonElement>;
	style?: React.CSSProperties;
	className?: string;
	// Drag & Drop
	dragListeners?: DraggableSyntheticListeners;
	dragAttributes?: DraggableAttributes;
}

export default function Card({
	card,
	suit,
	rank,
	file,
	showBack = false,
	backDesign = "blue",
	angle = 0,
	playable = false,
	selected = false,
	disabled = false,
	isGhost = false,
	isDragging = false,
	initial,
	animate,
	onClick,
	ref,
	style,
	className,
	dragListeners,
	dragAttributes,
}: CardProps) {
	// Determine image path
	let imagePath: string;
	if (file) {
		imagePath = `/doko/${file}`;
	} else if (showBack) {
		imagePath = getCardBackPath(backDesign);
	} else if (card) {
		imagePath = getCardImagePath(card.suit, card.rank);
	} else if (suit && rank) {
		imagePath = getCardImagePath(suit, rank);
	} else {
		imagePath = getCardBackPath(backDesign);
	}

	// Alt text
	const altText = showBack
		? "Kartenrücken"
		: file || `${rank} of ${suit}` || "Karte";

	// Hand cards: no animate prop → rotation via framer-motion animate for smooth interpolation.
	// DropZone cards with rotate in animate → framer-motion controls rotation, no style needed.
	// DropZone cards without rotate in animate → rotation via style (instant).
	const mergedAnimate = animate ?? { rotate: angle };
	const hasAnimatedRotation = animate != null && "rotate" in animate;
	const rotateStyle =
		hasAnimatedRotation || !animate ? undefined : { rotate: angle };
	const mergedStyle = { ...rotateStyle, ...style };

	const isInteractive = onClick && !disabled;

	return (
		<motion.button
			animate={mergedAnimate}
			className={cn(
				`absolute ${CARD_SIZE} origin-[50%_650%] shadow-md rounded-[5cqw] xl:origin-[50%_850%] transition-[translate,box-shadow] duration-200 select-none`,
				// Interactive states
				{ "cursor-pointer hover:-translate-y-[6%]": isInteractive },
				// Playable indicator (green ring)
				{ "ring-2 ring-emerald-500": playable && !selected },
				// Selected state
				{
					"-translate-y-[10%] hover:-translate-y-[10%] ring-2 ring-primary":
						selected,
				},
				// Disabled state
				{ "opacity-40 cursor-not-allowed": disabled },
				// Ghost/Dragging states
				{ "invisible pointer-events-none": isGhost || isDragging },
				{ "transition-none!": isDragging },
				className,
			)}
			disabled={!isInteractive}
			initial={initial ?? false}
			onClick={isInteractive ? onClick : undefined}
			ref={ref}
			style={mergedStyle}
			transition={THROW_TRANSITION}
			type="button"
			{...dragListeners}
			{...dragAttributes}
		>
			<Image alt={altText} draggable={false} fill src={imagePath} />
		</motion.button>
	);
}
