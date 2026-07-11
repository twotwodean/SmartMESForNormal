import { NextResponse } from "next/server";
// zod v4의 classic API는 `ZodSchema`(v3 별칭)를 내보내지 않으므로 `ZodType`을 사용한다.
import type { ZodType } from "zod";

/**
 * 요청 본문을 zod 스키마로 파싱한다.
 * 실패 시 400 { error } 응답을 반환하므로 호출부에서 early-return 해야 한다.
 *
 * 사용 예:
 *   const p = await parseBody(req, ItemCreateSchema);
 *   if ("res" in p) return p.res;
 *   const { code, name } = p.data;
 */
export async function parseBody<T>(
  req: Request,
  schema: ZodType<T>,
): Promise<{ data: T } | { res: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      res: NextResponse.json({ error: "잘못된 요청 본문(JSON 파싱 실패)." }, { status: 400 }),
    };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다.";
    return { res: NextResponse.json({ error: msg }, { status: 400 }) };
  }
  return { data: parsed.data };
}
