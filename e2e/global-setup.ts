import { execSync } from "node:child_process";

/** e2e.db를 마이그레이션+시드(전용 DATABASE_URL, dev.db 보호) */
export default async function globalSetup(): Promise<void> {
  const env = { ...process.env, DATABASE_URL: "file:./e2e.db" };
  execSync("npx prisma migrate deploy", { stdio: "inherit", env });
  execSync("npx tsx prisma/seed.ts", { stdio: "inherit", env });
}
