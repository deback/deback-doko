import { HandViewClient } from "@/components/test/test-cards-client";

export default function TestPage() {
	return (
		<div className="flex min-h-screen flex-col">
			<div className="container relative mx-auto p-8">
				<h1 className="mb-8 font-bold text-3xl">Karten-Test</h1>
				<p className="font-serif text-lg">
					SerifLorem ipsum dolor sit amet consectetur adipisicing elit.
					Quisquam, quos.
				</p>
				<p className="font-sans text-lg">
					Sans Lorem ipsum dolor sit amet consectetur adipisicing elit.
					Quisquam, quos.
				</p>
				<p className="font-mono text-lg">
					Mono Lorem ipsum dolor sit amet consectetur adipisicing elit.
					Quisquam, quos.
				</p>
				<HandViewClient />
			</div>
		</div>
	);
}
