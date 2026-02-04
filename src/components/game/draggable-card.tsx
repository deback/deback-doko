"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CardImage } from "@/components/cards/card-image";
import { cn } from "@/lib/utils";
import type { Card } from "@/types/game";

interface DraggableCardProps {
	card: Card;
	isPlayable?: boolean;
	isSelectable?: boolean;
	isSelected?: boolean;
	isDisabled?: boolean;
	isDraggingDisabled?: boolean;
	onClick?: () => void;
	onMouseEnter?: () => void;
	onMouseLeave?: () => void;
	className?: string;
	style?: React.CSSProperties;
}

export function DraggableCard({
	card,
	isPlayable = false,
	isSelectable = true,
	isSelected = false,
	isDisabled = false,
	isDraggingDisabled = false,
	onClick,
	onMouseEnter,
	onMouseLeave,
	className,
	style,
}: DraggableCardProps) {
	const { attributes, listeners, setNodeRef, transform, isDragging } =
		useDraggable({
			id: card.id,
			disabled: isDraggingDisabled || !isPlayable,
			data: {
				type: "card",
				card,
			},
		});

	// Kombiniere die Drag-Transform mit der ursprünglichen Transform
	// WICHTIG: Drag-Translation muss ZUERST kommen, damit die Bewegung
	// im Screen-Space erfolgt und nicht relativ zur Rotation
	const combinedTransform = transform
		? `${CSS.Translate.toString(transform)} ${style?.transform || ""}`.trim()
		: style?.transform;

	// Karte ist interaktiv wenn spielbar ODER selektierbar (und nicht deaktiviert)
	const isInteractive = (isPlayable || isSelectable) && !isDisabled;

	return (
		<button
			className={cn(
				"touch-none bg-transparent p-0 border-none",
				isDragging && "z-[100] scale-105 opacity-90 transition-none!",
				isDisabled && "opacity-40",
				className,
			)}
			disabled={!isInteractive}
			onClick={isInteractive ? onClick : undefined}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
			ref={setNodeRef}
			style={{
				...style,
				transform: combinedTransform,
				zIndex: isDragging ? 100 : style?.zIndex,
			}}
			type="button"
			{...listeners}
			{...attributes}
		>
			<CardImage
				className={cn(
					"w-full transition-transform duration-200",
					isPlayable && !isDragging && "cursor-grab hover:scale-105",
					isDragging && "cursor-grabbing",
					isDisabled && "cursor-not-allowed grayscale",
					!isPlayable && !isDisabled && isSelectable && "cursor-pointer",
				)}
				disabled={isDisabled}
				playable={isPlayable && !isDragging}
				rank={card.rank}
				selected={isSelected}
				suit={card.suit}
			/>
		</button>
	);
}
