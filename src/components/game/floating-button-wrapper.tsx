"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type FloatingButtonWrapperProps = HTMLAttributes<HTMLDivElement>;

export const FloatingButtonWrapper = forwardRef<
	HTMLDivElement,
	FloatingButtonWrapperProps
>(function FloatingButtonWrapper({ children, className, ...props }, ref) {
	return (
		<div
			className={cn(
				"flex items-center justify-center rounded bg-background shadow-sm",
				className,
			)}
			ref={ref}
			{...props}
		>
			{children}
		</div>
	);
});
