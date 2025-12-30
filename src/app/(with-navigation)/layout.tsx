import { Navigation } from "@/components/navigation";

export default function WithNavigationLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="pb-20">
			{children}
			<Navigation />
		</div>
	);
}
