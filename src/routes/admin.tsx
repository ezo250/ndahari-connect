import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { CATEGORIES } from "@/lib/constants";
import { loadSettings } from "@/lib/settings";
import {
  Users, ClipboardList, Briefcase, FileCheck, MessageSquare,
  Settings as SettingsIcon, Check, X, Plus, Zap, KeyRound, DollarSign,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin panel — Ndahari" },
      { name: "description", content: "Ndahari administration." },
    ],
  }),
  component: AdminPanel,
});

type Tab = "users" | "reservations" | "jobs" | "applications" | "messages" | "settings" | "credentials";

function AdminPanel() {
  const { t } = useI18n();
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("users");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
    if (!loading && user && !roles.includes("admin")) {
      navigate({ to: roles.includes("employer") ? "/employer" : "/employee" });
    }
  }, [user, roles, loading, navigate]);

  if (!user || !roles.includes("admin"))
    return <div className="p-10 text-center text-muted-foreground">{t("common.loading")}</div>;

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "users", label: t("admin.tab.users"), icon: Users },
    { id: "reservations", label: t("admin.tab.reservations"), icon: ClipboardList },
    { id: "jobs", label: t("admin.tab.jobs"), icon: Briefcase },
    { id: "applications", label: t("admin.tab.applications"), icon: FileCheck },
    { id: "messages", label: t("admin.tab.messages"), icon: MessageSquare },
    { id: "settings", label: t("admin.tab.settings"), icon: SettingsIcon },
    { id: "credentials", label: "My Credentials", icon: KeyRound },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 animate-fade-in">
      <h1 className="text-3xl font-bold mb-2">{t("admin.title")}</h1>
      <p className="text-sm text-muted-foreground mb-6">Full control over Ndahari.</p>

      <div className="flex flex-wrap gap-2 mb-6 border-b pb-2">
        {tabs.map((tt) => (
          <button
            key={tt.id}
            onClick={() => setTab(tt.id)}
            className={`px-3 py-2 text-sm rounded-md flex items-center gap-1.5 transition ${tab === tt.id ? "gradient-hero text-primary-foreground" : "hover:bg-accent"}`}
          >
            <tt.icon className="w-4 h-4" /> {tt.label}
          </button>
        ))}
      </div>

      {tab === "users" && <UsersTab />}
      {tab === "reservations" && <ReservationsTab />}
      {tab === "jobs" && <JobsTab />}
      {tab === "applications" && <ApplicationsTab />}
      {tab === "messages" && <MessagesTab />}
      {tab === "settings" && <SettingsTab />}
      {tab === "credentials" && <CredentialsTab />}
    </div>
  );
}

