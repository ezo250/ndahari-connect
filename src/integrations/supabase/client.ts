type Session = {
  access_token: string;
  user: { id: string; email: string; role?: string; first_name?: string; last_name?: string; phone?: string } | null;
};

type AuthState = {
  user: { id: string; email: string; role?: string; first_name?: string; last_name?: string; phone?: string } | null;
  session: Session | null;
};

const AUTH_STORAGE_KEY = "ndahari.auth";

function readAuthState(): AuthState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthState;
  } catch {
    return null;
  }
}

function writeAuthState(state: AuthState | null) {
  if (typeof window === "undefined") return;
  if (!state) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
}

async function apiRequest(payload: Record<string, unknown>) {
  const response = await fetch("/api/ndahari", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { error: { message: (json as { error?: { message?: string } })?.error?.message ?? "Request failed" } };
  }
  return json as Record<string, unknown>;
}

class QueryBuilder {
  private collection: string;
  private operation = "find";
  private filter: Record<string, unknown> = {};
  private _projection?: Record<string, unknown>;
  private _sort?: Record<string, 1 | -1>;
  private data?: Record<string, unknown>;
  private upsertFilter?: Record<string, unknown>;
  private maybeSingleMode = false;
  private limitVal?: number;

  constructor(collection: string) {
    this.collection = collection;
  }

  select(_columns?: string) {
    return this;
  }

  eq(field: string, value: unknown) {
    this.filter[field] = value;
    return this;
  }

  in(field: string, values: unknown[]) {
    this.filter[field] = { $in: values };
    return this;
  }

  order(field: string, config?: { ascending?: boolean }) {
    this._sort = { [field]: config?.ascending === false ? -1 : 1 };
    return this;
  }

  limit(n: number) {
    this.limitVal = n;
    return this;
  }

  maybeSingle() {
    this.maybeSingleMode = true;
    return this;
  }

  single() {
    this.maybeSingleMode = true;
    return this;
  }

  insert(data: Record<string, unknown>) {
    this.operation = "insert";
    this.data = data;
    return this;
  }

  update(data: Record<string, unknown>) {
    this.operation = "update";
    this.data = data;
    return this;
  }

  delete() {
    this.operation = "delete";
    return this;
  }

  upsert(data: Record<string, unknown>, options?: { onConflict?: string }) {
    this.operation = "upsert";
    this.data = data;
    // For settings upsert, filter by key
    if (options?.onConflict && data[options.onConflict] !== undefined) {
      this.upsertFilter = { [options.onConflict]: data[options.onConflict] };
    } else if (data.key !== undefined) {
      this.upsertFilter = { key: data.key };
    }
    return this;
  }

  then(
    resolve: (value: { data: unknown; error?: { message: string } | null }) => unknown,
    reject?: (reason?: unknown) => unknown,
  ) {
    return this.execute().then(resolve as never, reject as never);
  }

  catch(reject: (reason?: unknown) => unknown) {
    return this.execute().catch(reject);
  }

  finally(callback: () => void) {
    return this.execute().finally(callback);
  }

  private async execute() {
    const payload: Record<string, unknown> = {
      action: "query",
      collection: this.collection,
      operation: this.operation,
      filter: this.filter,
      sort: this._sort,
      data: this.data,
    };
    if (this._projection) payload.projection = this._projection;
    if (this.upsertFilter) payload.upsertFilter = this.upsertFilter;
    if (this.limitVal !== undefined) payload.limit = this.limitVal;

    const response = await apiRequest(payload);

    if (response?.error) {
      return { data: null, error: response.error as { message: string } };
    }

    const raw = response?.data;
    let payload2 = Array.isArray(raw) ? raw : raw;

    // Apply limit client-side if needed
    if (this.limitVal !== undefined && Array.isArray(payload2)) {
      payload2 = payload2.slice(0, this.limitVal);
    }

    if (this.maybeSingleMode) {
      const data = Array.isArray(payload2) ? payload2[0] ?? null : payload2 ?? null;
      return { data, error: null };
    }
    return { data: payload2 ?? [], error: null };
  }
}

