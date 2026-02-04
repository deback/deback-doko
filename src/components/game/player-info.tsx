"use client";

import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Player } from "@/types/tables";

interface PlayerInfoProps {
	player: Player;
	isCurrentTurn?: boolean;
	isCurrentPlayer?: boolean;
	score?: number;
	cardCount?: number;
	team?: "re" | "kontra";
	position: "top" | "bottom" | "left" | "right";
	className?: string;
}

export function PlayerInfo({
	player,
	isCurrentTurn = false,
	isCurrentPlayer = false,
	score = 0,
	cardCount,
	team,
	position,
	className,
}: PlayerInfoProps) {
	const isVertical = position === "left" || position === "right";

	return (
		<div
			className={cn(
				"flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-sm",
				isCurrentTurn &&
					"ring-2 ring-emerald-400 ring-offset-2 ring-offset-transparent",
				isVertical && "flex-col px-2 py-3",
				className,
			)}
		>
			<Avatar
				alt={player.name}
				fallback={player.name.charAt(0).toUpperCase()}
				size="sm"
				src={player.image}
			/>
			<div className={cn("flex flex-col", isVertical && "items-center")}>
				<span className="font-medium text-sm text-white">
					{player.name}
					{isCurrentPlayer && " (Du)"}
				</span>
				<div className="flex items-center gap-2 text-white/70 text-xs">
					<span>{score} Pkt.</span>
					{cardCount !== undefined && (
						<span className="text-white/50">{cardCount} Karten</span>
					)}
				</div>
			</div>
			{team && (
				<span
					className={cn(
						"rounded-full px-2 py-0.5 font-bold text-xs",
						team === "re"
							? "bg-cyan-500/80 text-white"
							: "bg-orange-500/80 text-white",
					)}
				>
					{team === "re" ? "Re" : "Ko"}
				</span>
			)}
		</div>
	);
}
