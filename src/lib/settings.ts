import { supabase } from "@/integrations/supabase/client";

export async function loadSettings(): Promise<Record<string, string>> {
  const { data } = await supabase.from("settings").select("key,value");
  const out: Record<string, string> = {};
  for (const r of (data ?? []) as { key: string; value: string }[]) {
    if (r?.key) out[r.key] = r.value;
  }
  return out;
}

export async function saveSetting(key: string, value: string): Promise<void> {
  await supabase.from("settings").upsert({ key, value });
}
