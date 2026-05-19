import { create } from "zustand";
import type { Usuario } from "@/types";

interface UserState {
  usuario: Usuario | null;
  loading: boolean;
  setUsuario: (usuario: Usuario | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useUserStore = create<UserState>((set) => ({
  usuario: null,
  loading: true,
  setUsuario: (usuario) => set({ usuario }),
  setLoading: (loading) => set({ loading }),
}));
