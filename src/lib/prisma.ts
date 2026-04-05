import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Tăng connection_limit cho Supabase (PgBouncer)
    // pool_timeout: 20s để đợi connection khi pool đầy
    datasources: {
      db: {
        url: process.env.DATABASE_URL + "&connection_limit=5&pool_timeout=20",
      },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
