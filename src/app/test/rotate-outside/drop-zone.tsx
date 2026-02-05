"use client";

import { AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Card from "./card";
import type { CardOrigin } from "./hand";

const OPPONENT_CARDS: {
	file: string;
	position: "top" | "left" | "right";
}[] = [
	{ file: "QS.svg", position: "top" },
	{ file: "JD.svg", position: "left" },
	{ file: "TC.svg", position: "right" },
];

function randomAngle() {
	return Math.random() * 40 - 20;
}

export default function DropZone({
	playedCard,
	cardOrigin,
}: {
	playedCard: string | null;
	cardOrigin: CardOrigin | null;
}) {
	const [mounted, setMounted] = useState(false);
	const anglesRef = useRef<Map<string, number>>(new Map());
	const dropZoneRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		for (const card of OPPONENT_CARDS) {
			const base =
				card.position === "left" || card.position === "right" ? 90 : 0;
			anglesRef.current.set(card.position, base + randomAngle());
		}
		anglesRef.current.set("bottom", randomAngle());
		setMounted(true);
	}, []);

	useEffect(() => {
		if (playedCard) {
			anglesRef.current.set("bottom", randomAngle());
		}
	}, [playedCard]);

	function getInitialFromOrigin() {
		if (!cardOrigin || !dropZoneRef.current) return undefined;
		const dropRect = dropZoneRef.current.getBoundingClientRect();
		const dropCenterX = dropRect.left + dropRect.width / 2;
		const dropCenterY = dropRect.top + dropRect.height / 2;
		const originCenterX = cardOrigin.x + cardOrigin.width / 2;
		const originCenterY = cardOrigin.y + cardOrigin.height / 2;
		return {
			x: originCenterX - dropCenterX,
			y: originCenterY - dropCenterY,
			scale: 1.2,
		};
	}

	return (
		<div
			className={[
				"fixed border-2 border-red-500",

				// -- Top --
				"top-[calc(min(30vw,10rem)*1.4*0.2)]",
				"portrait:top-[calc(min(30vw,10rem)*1.4/3)]",
				"lg:top-[calc(min(30vw,14rem)*1.4/3)]",

				// -- Bottom --
				"bottom-[calc(min(30vw,10rem)*1.4*2/3)]",
				"sm:bottom-[calc(min(30vw,10rem)*1.4/2)]",
				"landscape:bottom-[calc(min(30vw,10rem)*1.4/3)]",
				"lg:bottom-[calc(min(30vw,14rem)*1.4*2/3)]",
				"lg:landscape:bottom-[calc(min(30vw,14rem)*1.4/2)]",

				// -- Left/Right --
				"left-[calc(min(30vw,10rem)*0.4)]",
				"right-[calc(min(30vw,10rem)*0.4)]",
				"lg:left-[calc(min(30vw,14rem)*0.4)]",
				"lg:right-[calc(min(30vw,14rem)*0.4)]",
			].join(" ")}
			ref={dropZoneRef}
		>
			{mounted && (
				<div className="relative w-full h-full flex items-center justify-center">
					{OPPONENT_CARDS.map((card) => (
						<Card
							angle={anglesRef.current.get(card.position) ?? 0}
							className={[
								"origin-center!",
								card.position === "top" && "-translate-y-[30%]",
								card.position === "left" && "-translate-x-[30%]",
								card.position === "right" && "translate-x-[30%]",
							]
								.filter(Boolean)
								.join(" ")}
							file={card.file}
							key={card.position}
						/>
					))}
					<AnimatePresence mode="popLayout">
						{playedCard && (
							<Card
								angle={anglesRef.current.get("bottom") ?? 0}
								animate={{
									x: 0,
									y: 0,
									scale: 1,
								}}
								className="origin-center! translate-y-[30%]"
								file={playedCard}
								initial={
									getInitialFromOrigin() || false
								}
								key={playedCard}
							/>
						)}
					</AnimatePresence>
				</div>
			)}
		</div>
	);
}
