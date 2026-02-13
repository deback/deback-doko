"use client";

import { SidebarIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function RightSidebar() {
	const [open, setOpen] = useState(false);
	return (
		<div
			className={cn("w-72 bg-sidebar", {
				"translate-x-0": open,
				"-translate-x-full": !open,
			})}
		>
			<Button
				className="absolute top-2 right-2 z-10"
				onClick={() => setOpen(!open)}
				size="icon"
				variant="outline"
			>
				<SidebarIcon />
			</Button>
		</div>
	);
}
