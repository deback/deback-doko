"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/server/better-auth/client";

export function GoogleButton() {
	const [isPending, startTransition] = useTransition();

	function handleGoogleSignIn() {
		startTransition(async () => {
			try {
				const result = await authClient.signIn.social({
					provider: "google",
				});

				console.log(result);
			} catch (error) {
				console.error("Fehler bei Google-Anmeldung:", error);
			}
		});
	}

	return (
		<Button
			disabled={isPending}
			onClick={handleGoogleSignIn}
			variant="outline"
		>
			{isPending ? "Wird geladen..." : "Google sign in"}
		</Button>
	);
}

