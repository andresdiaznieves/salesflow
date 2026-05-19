"use client";

import { useEffect, useState, useRef } from "react";
import { Bell, Check, CheckCheck, Clock, Users, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Notificacion } from "@/types";

const iconMap: Record<string, typeof Bell> = {
  visita_pendiente: Clock,
  rendimiento_equipo: Users,
  meta_riesgo: AlertTriangle,
  general: Bell,
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notificacion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.leida).length;

  useEffect(() => {
    fetchNotifications();
    generateNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/notificaciones");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notificaciones || []);
      }
    } catch {}
  }

  async function generateNotifications() {
    try {
      await fetch("/api/notificaciones/generate", { method: "POST" });
      fetchNotifications();
    } catch {}
  }

  async function markAsRead(id?: string) {
    setLoading(true);
    await fetch("/api/notificaciones", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id } : { mark_all: true }),
    });
    setNotifications((prev) =>
      prev.map((n) => (id ? (n.id === id ? { ...n, leida: true } : n) : { ...n, leida: true }))
    );
    setLoading(false);
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9"
        onClick={() => setOpen(!open)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 sm:w-96 rounded-xl border bg-card shadow-lg">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="font-semibold text-sm">Notificaciones</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAsRead()}
                disabled={loading}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <CheckCheck className="h-3 w-3" />
                Marcar todas leídas
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No hay notificaciones
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = iconMap[n.tipo] || Bell;
                return (
                  <div
                    key={n.id}
                    className={`flex gap-3 px-4 py-3 border-b last:border-0 transition-colors ${
                      n.leida ? "opacity-60" : "bg-primary/5"
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">{n.titulo}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.mensaje}</p>
                      <span className="text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</span>
                    </div>
                    {!n.leida && (
                      <button
                        onClick={() => markAsRead(n.id)}
                        className="shrink-0 mt-0.5 text-muted-foreground hover:text-primary"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
