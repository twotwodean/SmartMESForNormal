"use client";

import * as React from "react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // 운영 환경에서는 모니터링(Sentry 등) 연동 지점. 스택은 서버 콘솔에만 남기고 화면에는 노출하지 않는다.
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-bg p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-crit-soft text-[20px] text-crit">!</span>
          <div className="flex flex-col gap-1.5">
            <h1 className="text-subtitle font-bold text-text">문제가 발생했습니다</h1>
            <p className="text-body-sm text-text-muted">
              요청을 처리하는 중 오류가 발생했습니다. 다시 시도하거나 홈으로 이동하세요.
            </p>
            {error.digest && <p className="text-caption text-text-faint">오류 코드: {error.digest}</p>}
          </div>
          <div className="flex w-full gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => reset()}>
              다시 시도
            </Button>
            <Link href="/mockups/manager" className={cn(buttonVariants({ variant: "primary" }), "flex-1")}>
              홈으로
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
