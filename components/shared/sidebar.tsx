"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import {
  Users,
  FileSpreadsheet,
  LayoutDashboard,
  BarChart3,
  TrendingUp,
  Target,
} from "lucide-react";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["SUPERVISOR", "REPRESENTANTE"],
  },
  {
    label: "Clientes",
    href: "/",
    icon: Users,
    roles: ["SUPERVISOR", "REPRESENTANTE"],
  },
  {
    label: "Comportamiento",
    href: "/comportamiento",
    icon: BarChart3,
    roles: ["SUPERVISOR", "REPRESENTANTE"],
  },
  {
    label: "Performance",
    href: "/performance",
    icon: TrendingUp,
    roles: ["SUPERVISOR", "REPRESENTANTE"],
  },
  {
    label: "Metas",
    href: "/metas",
    icon: Target,
    roles: ["SUPERVISOR"],
  },
  {
    label: "Importar",
    href: "/importar",
    icon: FileSpreadsheet,
    roles: ["SUPERVISOR"],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { usuario } = useUser();

  const filteredItems = navItems.filter(
    (item) => usuario && item.roles.includes(usuario.rol)
  );

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 border-r bg-card h-screen sticky top-0">
      <div className="flex items-center gap-2 px-6 py-5 border-b">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <span className="text-sm font-bold text-primary-foreground">SF</span>
        </div>
        <span className="font-semibold text-lg">SalesFlow</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {filteredItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
