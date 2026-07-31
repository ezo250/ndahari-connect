import { createHash, randomUUID } from "node:crypto";
import { MongoClient, type Document } from "mongodb";

const DEFAULT_URI =
  "mongodb+srv://ernestekubwimana24snhu_db_user:Ishoborabyose24980@cluster0.v6zt99j.mongodb.net/ndahari?retryWrites=true&w=majority";
const DB_NAME = "ndahari";

let clientPromise: Promise<MongoClient> | null = null;

function getUri() {
  return process.env.MONGODB_URI || process.env.VITE_MONGODB_URI || DEFAULT_URI;
}

async function getClient() {
  if (!clientPromise) {
    clientPromise = new MongoClient(getUri(), {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
    }).connect();
  }
  return clientPromise;
}

export async function getDb() {
  const client = await getClient();
  return client.db(DB_NAME);
}

function hashPassword(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function verifyPassword(value: string, hash: string) {
  return hashPassword(value) === hash;
}

function toPublicDoc(doc: Document | null) {
  if (!doc) return null;
  const { _id, ...rest } = doc as Document & { _id?: unknown };
  return {
    ...(rest as Record<string, unknown>),
    id:
      (doc as Document & { _id?: unknown })._id?.toString?.() ??
      (rest as { id?: string }).id,
  };
}

function toPublicDocs(docs: Document[]) {
  return docs.map((doc) => toPublicDoc(doc));
}

async function ensureSeedData() {
  const db = await getDb();
  const usersCollection = db.collection("users");
  const settingsCollection = db.collection("settings");

  // Ensure admin user exists
  const existingAdmin = await usersCollection.findOne({ email: "admin@ndahari.rw" });
  if (!existingAdmin) {
    await usersCollection.insertOne({
      id: randomUUID(),
      email: "admin@ndahari.rw",
      passwordHash: hashPassword("Admin@1234"),
      role: "admin",
      first_name: "Ndahari",
      last_name: "Admin",
      phone: "+250788000000",
      created_at: new Date().toISOString(),
    });
  }

  // Ensure default settings exist
  const defaults = [
    { key: "registration_fee", value: "2000" },
    { key: "client_fee", value: "1000" },
    { key: "subscription_days", value: "30" },
    { key: "momo_code", value: "*182*8*1*332991" },
    { key: "admin_phone", value: "+250 788 000 000" },
    { key: "worker_price", value: "5000" },
    { key: "admin_email", value: "admin@ndahari.rw" },
    { key: "admin_password", value: "Admin@1234" },
  ];
  for (const item of defaults) {
    const existing = await settingsCollection.findOne({ key: item.key });
    if (!existing) {
      await settingsCollection.insertOne({ key: item.key, value: item.value });
    }
  }
}

export async function initializeMongo() {
  await ensureSeedData();
}

async function findCollectionDocs(
  collectionName: string,
  filter: Record<string, unknown> = {},
  projection?: Record<string, unknown>,
  sort?: Record<string, 1 | -1>,
  limit?: number,
) {
  const db = await getDb();
  const collection = db.collection(collectionName);
  const cursor = collection.find(filter, projection ? { projection } : undefined);
  if (sort) cursor.sort(sort);
  if (limit) cursor.limit(limit);
  const docs = await cursor.toArray();
  return toPublicDocs(docs);
}

async function findCollectionDoc(
  collectionName: string,
  filter: Record<string, unknown> = {},
  projection?: Record<string, unknown>,
) {
  const db = await getDb();
  const collection = db.collection(collectionName);
  const doc = await collection.findOne(filter, projection ? { projection } : undefined);
  return toPublicDoc(doc);
}

async function insertCollectionDoc(
  collectionName: string,
  data: Record<string, unknown>,
) {
  const db = await getDb();
  const collection = db.collection(collectionName);
  const normalized = {
    ...data,
    id: (data.id as string) || randomUUID(),
    created_at: (data.created_at as string) || new Date().toISOString(),
  };
  await collection.insertOne(normalized);
  return toPublicDoc(normalized);
}

async function updateCollectionDocs(
  collectionName: string,
  filter: Record<string, unknown>,
  data: Record<string, unknown>,
) {
  const db = await getDb();
  const collection = db.collection(collectionName);
  const result = await collection.updateMany(filter, { $set: data });
  return { modifiedCount: result.modifiedCount };
}

async function upsertCollectionDoc(
  collectionName: string,
  filter: Record<string, unknown>,
  data: Record<string, unknown>,
) {
  const db = await getDb();
  const collection = db.collection(collectionName);
  await collection.updateOne(filter, { $set: data }, { upsert: true });
  return { ok: true };
}

async function deleteCollectionDocs(
  collectionName: string,
  filter: Record<string, unknown>,
) {
  const db = await getDb();
  const collection = db.collection(collectionName);
  const result = await collection.deleteMany(filter);
  return { deletedCount: result.deletedCount };
}

function getFilterValue(filter: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(filter)) {
    out[key] = value;
  }
  return out;
}

async function applyQuery(payload: Record<string, unknown>) {
  const collectionName = String(payload.collection || "");
  const operation = String(payload.operation || "find");
  const filter = getFilterValue((payload.filter as Record<string, unknown>) || {});
  const projection = (payload.projection as Record<string, unknown>) || undefined;
  const sort = (payload.sort as Record<string, 1 | -1>) || undefined;
  const data = (payload.data as Record<string, unknown>) || {};
  const upsertFilter = (payload.upsertFilter as Record<string, unknown>) || undefined;

  switch (operation) {
    case "find":
      return { data: await findCollectionDocs(collectionName, filter, projection, sort, (payload.limit as number) || undefined) };
    case "findOne":
      return { data: await findCollectionDoc(collectionName, filter, projection) };
    case "insert":
      return { data: await insertCollectionDoc(collectionName, data) };
    case "update":
      return { data: await updateCollectionDocs(collectionName, filter, data) };
    case "upsert":
      return { data: await upsertCollectionDoc(collectionName, upsertFilter || filter, data) };
    case "delete":
      return { data: await deleteCollectionDocs(collectionName, filter) };
    default:
      return { data: [] };
  }
}

