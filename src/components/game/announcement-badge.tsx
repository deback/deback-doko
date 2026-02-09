import { cn } from "@/lib/utils";

type BadgeVariant = "re" | "kontra" | "hochzeit" | "solo" | "points";

const VARIANT_STYLES: Record<BadgeVariant, string> = {
	re: "bg-emerald-500",
	kontra: "bg-rose-500",
	hochzeit: "bg-pink-500",
	solo: "bg-violet-500",
	points: "bg-amber-500",
};

interface AnnouncementBadgeProps {
	variant: BadgeVariant;
	label: string;
	className?: string;
}

export function AnnouncementBadge({
	variant,
	label,
	className,
}: AnnouncementBadgeProps) {
	const isPill = variant === "hochzeit" || variant === "solo";

	return (
		<span
			className={cn(
				"flex items-center justify-center rounded-full text-base font-bold text-white shadow-md",
				isPill ? "px-2 py-0.5 whitespace-nowrap" : "size-8 uppercase",
				VARIANT_STYLES[variant],
				className,
			)}
		>
			{label}
		</span>
	);
}
