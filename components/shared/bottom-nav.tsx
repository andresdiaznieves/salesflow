"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { Users, LayoutDashboard, BarChart3, TrendingUp } from "lucide-react";

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
    label: "Análisis",
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
];

export function BottomNav() {
  const pathname = usePathname();
  const { usuario } = useUser();

  const filteredItems = navItems.filter(
    (item) => usuario && item.roles.includes(usuario.rol)
  );

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-card">
      <div className="flex items-center justify-around py-2">
        {filteredItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
