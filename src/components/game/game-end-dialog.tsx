"use client";

import { animate, motion } from "framer-motion";
import { Dices } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { calculateBalanceChange, isSoloGame } from "@/lib/game/rules";
import { cn, formatBalance } from "@/lib/utils";
import type { GamePointsResult, GameState } from "@/types/game";
import type { Player } from "@/types/tables";

// =============================================================================
// Constants
// =============================================================================

const BAR_MARKS = [30, 60, 90, 120, 150, 180, 210, 240];
const WIN_LINE = 121;
const MAX_SCORE = 240;

// Animation timing
const INITIAL_DELAY = 500; // ms before bar starts
const BAR_DURATION = 3; // seconds for bar animation
const SUMMARY_DELAY = 600; // ms after bar completes

// Score thresholds at which game points appear (from winner's perspective)
const POINT_THRESHOLDS: Record<string, number> = {
	"Keine 120": 121,
	"Keine 90": 151,
	"Keine 60": 181,
	"Keine 30": 211,
	Schwarz: 240,
};

// =============================================================================
// Component
// =============================================================================

interface GameEndDialogProps {
	gameState: GameState;
	currentPlayer: Player | null;
	open: boolean;
	onClose: () => void;
}

export function GameEndDialog({
	gameState,
	currentPlayer,
	open,
	onClose,
}: GameEndDialogProps) {
	// Test data override
	const [testGpr, setTestGpr] = useState<GamePointsResult | null>(null);

	const gpr = testGpr ?? gameState.gamePointsResult;
	const myTeam = currentPlayer ? gameState.teams[currentPlayer.id] : undefined;
	const myCardPoints =
		myTeam === "re" ? (gpr?.reCardPoints ?? 0) : (gpr?.kontraCardPoints ?? 0);
	const iWon = myTeam === "re" ? gpr?.reWon : gpr?.kontraWon;

	const isSolo = gpr?.isSolo ?? isSoloGame(gameState.contractType, gameState.teams);

	const randomizeData = useCallback(() => {
		const reCardPoints = Math.floor(Math.random() * 241);
		const kontraCardPoints = 240 - reCardPoints;
		const reWon = reCardPoints >= 121;
		const kontraWon = !reWon;

		const possiblePoints: { label: string; team: "re" | "kontra" }[] = [];
		const winnerTeam = reWon ? "re" : "kontra";
		const loserCardPoints = reWon ? kontraCardPoints : reCardPoints;

		possiblePoints.push({ label: "Keine 120", team: winnerTeam });
		if (loserCardPoints < 90)
			possiblePoints.push({ label: "Keine 90", team: winnerTeam });
		if (loserCardPoints < 60)
			possiblePoints.push({ label: "Keine 60", team: winnerTeam });
		if (loserCardPoints < 30)
			possiblePoints.push({ label: "Keine 30", team: winnerTeam });

		// Randomly add extra points
		const extras: { label: string; team: "re" | "kontra" }[] = [
			{ label: "Re angesagt", team: reWon ? "re" : "kontra" },
			{ label: "Kontra angesagt", team: kontraWon ? "kontra" : "re" },
			{ label: "Fuchs gefangen", team: winnerTeam },
			{ label: "Karlchen", team: winnerTeam },
			{ label: "Doppelkopf", team: winnerTeam },
		];
		// Gegen die Alten: only when Kontra wins (7.2.3)
		if (kontraWon) {
			extras.push({ label: "Gegen die Alten", team: "kontra" });
		}
		for (const extra of extras) {
			if (Math.random() > 0.6) possiblePoints.push(extra);
		}

		const points = possiblePoints.map((p) => ({
			...p,
			value: p.label.includes("angesagt") ? 2 : 1,
		}));

		let totalRe = 0;
		let totalKontra = 0;
		for (const p of points) {
			if (p.team === "re") totalRe += p.value;
			else totalKontra += p.value;
		}

		setTestGpr({
			points,
			reWon,
			kontraWon,
			reCardPoints,
			kontraCardPoints,
			totalReGamePoints: totalRe,
			totalKontraGamePoints: totalKontra,
			netGamePoints: totalRe - totalKontra,
			isSolo: false,
		});
	}, []);

	// Animation state
	const [displayScore, setDisplayScore] = useState(0);
	const [visiblePoints, setVisiblePoints] = useState<Set<number>>(new Set());
	const [showSummary, setShowSummary] = useState(false);
	const [animationDone, setAnimationDone] = useState(false);
	const animationRef = useRef<{ stop: () => void } | null>(null);
	const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
	const revealedRef = useRef<Set<number>>(new Set());

	// Reset animation state when dialog opens or data changes
	useEffect(() => {
		if (!open) return;

		setDisplayScore(0);
		setVisiblePoints(new Set());
		setShowSummary(false);
		setAnimationDone(false);
		revealedRef.current = new Set();

		// Compute thresholds for each point
		// Threshold-based points only apply when the bar represents the winning team.
		// If the point is for the opponent, show it after the bar completes (null).
		const points = gpr?.points ?? [];
		const thresholds = points.map((point) => {
			const threshold = POINT_THRESHOLDS[point.label];
			if (threshold == null) return null;
			// Only use threshold if this point's team matches my team (bar = my score)
			return point.team === myTeam ? threshold : null;
		});

		const startTimer = setTimeout(() => {
			const controls = animate(0, myCardPoints, {
				duration: BAR_DURATION,
				ease: [0.25, 0.1, 0.25, 1],
				onUpdate: (v) => {
					const score = Math.round(v);
					setDisplayScore(score);

					// Reveal threshold-based points when bar crosses their value
					let changed = false;
					for (let i = 0; i < thresholds.length; i++) {
						const threshold = thresholds[i];
						if (
							threshold != null &&
							score >= threshold &&
							!revealedRef.current.has(i)
						) {
							revealedRef.current.add(i);
							changed = true;
						}
					}
					if (changed) {
						setVisiblePoints(new Set(revealedRef.current));
					}
				},
				onComplete: () => {
					// After bar completes, reveal non-threshold points immediately
					for (let i = 0; i < thresholds.length; i++) {
						if (thresholds[i] === null) {
							revealedRef.current.add(i);
						}
					}
					setVisiblePoints(new Set(revealedRef.current));

					// Show summary after a short delay
					const summaryTimer = setTimeout(() => {
						setShowSummary(true);
						setAnimationDone(true);
					}, SUMMARY_DELAY);
					timersRef.current.push(summaryTimer);
				},
			});
			animationRef.current = controls;
		}, INITIAL_DELAY);
		timersRef.current.push(startTimer);

		return () => {
			animationRef.current?.stop();
			for (const t of timersRef.current) clearTimeout(t);
			timersRef.current = [];
		};
	}, [open, myCardPoints, gpr?.points, myTeam]);

	// Skip animation on click
	const skipAnimation = useCallback(() => {
		if (animationDone) return;
		animationRef.current?.stop();
		for (const t of timersRef.current) clearTimeout(t);
		timersRef.current = [];
		setDisplayScore(myCardPoints);
		const allIndices = new Set((gpr?.points ?? []).map((_, i) => i));
		setVisiblePoints(allIndices);
		setShowSummary(true);
		setAnimationDone(true);
	}, [animationDone, myCardPoints, gpr?.points]);

	// Compute net points and money
	const baseNetPoints = gpr
		? myTeam === "re"
			? gpr.netGamePoints
			: -gpr.netGamePoints
		: 0;
	// Solo: Solist sieht dreifache Punkte, Gegner einfache
	const myNetPoints =
		isSolo && myTeam === "re" ? baseNetPoints * 3 : baseNetPoints;
	const myAmount =
		gpr && myTeam
			? calculateBalanceChange(gpr.netGamePoints, myTeam, isSolo)
			: 0;

	// During animation: primary color. After: green (won) or red (lost)
	const barColor = animationDone
		? iWon
			? "bg-emerald-500"
			: "bg-red-500"
		: "bg-primary";
	const barGlow = animationDone
		? iWon
			? "shadow-[0_0_12px_rgba(16,185,129,0.4)]"
			: "shadow-[0_0_12px_rgba(239,68,68,0.4)]"
		: "";

	return (
		<Dialog onOpenChange={(o) => !o && onClose()} open={open}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
				<Button
					className="absolute top-2 left-2 z-10 size-8"
					onClick={randomizeData}
					size="icon"
					title="Zufällige Testdaten"
					variant="ghost"
				>
					<Dices className="size-4" />
				</Button>
				<DialogHeader>
					<DialogTitle className="text-center font-serif text-2xl">
						Spiel beendet!
					</DialogTitle>
				</DialogHeader>

				{/* biome-ignore lint/a11y/useKeyWithClickEvents: skip animation shortcut */}
				{/* biome-ignore lint/a11y/noStaticElementInteractions: skip animation shortcut */}
				<div className="flex gap-4" onClick={skipAnimation}>
					{/* Left: Score Bar */}
					<div className="flex shrink-0 flex-col items-center">
						<ScoreBar
							animationDone={animationDone}
							barColor={barColor}
							barGlow={barGlow}
							displayScore={displayScore}
							iWon={!!iWon}
						/>
					</div>

					{/* Right: Game Points + Summary */}
					<div className="min-w-0 flex-1 space-y-3">
						{/* Team Overview (compact) - win/loss hidden until animation done */}
						<div className="flex gap-2 text-xs">
							<div
								className={cn(
									"min-w-0 flex-1 rounded-md px-2 py-1.5 transition-colors duration-500",
									animationDone && gpr?.reWon
										? "bg-emerald-500/20"
										: "bg-muted",
								)}
							>
								<span
									className={cn(
										"font-bold transition-colors duration-500",
										animationDone && gpr?.reWon && "text-emerald-600",
									)}
								>
									Re {animationDone && gpr?.reWon && "\u{1F3C6}"}
								</span>
								<span className="ml-1 font-bold">
									{animationDone ? (gpr?.reCardPoints ?? 0) : "?"}
								</span>
								<div className="text-muted-foreground">
									{gameState.players
										.filter((p) => gameState.teams[p.id] === "re")
										.map((p) => (
											<div key={p.id} className="truncate">
												{p.name}
											</div>
										))}
								</div>
							</div>
							<div
								className={cn(
									"min-w-0 flex-1 rounded-md px-2 py-1.5 transition-colors duration-500",
									animationDone && gpr?.kontraWon
										? "bg-emerald-500/20"
										: "bg-muted",
								)}
							>
								<span
									className={cn(
										"font-bold transition-colors duration-500",
										animationDone && gpr?.kontraWon && "text-emerald-600",
									)}
								>
									Kontra {animationDone && gpr?.kontraWon && "\u{1F3C6}"}
								</span>
								<span className="ml-1 font-bold">
									{animationDone ? (gpr?.kontraCardPoints ?? 0) : "?"}
								</span>
								<div className="text-muted-foreground">
									{gameState.players
										.filter((p) => gameState.teams[p.id] === "kontra")
										.map((p) => (
											<div key={p.id} className="truncate">
												{p.name}
											</div>
										))}
								</div>
							</div>
						</div>

						{/* Game Points List */}
						{gpr && gpr.points.length > 0 && (
							<div className="space-y-1">
								<h4 className="font-semibold text-sm">Spielpunkte</h4>
								<div className="space-y-0.5 rounded-lg border p-2">
									{gpr.points.map(
										(
											point: {
												label: string;
												team: "re" | "kontra";
												value: number;
											},
											idx: number,
										) => {
											const isVisible = visiblePoints.has(idx);
											const isMyPoint = point.team === myTeam;
											return (
												<motion.div
													animate={
														isVisible
															? {
																	opacity: 1,
																	x: 0,
																}
															: {
																	opacity: 0,
																	x: -10,
																}
													}
													className="flex items-center justify-between text-sm"
													initial={{
														opacity: 0,
														x: -10,
													}}
													key={`${point.label}-${point.team}-${idx}`}
													transition={{
														duration: 0.3,
													}}
												>
													<span className="text-muted-foreground">
														{point.label}
													</span>
													<span
														className={cn(
															"font-medium font-mono",
															isMyPoint ? "text-emerald-600" : "text-red-500",
														)}
													>
														{isMyPoint ? "+" : "\u2212"}
														{point.value}
													</span>
												</motion.div>
											);
										},
									)}

									{/* Gesamt */}
									<motion.div
										animate={showSummary ? { opacity: 1 } : { opacity: 0 }}
										className="mt-1 flex items-center justify-between border-t pt-2 font-bold text-sm"
										initial={{ opacity: 0 }}
										transition={{ duration: 0.4 }}
									>
										<span>Gesamt</span>
										<span>
											{isSolo && myTeam === "re" && (
												<span className="font-normal text-muted-foreground">
													({Math.abs(baseNetPoints)}{" "}
													{Math.abs(baseNetPoints) === 1
														? "Punkt"
														: "Punkte"}{" "}
													× 3){" "}
												</span>
											)}
											{myNetPoints > 0 ? "+" : ""}
											{myNetPoints}{" "}
											{Math.abs(myNetPoints) === 1 ? "Punkt" : "Punkte"}
										</span>
									</motion.div>
								</div>
							</div>
						)}

						{/* Abrechnung */}
						{gpr && currentPlayer && (
							<motion.div
								animate={
									showSummary ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }
								}
								className="space-y-1"
								initial={{ opacity: 0, y: 10 }}
								transition={{ duration: 0.4, delay: 0.2 }}
							>
								<div className="rounded-lg border p-2">
									<div className="flex items-center justify-between text-sm">
										<span>{currentPlayer.name}</span>
										<span
											className={cn(
												"font-bold font-mono",
												myAmount > 0
													? "text-emerald-600"
													: myAmount < 0
														? "text-red-500"
														: "",
											)}
										>
											{myAmount > 0 ? "+" : ""}
											{formatBalance(myAmount)}
										</span>
									</div>
								</div>
							</motion.div>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

// =============================================================================
// Score Bar
// =============================================================================

function ScoreBar({
	displayScore,
	barColor,
	barGlow,
	iWon,
	animationDone,
}: {
	displayScore: number;
	barColor: string;
	barGlow: string;
	iWon: boolean;
	animationDone: boolean;
}) {
	const barHeight = 280; // px
	const fillPercent = Math.min(displayScore / MAX_SCORE, 1);
	const fillHeight = fillPercent * barHeight;

	return (
		<div className="relative flex items-end" style={{ height: barHeight }}>
			{/* Marks on the left */}
			<div
				className="relative mr-1 w-8 text-right"
				style={{ height: barHeight }}
			>
				{BAR_MARKS.map((mark) => {
					const y = barHeight - (mark / MAX_SCORE) * barHeight;
					const isReached = displayScore >= mark;
					const isWinLine = mark === 120; // show 120 mark, actual win is 121
					return (
						<div
							className="absolute right-0 flex items-center"
							key={mark}
							style={{ top: y, transform: "translateY(-50%)" }}
						>
							<span
								className={cn(
									"font-mono text-[10px] transition-colors duration-300",
									isReached
										? animationDone
											? iWon
												? "font-bold text-emerald-600"
												: "font-bold text-red-500"
											: "font-bold text-primary"
										: "text-muted-foreground",
									isWinLine && "font-bold",
								)}
							>
								{mark}
							</span>
						</div>
					);
				})}
			</div>

			{/* Bar container */}
			<div
				className="relative w-12 overflow-hidden rounded-md border bg-muted"
				style={{ height: barHeight }}
			>
				{/* Tick marks */}
				{BAR_MARKS.map((mark) => {
					const y = barHeight - (mark / MAX_SCORE) * barHeight;
					return (
						<div
							className={cn(
								"absolute right-0 left-0 border-t",
								mark === 120
									? "border-foreground/40 border-dashed"
									: "border-muted-foreground/20",
							)}
							key={mark}
							style={{ top: y }}
						/>
					);
				})}

				{/* Win line (121) */}
				<div
					className="absolute right-0 left-0 border-yellow-500 border-t-2 border-dashed"
					style={{
						top: barHeight - (WIN_LINE / MAX_SCORE) * barHeight,
					}}
				/>

				{/* Filled bar */}
				<div
					className={cn(
						"absolute right-0 bottom-0 left-0 transition-none",
						barColor,
						fillHeight > 0 && barGlow,
					)}
					style={{ height: fillHeight }}
				/>

				{/* Score number overlay */}
				{displayScore > 0 && (
					<div
						className="absolute right-0 left-0 -mt-1.5 flex items-center justify-center pb-1 font-mono"
						style={{
							top: Math.max(barHeight - fillHeight - 14, 0),
						}}
					>
						<span className="font-bold font-mono text-xs">{displayScore}</span>
					</div>
				)}
			</div>
		</div>
	);
}
