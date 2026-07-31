import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { CATEGORIES, haversine } from "@/lib/constants";
import { loadSettings } from "@/lib/settings";
import { PaymentModal } from "@/components/PaymentModal";
import { MapPin, Radar, Phone } from "lucide-react";

export const Route = createFileRoute("/employer")({
  head: () => ({
    meta: [
      { title: "Employer dashboard — Ndahari" },
      { name: "description", content: "Find and reserve trusted local workers near you." },
    ],
  }),
  component: EmployerDash,
});

function EmployerDash() {
  const { t } = useI18n();
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  const [category, setCategory] = useState("driver");
  const [location, setLocation] = useState("");
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [workers, setWorkers] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [payTarget, setPayTarget] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
    if (!loading && user && !roles.includes("employer") && roles.length > 0) {
      navigate({ to: roles.includes("admin") ? "/admin" : "/employee" });
    }
  }, [user, roles, loading, navigate]);

  const useLive = () => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setLocation(`${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}`);
    });
  };

  const search = async () => {
    const { data: emps } = await supabase
      .from("employee_profiles")
      .select("*")
      .eq("category", category)
      .in("status", ["active", "in_service"]);
    if (!emps?.length) { setWorkers([]); return; }
    const { data: profs } = await supabase
      .from("users")
      .select("id,first_name,last_name")
      .in("id", (emps as any[]).map((e) => e.user_id));
    const map = new Map(((profs ?? []) as any[]).map((p) => [p.id, p]));
    let enriched = (emps as any[]).map((e) => {
      const dist = center && e.lat != null && e.lng != null ? haversine(center, { lat: e.lat, lng: e.lng }) : null;
      return { ...e, profile: map.get(e.user_id), distance: dist };
    });
    enriched.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    setWorkers(enriched);
  };

  const loadRes = async () => {
    if (!user) return;
    const { data } = await supabase.from("reservations").select("*").eq("employer_id", user.id).order("created_at", { ascending: false });
    const ids = ((data ?? []) as any[]).map((r) => r.employee_id);
    let profs: any[] = [];
    let emps: any[] = [];
    if (ids.length) {
      const [p, e] = await Promise.all([
        supabase.from("users").select("id,first_name,last_name,phone").in("id", ids),
        supabase.from("employee_profiles").select("user_id,category").in("user_id", ids),
      ]);
      profs = (p.data ?? []) as any[];
      emps = (e.data ?? []) as any[];
    }
    const pm = new Map(profs.map((p) => [p.id, p]));
    const em = new Map(emps.map((e) => [e.user_id, e]));
    setReservations(((data ?? []) as any[]).map((r) => ({ ...r, profile: pm.get(r.employee_id), emp: em.get(r.employee_id) })));
  };

  useEffect(() => { loadSettings().then(setSettings); loadRes(); }, [user]);

  const reserve = async () => {
    if (!user || !payTarget) return;
    const { data: r } = await supabase.from("reservations").insert({
      employer_id: user.id,
      employee_id: payTarget.user_id,
      status: "payment_reported",
    }).select().single();
    if (r) {
      await supabase.from("payments").insert({
        user_id: user.id,
        purpose: "reservation",
        amount: Number(settings.client_fee ?? 1000),
        momo_code: settings.momo_code,
        reservation_id: (r as any).id,
      });
    }
    setPayTarget(null);
    loadRes();
  };

  const closest = useMemo(() => workers[0], [workers]);

  if (!user) return <div className="p-10 text-center text-muted-foreground">{t("common.loading")}</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 animate-fade-in">
      <h1 className="text-3xl font-bold mb-6">{t("employer.find")}</h1>

      <div className="rounded-2xl border bg-card p-6 shadow-elegant mb-8">
        <div className="grid md:grid-cols-3 gap-3">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2.5 rounded-lg bg-background border">
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.emoji} {t(`cat.${c.id}` as any)}</option>)}
          </select>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" className="px-3 py-2.5 rounded-lg bg-background border" />
          <div className="flex gap-2">
            <button onClick={useLive} className="flex-1 px-3 py-2.5 rounded-lg bg-secondary text-sm flex items-center justify-center gap-1"><MapPin className="w-4 h-4" /> Live</button>
            <button onClick={search} className="flex-1 px-3 py-2.5 rounded-lg gradient-hero text-primary-foreground font-medium flex items-center justify-center gap-1"><Radar className="w-4 h-4" /> Search</button>
          </div>
        </div>
      </div>

      {workers.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">{t("employer.matching")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workers.map((w) => (
              <div key={w.user_id} className={`relative gradient-card rounded-xl border p-5 shadow-elegant ${w === closest ? "ring-2 ring-primary" : ""}`}>
                {w === closest && (
                  <>
                    <span className="absolute -top-2 -right-2 px-2 py-0.5 text-xs font-bold rounded-full bg-primary text-primary-foreground">NEAREST</span>
                    <span className="absolute inset-0 rounded-xl border-2 border-primary animate-ping-slow pointer-events-none" />
                  </>
                )}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full gradient-hero flex items-center justify-center text-primary-foreground font-bold">
                    {(w.profile?.first_name?.[0] ?? "?").toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold">{w.profile?.first_name} {w.profile?.last_name}</div>
                    <div className="text-xs text-muted-foreground">{CATEGORIES.find((c) => c.id === w.category)?.emoji} {t(`cat.${w.category}` as any)}</div>
                  </div>
                </div>
                <div className="mt-3 text-sm text-muted-foreground flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {w.location_text}</div>
                {w.distance !== null && (
                  <div className="text-xs mt-1 text-primary font-medium">~ {w.distance.toFixed(1)} km away</div>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-semibold text-primary">{Number(w.price_fee ?? 0).toLocaleString()} RWF</span>
                  <button onClick={() => setPayTarget(w)} className="px-3 py-1.5 rounded-md gradient-hero text-primary-foreground text-xs font-medium">
                    {t("employer.reserve")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10">
        <h2 className="text-xl font-bold mb-4">{t("employer.reservations")}</h2>
        {reservations.length === 0 ? (
          <div className="text-sm text-muted-foreground">No reservations yet.</div>
        ) : (
          <div className="space-y-3">
            {reservations.map((r) => (
              <div key={r.id} className="rounded-lg border p-4 flex items-center justify-between bg-card">
                <div>
                  <div className="font-semibold">{r.profile?.first_name} {r.profile?.last_name}</div>
                  <div className="text-xs text-muted-foreground">{CATEGORIES.find((c) => c.id === r.emp?.category)?.emoji} {t(`cat.${r.emp?.category}` as any)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs px-2 py-0.5 rounded-full bg-secondary inline-block">{r.status}</div>
                  {r.status === "in_service" && r.profile?.phone && (
                    <div className="mt-1 flex items-center gap-1 text-sm font-medium text-primary"><Phone className="w-3.5 h-3.5" /> {r.profile.phone}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PaymentModal
        open={!!payTarget}
        onClose={() => setPayTarget(null)}
        amount={Number(settings.client_fee ?? 1000)}
        momoCode={settings.momo_code ?? "*182*8*1*332991"}
        adminPhone={settings.admin_phone ?? "+250 788 000 000"}
        onPaid={reserve}
        title="Reserve worker"
      />
    </div>
  );
}
