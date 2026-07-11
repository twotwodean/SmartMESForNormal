/** E2E 전용 PostgreSQL 스키마 URL. dev(public) 스키마와 완전히 분리. */
export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgresql://smartmes:smartmes@localhost:5432/smartmes?schema=e2e";
