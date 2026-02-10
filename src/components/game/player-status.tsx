"use client";

import {
	getContractLabels,
	getContractTooltips,
	POINT_ANNOUNCEMENT_LABELS,
	POINT_ANNOUNCEMENT_TOOLTIPS,
} from "@/lib/game/labels";
import { useCardDesign } from "@/lib/hooks/use-card-design";
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
	const { cardDesign } = useCardDesign();
	const contractLabels = getContractLabels(cardDesign);
	const contractTooltips = getContractTooltips(cardDesign);
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
				"absolute top-0 left-1/2 flex -translate-x-1/2 -translate-y-full items-center gap-1.5 p-2",
				(position === "top" || position === "right") && "flex-row-reverse",
				className,
			)}
		>
			{hasContract && (
				<AnnouncementBadge
					label={contractLabels[declaredContract] ?? declaredContract}
					position={position}
					tooltip={contractTooltips[declaredContract]}
					variant={declaredContract === "hochzeit" ? "hochzeit" : "solo"}
				/>
			)}

			{hasReOrKontra && (
				<AnnouncementBadge
					label={announcements?.reOrKontra === "re" ? "RE" : "Ko"}
					position={position}
					tooltip={announcements?.reOrKontra === "re" ? "Re" : "Kontra"}
					variant={announcements?.reOrKontra === "re" ? "re" : "kontra"}
				/>
			)}

			{announcements?.pointAnnouncements?.map((pa) => (
				<AnnouncementBadge
					key={pa}
					label={POINT_ANNOUNCEMENT_LABELS[pa]}
					position={position}
					tooltip={POINT_ANNOUNCEMENT_TOOLTIPS[pa]}
					variant={pa === "schwarz" ? "schwarz" : "points"}
				/>
			))}
		</div>
	);
}
