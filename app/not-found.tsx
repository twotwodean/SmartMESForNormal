import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-bg p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
          <span className="rounded-lg bg-neutral-soft px-3 py-1.5 text-body-sm font-bold text-neutral">404</span>
          <div className="flex flex-col gap-1.5">
            <h1 className="text-subtitle font-bold text-text">페이지를 찾을 수 없습니다</h1>
            <p className="text-body-sm text-text-muted">요청하신 페이지가 존재하지 않거나 이동되었습니다.</p>
          </div>
          <div className="flex w-full gap-2">
            <Link href="/mockups/manager" className={cn(buttonVariants({ variant: "secondary" }), "flex-1")}>
              홈으로
            </Link>
            <Link href="/login" className={cn(buttonVariants({ variant: "primary" }), "flex-1")}>
              로그인
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
