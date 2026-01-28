import { ModeToggle } from "@/components/mode-toggle";

export default function AuthLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<main className="flex h-screen items-center justify-center p-4">
			{children}
			<div className="absolute top-4 right-4">
				<ModeToggle />
			</div>
		</main>
	);
}
