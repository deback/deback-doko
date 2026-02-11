import { redirect } from "next/navigation";
import { Suspense } from "react";
import { parseReturnTo } from "@/lib/auth/return-to";
import { getSession } from "@/server/better-auth/server";
import { LoginClient } from "./login-client";

export default async function LoginPage({
	searchParams,
}: {
	searchParams: Promise<{ returnTo?: string }>;
}) {
	const session = await getSession();
	const params = await searchParams;
	const returnTo = parseReturnTo(params.returnTo);

	if (session) {
		if (returnTo) {
			redirect(returnTo);
		}
		redirect("/");
	}

	return (
		<Suspense>
			<LoginClient returnTo={returnTo} />
		</Suspense>
	);
}
