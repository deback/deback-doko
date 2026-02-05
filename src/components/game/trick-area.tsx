"use client";

import { useDroppable } from "@dnd-kit/core";
import { motion } from "framer-motion";
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

// Animation phases for trick completion
type TrickAnimationPhase =
	| "playing" // Normal play phase
	| "waiting" // 1s wait after last card
	| "collecting" // Cards move to center
	| "flipping" // Cards flip over
	| "toWinner"; // Cards animate to winner

interface TrickAreaProps {
	trickCards: TrickCard[];
	players: Player[];
	currentPlayerId: string;
	// Animation props
	playedCard?: { card: CardType; playerId: string } | null;
	cardOrigin?: CardOrigin | null;
	// Trick winner for end-of-trick animation
	trickWinnerId?: string | null;
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

// Get the target position offset for animating cards to the winner
function getWinnerOffset(winnerPosition: RelativePosition): {
	x: number;
	y: number;
} {
	switch (winnerPosition) {
		case "bottom":
			return { x: 0, y: 200 };
		case "top":
			return { x: 0, y: -200 };
		case "left":
			return { x: -200, y: 0 };
		case "right":
			return { x: 200, y: 0 };
	}
}

export function TrickArea({
	trickCards,
	players,
	currentPlayerId,
	playedCard,
	cardOrigin,
	trickWinnerId,
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

	// Animation state for trick completion
	const [animationPhase, setAnimationPhase] =
		useState<TrickAnimationPhase>("playing");
	const [cachedTrickCards, setCachedTrickCards] = useState<TrickCard[]>([]);
	const [cachedWinnerId, setCachedWinnerId] = useState<string | null>(null);
	const [flipProgress, setFlipProgress] = useState(0);

	useEffect(() => {
		setMounted(true);
	}, []);

	// Helper to get or create angle for a card (synchronous, stable)
	const getCardAngle = useCallback(
		(cardId: string, playerId: string): number => {
			if (!anglesRef.current.has(cardId)) {
				const playerIndex = players.findIndex((p) => p.id === playerId);
				const position = getRelativePosition(
					playerIndex,
					currentPlayerIndex,
					players.length,
				);
				const baseAngle = position === "left" || position === "right" ? 90 : 0;
				anglesRef.current.set(cardId, baseAngle + randomAngle());
			}
			return anglesRef.current.get(cardId) ?? 0;
		},
		[players, currentPlayerIndex],
	);

	// Ref to track if animation is in progress (prevents timer cancellation)
	const animationInProgressRef = useRef(false);

	// Detect completed trick and start animation sequence
	useEffect(() => {
		// Trick is complete when we have 4 cards AND a winner
		if (
			trickCards.length === 4 &&
			trickWinnerId &&
			animationPhase === "playing" &&
			!animationInProgressRef.current
		) {
			animationInProgressRef.current = true;

			// Cache the trick cards and winner before animation starts
			setCachedTrickCards([...trickCards]);
			setCachedWinnerId(trickWinnerId);

			// Start animation sequence
			setAnimationPhase("waiting");
		}
	}, [trickCards, trickWinnerId, animationPhase]);

	// Handle waiting -> collecting transition
	useEffect(() => {
		if (animationPhase === "waiting") {
			const waitTimer = setTimeout(() => {
				setAnimationPhase("collecting");
			}, 1000);

			return () => clearTimeout(waitTimer);
		}
	}, [animationPhase]);

	// Handle collecting -> flipping transition
	useEffect(() => {
		if (animationPhase === "collecting") {
			const collectTimer = setTimeout(() => {
				setAnimationPhase("flipping");
			}, 500);

			return () => clearTimeout(collectTimer);
		}
	}, [animationPhase]);

	// Handle flipping animation
	useEffect(() => {
		if (animationPhase === "flipping") {
			let startTime: number | null = null;
			const duration = 400;

			const animateFlip = (timestamp: number) => {
				if (!startTime) startTime = timestamp;
				const elapsed = timestamp - startTime;
				const progress = Math.min(elapsed / duration, 1);
				setFlipProgress(progress);

				if (progress < 1) {
					requestAnimationFrame(animateFlip);
				} else {
					setAnimationPhase("toWinner");
				}
			};

			requestAnimationFrame(animateFlip);
		}
	}, [animationPhase]);

	// Handle toWinner -> reset transition
	useEffect(() => {
		if (animationPhase === "toWinner") {
			const toWinnerTimer = setTimeout(() => {
				// Reset animation state
				setAnimationPhase("playing");
				setCachedTrickCards([]);
				setCachedWinnerId(null);
				setFlipProgress(0);
				anglesRef.current.clear();
				animationInProgressRef.current = false;
			}, 600);

			return () => clearTimeout(toWinnerTimer);
		}
	}, [animationPhase]);

	// Reset animation when trick is cleared by server (only if not animating)
	useEffect(() => {
		if (
			trickCards.length === 0 &&
			animationPhase === "playing" &&
			!animationInProgressRef.current
		) {
			setCachedTrickCards([]);
			setCachedWinnerId(null);
			setFlipProgress(0);
		}
	}, [trickCards.length, animationPhase]);

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

	// Determine which cards to render based on animation phase
	const isAnimating = animationPhase !== "playing";
	const cardsToRender = isAnimating ? cachedTrickCards : trickCards;

	// Calculate winner position for animation
	const winnerPosition = cachedWinnerId
		? getRelativePosition(
				players.findIndex((p) => p.id === cachedWinnerId),
				currentPlayerIndex,
				players.length,
			)
		: "bottom";
	const winnerOffset = getWinnerOffset(winnerPosition);

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
					{/* All trick cards - with animation phases */}
					{cardsToRender.map((trickCard) => {
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
						const isThrowingCard =
							playedCard?.card.id === trickCard.card.id &&
							snapshot?.cardId === trickCard.card.id &&
							animationPhase === "playing";

						// Get stable angle for this card (synchronously generated if new)
						const storedAngle = getCardAngle(
							trickCard.card.id,
							trickCard.playerId,
						);
						const baseAngle = storedAngle + shortScreenOffset;

						// Position class based on player position (like in test drop-zone)
						const positionClass = cn(
							"origin-center!",
							position === "top" && "-translate-y-[30%]",
							position === "left" && "-translate-x-[30%]",
							position === "right" && "translate-x-[30%]",
							position === "bottom" && "translate-y-[30%]",
						);

						// Throwing animation (local player just played)
						if (isThrowingCard && snapshot) {
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
									className={positionClass}
									initial={snapshot.initial}
									key={trickCard.card.id}
								/>
							);
						}

						// End-of-trick animation phases
						if (isAnimating) {
							// Calculate animation properties based on phase
							let animateProps: {
								x: number;
								y: number;
								scale: number;
								rotate: number;
								opacity: number;
							};

							if (animationPhase === "waiting") {
								// Keep cards in their normal positions
								animateProps = {
									x: 0,
									y: 0,
									scale: 1,
									rotate: baseAngle,
									opacity: 1,
								};
							} else if (animationPhase === "collecting") {
								// Cards move to center
								animateProps = {
									x: 0,
									y: 0,
									scale: 0.9,
									rotate: 0,
									opacity: 1,
								};
							} else if (animationPhase === "toWinner") {
								animateProps = {
									x: winnerOffset.x,
									y: winnerOffset.y,
									scale: 0.5,
									rotate: 0,
									opacity: 0,
								};
							} else {
								// flipping phase
								animateProps = {
									x: 0,
									y: 0,
									scale: 0.9,
									rotate: 0,
									opacity: 1,
								};
							}

							return (
								<motion.div
									animate={animateProps}
									className="absolute"
									initial={
										animationPhase === "waiting"
											? { x: 0, y: 0, scale: 1, rotate: baseAngle, opacity: 1 }
											: false
									}
									key={trickCard.card.id}
									transition={
										animationPhase === "collecting"
											? { duration: 0.4, ease: "easeInOut" }
											: animationPhase === "toWinner"
												? { duration: 0.5, ease: "easeIn" }
												: { duration: 0.3 }
									}
								>
									<Card
										angle={0}
										card={trickCard.card}
										className={
											animationPhase === "waiting"
												? positionClass
												: "origin-center!"
										}
										flipProgress={
											animationPhase === "flipping" ||
											animationPhase === "toWinner"
												? flipProgress
												: 0
										}
									/>
								</motion.div>
							);
						}

						// Normal static card - use animate with rotation
						return (
							<Card
								angle={0}
								animate={{ rotate: baseAngle }}
								card={trickCard.card}
								className={positionClass}
								initial={{ rotate: baseAngle }}
								key={trickCard.card.id}
							/>
						);
					})}
				</div>
			)}

			{/* Drop-Zone Hinweis */}
			{trickCards.length === 0 &&
				!playedCard &&
				!isOver &&
				!isAnimating && (
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
