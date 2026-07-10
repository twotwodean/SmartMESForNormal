/** 필수 환경변수 검증 — 누락 시 즉시 실패(앱 부팅 불가) */
function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`필수 환경변수 누락: ${name}. .env.example을 참고해 설정하세요.`);
  return v;
}

export const env = {
  DATABASE_URL: required("DATABASE_URL"),
};
