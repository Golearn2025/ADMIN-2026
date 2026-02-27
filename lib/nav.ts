import {
    Bell,
    Briefcase,
    Building2,
    Calculator,
    Calendar,
    Car,
    CreditCard,
    DollarSign,
    FileText,
    Headphones,
    LayoutDashboard,
    LogOut,
    Map,
    RotateCcw,
    Settings,
    TrendingUp,
    Truck,
    UserCircle,
    Users,
    type LucideIcon
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export interface NavGroup {
  title: string;
  icon?: LucideIcon;
  items: NavItem[];
}

export const navConfig: NavGroup[] = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "Bookings",
    icon: Calendar,
    items: [
      {
        title: "All Bookings",
        href: "/bookings",
        icon: Calendar,
      },
      {
        title: "Jobs",
        href: "/jobs",
        icon: Briefcase,
      },
      {
        title: "Live Map",
        href: "/live-map",
        icon: Map,
      },
    ],
  },
  {
    title: "Finance",
    icon: DollarSign,
    items: [
      {
        title: "Payments",
        href: "/payments",
        icon: DollarSign,
      },
      {
        title: "Refunds",
        href: "/refunds",
        icon: RotateCcw,
      },
      {
        title: "Financial Overview",
        href: "/financials",
        icon: TrendingUp,
      },
    ],
  },
  {
    title: "Fleet",
    icon: Truck,
    items: [
      {
        title: "Drivers",
        href: "/drivers",
        icon: UserCircle,
      },
      {
        title: "Vehicles",
        href: "/vehicles",
        icon: Car,
      },
      {
        title: "Documents",
        href: "/documents",
        icon: FileText,
      },
    ],
  },
  {
    title: "Customers",
    icon: Users,
    items: [
      {
        title: "Customers",
        href: "/customers",
        icon: Users,
      },
      {
        title: "Billing",
        href: "/billing",
        icon: CreditCard,
      },
    ],
  },
  {
    title: "Organization",
    icon: Building2,
    items: [
      {
        title: "Team & Roles",
        href: "/team",
        icon: Users,
      },
      {
        title: "Organizations",
        href: "/organizations",
        icon: Building2,
      },
    ],
  },
];

export const bottomNavItems: NavItem[] = [
  {
    title: "Notifications",
    href: "/notifications",
    icon: Bell,
  },
  {
    title: "Support",
    href: "/support",
    icon: Headphones,
  },
  {
    title: "Pricing Calculator",
    href: "/pricing-calculator",
    icon: Calculator,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
  {
    title: "Sign Out",
    href: "/sign-out",
    icon: LogOut,
  },
];
