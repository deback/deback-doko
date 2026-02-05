"use client";

import { useDroppable } from "@dnd-kit/core";
import { AnimatePresence } from "framer-motion";
import {
	useCallback,
	useEffect,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { cn } from "@/lib/utils";
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

const SHORT_SCREEN_QUERY = "(max-height: 500px)";
const subscribe = (cb: () => void) => {
	const mql = window.matchMedia(SHORT_SCREEN_QUERY);
	mql.addEventListener("change", cb);
	return () => mql.removeEventListener("change", cb);
};
const getSnapshot = () => window.matchMedia(SHORT_SCREEN_QUERY).matches;
const getServerSnapshot = () => false;

function useIsShortScreen() {
	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export default function DropZone({
	playedCard,
	cardOrigin,
}: {
	playedCard: string | null;
	cardOrigin: CardOrigin | null;
}) {
	const {
		setNodeRef: setDroppableRef,
		isOver,
		active,
	} = useDroppable({
		id: "drop-zone",
	});
	const [mounted, setMounted] = useState(false);
	const anglesRef = useRef<Map<string, number>>(new Map());
	const dropZoneRef = useRef<HTMLDivElement>(null);
	const mergedRef = useCallback(
		(el: HTMLDivElement | null) => {
			dropZoneRef.current = el;
			setDroppableRef(el);
		},
		[setDroppableRef],
	);
	const canDrop = active != null;
	const isShortScreen = useIsShortScreen();
	const snapshotRef = useRef<{
		card: string;
		angle: number;
		initial: { x: number; y: number; scale: number; rotate: number };
	} | null>(null);

	useEffect(() => {
		for (const card of OPPONENT_CARDS) {
			const base =
				card.position === "left" || card.position === "right" ? 90 : 0;
			anglesRef.current.set(card.position, base + randomAngle());
		}
		setMounted(true);
	}, []);

	// Compute snapshot synchronously so the card renders immediately
	if (
		playedCard &&
		cardOrigin &&
		snapshotRef.current?.card !== playedCard &&
		dropZoneRef.current
	) {
		const dropRect = dropZoneRef.current.getBoundingClientRect();
		const dropCenterX = dropRect.left + dropRect.width / 2;
		const dropCenterY = dropRect.top + dropRect.height / 2;
		const originCenterX = cardOrigin.x + cardOrigin.width / 2;
		const originCenterY = cardOrigin.y + cardOrigin.height / 2;
		const angle = randomAngle();
		const spinOptions = [-360, 0, 360];
		const spin = spinOptions[Math.floor(Math.random() * 3)] ?? 0;
		snapshotRef.current = {
			card: playedCard,
			angle,
			initial: {
				x: originCenterX - dropCenterX,
				y: originCenterY - dropCenterY,
				scale: 1.2,
				rotate: angle + spin,
			},
		};
	}

	return (
		<div
			className={cn(
				"fixed border-2 transition-all duration-200",

				isOver && canDrop
					? "border-primary bg-primary/10 scale-[1.02]"
					: "border-red-500",

				// -- Top --
				"top-[calc(min(30vw,10rem)*1.4*0.2)]",
				"portrait:top-[calc(min(30vw,10rem)*1.4/3)]",
				"lg:top-[calc(min(30vw,14rem)*1.4/3)]",

				// -- Bottom: matches Hand translate-y at each breakpoint --
				"bottom-[calc(min(30vw,10rem)*1.4*2/3)]",
				"sm:bottom-[calc(min(30vw,10rem)*1.4/2)]",
				"landscape:bottom-[calc(min(30vh,7rem)*1.4/3)]",
				"lg:bottom-[calc(min(30vw,14rem)*1.4/2)]",
				"lg:landscape:bottom-[calc(min(30vw,14rem)*1.4/2)]",

				// -- Left/Right --
				"left-[calc(min(30vw,10rem)*0.4)]",
				"right-[calc(min(30vw,10rem)*0.4)]",
				"landscape:left-[calc(min(30vh,7rem)*0.4)]",
				"landscape:right-[calc(min(30vh,7rem)*0.4)]",
				"lg:left-[calc(min(30vw,14rem)*0.4)]",
				"lg:right-[calc(min(30vw,14rem)*0.4)]",
			)}
			ref={mergedRef}
		>
			{mounted && (
				<div className="relative w-full h-full flex items-center justify-center">
					{OPPONENT_CARDS.map((card) => {
						const shortScreenOffset =
							isShortScreen && card.position === "top" ? 90 : 0;
						return (
							<Card
								angle={
									(anglesRef.current.get(card.position) ?? 0) +
									shortScreenOffset
								}
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
						);
					})}
					<AnimatePresence mode="popLayout">
						{playedCard && snapshotRef.current?.card === playedCard && (
							<Card
								angle={0}
								animate={{
									x: 0,
									y: 0,
									scale: 1,
									rotate: snapshotRef.current.angle + (isShortScreen ? 90 : 0),
								}}
								className="origin-center! translate-y-[30%]"
								file={playedCard}
								initial={snapshotRef.current.initial}
								key={playedCard}
							/>
						)}
					</AnimatePresence>
				</div>
			)}
		</div>
	);
}
