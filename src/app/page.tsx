import { headers } from "next/headers";
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
			<pre>{JSON.stringify(session, null, 2)}</pre>
			<form>
				<Button
					formAction={async () => {
						"use server";
						await auth.api.signOut({
							headers: await headers(),
						});
						redirect("/login");
					}}
				>
					Abmelden
				</Button>
			</form>
		</main>
	);
}
