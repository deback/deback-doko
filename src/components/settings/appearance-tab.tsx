"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const themeOptions = [
	{ value: "light", label: "Hell", icon: Sun },
	{ value: "dark", label: "Dunkel", icon: Moon },
	{ value: "system", label: "System", icon: Laptop },
] as const;

interface AppearanceTabProps {
	extension?: ReactNode;
}

export function AppearanceTab({ extension }: AppearanceTabProps) {
	const { setTheme, theme } = useTheme();

	return (
		<div className="flex flex-col gap-2">
			<p className="text-muted-foreground text-sm">Erscheinungsbild</p>
			<div className="grid grid-cols-3 gap-2">
				{themeOptions.map((option) => {
					const Icon = option.icon;
					const isActive = theme === option.value;

					return (
						<button
							className={cn(
								"flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors",
								isActive
									? "border-primary bg-primary/10 text-primary"
									: "border-border hover:border-primary/50",
							)}
							key={option.value}
							onClick={() => setTheme(option.value)}
							type="button"
						>
							<Icon className="size-6" />
							<span className="text-sm">{option.label}</span>
						</button>
					);
				})}
			</div>
			{extension}
		</div>
	);
}
