import { Link, useLocation } from "react-router-dom"
import { LayoutDashboard, Package } from "lucide-react"
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarInset,
} from "@/components/ui/sidebar"
import logo from "@/assets/logo.svg"

const navItems = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Items", url: "/items", icon: Package },
]

export default function SidebarWrapper({ children }: { children: React.ReactNode }) {
    const location = useLocation()

    return (
        <SidebarProvider>
            <Sidebar>
                <SidebarContent>
                    <SidebarGroup>
                        <div className="flex items-center gap-3 h-16 border-b border-border px-4">
                            <img height={24} width={24} src={logo} alt="logo" />
                            <span className="text-lg font-semibold">Eval Dashboard</span>
                        </div>
                        <SidebarGroupContent className="px-4 pt-6">
                            <SidebarMenu className="flex flex-col gap-2">
                                {navItems.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                                            <Link to={item.url}>
                                                <item.icon />
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>
            </Sidebar>
            <SidebarInset>
                {children}
            </SidebarInset>
        </SidebarProvider>
    )
}

