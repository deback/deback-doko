import { Star, StarHalf } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
	rating: number;
	size?: "sm" | "default";
	className?: string;
}

export function StarRating({ rating, size = "default", className }: StarRatingProps) {
	const stars = [];
	const sizeClass = size === "sm" ? "size-4" : "size-5";

	for (let i = 1; i <= 5; i++) {
		if (rating >= i) {
			// Full star
			stars.push(
				<Star
					key={i}
					className={cn(sizeClass, "fill-yellow-600 text-yellow-600")}
				/>,
			);
		} else if (rating >= i - 0.5) {
			// Half star - show outline star as background and filled star clipped to half
			stars.push(
				<div key={i} className={cn("relative", sizeClass)}>
					<Star className={cn("absolute", sizeClass, "text-muted-foreground/20 fill-muted-foreground/10")} />
					<div className={cn("absolute overflow-hidden", sizeClass)} style={{ clipPath: "inset(0 50% 0 0)" }}>
						<Star className={cn(sizeClass, "fill-yellow-600 text-yellow-600")} />
					</div>
				</div>,
			);
		} else {
			// Empty star
			stars.push(
				<Star key={i} className={cn(sizeClass, "text-muted-foreground/20 fill-muted-foreground/10")} />,
			);
		}
	}

	return <div className={cn("flex items-center gap-0.5", className)}>{stars}</div>;
}
