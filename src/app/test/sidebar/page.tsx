import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarHeader,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import RightSidebar from "./right-sidebar";

export default function SidebarPage({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<SidebarProvider>
			<main className="flex h-screen w-full">
				xxx{children}
				<SidebarTrigger />
			</main>
			<RightSidebar />
		</SidebarProvider>
	);
}
