"use client";

import { Table2, User, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Navigation() {
	const pathname = usePathname();

	const navItems = [
		{
			href: "/tables",
			icon: Table2,
			label: "Tische",
		},
		{
			href: "/players",
			icon: Users,
			label: "Spieler",
		},
		{
			href: "/profile/me",
			icon: User,
			label: "Profil",
		},
	];

	return (
		<nav className="fixed right-0 bottom-0 left-0 z-50 border-t bg-background">
			<div className="mx-auto flex max-w-3xl items-center justify-around px-4 py-2">
				{navItems.map((item) => {
					const isActive = pathname === item.href;
					const Icon = item.icon;

					return (
						<Link
							aria-label={item.label}
							className={cn(
								"flex flex-col items-center gap-1 rounded-lg px-4 py-2 transition-colors",
								isActive
									? "text-primary"
									: "text-muted-foreground hover:text-foreground",
							)}
							href={item.href}
							key={item.href}
						>
							<Icon className="size-6" />
							<span className="text-xs">{item.label}</span>
						</Link>
					);
				})}
			</div>
		</nav>
	);
}
