"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import Card from "./card";

export interface CardOrigin {
	x: number;
	y: number;
	width: number;
	height: number;
	rotate: number;
}

const CLOSE_GAP_DELAY = 600;

export default function Hand({
	cards,
	position,
	opponent = false,
	onPlayCard,
	onRemoveCard,
}: {
	cards: string[];
	position: "bottom" | "top" | "left" | "right";
	opponent?: boolean;
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
			<div className="relative w-[30vw] max-w-40 lg:max-w-56 aspect-5/7">
				{cards.map((card, index) => {
					const t = index - (cards.length - 1) / 2;
					const angle = t * 1.2;
					return (
						<Card
							angle={angle}
							className={cn(
								"top-0 left-0 w-full h-full",
								ghostFile === card &&
									"invisible pointer-events-none",
							)}
							file={`${opponent ? "1B.svg" : card}`}
							key={card}
							onClick={
								opponent
									? undefined
									: () => handleClick(card, index)
							}
							ref={!opponent ? setCardRef(card) : undefined}
							selected={!opponent && selectedIndex === index}
						/>
					);
				})}
			</div>
		</div>
	);
}
