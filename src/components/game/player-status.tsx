"use client";

import { CONTRACT_LABELS, POINT_ANNOUNCEMENT_LABELS } from "@/lib/game/labels";
import { cn } from "@/lib/utils";
import type { ContractType, PointAnnouncementType } from "@/types/game";
import { AnnouncementBadge } from "./announcement-badge";

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

	return (
		<div
			className={cn(
				"absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full flex items-center gap-1.5",
				className,
			)}
		>
			{hasContract && (
				<AnnouncementBadge
					label={CONTRACT_LABELS[declaredContract] ?? declaredContract}
					position={position}
					variant={declaredContract === "hochzeit" ? "hochzeit" : "solo"}
				/>
			)}

			{hasReOrKontra && (
				<AnnouncementBadge
					label={announcements?.reOrKontra === "re" ? "Re" : "Ko"}
					position={position}
					variant={announcements?.reOrKontra === "re" ? "re" : "kontra"}
				/>
			)}

			{announcements?.pointAnnouncements?.map((pa) => (
				<AnnouncementBadge
					key={pa}
					label={POINT_ANNOUNCEMENT_LABELS[pa]}
					position={position}
					variant="points"
				/>
			))}
		</div>
	);
}
