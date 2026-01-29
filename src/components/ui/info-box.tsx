import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type InfoVariant = "info" |"success" | "warning" | "error";

interface InfoBoxProps {
	children: React.ReactNode;
	variant?: InfoVariant;
}

const variantStyles: Record<
	InfoVariant,
	{ container: string; icon: string; Icon: typeof CircleCheck }
> = {
	success: {
		container:
			"border-emerald-600 bg-emerald-100 dark:border-emerald-400 dark:bg-emerald-900",
		icon: "text-emerald-600 dark:text-emerald-400",
		Icon: CircleCheck,
	},
	warning: {
		container:
			"border-amber-600 bg-amber-100 dark:border-amber-400 dark:bg-amber-900",
		icon: "text-amber-600 dark:text-amber-400",
		Icon: TriangleAlert,
	},
	error: {
		container: "border-red-600 bg-red-100 dark:border-red-400 dark:bg-red-900",
		icon: "text-red-600 dark:text-red-400",
		Icon: CircleAlert,
	},
	info: {
		container: "border bg-background ",
		icon: "text-foreground",
		Icon: Info,
	},
};

export function InfoBox({ children, variant = "success" }: InfoBoxProps) {
	const styles = variantStyles[variant];
	const Icon = styles.Icon;

	return (
		<div
			className={cn(
				"flex items-center gap-3 rounded-lg border p-4",
				styles.container,
			)}
		>
			<Icon className={cn("size-5 shrink-0", styles.icon)} />
			<p className="text-sm">{children}</p>
		</div>
	);
}
