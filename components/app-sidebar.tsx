"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Package,
    Users,
    Building2,
    Tag,
    Ruler,
    PawPrint,
    TruckIcon,
    Settings,
    LogOut,
    Heart,
    ShoppingCart,
    PackageSearch,
    ClipboardList,
    FileText,
    BookOpen,
    DollarSign,
    Wallet,
    CreditCard,
    BarChart3,
    Stethoscope,
    Zap,
    Calendar,
    UserCog,
    Hotel,
    Menu,
    ChevronLeft,
    ChevronRight,
    Receipt,
    LucideIcon,
    ChevronDown,
    AlertTriangle,
    Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuthActions } from "@convex-dev/auth/react";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
// Type definitions
interface NavigationChild {
    name: string;
    href: string;
    icon: LucideIcon;
}

interface NavigationItem {
    name: string;
    icon: LucideIcon;
    href?: string;
    children?: NavigationChild[];
}

const navigation: NavigationItem[] = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    {
        name: "Penjualan",
        icon: Receipt,
        children: [
            { name: "Daftar Penjualan", href: "/dashboard/sales", icon: Receipt },
            { name: "Transaksi Baru", href: "/dashboard/sales/create", icon: Zap }, // Using Zap icon for quick transaction/POS
        ],
    },
    { name: "Produk", href: "/dashboard/products", icon: Package },
    { name: "Pembelian", href: "/dashboard/purchase-orders", icon: ShoppingCart },
    {
        name: "Stok",
        icon: PackageSearch,
        children: [
            { name: "Manajemen Stok", href: "/dashboard/stock", icon: PackageSearch },
            { name: "Input Stok Awal", href: "/dashboard/stock/initial", icon: Plus },
            { name: "Monitoring Kadaluarsa", href: "/dashboard/expiry", icon: AlertTriangle },
        ],
    },
    { name: "Hewan", href: "/dashboard/pets", icon: Heart },
    { name: "Pelanggan", href: "/dashboard/customers", icon: Users },
    { name: "Supplier", href: "/dashboard/suppliers", icon: TruckIcon },
    { name: "Laporan", href: "/dashboard/reports", icon: ClipboardList },
    {
        name: "Akuntansi",
        icon: FileText,
        children: [
            { name: "Dashboard", href: "/dashboard/accounting", icon: LayoutDashboard },
            { name: "Chart of Accounts", href: "/dashboard/accounting/chart-of-accounts", icon: BookOpen },
            { name: "Journal Entries", href: "/dashboard/accounting/journal-entries", icon: FileText },
            { name: "General Ledger", href: "/dashboard/accounting/ledger", icon: BookOpen },
            { name: "Expenses", href: "/dashboard/accounting/expenses", icon: DollarSign },
            { name: "Bank", href: "/dashboard/accounting/bank", icon: Wallet },
            { name: "AR Aging", href: "/dashboard/accounting/ar-aging", icon: CreditCard },
            { name: "Reports", href: "/dashboard/accounting/reports", icon: BarChart3 },
        ],
    },
    {
        name: "Klinik",
        icon: Stethoscope,
        children: [
            { name: "Transaksi Cepat", href: "/dashboard/clinic/transactions", icon: Zap },
            { name: "Appointment", href: "/dashboard/clinic/appointments", icon: Calendar },
            { name: "Rekam Medis", href: "/dashboard/clinic/medical-records", icon: FileText },
            { name: "Staff/Dokter", href: "/dashboard/clinic/staff", icon: UserCog },
        ],
    },
    {
        name: "Pet Hotel",
        icon: Hotel,
        children: [
            { name: "Booking", href: "/dashboard/hotel/bookings", icon: Calendar },
            { name: "Kandang", href: "/dashboard/hotel/rooms", icon: Hotel },
        ],
    },
    {
        name: "Master Data",
        icon: Settings,
        children: [
            { name: "Kategori Produk", href: "/dashboard/product-categories", icon: Package },
            { name: "Sub-Kategori Produk", href: "/dashboard/product-subcategories", icon: Package },
            { name: "Jenis Hewan", href: "/dashboard/animal-categories", icon: PawPrint },
            { name: "Sub-Kategori Hewan", href: "/dashboard/animal-subcategories", icon: PawPrint },
            { name: "Merek", href: "/dashboard/brands", icon: Tag },
            { name: "Satuan", href: "/dashboard/units", icon: Ruler },
            { name: "Cabang", href: "/dashboard/branches", icon: Building2 },
        ],
    },
    {
        name: "Pengaturan",
        icon: UserCog,
        children: [
            { name: "User Management", href: "/dashboard/users", icon: Users },
            { name: "Roles & Permissions", href: "/dashboard/roles", icon: Settings },
        ],
    },
];

