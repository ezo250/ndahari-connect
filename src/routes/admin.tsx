import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { CATEGORIES } from "@/lib/constants";
import { loadSettings } from "@/lib/settings";
import {
  Users, ClipboardList, Briefcase, FileCheck, MessageSquare,
  Settings as SettingsIcon, Check, X, Plus, Zap, KeyRound, DollarSign, Video,
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

const EMPTY_FORM = {
  first_name: "", last_name: "", email: "", password: "",
  phone: "", role: "employee" as string, category: "driver",
  location_text: "", price_fee: "", video_url: "", status: "active",
};

function UsersTab() {
  const { t } = useI18n();
  const [users, setUsers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [editPrice, setEditPrice] = useState<{ id: string; val: string } | null>(null);
  const [err, setErr] = useState("");

  const load = async () => {
    const { data } = await supabase.from("users").select("*").order("created_at", { ascending: false });
    setUsers((data ?? []) as any[]);
  };

  useEffect(() => { load(); }, []);

  const f = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const addUser = async () => {
    setErr("");
    if (!form.first_name || !form.last_name || !form.email || !form.password) {
      setErr("First name, last name, email and password are required."); return;
    }
    setSaving(true);
    // Use direct API to create user
    const res = await fetch("/api/ndahari", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "auth", subAction: "signup",
        email: form.email, password: form.password,
        role: form.role, first_name: form.first_name, last_name: form.last_name, phone: form.phone,
      }),
    }).then((r) => r.json());
    if (res?.error) { setErr(res.error.message); setSaving(false); return; }
    const userId = res?.data?.user?.id;
    if (userId && (form.price_fee || form.category || form.location_text || form.video_url)) {
      const extra: Record<string, unknown> = { category: form.category, status: form.status };
      if (form.location_text) extra.location_text = form.location_text;
      if (form.price_fee) extra.price_fee = Number(form.price_fee);
      if (form.video_url) extra.video_url = form.video_url;
      await supabase.from("users").update(extra).eq("id", userId);
    }
    setForm(EMPTY_FORM);
    setShowForm(false);
    setSaving(false);
    load();
  };

  const setStatus = async (id: string, status: string) => {
    await supabase.from("users").update({ status }).eq("id", id);
    load();
  };

  const savePrice = async (id: string, price: string) => {
    await supabase.from("users").update({ price_fee: Number(price) }).eq("id", id);
    setEditPrice(null);
    load();
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Delete this user?")) return;
    await supabase.from("users").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-lg">All Users ({users.length})</h2>
        <button onClick={() => setShowForm((v) => !v)} className="px-3 py-2 rounded-lg gradient-hero text-primary-foreground text-sm flex items-center gap-1">
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg border p-4 bg-card space-y-3">
          <h3 className="font-semibold">New User</h3>
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="First name *" value={form.first_name} onChange={f("first_name")} className="px-3 py-2 rounded-lg bg-background border text-sm" />
            <input placeholder="Last name *" value={form.last_name} onChange={f("last_name")} className="px-3 py-2 rounded-lg bg-background border text-sm" />
            <input placeholder="Email *" type="email" value={form.email} onChange={f("email")} className="px-3 py-2 rounded-lg bg-background border text-sm" />
            <input placeholder="Password *" type="password" value={form.password} onChange={f("password")} className="px-3 py-2 rounded-lg bg-background border text-sm" />
            <input placeholder="Phone" value={form.phone} onChange={f("phone")} className="px-3 py-2 rounded-lg bg-background border text-sm" />
            <select value={form.role} onChange={f("role")} className="px-3 py-2 rounded-lg bg-background border text-sm">
              <option value="employee">Employee</option>
              <option value="employer">Employer</option>
            </select>
          </div>
          {form.role === "employee" && (
            <div className="grid grid-cols-2 gap-2">
              <select value={form.category} onChange={f("category")} className="px-3 py-2 rounded-lg bg-background border text-sm">
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.emoji} {t(`cat.${c.id}` as any)}</option>)}
              </select>
              <input placeholder="Location" value={form.location_text} onChange={f("location_text")} className="px-3 py-2 rounded-lg bg-background border text-sm" />
              <input placeholder="Price (RWF)" type="number" value={form.price_fee} onChange={f("price_fee")} className="px-3 py-2 rounded-lg bg-background border text-sm" />
              <select value={form.status} onChange={f("status")} className="px-3 py-2 rounded-lg bg-background border text-sm">
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Video className="w-3 h-3" /> Proof video URL (YouTube or direct link)</label>
                <input placeholder="https://youtube.com/watch?v=..." value={form.video_url} onChange={f("video_url")} className="w-full px-3 py-2 rounded-lg bg-background border text-sm" />
              </div>
            </div>
          )}
          {err && <div className="text-sm text-destructive">{err}</div>}
          <div className="flex gap-2">
            <button onClick={addUser} disabled={saving} className="px-4 py-2 rounded-lg gradient-hero text-primary-foreground text-sm disabled:opacity-60">{saving ? "Saving…" : "Create User"}</button>
            <button onClick={() => { setShowForm(false); setErr(""); setForm(EMPTY_FORM); }} className="px-4 py-2 rounded-lg bg-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {users.filter((u) => u.role !== "admin").map((u) => (
          <div key={u.id} className="rounded-lg border p-4 bg-card space-y-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="font-semibold">
                  {u.first_name} {u.last_name}
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-secondary">{u.role}</span>
                  <span className="ml-1 text-xs text-muted-foreground">· {u.email}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {u.category && <>{CATEGORIES.find((c) => c.id === u.category)?.emoji} {t(`cat.${u.category}` as any)} · </>}
                  {u.location_text && <>{u.location_text} · </>}
                  📞 {u.phone}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs px-2 py-1 rounded-full bg-secondary">{u.status ?? "active"}</span>
                {u.status !== "active" && (
                  <button onClick={() => setStatus(u.id, "active")} className="px-2 py-1 rounded-md bg-success/20 text-success text-xs flex items-center gap-1">
                    <Check className="w-3 h-3" /> Activate
                  </button>
                )}
                {u.status !== "suspended" && (
                  <button onClick={() => setStatus(u.id, "suspended")} className="px-2 py-1 rounded-md bg-destructive/20 text-destructive text-xs flex items-center gap-1">
                    <X className="w-3 h-3" /> Suspend
                  </button>
                )}
                <button onClick={() => deleteUser(u.id)} className="px-2 py-1 rounded-md bg-destructive/20 text-destructive text-xs">Delete</button>
              </div>
            </div>

            {u.role === "employee" && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  {editPrice?.id === u.id ? (
                    <>
                      <input type="number" value={editPrice.val} onChange={(ev) => setEditPrice({ id: u.id, val: ev.target.value })} className="w-28 px-2 py-1 rounded-md bg-background border text-sm" />
                      <button onClick={() => savePrice(u.id, editPrice.val)} className="px-2 py-1 rounded-md bg-primary text-primary-foreground text-xs">Save</button>
                      <button onClick={() => setEditPrice(null)} className="px-2 py-1 rounded-md bg-secondary text-xs">Cancel</button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-medium">{Number(u.price_fee ?? 0).toLocaleString()} RWF</span>
                      <button onClick={() => setEditPrice({ id: u.id, val: String(u.price_fee ?? 0) })} className="px-2 py-1 rounded-md bg-secondary text-xs">Set price</button>
                    </>
                  )}
                </div>
                {u.video_url && (
                  <a href={u.video_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary underline">
                    <Video className="w-3 h-3" /> View proof video
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
        {users.filter((u) => u.role !== "admin").length === 0 && (
          <div className="text-sm text-muted-foreground">No users yet.</div>
        )}
      </div>
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
