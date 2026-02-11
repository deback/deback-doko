"use client";

import { useSearchParams } from "next/navigation";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GitHubButton } from "./github-button";
import { GoogleButton } from "./google-button";
import { LoginForm } from "./login-form";
import { PasswordLoginForm } from "./password-login-form";

interface LoginClientProps {
	returnTo: string | null;
}

export function LoginClient({ returnTo }: LoginClientProps) {
	const searchParams = useSearchParams();
	const error = searchParams.get("error");

	return (
		<Card className="w-full max-w-sm">
			<CardHeader className="text-center">
				<CardTitle className="font-serif text-2xl uppercase">
					Anmelden
				</CardTitle>
				<CardDescription>
					Melde dich mit deiner bevorzugten Methode an.
				</CardDescription>
				{error === "INVALID_TOKEN" && (
					<div className="rounded-md border border-red-500/20 bg-red-500/10 p-3">
						<p className="text-red-500 text-sm">
							Der Anmelde-Link ist ungültig oder abgelaufen. Fordere einen neuen
							Link an.
						</p>
					</div>
				)}
			</CardHeader>
			<CardContent className="flex flex-col gap-6">
				<div className="flex flex-col gap-2">
					<GitHubButton returnTo={returnTo} />
					<GoogleButton returnTo={returnTo} />
				</div>

				<div className="relative">
					<div className="absolute inset-0 flex items-center">
						<span className="w-full border-t" />
					</div>
					<div className="relative flex justify-center text-xs uppercase">
						<span className="bg-card px-2 text-muted-foreground">oder</span>
					</div>
				</div>

				<Tabs className="w-full" defaultValue="password">
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="password">E-Mail/Passwort</TabsTrigger>
						<TabsTrigger value="magic-link">Magic Link</TabsTrigger>
					</TabsList>
					<TabsContent className="mt-4" value="password">
						<PasswordLoginForm returnTo={returnTo} />
					</TabsContent>
					<TabsContent className="mt-4" value="magic-link">
						<LoginForm returnTo={returnTo} />
					</TabsContent>
				</Tabs>
			</CardContent>
		</Card>
	);
}
