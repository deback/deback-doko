"use client";

import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Player } from "@/types/tables";

interface PlayerInfoProps {
	player: Player;
	isCurrentTurn?: boolean;
	position: "top" | "bottom" | "left" | "right";
	className?: string;
}

export function PlayerInfo({
	player,
	isCurrentTurn = false,
	position,
	className,
}: PlayerInfoProps) {
	return (
		<div
			className={cn(
				"absolute z-20 inline-flex items-center gap-2 text-balance rounded-t-[1.2rem] bg-primary/40 px-2 py-2 backdrop-blur-sm",
				{
					"ring-4 ring-primary": isCurrentTurn,
				},
				{
					"bottom-0 left-1/2 -translate-x-1/2": position === "bottom",
				},
				{
					"top-1/2 right-0 origin-[50%_0%] translate-x-1/2 rotate-90 rounded-t-none rounded-b-[1.2rem]":
						position === "right",
				},
				{
					"top-1/2 left-0 origin-[50%_0%] -translate-x-1/2 -rotate-90 rounded-t-none rounded-b-[1.2rem]":
						position === "left",
				},
				{
					"top-0 left-1/2 -translate-x-1/2 rounded-t-none rounded-b-[1.2rem]":
						position === "top",
				},
				className,
			)}
		>
			<Avatar
				alt={player.name}
				className={cn({
					"rotate-90": position === "left",
					"-rotate-90": position === "right",
				})}
				fallback={player.name.charAt(0).toUpperCase()}
				size="xs"
				src={player.image}
			/>
			<span className="max-w-32 truncate pr-1 font-medium text-sm text-white lg:text-base">
				{player.name}
			</span>
		</div>
	);
}