function UsersTab() {
  const { t } = useI18n();
  const [emps, setEmps] = useState<any[]>([]);
  const [editPrice, setEditPrice] = useState<{ id: string; val: string } | null>(null);

  const load = async () => {
    const { data: e } = await supabase
      .from("employee_profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (!e?.length) { setEmps([]); return; }
    const { data: p } = await supabase
      .from("users")
      .select("*")
      .in("id", (e as any[]).map((x) => x.user_id));
    const map = new Map(((p ?? []) as any[]).map((x) => [x.id, x]));
    setEmps((e as any[]).map((x) => ({ ...x, profile: map.get(x.user_id) })));
  };

  useEffect(() => { load(); }, []);

  const setStatus = async (uid: string, status: string) => {
    const update: any = { status };
    if (status === "active") {
      const days = 30;
      const exp = new Date();
      exp.setDate(exp.getDate() + days);
      update.subscription_expires_at = exp.toISOString();
    }
    await supabase.from("employee_profiles").update(update).eq("user_id", uid);
    load();
  };

  const savePrice = async (uid: string, price: string) => {
    await supabase.from("employee_profiles").update({ price_fee: Number(price) }).eq("user_id", uid);
    setEditPrice(null);
    load();
  };

  return (
    <div className="space-y-3">
      {emps.map((e) => (
        <div key={e.user_id} className="rounded-lg border p-4 bg-card space-y-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="font-semibold">
                {e.profile?.first_name} {e.profile?.last_name}{" "}
                <span className="text-xs text-muted-foreground">· {e.profile?.email}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {CATEGORIES.find((c) => c.id === e.category)?.emoji} {t(`cat.${e.category}` as any)} · {e.location_text} · 📞 {e.profile?.phone}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs px-2 py-1 rounded-full bg-secondary">{t(`status.${e.status}` as any)}</span>
              {e.status !== "active" && (
                <button onClick={() => setStatus(e.user_id, "active")} className="px-2 py-1 rounded-md bg-success/20 text-success text-xs font-medium flex items-center gap-1">
                  <Check className="w-3 h-3" /> {t("admin.activate")}
                </button>
              )}
              {e.status !== "suspended" && (
                <button onClick={() => setStatus(e.user_id, "suspended")} className="px-2 py-1 rounded-md bg-destructive/20 text-destructive text-xs font-medium flex items-center gap-1">
                  <X className="w-3 h-3" /> {t("admin.deactivate")}
                </button>
              )}
            </div>
          </div>
          {/* Admin sets price */}
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            {editPrice?.id === e.user_id ? (
              <>
                <input
                  type="number"
                  value={editPrice.val}
                  onChange={(ev) => setEditPrice({ id: e.user_id, val: ev.target.value })}
                  className="w-28 px-2 py-1 rounded-md bg-background border text-sm"
                />
                <button onClick={() => savePrice(e.user_id, editPrice.val)} className="px-2 py-1 rounded-md bg-primary text-primary-foreground text-xs">Save</button>
                <button onClick={() => setEditPrice(null)} className="px-2 py-1 rounded-md bg-secondary text-xs">Cancel</button>
              </>
            ) : (
              <>
                <span className="text-sm font-medium">{Number(e.price_fee ?? 0).toLocaleString()} RWF</span>
                <button
                  onClick={() => setEditPrice({ id: e.user_id, val: String(e.price_fee ?? 0) })}
                  className="px-2 py-1 rounded-md bg-secondary text-xs"
                >
                  Set price
                </button>
              </>
            )}
          </div>
        </div>
      ))}
      {emps.length === 0 && <div className="text-sm text-muted-foreground">No workers yet.</div>}
    </div>
  );
}

function ReservationsTab() {
  const { t } = useI18n();
  const [rows, setRows] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase.from("reservations").select("*").order("created_at", { ascending: false });
    if (!data?.length) { setRows([]); return; }
    const ids = Array.from(new Set([...(data as any[]).map((r) => r.employer_id), ...(data as any[]).map((r) => r.employee_id)]));
    const { data: profs } = await supabase.from("users").select("*").in("id", ids);
    const map = new Map(((profs ?? []) as any[]).map((p) => [p.id, p]));
    setRows((data as any[]).map((r) => ({ ...r, employer: map.get(r.employer_id), employee: map.get(r.employee_id) })));
  };

  useEffect(() => { load(); }, []);

  const pair = async (r: any) => {
    await supabase.from("reservations").update({ status: "in_service" }).eq("id", r.id);
    await supabase.from("employee_profiles").update({ status: "in_service" }).eq("user_id", r.employee_id);
    load();
  };

  const confirm = async (r: any) => {
    await supabase.from("reservations").update({ status: "confirmed" }).eq("id", r.id);
    await supabase.from("payments").update({ confirmed: true, confirmed_at: new Date().toISOString() }).eq("reservation_id", r.id);
    load();
  };

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.id} className="rounded-lg border p-4 bg-card">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-sm"><b>Employer:</b> {r.employer?.first_name} {r.employer?.last_name} ({r.employer?.phone})</div>
              <div className="text-sm"><b>Worker:</b> {r.employee?.first_name} {r.employee?.last_name} ({r.employee?.phone})</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-1 rounded-full bg-secondary">{r.status}</span>
              {r.status === "payment_reported" && (
                <button onClick={() => confirm(r)} className="px-2 py-1 rounded-md bg-primary text-primary-foreground text-xs flex items-center gap-1">
                  <Check className="w-3 h-3" /> {t("admin.confirm")}
                </button>
              )}
              {(r.status === "confirmed" || r.status === "payment_reported") && (
                <button onClick={() => pair(r)} className="px-2 py-1 rounded-md gradient-hero text-primary-foreground text-xs flex items-center gap-1">
                  <Zap className="w-3 h-3" /> {t("admin.pair")}
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
      {rows.length === 0 && <div className="text-sm text-muted-foreground">No reservations yet.</div>}
    </div>
  );
}

