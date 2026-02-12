import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({
	className,
	...props
}: React.ComponentProps<"textarea">,
ref: React.ForwardedRef<HTMLTextAreaElement>,
) {
	return (
		<textarea
			className={cn(
				"border-input placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-input dark:bg-input/30",
				className,
			)}
			data-slot="textarea"
			ref={ref}
			{...props}
		/>
	);
}
const ForwardedTextarea = React.forwardRef(Textarea);
ForwardedTextarea.displayName = "Textarea";

export { ForwardedTextarea as Textarea };
