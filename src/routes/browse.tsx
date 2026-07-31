import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { CATEGORIES } from "@/lib/constants";
import { MapPin, Search } from "lucide-react";

export const Route = createFileRoute("/browse")({
  head: () => ({
    meta: [
      { title: "Browse workers — Ndahari" },
      { name: "description", content: "Browse verified workers in Rwanda by category, location and price on Ndahari." },
      { property: "og:title", content: "Browse workers — Ndahari" },
      { property: "og:description", content: "Find trusted workers near you." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    category: (s.category as string) ?? "",
    q: (s.q as string) ?? "",
  }),
  component: Browse,
});

function Browse() {
  const { t } = useI18n();
  const search = Route.useSearch();
  const [q, setQ] = useState(search.q ?? "");
  const [category, setCategory] = useState(search.category ?? "");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: emps } = await supabase
        .from("employee_profiles")
        .select("user_id,category,location_text,price_fee,status,bio")
        .in("status", ["active", "in_service"]);
      if (!emps?.length) { setRows([]); setLoading(false); return; }
      const { data: profs } = await supabase
        .from("users")
        .select("id,first_name,last_name")
        .in("id", emps.map((e) => e.user_id));
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      setRows(emps.map((e) => ({ ...e, profile: map.get(e.user_id) })));
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (category && r.category !== category) return false;
      if (!term) return true;
      const name = `${r.profile?.first_name ?? ""} ${r.profile?.last_name ?? ""}`.toLowerCase();
      return (
        name.includes(term) ||
        r.category?.toLowerCase().includes(term) ||
        r.location_text?.toLowerCase().includes(term)
      );
    });
  }, [rows, q, category]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 animate-fade-in">
      <h1 className="text-3xl font-bold mb-6">{t("browse.title")}</h1>
      <div className="flex flex-col md:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search.placeholder")}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-card border focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-4 py-2.5 rounded-lg bg-card border cursor-pointer"
        >
          <option value="">— {t("categories.title")} —</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>{c.emoji} {t(`cat.${c.id}` as any)}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">{t("browse.empty")}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => {
            const cat = CATEGORIES.find((c) => c.id === e.category);
            return (
              <div key={e.user_id} className="gradient-card rounded-xl border p-5 shadow-elegant hover:-translate-y-1 transition">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full gradient-hero flex items-center justify-center text-primary-foreground font-bold text-lg">
                    {(e.profile?.first_name?.[0] ?? "?").toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{e.profile?.first_name} {e.profile?.last_name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <span>{cat?.emoji}</span> {t(`cat.${e.category}` as any)}
                    </div>
                  </div>
                </div>
                {e.bio && <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{e.bio}</p>}
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" /> {e.location_text}
                  </span>
                  <span className="font-semibold text-primary">{Number(e.price_fee ?? 0).toLocaleString()} RWF</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
