"use client";

import { useDraggable } from "@dnd-kit/core";
import type { TargetAndTransition, Transition } from "framer-motion";
import { useCallback } from "react";
import { cn } from "@/lib/utils";
import type { Card as CardType } from "@/types/game";
import GameCard from "./card";

interface DraggableCardProps {
	card: CardType;
	angle?: number;
	showBack?: boolean;
	isPlayable?: boolean;
	isSelected?: boolean;
	isDisabled?: boolean;
	isGhost?: boolean;
	isDraggingDisabled?: boolean;
	initial?: false | TargetAndTransition;
	animate?: TargetAndTransition;
	transition?: Transition;
	onClick?: () => void;
	onRef?: (el: HTMLButtonElement | null) => void;
	className?: string;
	style?: React.CSSProperties;
}

export function DraggableCard({
	card,
	angle = 0,
	showBack = false,
	isPlayable = false,
	isSelected = false,
	isDisabled = false,
	isGhost = false,
	isDraggingDisabled = false,
	initial,
	animate,
	transition,
	onClick,
	onRef,
	className,
	style,
}: DraggableCardProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		isDragging: isDraggingThis,
	} = useDraggable({
		id: card.id,
		disabled: isDraggingDisabled || isDisabled,
		data: {
			type: "card",
			card,
			angle,
		},
	});

	// Merge refs: dnd-kit ref + external ref callback
	const mergedRef = useCallback(
		(el: HTMLButtonElement | null) => {
			setNodeRef(el);
			onRef?.(el);
		},
		[setNodeRef, onRef],
	);

	// Drag transform style
	const dragStyle: React.CSSProperties | undefined =
		transform && !isDraggingThis
			? { translate: `${transform.x}px ${transform.y}px` }
			: undefined;

	return (
		<GameCard
			angle={angle}
			card={card}
			className={cn(
				"top-0 left-0 h-full w-full touch-none",
				(isGhost || isDraggingThis) && "pointer-events-none invisible",
				isDraggingThis && "transition-none!",
				className,
			)}
			disabled={isDisabled}
			dragAttributes={attributes}
			dragListeners={listeners}
			initial={initial}
			animate={animate}
			transition={transition}
			isDragging={isDraggingThis}
			isGhost={isGhost}
			onClick={onClick}
			playable={isPlayable && !isDraggingThis}
			ref={mergedRef}
			selected={isSelected}
			showBack={showBack}
			style={{ ...style, ...dragStyle }}
		/>
	);
}
