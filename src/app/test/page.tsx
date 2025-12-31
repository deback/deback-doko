import { HandViewClient } from "@/components/test/test-cards-client";

export default function TestPage() {
	return (
		<div className="flex min-h-screen flex-col">
			<div className="container relative mx-auto p-8">
				<h1 className="mb-8 font-bold text-3xl">Karten-Test</h1>
				<HandViewClient />
			</div>
		</div>
	);
}
