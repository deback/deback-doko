"use client";

import { Settings } from "lucide-react";
import { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppearanceTab } from "./appearance-tab";
import { ProfileTab } from "./profile-tab";

interface SettingsDialogProps {
	user?: {
		id: string;
		name: string;
		image: string | null;
	} | null;
}

export function SettingsDialog({ user }: SettingsDialogProps) {
	const [open, setOpen] = useState(false);

	return (
		<Dialog onOpenChange={setOpen} open={open}>
			<DialogTrigger asChild>
				<button
					aria-label="Einstellungen"
					className="flex flex-col items-center gap-1 rounded-lg px-4 py-2 text-muted-foreground transition-colors hover:text-foreground"
					type="button"
				>
					<Settings className="size-6" />
					<span className="text-xs">Optionen</span>
				</button>
			</DialogTrigger>
			<DialogContent className="min-h-130 content-start">
				<DialogHeader>
					<DialogTitle>Einstellungen</DialogTitle>
				</DialogHeader>

				{user ? (
					<Tabs className="w-full" defaultValue="profile">
						<TabsList className="w-full">
							<TabsTrigger className="flex-1" value="profile">
								Profil
							</TabsTrigger>
							<TabsTrigger className="flex-1" value="appearance">
								Erscheinungsbild
							</TabsTrigger>
						</TabsList>
						<TabsContent className="mt-4" value="profile">
							<ProfileTab onClose={() => setOpen(false)} user={user} />
						</TabsContent>
						<TabsContent className="mt-4" value="appearance">
							<AppearanceTab />
						</TabsContent>
					</Tabs>
				) : (
					<AppearanceTab />
				)}
			</DialogContent>
		</Dialog>
	);
}
