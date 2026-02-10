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
import { cn } from "@/lib/utils";
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
const POINT_DELAY = 400; // ms between each game point appearing
const SUMMARY_DELAY = 600; // ms after last point before summary

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

	const isSolo =
		gameState.contractType !== "normal" &&
		gameState.contractType !== "hochzeit";

	const randomizeData = useCallback(() => {
		const reCardPoints = Math.floor(Math.random() * 241);
		const kontraCardPoints = 240 - reCardPoints;
		const reWon = reCardPoints >= 121;
		const kontraWon = !reWon;

		const possiblePoints: { label: string; team: "re" | "kontra" }[] = [];
		const winnerTeam = reWon ? "re" : "kontra";
		const loserCardPoints = reWon ? kontraCardPoints : reCardPoints;

		possiblePoints.push({ label: "Gewonnen", team: winnerTeam });
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
			{ label: "Gegen die Alten", team: "kontra" },
			{ label: "Fuchs gefangen", team: winnerTeam },
			{ label: "Karlchen", team: winnerTeam },
			{ label: "Doppelkopf", team: winnerTeam },
		];
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
		});
	}, []);

	// Animation state
	const [displayScore, setDisplayScore] = useState(0);
	const [visiblePointCount, setVisiblePointCount] = useState(0);
	const [showSummary, setShowSummary] = useState(false);
	const [animationDone, setAnimationDone] = useState(false);
	const animationRef = useRef<{ stop: () => void } | null>(null);
	const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

	// Reset animation state when dialog opens
	useEffect(() => {
		if (!open) return;

		setDisplayScore(0);
		setVisiblePointCount(0);
		setShowSummary(false);
		setAnimationDone(false);

		const startTimer = setTimeout(() => {
			// Animate bar from 0 to myCardPoints
			const controls = animate(0, myCardPoints, {
				duration: BAR_DURATION,
				ease: [0.25, 0.1, 0.25, 1],
				onUpdate: (v) => setDisplayScore(Math.round(v)),
				onComplete: () => {
					// After bar completes, show game points sequentially
					const points = gpr?.points ?? [];
					for (let i = 0; i < points.length; i++) {
						const timer = setTimeout(() => {
							setVisiblePointCount(i + 1);
						}, i * POINT_DELAY);
						timersRef.current.push(timer);
					}

					// Show summary after all points
					const summaryTimer = setTimeout(
						() => {
							setShowSummary(true);
							setAnimationDone(true);
						},
						points.length * POINT_DELAY + SUMMARY_DELAY,
					);
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
	}, [open, myCardPoints, gpr?.points]);

	// Skip animation on click
	const skipAnimation = useCallback(() => {
		if (animationDone) return;
		animationRef.current?.stop();
		for (const t of timersRef.current) clearTimeout(t);
		timersRef.current = [];
		setDisplayScore(myCardPoints);
		setVisiblePointCount(gpr?.points.length ?? 0);
		setShowSummary(true);
		setAnimationDone(true);
	}, [animationDone, myCardPoints, gpr?.points.length]);

	// Compute net points and money
	const myNetPoints = gpr
		? myTeam === "re"
			? gpr.netGamePoints
			: -gpr.netGamePoints
		: 0;
	const absGamePoints = Math.abs(gpr?.netGamePoints ?? 0);
	const pointsPerPlayer = absGamePoints * 50; // Cents

	let myAmount = 0;
	if (gpr && myTeam) {
		if (isSolo && myTeam === "re") {
			myAmount = (gpr.netGamePoints > 0 ? 1 : -1) * pointsPerPlayer * 3;
		} else if (isSolo && myTeam === "kontra") {
			myAmount = (gpr.netGamePoints < 0 ? 1 : -1) * pointsPerPlayer;
		} else {
			const teamWins =
				(myTeam === "re" && gpr.netGamePoints > 0) ||
				(myTeam === "kontra" && gpr.netGamePoints < 0);
			myAmount = teamWins ? pointsPerPlayer : -pointsPerPlayer;
		}
	}

	const barColor = iWon ? "bg-emerald-500" : "bg-red-500";
	const barGlow = iWon
		? "shadow-[0_0_12px_rgba(16,185,129,0.4)]"
		: "shadow-[0_0_12px_rgba(239,68,68,0.4)]";

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
					<DialogTitle className="text-center text-2xl text-emerald-600">
						Spiel beendet!
					</DialogTitle>
				</DialogHeader>

				{/* biome-ignore lint/a11y/useKeyWithClickEvents: skip animation shortcut */}
				{/* biome-ignore lint/a11y/noStaticElementInteractions: skip animation shortcut */}
				<div className="flex gap-4" onClick={skipAnimation}>
					{/* Left: Score Bar */}
					<div className="flex shrink-0 flex-col items-center">
						<ScoreBar
							barColor={barColor}
							barGlow={barGlow}
							displayScore={displayScore}
							iWon={!!iWon}
							targetScore={myCardPoints}
						/>
					</div>

					{/* Right: Game Points + Summary */}
					<div className="min-w-0 flex-1 space-y-3">
						{/* Team Overview (compact) */}
						<div className="flex gap-2 text-xs">
							<div
								className={cn(
									"flex-1 rounded-md px-2 py-1.5",
									gpr?.reWon ? "bg-emerald-500/20" : "bg-muted",
								)}
							>
								<span
									className={cn("font-bold", gpr?.reWon && "text-emerald-600")}
								>
									Re {gpr?.reWon && "\u{1F3C6}"}
								</span>
								<span className="ml-1 font-bold">{gpr?.reCardPoints ?? 0}</span>
								<div className="text-muted-foreground">
									{gameState.players
										.filter((p) => gameState.teams[p.id] === "re")
										.map((p) => p.name)
										.join(", ")}
								</div>
							</div>
							<div
								className={cn(
									"flex-1 rounded-md px-2 py-1.5",
									gpr?.kontraWon ? "bg-emerald-500/20" : "bg-muted",
								)}
							>
								<span
									className={cn(
										"font-bold",
										gpr?.kontraWon && "text-emerald-600",
									)}
								>
									Kontra {gpr?.kontraWon && "\u{1F3C6}"}
								</span>
								<span className="ml-1 font-bold">
									{gpr?.kontraCardPoints ?? 0}
								</span>
								<div className="text-muted-foreground">
									{gameState.players
										.filter((p) => gameState.teams[p.id] === "kontra")
										.map((p) => p.name)
										.join(", ")}
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
											const isVisible = idx < visiblePointCount;
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
															"font-medium",
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
										className="mt-1 flex items-center justify-between border-t pt-1 font-bold text-sm"
										initial={{ opacity: 0 }}
										transition={{ duration: 0.4 }}
									>
										<span>Gesamt</span>
										<span
											className={cn(
												myNetPoints > 0
													? "text-emerald-600"
													: myNetPoints < 0
														? "text-red-500"
														: "",
											)}
										>
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
								<h4 className="font-semibold text-sm">
									Abrechnung (je Spielpunkt 0,50$)
								</h4>
								<div className="rounded-lg border p-2">
									<div className="flex items-center justify-between text-sm">
										<span>{currentPlayer.name}</span>
										<span
											className={cn(
												"font-bold",
												myAmount > 0
													? "text-emerald-600"
													: myAmount < 0
														? "text-red-500"
														: "",
											)}
										>
											{myAmount > 0 ? "+" : ""}
											{(myAmount / 100).toFixed(2).replace(".", ",")}$
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
	targetScore,
	barColor,
	barGlow,
	iWon,
}: {
	displayScore: number;
	targetScore: number;
	barColor: string;
	barGlow: string;
	iWon: boolean;
}) {
	const barHeight = 280; // px
	const fillPercent = Math.min(displayScore / MAX_SCORE, 1);
	const fillHeight = fillPercent * barHeight;

	// Target score position for the number label
	const targetPercent = Math.min(targetScore / MAX_SCORE, 1);
	const targetY = barHeight - targetPercent * barHeight;

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
										? iWon
											? "font-bold text-emerald-600"
											: "font-bold text-red-500"
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
						className="absolute right-0 left-0 flex items-center justify-center"
						style={{
							top: Math.max(barHeight - fillHeight - 14, 0),
						}}
					>
						<span className="font-bold font-mono text-xs">{displayScore}</span>
					</div>
				)}
			</div>

			{/* Target score label on the right */}
			<div className="relative ml-1" style={{ height: barHeight }}>
				{displayScore >= targetScore && targetScore > 0 && (
					<div
						className="absolute flex items-center"
						style={{
							top: targetY,
							transform: "translateY(-50%)",
						}}
					>
						<span className="whitespace-nowrap text-[10px] text-muted-foreground">
							{targetScore} Augen
						</span>
					</div>
				)}
			</div>
		</div>
	);
}
