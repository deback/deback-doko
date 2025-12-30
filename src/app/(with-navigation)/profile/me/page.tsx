import { redirect } from "next/navigation";
import { getUserById } from "@/app/profile/[userId]/actions";
import { UserProfile } from "@/components/profile/user-profile";
import { UsernameForm } from "@/components/profile/username-form";
import { getSession } from "@/server/better-auth/server";

export default async function MyProfilePage() {
	const session = await getSession();

	if (!session?.user) {
		redirect("/login");
	}

	// Hole aktuelle User-Daten aus der Datenbank
	const result = await getUserById(session.user.id);

	if (!result.success || !result.data) {
		redirect("/");
	}

	return (
		<main className="mx-auto min-h-screen max-w-screen-md overflow-hidden border-x px-4">
			<div className="space-y-6 p-6">
				<h1 className="font-bold text-3xl">Mein Profil</h1>
				<UserProfile user={result.data} />
				<UsernameForm currentName={result.data.name} userId={result.data.id} />
			</div>
		</main>
	);
}
