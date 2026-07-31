import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { CATEGORIES, LICENSE_CATEGORIES, isDriver } from "@/lib/constants";
import { loadSettings } from "@/lib/settings";
import { PaymentModal } from "@/components/PaymentModal";
import { Logo } from "@/components/Logo";
import { MapPin, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Ndahari" },
      { name: "description", content: "Sign in or create your Ndahari account as a worker or an employer." },
      { property: "og:title", content: "Sign in — Ndahari" },
      { property: "og:description", content: "Join Ndahari to hire trusted workers or offer your skills." },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup";
type Role = "employee" | "employer";

function AuthPage() {
  const { t } = useI18n();
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [role, setRole] = useState<Role>("employee");

  useEffect(() => {
    if (!loading && user) {
      const dest = roles.includes("admin") ? "/admin" : roles.includes("employer") ? "/employer" : "/employee";
      navigate({ to: dest });
    }
  }, [user, roles, loading, navigate]);

  return (
    <div className="mx-auto max-w-lg px-4 py-10 animate-fade-in">
      <div className="text-center mb-6">
        <div className="inline-block"><Logo size={56} /></div>
        <h1 className="mt-4 text-2xl font-bold">{t("auth.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("auth.subtitle")}</p>
      </div>

      <div className="rounded-2xl bg-card border shadow-elegant p-6">
        <div className="flex rounded-lg bg-secondary p-1 mb-6">
          <button
            onClick={() => setMode("signin")}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition ${mode === "signin" ? "bg-background shadow" : "text-muted-foreground"}`}
          >{t("auth.tab.signin")}</button>
          <button
            onClick={() => setMode("signup")}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition ${mode === "signup" ? "bg-background shadow" : "text-muted-foreground"}`}
          >{t("auth.tab.signup")}</button>
        </div>

        {mode === "signup" && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => setRole("employee")}
              className={`p-3 rounded-lg border text-sm font-medium transition ${role === "employee" ? "border-primary bg-primary/5" : ""}`}
            >👷 {t("auth.role.employee")}</button>
            <button
              onClick={() => setRole("employer")}
              className={`p-3 rounded-lg border text-sm font-medium transition ${role === "employer" ? "border-primary bg-primary/5" : ""}`}
            >💼 {t("auth.role.employer")}</button>
          </div>
        )}

        {mode === "signin" ? <SignInForm /> : role === "employee" ? <EmployeeSignup /> : <EmployerSignup />}
      </div>

      <div className="mt-4 text-center text-xs text-muted-foreground">
        <Link to="/" className="hover:underline">← {t("nav.home")}</Link>
      </div>
    </div>
  );
}

function SignInForm() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setErr((error as { message: string }).message);
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <Input label={t("auth.field.email")} type="email" value={email} onChange={setEmail} required />
      <Input label={t("auth.field.password")} type="password" value={password} onChange={setPassword} required />
      {err && <div className="text-sm text-destructive">{err}</div>}
      <button disabled={loading} className="w-full py-2.5 rounded-lg gradient-hero text-primary-foreground font-semibold shadow-elegant disabled:opacity-60 flex items-center justify-center gap-2">
        {loading && <Loader2 className="w-4 h-4 animate-spin" />} {t("auth.submit.signin")}
      </button>
      <div className="text-xs text-muted-foreground text-center pt-2">
        {t("auth.demo.admin")}: <code className="bg-secondary px-1 rounded">admin@ndahari.rw</code> / <code className="bg-secondary px-1 rounded">Admin@1234</code>
      </div>
    </form>
  );
}

function Input({ label, type = "text", value, onChange, required, ...rest }: any) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        required={required}
        className="mt-1 w-full px-3 py-2 rounded-lg bg-background border focus:outline-none focus:ring-2 focus:ring-ring"
        {...rest}
      />
    </label>
  );
}

function EmployerSignup() {
  const { t } = useI18n();
  const [f, setF] = useState({ first: "", last: "", email: "", phone: "", pw: "", pw2: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    if (f.pw !== f.pw2) { setErr("Passwords don't match"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: f.email, password: f.pw,
      options: { data: { first_name: f.first, last_name: f.last, phone: f.phone, role: "employer" } },
    });
    setLoading(false);
    if (error) { setErr((error as { message: string }).message); return; }
    setDone(true);
  };

  if (done) return <div className="text-center py-4 text-success font-medium">Account created! You can now sign in.</div>;

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Input label={t("auth.field.firstname")} value={f.first} onChange={(v: string) => setF({ ...f, first: v })} required />
        <Input label={t("auth.field.lastname")} value={f.last} onChange={(v: string) => setF({ ...f, last: v })} required />
      </div>
      <Input label={t("auth.field.email")} type="email" value={f.email} onChange={(v: string) => setF({ ...f, email: v })} required />
      <Input label={t("auth.field.phone")} value={f.phone} onChange={(v: string) => setF({ ...f, phone: v })} required />
      <Input label={t("auth.field.password")} type="password" value={f.pw} onChange={(v: string) => setF({ ...f, pw: v })} required />
      <Input label={t("auth.field.confirmpassword")} type="password" value={f.pw2} onChange={(v: string) => setF({ ...f, pw2: v })} required />
      {err && <div className="text-sm text-destructive">{err}</div>}
      <button disabled={loading} className="w-full py-2.5 rounded-lg gradient-hero text-primary-foreground font-semibold shadow-elegant disabled:opacity-60 flex items-center justify-center gap-2">
        {loading && <Loader2 className="w-4 h-4 animate-spin" />} {t("auth.submit.signup")}
      </button>
    </form>
  );
}

