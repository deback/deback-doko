import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getAllUsers } from "@/app/actions";
import { auth } from "@/server/better-auth";
import { getSession } from "@/server/better-auth/server";

export default async function Home() {
	const session = await getSession();

	if (!session) {
		redirect("/login");
	}

	const usersResult = await getAllUsers();
	const users = usersResult.success ? usersResult.data : [];

	return (
		<main className="mx-auto min-h-screen max-w-screen-md overflow-hidden border-x px-4">
			<div className="space-y-6 p-6">
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
								<Link key={user.id} href={`/profile/${user.id}`}>
									<Card className="transition-colors hover:bg-accent">
										<CardContent className="flex items-center gap-4 p-4">
											{user.image ? (
												<Image
													src={user.image}
													alt={user.name}
													width={48}
													height={48}
													className="rounded-full"
												/>
											) : (
												<div className="flex size-12 items-center justify-center rounded-full bg-muted text-lg font-bold">
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
