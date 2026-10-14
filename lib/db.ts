import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

const globalDatabase = globalThis as unknown as { overleetDatabase?: PrismaClient };

export function getDb(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Database is not configured.");
  if (!globalDatabase.overleetDatabase) {
    globalDatabase.overleetDatabase = new PrismaClient({
      adapter: new PrismaPg({ connectionString, connectionTimeoutMillis: 5000 }),
    });
  }
  return globalDatabase.overleetDatabase;
}
