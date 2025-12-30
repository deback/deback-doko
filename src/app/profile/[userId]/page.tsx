import { notFound } from "next/navigation";
import { UserProfile } from "@/components/profile/user-profile";
import { getUserById } from "./actions";

interface ProfilePageProps {
	params: Promise<{ userId: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
	const { userId } = await params;
	const result = await getUserById(userId);

	if (!result.success || !result.data) {
		notFound();
	}

	return (
		<main className="mx-auto min-h-screen max-w-screen-md overflow-hidden border-x px-4">
			<div className="space-y-6 p-6">
				<h1 className="font-bold text-3xl">Profil</h1>
				<UserProfile user={result.data} />
			</div>
		</main>
	);
}