function JobsTab() {
  const { t } = useI18n();
  const [jobs, setJobs] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: "", description: "", category: "driver", location: "",
    is_public: true, requires_resume: true, requires_cover_letter: true,
  });

  const load = async () => {
    const { data } = await supabase.from("jobs").select("*").order("created_at", { ascending: false });
    setJobs((data ?? []) as any[]);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.title) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("jobs").insert({ ...form, admin_id: user?.id });
    setForm({ title: "", description: "", category: "driver", location: "", is_public: true, requires_resume: true, requires_cover_letter: true });
    load();
  };

  const del = async (id: string) => {
    await supabase.from("jobs").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4 bg-card space-y-2">
        <h3 className="font-semibold flex items-center gap-1"><Plus className="w-4 h-4" /> New job</h3>
        <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-background border" />
        <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-background border" />
        <div className="grid grid-cols-2 gap-2">
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="px-3 py-2 rounded-lg bg-background border">
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.emoji} {t(`cat.${c.id}` as any)}</option>)}
          </select>
          <input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="px-3 py-2 rounded-lg bg-background border" />
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <label className="flex items-center gap-1"><input type="checkbox" checked={form.is_public} onChange={(e) => setForm({ ...form, is_public: e.target.checked })} /> Public</label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={form.requires_resume} onChange={(e) => setForm({ ...form, requires_resume: e.target.checked })} /> Require résumé</label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={form.requires_cover_letter} onChange={(e) => setForm({ ...form, requires_cover_letter: e.target.checked })} /> Require cover letter</label>
        </div>
        <button onClick={create} className="px-4 py-2 rounded-lg gradient-hero text-primary-foreground text-sm font-medium">Create</button>
      </div>
      <div className="space-y-2">
        {(jobs as any[]).map((j) => (
          <div key={j.id} className="rounded-lg border p-3 bg-card flex justify-between items-center">
            <div>
              <div className="font-semibold">{j.title} <span className="text-xs text-muted-foreground">· {j.is_public ? "public" : "private"}</span></div>
              <div className="text-xs text-muted-foreground">{t(`cat.${j.category}` as any)} · {j.location}</div>
            </div>
            <button onClick={() => del(j.id)} className="px-2 py-1 rounded-md bg-destructive/20 text-destructive text-xs">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ApplicationsTab() {
  const [apps, setApps] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase.from("applications").select("*").order("created_at", { ascending: false });
    if (!data?.length) { setApps([]); return; }
    const [{ data: jobs }, { data: profs }] = await Promise.all([
      supabase.from("jobs").select("*").in("id", (data as any[]).map((a) => a.job_id)),
      supabase.from("users").select("*").in("id", (data as any[]).map((a) => a.employee_id)),
    ]);
    const jm = new Map(((jobs ?? []) as any[]).map((j) => [j.id, j]));
    const pm = new Map(((profs ?? []) as any[]).map((p) => [p.id, p]));
    setApps((data as any[]).map((a) => ({ ...a, job: jm.get(a.job_id), profile: pm.get(a.employee_id) })));
  };

  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: string) => {
    await supabase.from("applications").update({ status }).eq("id", id);
    load();
  };

  return (
    <div className="space-y-2">
      {apps.map((a) => (
        <div key={a.id} className="rounded-lg border p-3 bg-card">
          <div className="flex justify-between items-start gap-3 flex-wrap">
            <div>
              <div className="font-semibold">{a.profile?.first_name} {a.profile?.last_name} → {a.job?.title}</div>
              <div className="text-xs text-muted-foreground">{a.cover_letter}</div>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs px-2 py-1 rounded-full bg-secondary">{a.status}</span>
              <button onClick={() => setStatus(a.id, "accepted")} className="px-2 py-1 rounded-md bg-success/20 text-success text-xs">Accept</button>
              <button onClick={() => setStatus(a.id, "rejected")} className="px-2 py-1 rounded-md bg-destructive/20 text-destructive text-xs">Reject</button>
            </div>
          </div>
        </div>
      ))}
      {apps.length === 0 && <div className="text-sm text-muted-foreground">No applications.</div>}
    </div>
  );
}

function MessagesTab() {
  const [threads, setThreads] = useState<any[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [body, setBody] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("messages").select("*").order("created_at", { ascending: true });
      const grouped = new Map<string, any[]>();
      for (const m of (data ?? []) as any[]) {
        const arr = grouped.get(m.thread_user_id) ?? [];
        arr.push(m);
        grouped.set(m.thread_user_id, arr);
      }
      const ids = Array.from(grouped.keys());
      const { data: profs } = ids.length
        ? await supabase.from("users").select("id,first_name,last_name").in("id", ids)
        : { data: [] };
      const pm = new Map(((profs ?? []) as any[]).map((p) => [p.id, p]));
      setThreads(ids.map((id) => ({ id, profile: pm.get(id), latest: grouped.get(id)!.slice(-1)[0] })));
    })();
  }, [active]);

  useEffect(() => {
    if (!active) return;
    supabase.from("messages").select("*").eq("thread_user_id", active).order("created_at", { ascending: true })
      .then(({ data }) => setMsgs((data ?? []) as any[]));
  }, [active]);

  const send = async () => {
    if (!active || !body.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("messages").insert({ thread_user_id: active, from_user_id: user.id, body, from_admin: true });
    setBody("");
    supabase.from("messages").select("*").eq("thread_user_id", active).order("created_at", { ascending: true })
      .then(({ data }) => setMsgs((data ?? []) as any[]));
  };

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <div className="space-y-2">
        {threads.map((t) => (
          <button key={t.id} onClick={() => setActive(t.id)} className={`w-full text-left p-3 rounded-lg border ${active === t.id ? "border-primary bg-primary/5" : "bg-card"}`}>
            <div className="font-semibold text-sm">{t.profile?.first_name} {t.profile?.last_name}</div>
            <div className="text-xs text-muted-foreground truncate">{t.latest?.body}</div>
          </button>
        ))}
        {threads.length === 0 && <div className="text-sm text-muted-foreground">No messages.</div>}
      </div>
      <div className="md:col-span-2 rounded-lg border p-4 bg-card min-h-[300px] flex flex-col">
        {active ? (
          <>
            <div className="flex-1 space-y-2 overflow-y-auto mb-3">
              {msgs.map((m) => (
                <div key={m.id} className={`p-2 rounded-lg text-sm ${m.from_admin ? "bg-primary/10 ml-8" : "bg-accent"}`}>{m.body}</div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={body} onChange={(e) => setBody(e.target.value)} className="flex-1 px-3 py-2 rounded-lg bg-background border" placeholder="Reply…" />
              <button onClick={send} className="px-4 py-2 rounded-lg gradient-hero text-primary-foreground">Send</button>
            </div>
          </>
        ) : (
          <div className="text-sm text-muted-foreground m-auto">Select a thread</div>
        )}
      </div>
    </div>
  );
}

function SettingsTab() {
  const [s, setS] = useState<Record<string, string>>({});

  useEffect(() => { loadSettings().then(setS); }, []);

  const save = async () => {
    for (const [key, value] of Object.entries(s)) {
      await supabase.from("settings").upsert({ key, value });
    }
    alert("Settings saved!");
  };

  const fields: [string, string][] = [
    ["registration_fee", "Registration fee (RWF)"],
    ["client_fee", "Client fee per reservation (RWF)"],
    ["subscription_days", "Subscription duration (days)"],
    ["momo_code", "MoMo code"],
    ["admin_phone", "Admin contact phone"],
    ["worker_price", "Default worker price (RWF)"],
  ];

  return (
    <div className="max-w-xl space-y-3">
      {fields.map(([k, label]) => (
        <label key={k} className="block">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <input
            value={s[k] ?? ""}
            onChange={(e) => setS({ ...s, [k]: e.target.value })}
            className="mt-1 w-full px-3 py-2 rounded-lg bg-background border"
          />
        </label>
      ))}
      <button onClick={save} className="px-4 py-2 rounded-lg gradient-hero text-primary-foreground text-sm font-medium">Save settings</button>
    </div>
  );
}

function CredentialsTab() {
  const { user, refresh } = useAuth();
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setErr(""); setMsg("");
    if (newPassword && newPassword !== confirmPassword) {
      setErr("Passwords do not match");
      return;
    }
    if (!newEmail && !newPassword) {
      setErr("Enter a new email or password");
      return;
    }
    setLoading(true);
    await (supabase.auth as any).updateAdminCredentials({
      userId: user?.id ?? "",
      newEmail: newEmail || undefined,
      newPassword: newPassword || undefined,
    });
    await refresh();
    setMsg("Credentials updated successfully!");
    setNewEmail(""); setNewPassword(""); setConfirmPassword("");
    setLoading(false);
  };

  return (
    <div className="max-w-md space-y-4">
      <h2 className="font-bold text-lg flex items-center gap-2"><KeyRound className="w-5 h-5" /> Change Admin Credentials</h2>
      <div className="text-sm text-muted-foreground">Current email: <span className="font-medium text-foreground">{user?.email}</span></div>
      <label className="block">
        <span className="text-xs font-medium text-muted-foreground">New email (leave blank to keep current)</span>
        <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg bg-background border" placeholder="new@email.com" />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-muted-foreground">New password (leave blank to keep current)</span>
        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg bg-background border" placeholder="••••••••" />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-muted-foreground">Confirm new password</span>
        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg bg-background border" placeholder="••••••••" />
      </label>
      {err && <div className="text-sm text-destructive">{err}</div>}
      {msg && <div className="text-sm text-success">{msg}</div>}
      <button onClick={save} disabled={loading} className="px-4 py-2 rounded-lg gradient-hero text-primary-foreground text-sm font-medium disabled:opacity-60">
        {loading ? "Saving…" : "Update credentials"}
      </button>
    </div>
  );
}
