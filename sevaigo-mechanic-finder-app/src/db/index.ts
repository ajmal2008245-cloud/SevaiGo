import path from "node:path";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzleNodePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { ensureTables } from "./init";

const databaseUrl = process.env.DATABASE_URL;
const isVercel = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.VERCEL_ENV
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
    globalForDb.__sevaigoInitPromise = ensureTables(poolInstance);
  }
} else {
  if (!globalForDb.__sevaigoDb) {
    const isBuild =
      process.env.NEXT_PHASE === "phase-production-build" ||
      process.env.npm_lifecycle_event === "build";

    let pglite: PGlite;
    if (isBuild) {
      pglite = new PGlite();
    } else {
      const dbPath = isVercel
        ? path.join("/tmp", ".data", "sevaigo-db")
        : path.join(process.cwd(), ".data", "sevaigo-db");

      try {
        fs.mkdirSync(dbPath, { recursive: true });
      } catch (err) {
        console.warn("[SevaiGo DB] Directory creation warning for", dbPath, err);
      }

      try {
        pglite = new PGlite(dbPath);
      } catch (err) {
        console.warn("[SevaiGo DB] Failed to open PGlite with directory, falling back to memory:", err);
        pglite = new PGlite();
      }
    }

    globalForDb.__sevaigoPgClient = pglite;
    globalForDb.__sevaigoDb = drizzlePglite(pglite);
    globalForDb.__sevaigoInitPromise = ensureTables(pglite);
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
