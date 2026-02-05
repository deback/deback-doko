"use client";

import { useDroppable } from "@dnd-kit/core";
import {
	useCallback,
	useEffect,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { cn } from "@/lib/utils";
import type { Card as CardType } from "@/types/game";
import type { Player } from "@/types/tables";
import Card, { type CardOrigin } from "./card";

// Random angle for natural card fall (-20° to +20°)
function randomAngle() {
	return Math.random() * 40 - 20;
}

// Hook to detect short screens
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

interface TrickCard {
	card: CardType;
	playerId: string;
}

interface TrickAreaProps {
	trickCards: TrickCard[];
	players: Player[];
	currentPlayerId: string;
	// Animation props
	playedCard?: { card: CardType; playerId: string } | null;
	cardOrigin?: CardOrigin | null;
	className?: string;
}

// Get relative position for a player's card in the trick
type RelativePosition = "bottom" | "left" | "top" | "right";

function getRelativePosition(
	playerIndex: number,
	currentPlayerIndex: number,
	totalPlayers: number,
): RelativePosition {
	const relativePosition =
		(playerIndex - currentPlayerIndex + totalPlayers) % totalPlayers;
	const positions: RelativePosition[] = ["bottom", "left", "top", "right"];
	return positions[relativePosition] ?? "bottom";
}

export function TrickArea({
	trickCards,
	players,
	currentPlayerId,
	playedCard,
	cardOrigin,
	className,
}: TrickAreaProps) {
	const {
		setNodeRef: setDroppableRef,
		isOver,
		active,
	} = useDroppable({
		id: "trick-area",
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
	const canDrop = active?.data?.current?.type === "card";
	const isShortScreen = useIsShortScreen();
	const snapshotRef = useRef<{
		cardId: string;
		angle: number;
		initial: { x: number; y: number; scale: number; rotate: number };
	} | null>(null);

	const currentPlayerIndex = players.findIndex((p) => p.id === currentPlayerId);

	useEffect(() => {
		setMounted(true);
	}, []);

	// Generate random angles for trick cards on mount
	useEffect(() => {
		for (const trickCard of trickCards) {
			if (!anglesRef.current.has(trickCard.card.id)) {
				const playerIndex = players.findIndex(
					(p) => p.id === trickCard.playerId,
				);
				const position = getRelativePosition(
					playerIndex,
					currentPlayerIndex,
					players.length,
				);
				const baseAngle = position === "left" || position === "right" ? 90 : 0;
				anglesRef.current.set(trickCard.card.id, baseAngle + randomAngle());
			}
		}
	}, [trickCards, players, currentPlayerIndex]);

	// Compute snapshot synchronously for the played card animation
	if (
		playedCard &&
		cardOrigin &&
		snapshotRef.current?.cardId !== playedCard.card.id &&
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
			cardId: playedCard.card.id,
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
					: "border-transparent",

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

				className,
			)}
			ref={mergedRef}
		>
			{mounted && (
				<div className="relative w-full h-full flex items-center justify-center">
					{/* All trick cards - show animated version if it's the currently played card */}
					{trickCards.map((trickCard) => {
						const playerIndex = players.findIndex(
							(p) => p.id === trickCard.playerId,
						);
						const position = getRelativePosition(
							playerIndex,
							currentPlayerIndex,
							players.length,
						);
						const shortScreenOffset =
							isShortScreen && position === "top" ? 90 : 0;

						// Check if this card should be animated (just played by local player)
						const snapshot = snapshotRef.current;
						const isAnimatingCard =
							playedCard?.card.id === trickCard.card.id &&
							snapshot?.cardId === trickCard.card.id;

						if (isAnimatingCard && snapshot) {
							// Render animated version
							return (
								<Card
									angle={0}
									animate={{
										x: 0,
										y: 0,
										scale: 1,
										rotate: snapshot.angle + shortScreenOffset,
									}}
									card={trickCard.card}
									className={cn(
										"origin-center!",
										position === "top" && "-translate-y-[30%]",
										position === "left" && "-translate-x-[30%]",
										position === "right" && "translate-x-[30%]",
										position === "bottom" && "translate-y-[30%]",
									)}
									initial={snapshot.initial}
									key={trickCard.card.id}
								/>
							);
						}

						// Render static version
						return (
							<Card
								angle={
									(anglesRef.current.get(trickCard.card.id) ?? 0) +
									shortScreenOffset
								}
								card={trickCard.card}
								className={cn(
									"origin-center!",
									position === "top" && "-translate-y-[30%]",
									position === "left" && "-translate-x-[30%]",
									position === "right" && "translate-x-[30%]",
									position === "bottom" && "translate-y-[30%]",
								)}
								key={trickCard.card.id}
							/>
						);
					})}
				</div>
			)}

			{/* Drop-Zone Hinweis */}
			{trickCards.length === 0 && !playedCard && !isOver && (
				<div className="absolute inset-0 flex items-center justify-center">
					<span className="text-white/30 text-sm">Karte hier ablegen</span>
				</div>
			)}

			{/* Hover-Effekt */}
			{isOver && canDrop && (
				<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
					<div className="animate-pulse text-emerald-400 text-lg font-semibold">
						Loslassen zum Spielen
					</div>
				</div>
			)}
		</div>
	);
}
