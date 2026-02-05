"use client";

import { useDraggable } from "@dnd-kit/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import Card, { CARD_SIZE } from "./card";

export interface CardOrigin {
	x: number;
	y: number;
	width: number;
	height: number;
	rotate: number;
}

const CLOSE_GAP_DELAY = 600;

function DraggableHandCard({
	file,
	angle,
	selected,
	isGhost,
	isDragging,
	disabled,
	onClick,
	onRef,
}: {
	file: string;
	angle: number;
	selected: boolean;
	isGhost: boolean;
	isDragging: boolean;
	disabled: boolean;
	onClick: () => void;
	onRef: (el: HTMLButtonElement | null) => void;
}) {
	const {
		setNodeRef,
		attributes,
		listeners,
		transform,
		isDragging: isDraggingThis,
	} = useDraggable({
		id: file,
		data: { file, angle },
		disabled,
	});

	const mergedRef = useCallback(
		(el: HTMLButtonElement | null) => {
			setNodeRef(el);
			onRef(el);
		},
		[setNodeRef, onRef],
	);

	const dragStyle: React.CSSProperties | undefined =
		transform && !isDraggingThis
			? { translate: `${transform.x}px ${transform.y}px` }
			: undefined;

	return (
		<Card
			angle={angle}
			className={cn(
				"top-0 left-0 w-full h-full touch-none",
				(isGhost || isDragging || isDraggingThis) &&
					"invisible pointer-events-none",
				isDraggingThis && "transition-none!",
			)}
			dragAttributes={attributes}
			dragListeners={listeners}
			file={file}
			onClick={onClick}
			ref={mergedRef}
			selected={selected}
			style={dragStyle}
		/>
	);
}

export default function Hand({
	cards,
	position,
	opponent = false,
	activeDragCard,
	onPlayCard,
	onRemoveCard,
}: {
	cards: string[];
	position: "bottom" | "top" | "left" | "right";
	opponent?: boolean;
	activeDragCard?: string | null;
	onPlayCard?: (file: string, origin: CardOrigin) => void;
	onRemoveCard?: (file: string) => void;
}) {
	const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
	const [ghostFile, setGhostFile] = useState<string | null>(null);
	const cardRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
	const ghostTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

	const setCardRef = useCallback(
		(file: string) => (el: HTMLButtonElement | null) => {
			if (el) cardRefs.current.set(file, el);
			else cardRefs.current.delete(file);
		},
		[],
	);

	useEffect(() => {
		return () => {
			clearTimeout(ghostTimerRef.current);
		};
	}, []);

	// When a card is played via drag, trigger ghost + removal from parent
	useEffect(() => {
		if (!activeDragCard || opponent) return;
		const idx = cards.indexOf(activeDragCard);
		if (idx === -1) return;
		setGhostFile(activeDragCard);
		setSelectedIndex(null);
		ghostTimerRef.current = setTimeout(() => {
			onRemoveCard?.(activeDragCard);
			setGhostFile(null);
		}, CLOSE_GAP_DELAY);
	}, [activeDragCard, cards, opponent, onRemoveCard]);

	function handleClick(card: string, index: number) {
		if (ghostFile !== null) return;
		if (selectedIndex === index) {
			const el = cardRefs.current.get(card);
			if (el) {
				const rect = el.getBoundingClientRect();
				const t = index - (cards.length - 1) / 2;
				const angle = t * 1.2;
				onPlayCard?.(card, {
					x: rect.x,
					y: rect.y,
					width: rect.width,
					height: rect.height,
					rotate: angle,
				});
				setGhostFile(card);
				ghostTimerRef.current = setTimeout(() => {
					onRemoveCard?.(card);
					setGhostFile(null);
				}, CLOSE_GAP_DELAY);
			}
			setSelectedIndex(null);
		} else {
			setSelectedIndex(index);
		}
	}

	return (
		<div
			className={cn(
				"fixed",
				{
					"rotate-180 top-0 -translate-x-1/2 portrait:-translate-y-2/3 left-1/2 -translate-y-4/5 lg:-translate-y-2/3":
						position === "top",
				},
				{
					"left-0 top-1/2 -translate-y-1/2 rotate-90 -translate-x-4/5":
						position === "left",
				},
				{
					"right-0 top-1/2 -translate-y-1/2  -rotate-90 translate-x-4/5":
						position === "right",
				},
				{
					"bottom-0 translate-y-1/3 -translate-x-1/2 sm:translate-y-1/2 left-1/2 landscape:translate-y-2/3 lg:landscape:translate-y-1/2":
						position === "bottom",
				},
			)}
		>
			<div className={`@container relative ${CARD_SIZE}`}>
				{cards.map((card, index) => {
					const t = index - (cards.length - 1) / 2;
					const angle = t * 1.2;

					if (opponent) {
						return (
							<Card
								angle={angle}
								className="top-0 left-0 w-full h-full"
								file="1B.svg"
								key={card}
							/>
						);
					}

					return (
						<DraggableHandCard
							angle={angle}
							disabled={ghostFile !== null}
							file={card}
							isDragging={activeDragCard === card && ghostFile !== card}
							isGhost={ghostFile === card}
							key={card}
							onClick={() => handleClick(card, index)}
							onRef={setCardRef(card)}
							selected={selectedIndex === index}
						/>
					);
				})}
			</div>
		</div>
	);
}
