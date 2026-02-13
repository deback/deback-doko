"use client";

import { SidebarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/ui-store";

export default function SidebarToggleButton() {
	const { toggleRightSidebar } = useUIStore();

	return (
		<Button onClick={toggleRightSidebar} size="icon" variant="outline">
			<SidebarIcon />
		</Button>
	);
}
