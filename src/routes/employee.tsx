import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { CATEGORIES } from "@/lib/constants";
import { loadSettings } from "@/lib/settings";
import { PaymentModal } from "@/components/PaymentModal";
import { MapPin, Send, RefreshCw, MessageSquare, FileText, Moon, Sun, KeyRound } from "lucide-react";

export const Route = createFileRoute("/employee")({
  head: () => ({
    meta: [
      { title: "Worker dashboard — Ndahari" },
      { name: "description", content: "Manage your Ndahari worker profile, subscription and applications." },
    ],
  }),
  component: EmployeeDash,
});

function EmployeeDash() {
  const { t } = useI18n();
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [emp, setEmp] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [msgBody, setMsgBody] = useState("");
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [showPay, setShowPay] = useState(false);
  const [dark, setDark] = useState(false);
  const [showPwChange, setShowPwChange] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
    if (!loading && user && !roles.includes("employee") && roles.length > 0) {
      navigate({ to: roles.includes("admin") ? "/admin" : "/employer" });
    }
  }, [user, roles, loading, navigate]);

  useEffect(() => {
    const stored = localStorage.getItem("ndahari.theme");
    const isDark = stored === "dark";
    setDark(isDark);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("ndahari.theme", next ? "dark" : "light");
  };

  const load = async () => {
    if (!user) return;
    const [{ data: p }, { data: e }, { data: j }, { data: m }] = await Promise.all([
      supabase.from("users").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("employee_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("jobs").select("*").eq("is_public", true).order("created_at", { ascending: false }),
      supabase.from("messages").select("*").eq("thread_user_id", user.id).order("created_at", { ascending: true }),
    ]);
    setProfile(p ?? user);
    setEmp(e);
    setJobs((j ?? []) as any[]);
    setMessages((m ?? []) as any[]);
    setSettings(await loadSettings());
  };

  useEffect(() => { load(); }, [user]);

  const statusColors: Record<string, string> = {
    dormant: "bg-muted text-muted-foreground",
    pending_activation: "bg-warning/20 text-warning",
    active: "bg-success/20 text-success",
    in_service: "bg-primary/20 text-primary",
    suspended: "bg-destructive/20 text-destructive",
  };

  const sendMessage = async () => {
    if (!msgBody.trim() || !user) return;
    await supabase.from("messages").insert({
      from_user_id: user.id, thread_user_id: user.id, body: msgBody, from_admin: false,
    });
    setMsgBody("");
    load();
  };

  const reportPayment = async () => {
    if (!user) return;
    await supabase.from("payments").insert({
      user_id: user.id,
      purpose: emp?.status === "dormant" ? "registration" : "renewal",
      amount: Number(settings.registration_fee ?? 2000),
      momo_code: settings.momo_code,
    });
    await supabase.from("employee_profiles").update({ status: "pending_activation" }).eq("user_id", user.id);
    load();
  };

  const applyJob = async (jobId: string) => {
    if (!user) return;
    if (emp?.status !== "active" && emp?.status !== "in_service") {
      alert("Activate your account to apply.");
      return;
    }
    const cover = prompt("Cover letter (short message to admin)");
    if (cover === null) return;
    await supabase.from("applications").insert({ job_id: jobId, employee_id: user.id, cover_letter: cover });
    alert("Application submitted!");
  };

  const changePassword = async () => {
    setPwMsg("");
    if (!newPw || newPw !== confirmPw) { setPwMsg("Passwords don't match"); return; }
    await (supabase.auth as any).updatePassword({ userId: user?.id ?? "", newPassword: newPw });
    setPwMsg("Password updated!");
    setNewPw(""); setConfirmPw("");
  };

  if (!user || !emp) return <div className="p-10 text-center text-muted-foreground">{t("common.loading")}</div>;
  const cat = CATEGORIES.find((c) => c.id === emp.category);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{t("dashboard.title")}</h1>
        <button onClick={toggleTheme} className="p-2 rounded-md bg-secondary hover:bg-accent transition" aria-label="Toggle theme">
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile card */}
        <div className="md:col-span-1 gradient-card rounded-2xl border p-6 shadow-elegant space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full gradient-hero flex items-center justify-center text-primary-foreground font-bold text-2xl">
              {((profile?.first_name ?? user.first_name ?? "?")[0]).toUpperCase()}
            </div>
            <div>
              <div className="font-bold">{profile?.first_name ?? user.first_name} {profile?.last_name ?? user.last_name}</div>
              <div className="text-xs text-muted-foreground">{cat?.emoji} {t(`cat.${emp.category}` as any)}</div>
            </div>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="w-3.5 h-3.5" /> {emp.location_text}</div>
            <div className="font-semibold text-primary">💵 {Number(emp.price_fee ?? 0).toLocaleString()} RWF <span className="text-xs font-normal text-muted-foreground">(set by admin)</span></div>
          </div>
          <div>
            <div className="text-xs uppercase font-semibold text-muted-foreground mb-1">{t("dashboard.status")}</div>
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusColors[emp.status] ?? ""}`}>
              {t(`status.${emp.status}` as any)}
            </span>
          </div>
          {emp.status !== "active" && emp.status !== "in_service" && (
            <button onClick={() => setShowPay(true)} className="w-full py-2 rounded-lg gradient-hero text-primary-foreground text-sm font-medium shadow-elegant flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4" /> {t("dashboard.renew")}
            </button>
          )}
          <button onClick={() => setShowPwChange(!showPwChange)} className="w-full py-2 rounded-lg bg-secondary text-sm flex items-center justify-center gap-2">
            <KeyRound className="w-4 h-4" /> Change password
          </button>
          {showPwChange && (
            <div className="space-y-2">
              <input type="password" placeholder="New password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-background border text-sm" />
              <input type="password" placeholder="Confirm password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-background border text-sm" />
              {pwMsg && <div className="text-xs text-success">{pwMsg}</div>}
              <button onClick={changePassword} className="w-full py-1.5 rounded-lg gradient-hero text-primary-foreground text-sm">Save</button>
            </div>
          )}
        </div>

        {/* Jobs + Messages */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-2xl border p-6 bg-card">
            <h2 className="font-bold mb-4 flex items-center gap-2"><FileText className="w-4 h-4" /> {t("dashboard.applyjobs")}</h2>
            {jobs.length === 0 ? (
              <div className="text-sm text-muted-foreground">No public jobs yet.</div>
            ) : (
              <div className="space-y-3">
                {jobs.map((j) => (
                  <div key={j.id} className="rounded-lg border p-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{j.title}</div>
                      <div className="text-xs text-muted-foreground">{CATEGORIES.find((c) => c.id === j.category)?.emoji} {t(`cat.${j.category}` as any)} · {j.location ?? "—"}</div>
                      {j.description && <p className="text-sm mt-1">{j.description}</p>}
                    </div>
                    <button onClick={() => applyJob(j.id)} className="px-3 py-1.5 rounded-md gradient-hero text-primary-foreground text-xs font-medium">
                      {t("dashboard.apply")}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border p-6 bg-card">
            <h2 className="font-bold mb-4 flex items-center gap-2"><MessageSquare className="w-4 h-4" /> {t("dashboard.messages")}</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto mb-3">
              {messages.map((m) => (
                <div key={m.id} className={`p-3 rounded-lg text-sm ${m.from_admin ? "bg-accent" : "bg-primary/10 ml-8"}`}>
                  <div className="text-xs text-muted-foreground mb-0.5">{m.from_admin ? "Admin" : "You"}</div>
                  {m.body}
                </div>
              ))}
              {messages.length === 0 && <div className="text-sm text-muted-foreground">No messages yet.</div>}
            </div>
            <div className="flex gap-2">
              <input value={msgBody} onChange={(e) => setMsgBody(e.target.value)} placeholder="Write to admin…" className="flex-1 px-3 py-2 rounded-lg bg-background border" />
              <button onClick={sendMessage} className="px-4 py-2 rounded-lg gradient-hero text-primary-foreground flex items-center gap-1"><Send className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </div>

      <PaymentModal
        open={showPay}
        onClose={() => setShowPay(false)}
        amount={Number(settings.registration_fee ?? 2000)}
        momoCode={settings.momo_code ?? "*182*8*1*332991"}
        adminPhone={settings.admin_phone ?? "+250 788 000 000"}
        onPaid={reportPayment}
      />
    </div>
  );
}
