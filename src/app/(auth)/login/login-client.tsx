"use client";

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

export function LoginClient() {
	return (
		<Card className="w-full max-w-sm">
			<CardHeader className="text-center">
				<CardTitle className="font-serif text-2xl uppercase">
					Anmelden
				</CardTitle>
				<CardDescription>
					Melde dich mit deiner bevorzugten Methode an.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-6">
				<div className="flex flex-col gap-2">
					<GitHubButton />
					<GoogleButton />
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
						<PasswordLoginForm />
					</TabsContent>
					<TabsContent className="mt-4" value="magic-link">
						<LoginForm />
					</TabsContent>
				</Tabs>
			</CardContent>
		</Card>
	);
}
