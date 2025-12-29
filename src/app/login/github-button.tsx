"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/server/better-auth/client";

export function GitHubButton() {
	const [isPending, startTransition] = useTransition();

	function handleGitHubSignIn() {
		startTransition(async () => {
			try {
				const result = await authClient.signIn.social({
					provider: "github",
				});
			} catch (error) {
				console.error("Fehler bei GitHub-Anmeldung:", error);
			}
		});
	}

	return (
		<Button disabled={isPending} onClick={handleGitHubSignIn} variant="outline">
			{isPending ? "Wird geladen..." : "GitHub sign in"}
		</Button>
	);
}
