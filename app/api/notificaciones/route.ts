import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data } = await supabase
    .from("notificaciones")
    .select("*")
    .eq("usuario_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ notificaciones: data || [] });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { id, mark_all } = body;

  if (mark_all) {
    await supabase
      .from("notificaciones")
      .update({ leida: true })
      .eq("usuario_id", user.id)
      .eq("leida", false);
  } else if (id) {
    await supabase
      .from("notificaciones")
      .update({ leida: true })
      .eq("id", id)
      .eq("usuario_id", user.id);
  }

  return NextResponse.json({ ok: true });
}
