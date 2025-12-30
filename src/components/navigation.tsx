"use client";

import { Home, Table2, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Navigation() {
	const pathname = usePathname();

	const navItems = [
		{
			href: "/",
			icon: Home,
			label: "Startseite",
		},
		{
			href: "/tables",
			icon: Table2,
			label: "Tische",
		},
		{
			href: "/profile/me",
			icon: User,
			label: "Profil",
		},
	];

	return (
		<nav className="fixed right-0 bottom-0 left-0 z-50 border-t bg-background">
			<div className="mx-auto flex max-w-screen-md items-center justify-around px-4 py-2">
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