export function AppSidebar() {
    const pathname = usePathname();
    const { signOut } = useAuthActions();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Persist collapsed state
    useEffect(() => {
        setMounted(true);
        const saved = localStorage.getItem("sidebar-collapsed");
        if (saved) {
            setIsCollapsed(JSON.parse(saved));
        }
    }, []);

    const toggleCollapse = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem("sidebar-collapsed", JSON.stringify(newState));
    };

    if (!mounted) return null; // Prevent hydration mismatch

    return (
        <>
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="lg:hidden">
                                <Menu className="h-6 w-6" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-72 p-0">
                            <MobileNav
                                pathname={pathname}
                                navigation={navigation}
                                signOut={signOut}
                                onClose={() => setMobileMenuOpen(false)}
                            />
                        </SheetContent>
                    </Sheet>
                    <h1 className="text-xl font-bold text-sidebar-primary">🐾 Petshop</h1>
                </div>
                <LocaleSwitcher />
            </div>

            {/* Desktop Sidebar */}
            <aside
                className={cn(
                    "hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border h-screen sticky top-0 transition-all duration-300 ease-in-out z-40",
                    isCollapsed ? "w-20" : "w-64"
                )}
            >
                {/* Header */}
                <div className={cn("flex items-center h-16 border-b border-sidebar-border", isCollapsed ? "justify-center px-0" : "justify-between px-4")}>
                    {!isCollapsed && (
                        <div className="flex flex-col">
                            <h1 className="text-xl font-bold text-sidebar-primary truncate">🐾 Petshop</h1>
                            <p className="text-xs text-sidebar-foreground/70 truncate">Management System</p>
                        </div>
                    )}
                    {isCollapsed && <span className="text-2xl">🐾</span>}

                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn("h-8 w-8 text-sidebar-foreground/70", isCollapsed ? "hidden group-hover:flex absolute -right-4 top-6 bg-sidebar border shadow-sm rounded-full" : "")}
                        onClick={toggleCollapse}
                    >
                        {/* This button logic is a bit tricky for the collapsed state if we want it to float. 
                 Let's just put it in the header for now or at the bottom. 
                 Actually, a common pattern is a small button at the border or bottom. 
                 Let's put it at the bottom or top right. */}
                    </Button>
                </div>

                {/* Toggle Button (Better placement) */}
                <div className="absolute -right-3 top-20 z-50">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6 rounded-full bg-sidebar shadow-md border-sidebar-border hover:bg-sidebar-accent"
                        onClick={toggleCollapse}
                    >
                        {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
                    </Button>
                </div>

                {/* Navigation */}
                <ScrollArea className="flex-1 py-4">
                    <nav className="space-y-1 px-2">
                        {navigation.map((item) => (
                            <NavItem
                                key={item.name}
                                item={item}
                                pathname={pathname}
                                isCollapsed={isCollapsed}
                            />
                        ))}
                    </nav>
                </ScrollArea>

                {/* Footer */}
                <div className="p-4 border-t border-sidebar-border space-y-2">
                    <div className={cn("flex items-center gap-2", isCollapsed ? "justify-center flex-col" : "justify-between")}>
                        {!isCollapsed && <LocaleSwitcher />}
                        <ThemeToggle />
                    </div>
                    <TooltipProvider delayDuration={0}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className={cn(
                                        "w-full gap-2 text-sidebar-foreground hover:text-red-600 hover:bg-red-50",
                                        isCollapsed ? "justify-center px-0" : "justify-start"
                                    )}
                                    onClick={() => signOut()}
                                >
                                    <LogOut className="h-5 w-5" />
                                    {!isCollapsed && <span>Keluar</span>}
                                </Button>
                            </TooltipTrigger>
                            {isCollapsed && <TooltipContent side="right">Keluar</TooltipContent>}
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </aside>
        </>
    );
}

