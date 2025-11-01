import { SidebarDemo } from "@/components/features/dashboard/Sidebar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <SidebarDemo>{children}</SidebarDemo>;
}
