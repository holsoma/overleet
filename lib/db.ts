import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

const globalDatabase = globalThis as unknown as { overleetDatabase?: PrismaClient };

export function getDb(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Database is not configured.");
  if (!globalDatabase.overleetDatabase) {
    globalDatabase.overleetDatabase = new PrismaClient({
      adapter: new PrismaPg({
        connectionString,
        max: 3,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 15000,
      }),
    });
  }
  return globalDatabase.overleetDatabase;
}