function NavItem({
    item,
    pathname,
    isCollapsed,
}: {
    item: NavigationItem;
    pathname: string;
    isCollapsed: boolean;
}) {
    const isActive = item.href ? pathname === item.href : false;
    const isChildActive = item.children?.some((child) => pathname === child.href);
    const [isOpen, setIsOpen] = useState(isChildActive);

    // Auto-expand if child is active
    useEffect(() => {
        if (isChildActive) setIsOpen(true);
    }, [isChildActive]);

    if (isCollapsed) {
        // Collapsed State Logic
        if (item.children) {
            // For collapsed with children, we can show a popover or just the main icon that expands sidebar.
            // For simplicity, let's just show the main icon with a tooltip. 
            // If clicked, we could expand the sidebar or navigate to first child?
            // Let's make it simple: Hovering shows tooltip with submenu items? 
            // Or just show the parent icon.
            return (
                <TooltipProvider delayDuration={0}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                className={cn(
                                    "w-full justify-center p-2 h-10 mb-1",
                                    isChildActive ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground hover:bg-sidebar-accent"
                                )}
                            >
                                <item.icon className="h-5 w-5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="flex flex-col gap-1 p-2 min-w-[180px]">
                            <p className="font-semibold text-xs px-2 py-1 text-sidebar-foreground/70">{item.name}</p>
                            {item.children.map(child => (
                                <Link key={child.href} href={child.href} className={cn("text-sm px-2 py-1 rounded hover:bg-sidebar-accent block", pathname === child.href && "text-sidebar-primary font-medium bg-sidebar-accent")}>
                                    {child.name}
                                </Link>
                            ))}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )
        }

        return (
            <TooltipProvider delayDuration={0}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Link
                            href={item.href!}
                            className={cn(
                                "flex items-center justify-center h-10 w-full rounded-md mb-1 transition-colors",
                                isActive
                                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                            )}
                        >
                            <item.icon className="h-5 w-5" />
                        </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.name}</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    // Expanded State Logic
    if (item.children) {
        return (
            <div className="mb-1">
                <Button
                    variant="ghost"
                    className={cn(
                        "w-full justify-between hover:bg-sidebar-accent",
                        isChildActive ? "text-sidebar-primary font-medium" : "text-sidebar-foreground"
                    )}
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <div className="flex items-center gap-2">
                        <item.icon className="h-5 w-5" />
                        <span>{item.name}</span>
                    </div>
                    <ChevronDown
                        className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")}
                    />
                </Button>
                {isOpen && (
                    <div className="ml-4 mt-1 space-y-1 border-l border-sidebar-border pl-2">
                        {item.children.map((child) => {
                            const isChildActive = pathname === child.href;
                            return (
                                <Link
                                    key={child.href}
                                    href={child.href}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                                        isChildActive
                                            ? "bg-sidebar-accent text-sidebar-primary font-medium"
                                            : "text-sidebar-foreground hover:bg-sidebar-accent"
                                    )}
                                >
                                    <child.icon className="h-4 w-4" />
                                    <span>{child.name}</span>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    return (
        <Link
            href={item.href!}
            className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm rounded-md mb-1 transition-colors",
                isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
            )}
        >
            <item.icon className="h-5 w-5" />
            <span>{item.name}</span>
        </Link>
    );
}

function MobileNav({
    pathname,
    navigation,
    signOut,
    onClose,
}: {
    pathname: string;
    navigation: NavigationItem[];
    signOut: () => void;
    onClose: () => void;
}) {
    return (
        <div className="flex flex-col h-full bg-sidebar">
            <div className="p-6 border-b border-sidebar-border">
                <h1 className="text-2xl font-bold text-sidebar-primary">🐾 Petshop</h1>
                <p className="text-sm text-sidebar-foreground/70 mt-1">Management System</p>
            </div>

            <ScrollArea className="flex-1 p-4">
                <nav className="space-y-1">
                    {navigation.map((item) => {
                        if (item.children) {
                            return (
                                <div key={item.name} className="space-y-1 mb-2">
                                    <div className="px-3 py-2 text-sm font-medium text-sidebar-foreground flex items-center gap-2">
                                        <item.icon className="h-5 w-5 text-sidebar-foreground/70" />
                                        {item.name}
                                    </div>
                                    <div className="ml-4 space-y-1 border-l border-sidebar-border pl-2">
                                        {item.children.map((child) => {
                                            const isActive = pathname === child.href;
                                            return (
                                                <Link
                                                    key={child.href}
                                                    href={child.href}
                                                    onClick={onClose}
                                                    className={cn(
                                                        "flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors",
                                                        isActive
                                                            ? "bg-sidebar-accent text-sidebar-primary font-medium"
                                                            : "text-sidebar-foreground hover:bg-sidebar-accent"
                                                    )}
                                                >
                                                    <child.icon className="h-4 w-4" />
                                                    {child.name}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        }

                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href!}
                                href={item.href!}
                                onClick={onClose}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors mb-1",
                                    isActive
                                        ? "bg-sidebar-accent text-sidebar-primary font-medium"
                                        : "text-sidebar-foreground hover:bg-sidebar-accent"
                                )}
                            >
                                <item.icon className="h-5 w-5" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </ScrollArea>

            <div className="p-4 border-t border-sidebar-border">
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 text-sidebar-foreground hover:text-red-600 hover:bg-red-50"
                    onClick={() => {
                        signOut();
                        onClose();
                    }}
                >
                    <LogOut className="h-5 w-5" />
                    Keluar
                </Button>
            </div>
        </div>
    );
}


