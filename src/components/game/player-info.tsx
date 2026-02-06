"use client";

import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { PointAnnouncementType } from "@/types/game";
import type { Player } from "@/types/tables";

interface PlayerAnnouncements {
	reOrKontra?: "re" | "kontra";
	pointAnnouncements?: PointAnnouncementType[];
}

interface PlayerInfoProps {
	player: Player;
	isCurrentTurn?: boolean;
	isCurrentPlayer?: boolean;
	score?: number;
	cardCount?: number;
	team?: "re" | "kontra";
	position: "top" | "bottom" | "left" | "right";
	announcements?: PlayerAnnouncements;
	className?: string;
}

// Labels für Punkt-Ansagen (kurz)
const POINT_ANNOUNCEMENT_LABELS: Record<string, string> = {
	no90: "K90",
	no60: "K60",
	no30: "K30",
	schwarz: "S",
};

export function PlayerInfo({
	player,
	isCurrentTurn = false,
	position,
	announcements,
	className,
}: PlayerInfoProps) {
	const isVertical = position === "left" || position === "right";

	// Bestimme ob Spieler Ansagen hat
	const hasAnnouncements =
		announcements?.reOrKontra ||
		(announcements?.pointAnnouncements &&
			announcements.pointAnnouncements.length > 0);

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
			<div className={cn("flex flex-col", isVertical && "items-center")}>
				<span className="font-medium text-white lg:text-base text-sm pr-1">
					{player.name}
				</span>
				{/* Ansagen-Badges */}
				{hasAnnouncements && (
					<div className="flex items-center gap-1 mt-0.5">
						{announcements?.reOrKontra && (
							<span
								className={cn(
									"px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
									announcements.reOrKontra === "re"
										? "bg-emerald-500 text-white"
										: "bg-rose-500 text-white",
								)}
							>
								{announcements.reOrKontra === "re" ? "Re" : "Ko"}
							</span>
						)}
						{announcements?.pointAnnouncements?.map((pa) => (
							<span
								className="px-1 py-0.5 rounded text-[10px] font-semibold bg-amber-500 text-white"
								key={pa}
							>
								{POINT_ANNOUNCEMENT_LABELS[pa] || pa}
							</span>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
