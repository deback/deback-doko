"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function ModeToggle() {
	const { setTheme, theme } = useTheme();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button size="icon" variant="outline">
					<Sun
						className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
						size={20}
					/>
					<Moon
						className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
						size={20}
					/>
					<span className="sr-only">Toggle theme</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				onCloseAutoFocus={(e) => e.preventDefault()}
			>
				<DropdownMenuItem
					className={cn({ "text-primary": theme === "light" })}
					onClick={() => setTheme("light")}
				>
					<Sun className="text-inherit" />
					<span>Light</span>
				</DropdownMenuItem>
				<DropdownMenuItem
					className={cn({ "text-primary": theme === "dark" })}
					onClick={() => setTheme("dark")}
				>
					<Moon className="text-inherit" />
					<span>Dark</span>
				</DropdownMenuItem>
				<DropdownMenuItem
					className={cn({ "text-primary": theme === "system" })}
					onClick={() => setTheme("system")}
				>
					<Laptop className="text-inherit" />
					<span>System</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
