"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/store/user-store";
import type { Usuario } from "@/types";

export function useUser() {
  const { usuario, loading, setUsuario, setLoading } = useUserStore();

  useEffect(() => {
    const supabase = createClient();

    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from("usuarios")
          .select("*")
          .eq("id", user.id)
          .single();

        setUsuario(data as Usuario | null);
      } else {
        setUsuario(null);
      }
      setLoading(false);
    }

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUsuario(null);
        setLoading(false);
      } else {
        getUser();
      }
    });

    return () => subscription.unsubscribe();
  }, [setUsuario, setLoading]);

  return {
    usuario,
    loading,
    isSupervisor: usuario?.rol === "SUPERVISOR",
    isRepresentante: usuario?.rol === "REPRESENTANTE",
  };
}
