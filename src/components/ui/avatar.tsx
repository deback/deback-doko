import Image from "next/image";
import { cn } from "@/lib/utils";

interface AvatarProps {
	src?: string | null;
	alt: string;
	fallback: string;
	size?: "sm" | "md" | "lg";
	className?: string;
}

const sizeMap = {
	sm: { container: "size-8", text: "text-sm", image: 32 },
	md: { container: "size-10", text: "text-base", image: 40 },
	lg: { container: "size-12", text: "text-lg", image: 48 },
};

export function Avatar({
	src,
	alt,
	fallback,
	size = "md",
	className,
}: AvatarProps) {
	const sizes = sizeMap[size];

	if (src) {
		return (
			<Image
				src={src}
				alt={alt}
				width={sizes.image}
				height={sizes.image}
				className={cn(
					"rounded-full object-cover",
					sizes.container,
					className,
				)}
			/>
		);
	}

	return (
		<div
			className={cn(
				"flex items-center justify-center rounded-full bg-muted font-semibold",
				sizes.container,
				sizes.text,
				className,
			)}
		>
			{fallback}
		</div>
	);
}