function EmployeeSignup() {
  const { t } = useI18n();
  const [f, setF] = useState({
    first: "", last: "", email: "", phone: "", pw: "",
    location: "", lat: null as number | null, lng: null as number | null,
    category: "driver", licenseCat: "B",
  });
  const [files, setFiles] = useState<Record<string, File | null>>({ id_front: null, id_back: null, license_front: null, license_back: null });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);

  useEffect(() => { loadSettings().then(setSettings); }, []);

  const useMyLocation = () => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      setF((s) => ({
        ...s,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        location: s.location || `${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}`,
      }));
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: f.email, password: f.pw,
      options: { data: { first_name: f.first, last_name: f.last, phone: f.phone, role: "employee" } },
    });
    if (error || !(data as any)?.user) { setErr((error as any)?.message ?? "Signup failed"); setLoading(false); return; }
    const uid = (data as any).user.id;
    setCreatedUserId(uid);

    // Upload documents if driver
    const urls: Record<string, string> = {};
    if (isDriver(f.category)) {
      for (const key of ["id_front", "id_back", "license_front", "license_back"] as const) {
        const file = files[key];
        if (file) {
          const path = `${uid}/${key}-${Date.now()}-${file.name}`;
          const { error: upErr } = await supabase.storage.from("documents").upload(path, file);
          if (!upErr) urls[`${key}_url`] = path;
        }
      }
    }

    // Price is set by admin — use default worker_price from settings
    await supabase.from("employee_profiles").insert({
      user_id: uid,
      category: f.category,
      location_text: f.location,
      lat: f.lat,
      lng: f.lng,
      price_fee: Number(settings.worker_price ?? 5000),
      status: "dormant",
      license_category: isDriver(f.category) ? f.licenseCat : null,
      ...urls,
    });
    setLoading(false);
    setShowPay(true);
  };

  const finalize = async (paid: boolean) => {
    if (!createdUserId) return;
    if (paid) {
      await supabase.from("payments").insert({
        user_id: createdUserId,
        purpose: "registration",
        amount: Number(settings.registration_fee ?? 2000),
        momo_code: settings.momo_code,
      });
      await supabase.from("employee_profiles").update({ status: "pending_activation" }).eq("user_id", createdUserId);
    }
  };

  return (
    <>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Input label={t("auth.field.firstname")} value={f.first} onChange={(v: string) => setF({ ...f, first: v })} required />
          <Input label={t("auth.field.lastname")} value={f.last} onChange={(v: string) => setF({ ...f, last: v })} required />
        </div>
        <Input label={t("auth.field.email")} type="email" value={f.email} onChange={(v: string) => setF({ ...f, email: v })} required />
        <div className="grid grid-cols-2 gap-2">
          <Input label={t("auth.field.phone")} value={f.phone} onChange={(v: string) => setF({ ...f, phone: v })} required />
          <Input label={t("auth.field.password")} type="password" value={f.pw} onChange={(v: string) => setF({ ...f, pw: v })} required />
        </div>
        <div>
          <div className="flex items-end gap-2">
            <div className="flex-1"><Input label={t("auth.field.location")} value={f.location} onChange={(v: string) => setF({ ...f, location: v })} placeholder="e.g. Kigali, Kacyiru" required /></div>
            <button type="button" onClick={useMyLocation} className="px-3 py-2 rounded-lg bg-secondary text-sm flex items-center gap-1">
              <MapPin className="w-4 h-4" /> {t("auth.field.usemylocation")}
            </button>
          </div>
          {f.lat !== null && <div className="text-xs text-success mt-1">📍 Live location captured</div>}
        </div>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">{t("auth.field.category")}</span>
          <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg bg-background border">
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.emoji} {t(`cat.${c.id}` as any)}</option>)}
          </select>
        </label>
        {isDriver(f.category) && (
          <div className="space-y-2 rounded-lg bg-accent/50 p-3">
            <label className="block">
              <span className="text-xs font-medium">{t("auth.field.licensecat")}</span>
              <select value={f.licenseCat} onChange={(e) => setF({ ...f, licenseCat: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg bg-background border">
                {LICENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <FileField label={t("auth.upload.idfront")} onChange={(file) => setFiles((s) => ({ ...s, id_front: file }))} />
            <FileField label={t("auth.upload.idback")} onChange={(file) => setFiles((s) => ({ ...s, id_back: file }))} />
            <FileField label={t("auth.upload.licensefront")} onChange={(file) => setFiles((s) => ({ ...s, license_front: file }))} />
            <FileField label={t("auth.upload.licenseback")} onChange={(file) => setFiles((s) => ({ ...s, license_back: file }))} />
          </div>
        )}
        <div className="text-xs text-muted-foreground bg-accent/50 rounded-lg p-2">
          💡 Your service price will be set by the admin and displayed on your profile card.
        </div>
        {err && <div className="text-sm text-destructive">{err}</div>}
        <button disabled={loading} className="w-full py-2.5 rounded-lg gradient-hero text-primary-foreground font-semibold shadow-elegant disabled:opacity-60 flex items-center justify-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />} {t("auth.submit.signup")}
        </button>
      </form>
      <PaymentModal
        open={showPay}
        onClose={() => setShowPay(false)}
        amount={Number(settings.registration_fee ?? 2000)}
        momoCode={settings.momo_code ?? "*182*8*1*332991"}
        adminPhone={settings.admin_phone ?? "+250 788 000 000"}
        allowDormant
        onDormant={() => { finalize(false); setShowPay(false); }}
        onPaid={() => finalize(true)}
      />
    </>
  );
}

function FileField({ label, onChange }: { label: string; onChange: (f: File | null) => void }) {
  return (
    <label className="block text-xs">
      <span className="font-medium">{label}</span>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        className="mt-1 block w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:cursor-pointer"
      />
    </label>
  );
}
