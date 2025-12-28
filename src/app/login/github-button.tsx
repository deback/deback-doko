"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/server/better-auth/client";

export function GitHubButton() {
	const [isLoading, setIsLoading] = useState(false);

	async function handleGitHubSignIn() {
		setIsLoading(true);
		try {
			const result = await authClient.signIn.social({
				provider: "github",
				//callbackURL: "/",
			});

			if (result.data?.url) {
				window.location.href = result.data.url;
			}
		} catch (error) {
			console.error("Fehler bei GitHub-Anmeldung:", error);
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<Button disabled={isLoading} onClick={handleGitHubSignIn} variant="outline">
			{isLoading ? "Wird geladen..." : "GitHub"}
		</Button>
	);
}
