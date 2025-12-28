import { redirect } from "next/navigation";
import { getSession } from "@/server/better-auth/server";
import { GitHubButton } from "./github-button";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
	const session = await getSession();

	if (session) {
		redirect("/");
	}

	return (
		<div className="flex flex-col items-center justify-center gap-8 px-4 py-16">
			<div className="w-full max-w-md rounded-lg border border-white/10 bg-white/5 p-8 shadow-lg backdrop-blur-sm">
				<h1 className="mb-6 text-center font-bold text-3xl text-foreground">
					Anmelden
				</h1>
				<LoginForm />
			</div>
			<GitHubButton />
		</div>
	);
}
