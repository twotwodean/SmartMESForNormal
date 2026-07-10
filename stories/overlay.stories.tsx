import type { Meta, StoryObj } from "@storybook/react";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerBody } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

const meta: Meta = { title: "Layout/Overlay" };
export default meta;
type Story = StoryObj;

export const Modal: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild><Button>작업지시 취소</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>작업지시 취소</DialogTitle>
          <DialogDescription>WO-260709-014를 취소합니다. 이 작업은 되돌릴 수 없습니다.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild><Button variant="secondary">돌아가기</Button></DialogClose>
          <DialogClose asChild><Button variant="danger">취소 확정</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const SideDrawer: Story = {
  render: () => (
    <Drawer>
      <DrawerTrigger asChild><Button variant="secondary">상세 보기</Button></DrawerTrigger>
      <DrawerContent>
        <DrawerHeader><DrawerTitle>WO-260709-014 상세</DrawerTitle></DrawerHeader>
        <DrawerBody><p className="text-body-sm text-text-muted">공정·검사·수불 상세가 표시됩니다.</p></DrawerBody>
      </DrawerContent>
    </Drawer>
  ),
};
