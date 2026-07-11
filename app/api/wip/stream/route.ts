import { requireUser } from "@/lib/api/guard";
import { getWipBoard } from "@/lib/services/wip-service";
import { logError } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INTERVAL_MS = 3000;

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;

  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      const ping = () => {
        controller.enqueue(encoder.encode(`: ping\n\n`));
      };

      const cleanup = () => {
        if (timer) clearInterval(timer);
        timer = undefined;
        try {
          controller.close();
        } catch {
          // 이미 닫힌 경우 무시
        }
      };

      try {
        send(await getWipBoard());
      } catch (err) {
        logError("wip.stream.initial", err);
      }

      timer = setInterval(async () => {
        try {
          const snapshot = await getWipBoard();
          send(snapshot);
          ping();
        } catch (err) {
          logError("wip.stream.tick", err);
        }
      }, INTERVAL_MS);

      req.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      if (timer) clearInterval(timer);
      timer = undefined;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
