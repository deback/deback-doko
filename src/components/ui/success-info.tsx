import { CircleCheck } from "lucide-react";

export function SuccessInfo({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex items-start gap-3 rounded-lg border border-emerald-600 bg-emerald-100 dark:border-emerald-400 dark:bg-emerald-900 p-4">
			<CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
			<p className="text-sm">{children}</p>
		</div>
	);
}
