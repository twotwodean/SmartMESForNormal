import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, useToast } from "@/components/ui/toast";

function Trigger() {
  const { toast } = useToast();
  return <button onClick={() => toast({ title: "저장됨", description: "실적이 등록되었습니다." })}>등록</button>;
}

describe("useToast", () => {
  it("toast 호출 시 화면에 표시된다", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await user.click(screen.getByRole("button", { name: "등록" }));
    expect(await screen.findByText("저장됨")).toBeInTheDocument();
    expect(screen.getByText("실적이 등록되었습니다.")).toBeInTheDocument();
  });
});
