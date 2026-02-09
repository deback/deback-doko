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
				"absolute z-10 inline-flex items-center gap-2 rounded-t-[1.2rem] bg-primary/40 px-2 py-2 backdrop-blur-sm",
				{
					"ring-4 ring-primary": isCurrentTurn,
				},
				{
					"bottom-0 left-1/2 -translate-x-1/2": position === "bottom",
				},
				{
					"right-0 top-1/2 rounded-b-[1.2rem] rounded-t-none -translate-y-1/2 translate-x-1/2 origin-[50%_0%] rotate-90 ":
						position === "right",
				},
				{
					"rounded-b-[1.2rem] rounded-t-none top-1/2 left-0 -translate-x-1/2 -rotate-90 origin-[50%_0%]":
						position === "left",
				},
				{
					"top-0 left-1/2 -translate-x-1/2 rounded-b-[1.2rem] rounded-t-none":
						position === "top",
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
			<span className="font-medium text-white lg:text-base text-sm pr-1">
				{player.name}
			</span>
		</div>
	);
}
