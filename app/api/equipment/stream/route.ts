import { requireUser } from "@/lib/api/guard";
import { listEquipmentStates } from "@/lib/services/equipment-state-service";
import { logError } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INTERVAL_MS = 2000;

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
        send(await listEquipmentStates());
      } catch (err) {
        logError("equipment.stream.initial", err);
      }

      timer = setInterval(async () => {
        try {
          const snapshot = await listEquipmentStates();
          send(snapshot);
          ping();
        } catch (err) {
          logError("equipment.stream.tick", err);
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
      "X-Accel-Buffering": "no",
    },
  });
}
