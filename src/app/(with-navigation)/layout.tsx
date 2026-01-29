import { Navigation } from "@/components/navigation";
import { getSession } from "@/server/better-auth/server";

export default async function WithNavigationLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await getSession();

	const user = session?.user
		? {
				id: session.user.id,
				name: session.user.name,
				image: session.user.image ?? null,
			}
		: null;

	return (
		<div className="pb-20">
			{children}
			<Navigation user={user} />
		</div>
	);
}
