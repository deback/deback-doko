import { CircleAlert } from "lucide-react";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAllUsers } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

	const usersResult = await getAllUsers();
	const users = usersResult.success ? usersResult.data : [];

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

				<div className="space-y-4">
					<h2 className="font-semibold text-xl">Alle User</h2>
					{users.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							Keine User gefunden.
						</p>
					) : (
						<div className="space-y-2">
							{users.map((user) => (
								<Link href={`/profile/${user.id}`} key={user.id}>
									<Card className="transition-colors hover:bg-accent">
										<CardContent className="flex items-center gap-4 p-4">
											{user.image ? (
												<Image
													alt={user.name}
													className="rounded-full"
													height={48}
													src={user.image}
													width={48}
												/>
											) : (
												<div className="flex size-12 items-center justify-center rounded-full bg-muted font-bold text-lg">
													{user.name.charAt(0).toUpperCase()}
												</div>
											)}
											<div className="flex-1">
												<p className="font-medium">{user.name}</p>
												<p className="text-muted-foreground text-sm">
													{user.email}
												</p>
											</div>
										</CardContent>
									</Card>
								</Link>
							))}
						</div>
					)}
				</div>
			</div>
		</main>
	);
}