// Auth state change listeners
type AuthListener = (event: string, session: Session | null) => void;
const authListeners: AuthListener[] = [];

const authApi = {
  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const result = await apiRequest({ action: "auth", subAction: "signin", email, password });
    if ((result as { data?: { session?: unknown } })?.data?.session) {
      const d = (result as { data: { user: AuthState["user"]; session: Session } }).data;
      writeAuthState({ user: d.user ?? null, session: d.session });
      authListeners.forEach((fn) => fn("SIGNED_IN", d.session));
    }
    return { data: (result as { data?: unknown }).data ?? null, error: (result as { error?: unknown }).error ?? null };
  },

  async signUp({
    email,
    password,
    options,
  }: {
    email: string;
    password: string;
    options?: { data?: Record<string, unknown>; emailRedirectTo?: string };
  }) {
    const result = await apiRequest({
      action: "auth",
      subAction: "signup",
      email,
      password,
      role: (options?.data?.role as string) ?? "employer",
      first_name: (options?.data?.first_name as string) ?? "",
      last_name: (options?.data?.last_name as string) ?? "",
      phone: (options?.data?.phone as string) ?? "",
    });
    if ((result as { data?: { session?: unknown } })?.data?.session) {
      const d = (result as { data: { user: AuthState["user"]; session: Session } }).data;
      writeAuthState({ user: d.user ?? null, session: d.session });
      authListeners.forEach((fn) => fn("SIGNED_IN", d.session));
    }
    return { data: (result as { data?: unknown }).data ?? null, error: (result as { error?: unknown }).error ?? null };
  },

  async getSession() {
    const state = readAuthState();
    return { data: { session: state?.session ?? null } };
  },

  async getUser() {
    const state = readAuthState();
    return { data: { user: state?.user ?? null } };
  },

  async signOut() {
    writeAuthState(null);
    authListeners.forEach((fn) => fn("SIGNED_OUT", null));
    return { error: null };
  },

  onAuthStateChange(callback: AuthListener) {
    authListeners.push(callback);
    // Fire immediately with current state (tab restore)
    const state = readAuthState();
    setTimeout(() => callback("INITIAL_SESSION", state?.session ?? null), 0);
    return {
      subscription: {
        unsubscribe: () => {
          const idx = authListeners.indexOf(callback);
          if (idx !== -1) authListeners.splice(idx, 1);
        },
      },
    };
  },

  async updateAdminCredentials({
    userId,
    newEmail,
    newPassword,
  }: {
    userId: string;
    newEmail?: string;
    newPassword?: string;
  }) {
    const result = await apiRequest({
      action: "auth",
      subAction: "updateAdminCredentials",
      userId,
      newEmail: newEmail ?? "",
      newPassword: newPassword ?? "",
    });
    // Update local session if email changed
    if (newEmail) {
      const state = readAuthState();
      if (state?.user) {
        state.user.email = newEmail;
        if (state.session?.user) state.session.user.email = newEmail;
        writeAuthState(state);
      }
    }
    return result;
  },

  async updatePassword({ userId, newPassword }: { userId: string; newPassword: string }) {
    return apiRequest({ action: "auth", subAction: "updatePassword", userId, newPassword });
  },
};

const storageApi = {
  from(_bucket: string) {
    return {
      async upload(path: string, file: File | Blob) {
        await apiRequest({
          action: "query",
          collection: "documents",
          operation: "insert",
          data: {
            path,
            name: file instanceof File ? file.name : path,
            type: file instanceof File ? file.type : "application/octet-stream",
          },
        });
        return { error: null };
      },
    };
  },
};

export const supabase = {
  from(collection: string) {
    return new QueryBuilder(collection);
  },
  auth: authApi,
  storage: storageApi,
};
