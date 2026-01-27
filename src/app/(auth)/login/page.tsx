import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/server/better-auth/server";
import { LoginClient } from "./login-client";

export default async function LoginPage() {
	const session = await getSession();

	if (session) {
		redirect("/");
	}

	return (
		<Suspense>
			<LoginClient />
		</Suspense>
	);
}
