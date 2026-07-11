import { execSync } from "node:child_process";

import { E2E_DATABASE_URL } from "./db-url";

/** e2e 전용 PostgreSQL 스키마를 마이그레이션+시드(전용 DATABASE_URL, public 스키마 보호) */
export default async function globalSetup(): Promise<void> {
  const env = { ...process.env, DATABASE_URL: E2E_DATABASE_URL };
  execSync("npx prisma migrate deploy", { stdio: "inherit", env });
  execSync("npx tsx prisma/seed.ts", { stdio: "inherit", env });
}
