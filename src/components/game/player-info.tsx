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
				"absolute z-10 inline-flex items-center gap-2 rounded-t-[1.2rem] bg-primary/40 px-2 py-2 backdrop-blur-sm",
				{
					"ring-4 ring-primary": isCurrentTurn,
				},
				{
					"rounded-b-[1.2rem] rounded-t-none top-1/2 left-0 -translate-x-1/2 -rotate-90 origin-[50%_0%]":
						position === "left",
				},

				className,
			)}
		>
			<Avatar
				alt={player.name}
				fallback={player.name.charAt(0).toUpperCase()}
				size="xs"
				src={player.image}
			/>
			<div className={cn("flex flex-col", isVertical && "items-center")}>
				<span className="font-medium text-white text-sm pr-1">
					{player.name}
				</span>
			</div>
		</div>
	);
}
