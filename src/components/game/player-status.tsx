"use client";

import { CONTRACT_LABELS, POINT_ANNOUNCEMENT_LABELS } from "@/lib/game/labels";
import { cn } from "@/lib/utils";
import type { ContractType, PointAnnouncementType } from "@/types/game";

interface PlayerStatusProps {
	position: "top" | "bottom" | "left" | "right";
	/** Contract declared by this player (solo or hochzeit) */
	declaredContract?: ContractType;
	/** Announcement info for this player */
	announcements?: {
		reOrKontra?: "re" | "kontra";
		pointAnnouncements?: PointAnnouncementType[];
	};
	className?: string;
}

export function PlayerStatus({
	position,
	declaredContract,
	announcements,
	className,
}: PlayerStatusProps) {
	const hasContract = declaredContract && declaredContract !== "normal";
	const hasReOrKontra = !!announcements?.reOrKontra;
	const hasPointAnnouncements =
		announcements?.pointAnnouncements &&
		announcements.pointAnnouncements.length > 0;

	if (!hasContract && !hasReOrKontra && !hasPointAnnouncements) {
		return null;
	}

	const isVertical = position === "left" || position === "right";

	return (
		<div
			className={cn(
				"flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 backdrop-blur-sm",
				isVertical && "flex-col px-1 py-2",
				className,
			)}
		>
			{/* Contract badge */}
			{hasContract && (
				<span
					className={cn(
						"rounded px-1.5 py-0.5 text-[10px] font-bold text-white whitespace-nowrap",
						declaredContract === "hochzeit" ? "bg-pink-500" : "bg-violet-500",
					)}
				>
					{CONTRACT_LABELS[declaredContract]}
				</span>
			)}

			{/* Re/Kontra badge */}
			{hasReOrKontra && (
				<span
					className={cn(
						"rounded px-1.5 py-0.5 text-[10px] font-bold uppercase text-white",
						announcements?.reOrKontra === "re"
							? "bg-emerald-500"
							: "bg-rose-500",
					)}
				>
					{announcements?.reOrKontra === "re" ? "Re" : "Ko"}
				</span>
			)}

			{/* Point announcement badges */}
			{announcements?.pointAnnouncements?.map((pa) => (
				<span
					className="rounded bg-amber-500 px-1 py-0.5 text-[10px] font-semibold text-white"
					key={pa}
				>
					{POINT_ANNOUNCEMENT_LABELS[pa]}
				</span>
			))}
		</div>
	);
}
