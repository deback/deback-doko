import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { auth } from "@/server/better-auth";
import { getSession } from "@/server/better-auth/server";

export default async function Home() {
	const session = await getSession();

	if (!session) {
		redirect("/login");
	}

	return (
		<main className="mx-auto min-h-screen max-w-screen-md overflow-hidden border-x px-4">
			<div className="space-y-4 p-6">
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
