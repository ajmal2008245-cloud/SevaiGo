import path from "node:path";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzleNodePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { ensureTables } from "./init";

const databaseUrl = process.env.DATABASE_URL;
const isVercelOrServerless = Boolean(
  process.env.VERCEL ||
  process.env.VERCEL_ENV ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT ||
  (typeof process.cwd === "function" && (process.cwd().includes("var/task") || process.cwd().includes("/var/task"))) ||
  process.env.NODE_ENV === "production"
);

const isRemotePg = Boolean(
  databaseUrl &&
  !databaseUrl.includes("127.0.0.1") &&
  !databaseUrl.includes("localhost")
);

const globalForDb = globalThis as typeof globalThis & {
  __sevaigoDb?: any;
  __sevaigoPgClient?: PGlite;
  __sevaigoPool?: Pool;
  __sevaigoInitPromise?: Promise<void>;
};

let dbInstance: any;
let poolInstance: Pool | undefined;

if (isRemotePg && databaseUrl) {
  const sslConfig =
    process.env.NODE_ENV === "production" ||
    databaseUrl.includes("supabase.co") ||
    databaseUrl.includes("sslmode=require") ||
    databaseUrl.includes("pooler.supabase.com")
      ? { rejectUnauthorized: false }
      : undefined;

  poolInstance =
    globalForDb.__sevaigoPool ??
    new Pool({
      connectionString: databaseUrl,
      ssl: sslConfig,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__sevaigoPool = poolInstance;
  }
  dbInstance = drizzleNodePg(poolInstance);

  if (!globalForDb.__sevaigoInitPromise) {
    globalForDb.__sevaigoInitPromise = (async () => {
      try {
        await ensureTables(poolInstance!);
      } catch (err) {
        console.warn("[SevaiGo DB] Remote PostgreSQL table initialization note:", err);
      }
    })();
  }
} else {
  if (!globalForDb.__sevaigoDb) {
    const isBuild =
      process.env.NEXT_PHASE === "phase-production-build" ||
      process.env.npm_lifecycle_event === "build";

    let pglite: PGlite;
    if (isBuild || isVercelOrServerless) {
      // In serverless, Vercel, or production environments without remote DB,
      // run PGlite in-memory to prevent read-only filesystem errors (e.g. /var/task/.data/sevaigo-db)
      // and multi-worker directory lock errors completely.
      pglite = new PGlite();
    } else {
      // Local development on developer's laptop
      const dbPath = path.join(process.cwd(), ".data", "sevaigo-db");
      try {
        fs.mkdirSync(dbPath, { recursive: true });
        pglite = new PGlite(dbPath);
      } catch (err) {
        console.warn("[SevaiGo DB] Local directory initialization warning, using memory:", err);
        pglite = new PGlite();
      }
    }

    globalForDb.__sevaigoPgClient = pglite;
    globalForDb.__sevaigoDb = drizzlePglite(pglite);

    globalForDb.__sevaigoInitPromise = (async () => {
      try {
        if (typeof pglite.waitReady?.then === "function") {
          await pglite.waitReady;
        }
        await ensureTables(pglite);
      } catch (err) {
        console.warn("[SevaiGo DB] PGlite table verification note:", err);
      }
    })();
  }
  dbInstance = globalForDb.__sevaigoDb;
}

export async function initDb() {
  if (globalForDb.__sevaigoInitPromise) {
    try {
      await globalForDb.__sevaigoInitPromise;
    } catch (err) {
      console.error("[SevaiGo DB] Table verification note:", err);
    }
  }
}

export const db = dbInstance;
export const pool = poolInstance;
