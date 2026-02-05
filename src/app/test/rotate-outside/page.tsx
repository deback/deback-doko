"use client";

import { useCallback, useState } from "react";
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
	const [playedCard, setPlayedCard] = useState<string | null>(null);
	const [cardOrigin, setCardOrigin] = useState<CardOrigin | null>(null);
	const [handCards, setHandCards] = useState(CARD_FILES);

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
	}, []);

	return (
		<>
			<Hand
				cards={handCards}
				onPlayCard={handlePlayCard}
				onRemoveCard={handleRemoveCard}
				position="bottom"
			/>
			<Hand cards={CARD_FILES} opponent position="top" />
			<Hand cards={CARD_FILES} opponent position="left" />
			<Hand cards={CARD_FILES} opponent position="right" />
			<DropZone cardOrigin={cardOrigin} playedCard={playedCard} />
		</>
	);
}
