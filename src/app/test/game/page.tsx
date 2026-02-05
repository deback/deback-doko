"use client";

import {
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	MouseSensor,
	TouchSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import Image from "next/image";
import { useCallback, useId, useState } from "react";
import DropZone from "./drop-zone";
import Hand, { type CardOrigin } from "./hand";

const CARD_FILES: string[] = [
	"TH.svg",
	"QD.svg",
	"KC.svg",
	"8C.svg",
	"9D.svg",
	"AS.svg",
	"9S.svg",
	"KH.svg",
	"AC.svg",
	"9C.svg",
	"QC.svg",
	"6C.svg",
];

export default function RotateOutsidePage() {
	const dndContextId = useId();
	const [playedCard, setPlayedCard] = useState<string | null>(null);
	const [cardOrigin, setCardOrigin] = useState<CardOrigin | null>(null);
	const [handCards, setHandCards] = useState(CARD_FILES);
	const [activeDragCard, setActiveDragCard] = useState<string | null>(null);
	// Track the last card played via drag so Hand can trigger ghost + removal
	const [dragPlayedCard, setDragPlayedCard] = useState<string | null>(null);

	const mouseSensor = useSensor(MouseSensor, {
		activationConstraint: { distance: 10 },
	});
	const touchSensor = useSensor(TouchSensor, {
		activationConstraint: { delay: 150, tolerance: 5 },
	});
	const sensors = useSensors(mouseSensor, touchSensor);

	function handlePlayCard(file: string, origin: CardOrigin) {
		setCardOrigin(origin);
		setPlayedCard(file);
	}

	const handleRemoveCard = useCallback((file: string) => {
		setHandCards((prev) => {
			const idx = prev.indexOf(file);
			if (idx === -1) return prev;
			return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
		});
		setDragPlayedCard(null);
	}, []);

	function handleDragStart(event: DragStartEvent) {
		setActiveDragCard(event.active.id as string);
	}

	function handleDragEnd(event: DragEndEvent) {
		const { active, over, delta } = event;
		setActiveDragCard(null);

		if (over?.id !== "drop-zone" || !active?.id) return;

		const cardFile = active.id as string;
		const initialRect = active.rect.current.initial;
		if (!initialRect) return;

		const angle =
			(active.data.current as { angle?: number } | undefined)?.angle ?? 0;

		const dropOrigin: CardOrigin = {
			x: initialRect.left + delta.x,
			y: initialRect.top + delta.y,
			width: initialRect.width,
			height: initialRect.height,
			rotate: angle,
		};

		handlePlayCard(cardFile, dropOrigin);
		setDragPlayedCard(cardFile);
	}

	return (
		<DndContext
			id={dndContextId}
			onDragEnd={handleDragEnd}
			onDragStart={handleDragStart}
			sensors={sensors}
		>
			<Hand
				activeDragCard={dragPlayedCard}
				cards={handCards}
				onPlayCard={handlePlayCard}
				onRemoveCard={handleRemoveCard}
				position="bottom"
			/>
			<Hand cards={CARD_FILES} opponent position="top" />
			<Hand cards={CARD_FILES} opponent position="left" />
			<Hand cards={CARD_FILES} opponent position="right" />
			<DropZone cardOrigin={cardOrigin} playedCard={playedCard} />
			<DragOverlay dropAnimation={null}>
				{activeDragCard && (
					<div className="relative w-[30vw] max-w-56 aspect-5/7">
						<Image
							alt={activeDragCard}
							className="rounded-[1cqw] shadow-xl"
							draggable={false}
							fill
							src={`/doko/${activeDragCard}`}
						/>
					</div>
				)}
			</DragOverlay>
		</DndContext>
	);
}