export async function handleMongoRequest(payload: Record<string, unknown>) {
  try {
    await initializeMongo();
  } catch (err) {
    console.error("[MongoDB] Connection failed:", err);
    return { error: { message: "Database connection failed. Please check your network or MongoDB Atlas IP whitelist." } };
  }

  const action = String(payload.action || "");

  if (action === "auth") {
    const subAction = String(payload.subAction || "");
    const db = await getDb();
    const users = db.collection("users");
    const settings = db.collection("settings");

    if (subAction === "signin") {
      const email = String((payload.email as string) || "")
        .trim()
        .toLowerCase();
      const password = String((payload.password as string) || "");

      // Check settings for current admin credentials
      const adminEmailDoc = await settings.findOne({ key: "admin_email" });
      const adminPasswordDoc = await settings.findOne({ key: "admin_password" });
      const adminEmail = String(adminEmailDoc?.value || "admin@ndahari.rw");
      const adminPassword = String(adminPasswordDoc?.value || "Admin@1234");

      // Try DB user first
      const userDoc = await users.findOne({ email });

      if (userDoc) {
        // Check hashed password
        if (!verifyPassword(password, userDoc.passwordHash as string)) {
          // For admin, also allow plain-text password from settings
          if (userDoc.role === "admin" && password !== adminPassword) {
            return { error: { message: "Invalid credentials" } };
          } else if (userDoc.role !== "admin") {
            return { error: { message: "Invalid credentials" } };
          }
        }
        return {
          data: {
            user: {
              id: userDoc.id,
              email: userDoc.email,
              role: userDoc.role,
              first_name: userDoc.first_name,
              last_name: userDoc.last_name,
              phone: userDoc.phone,
            },
            session: {
              access_token: `ndahari-${userDoc.id}-${Date.now()}`,
              user: { id: userDoc.id, email: userDoc.email, role: userDoc.role },
            },
          },
        };
      }

      // Fallback: check admin credentials from settings
      if (email === adminEmail.toLowerCase() && password === adminPassword) {
        // Create admin user in DB if missing
        const newId = randomUUID();
        const adminUser = {
          id: newId,
          email: adminEmail.toLowerCase(),
          passwordHash: hashPassword(adminPassword),
          role: "admin",
          first_name: "Ndahari",
          last_name: "Admin",
          phone: "+250788000000",
          created_at: new Date().toISOString(),
        };
        await users.insertOne(adminUser);
        return {
          data: {
            user: {
              id: newId,
              email: adminEmail.toLowerCase(),
              role: "admin",
              first_name: "Ndahari",
              last_name: "Admin",
              phone: "+250788000000",
            },
            session: {
              access_token: `ndahari-${newId}-${Date.now()}`,
              user: { id: newId, email: adminEmail.toLowerCase(), role: "admin" },
            },
          },
        };
      }

      return { error: { message: "Invalid credentials" } };
    }

    if (subAction === "signup") {
      const email = String((payload.email as string) || "")
        .trim()
        .toLowerCase();
      const password = String((payload.password as string) || "");
      const role = String((payload.role as string) || "employer");
      const firstName = String((payload.first_name as string) || "");
      const lastName = String((payload.last_name as string) || "");
      const phone = String((payload.phone as string) || "");
      const existing = await users.findOne({ email });
      if (existing) {
        return { error: { message: "User already exists" } };
      }
      const user = {
        id: randomUUID(),
        email,
        passwordHash: hashPassword(password),
        role,
        first_name: firstName,
        last_name: lastName,
        phone,
        created_at: new Date().toISOString(),
      };
      await users.insertOne(user);
      return {
        data: {
          user: { id: user.id, email: user.email, role: user.role, first_name: user.first_name, last_name: user.last_name, phone: user.phone },
          session: {
            access_token: `ndahari-${user.id}-${Date.now()}`,
            user: { id: user.id, email: user.email, role: user.role },
          },
        },
      };
    }

    if (subAction === "updateAdminCredentials") {
      const newEmail = String((payload.newEmail as string) || "").trim().toLowerCase();
      const newPassword = String((payload.newPassword as string) || "");
      const userId = String((payload.userId as string) || "");

      if (newEmail) {
        await settings.updateOne({ key: "admin_email" }, { $set: { value: newEmail } }, { upsert: true });
        await users.updateOne({ id: userId }, { $set: { email: newEmail } });
      }
      if (newPassword) {
        await settings.updateOne({ key: "admin_password" }, { $set: { value: newPassword } }, { upsert: true });
        await users.updateOne({ id: userId }, { $set: { passwordHash: hashPassword(newPassword) } });
      }
      return { data: { ok: true } };
    }

    if (subAction === "updatePassword") {
      const userId = String((payload.userId as string) || "");
      const newPassword = String((payload.newPassword as string) || "");
      if (!userId || !newPassword) return { error: { message: "Missing fields" } };
      await users.updateOne({ id: userId }, { $set: { passwordHash: hashPassword(newPassword) } });
      return { data: { ok: true } };
    }

    if (subAction === "getSession") {
      return { data: { session: null } };
    }

    if (subAction === "getUser") {
      return { data: { user: null } };
    }
  }

  if (action === "query") {
    return applyQuery(payload);
  }

  return { data: [] };
}
