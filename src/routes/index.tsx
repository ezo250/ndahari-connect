import { createFileRoute, Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { CATEGORIES } from "@/lib/constants";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, MapPin, Sparkles, Star } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ndahari — Work for all, Opportunities for all" },
      { name: "description", content: "Ndahari connects trusted local workers with employers in Rwanda. Find drivers, chefs, barbers, mechanics, cleaners and more, near you." },
      { property: "og:title", content: "Ndahari — Connecting hands with opportunity" },
      { property: "og:description", content: "Find trusted local workers near you or join Ndahari as a worker to reach clients." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { t } = useI18n();
  const [featured, setFeatured] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: emps } = await supabase
        .from("employee_profiles")
        .select("user_id,category,location_text,price_fee,status")
        .in("status", ["active", "in_service"])
        .limit(6);
      if (!emps?.length) { setFeatured([]); return; }
      const { data: profs } = await supabase
        .from("users")
        .select("id,first_name,last_name")
        .in("id", emps.map((e) => e.user_id));
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      setFeatured(emps.map((e) => ({ ...e, profile: map.get(e.user_id) })));
    })();
  }, []);

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-95" />
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 70% 60%, white 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />
        <div className="relative mx-auto max-w-7xl px-4 py-24 md:py-32 text-primary-foreground">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur text-xs font-medium mb-6">
              <Sparkles className="w-3.5 h-3.5" /> {t("brand.tagline")}
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              {t("hero.title")}
            </h1>
            <p className="mt-6 text-lg md:text-xl text-primary-foreground/85 max-w-2xl">
              {t("hero.subtitle")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/browse" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-primary font-semibold shadow-elegant hover:opacity-90 transition">
                {t("hero.cta.find")} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/auth" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 backdrop-blur border border-white/20 text-white font-semibold hover:bg-white/20 transition">
                {t("hero.cta.join")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-bold mb-8">{t("categories.title")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {CATEGORIES.map((c) => (
            <Link
              key={c.id}
              to="/browse"
              search={{ category: c.id } as any}
              className="group flex flex-col items-center gap-2 p-4 rounded-xl bg-card border hover:border-primary hover:shadow-elegant transition"
            >
              <span className="text-3xl group-hover:scale-110 transition">{c.emoji}</span>
              <span className="text-sm font-medium text-center">{t(`cat.${c.id}` as any)}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured workers */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-20">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 flex items-center gap-2">
            <Star className="w-6 h-6 text-warning fill-warning" />
            Featured workers
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((e) => (
              <div key={e.user_id} className="gradient-card rounded-xl border p-5 shadow-elegant hover:-translate-y-1 transition">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full gradient-hero flex items-center justify-center text-primary-foreground font-bold">
                    {(e.profile?.first_name?.[0] ?? "?").toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold">{e.profile?.first_name} {e.profile?.last_name}</div>
                    <div className="text-xs text-muted-foreground">{t(`cat.${e.category}` as any)}</div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" /> {e.location_text}
                  </span>
                  <span className="font-semibold text-primary">{e.price_fee?.toLocaleString()} RWF</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
