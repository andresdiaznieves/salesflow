"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut } from "lucide-react";
import { NotificationBell } from "@/components/shared/notification-bell";

export function Navbar() {
  const { usuario } = useUser();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 lg:px-6 h-14">
        <div className="lg:hidden flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <span className="text-xs font-bold text-primary-foreground">SF</span>
          </div>
          <span className="font-semibold">SalesFlow</span>
        </div>
        <div className="hidden lg:block" />
        <div className="flex items-center gap-3">
          {usuario && (
            <>
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-medium">
                  {usuario.nombre_completo}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {usuario.rol}
                </Badge>
              </div>
              <NotificationBell />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
