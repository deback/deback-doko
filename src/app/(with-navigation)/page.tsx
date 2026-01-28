import { CircleAlert } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { auth } from "@/server/better-auth";
import { getSession } from "@/server/better-auth/server";

export default async function Home({
	searchParams,
}: {
	searchParams: Promise<{ error?: string }>;
}) {
	const session = await getSession();
	const { error } = await searchParams;

	if (!session) {
		if (error) {
			redirect(`/login?error=${encodeURIComponent(error)}`);
		}
		redirect("/login");
	}

	return (
		<main className="mx-auto min-h-screen max-w-3xl overflow-hidden border-x px-4">
			<div className="space-y-6 p-6">
				{error === "INVALID_TOKEN" && (
					<div className="flex items-start gap-3 rounded-md border border-yellow-500/20 bg-yellow-500/10 p-4">
						<CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600 dark:text-yellow-400" />
						<p className="text-sm">
							Dieser Anmelde-Link ist nicht mehr gültig. Du bist bereits
							angemeldet.
						</p>
					</div>
				)}
				<h1 className="font-bold text-3xl">Doppelkopf</h1>
				<Link href="/tables">
					<Button className="w-full">Zu den Tischen</Button>
				</Link>
				<form>
					<Button
						formAction={async () => {
							"use server";
							await auth.api.signOut({
								headers: await headers(),
							});
							redirect("/login");
						}}
						variant="outline"
					>
						Abmelden
					</Button>
				</form>
			</div>
		</main>
	);
}
