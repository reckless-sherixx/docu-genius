import { SidebarDemo } from "@/components/features/dashboard/Sidebar";
import { OrganizationProvider } from "@/contexts/OrganizationContext";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <OrganizationProvider>
            <SidebarDemo>{children}</SidebarDemo>
        </OrganizationProvider>
    );
}
