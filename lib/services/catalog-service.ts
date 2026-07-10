import { prisma } from "@/lib/db";

export interface ProductModelRow { id: string; code: string; name: string; spec: string | null; itemName: string; }
export async function listProductModels(): Promise<ProductModelRow[]> {
  const rows = await prisma.productModel.findMany({ include: { item: true }, orderBy: { code: "asc" } });
  return rows.map((r) => ({ id: r.id, code: r.code, name: r.name, spec: r.spec ?? null, itemName: r.item.name }));
}
export async function createProductModel(input: { itemId: string; code: string; name: string; spec?: string }) {
  if (!input.code.trim() || !input.name.trim()) throw new Error("코드와 이름은 필수입니다.");
  return prisma.productModel.create({ data: { itemId: input.itemId, code: input.code, name: input.name, spec: input.spec || null } });
}

export interface DocumentRow { id: string; name: string; rev: string; note: string | null; itemName: string | null; createdAt: string; }
export async function listDocuments(): Promise<DocumentRow[]> {
  const rows = await prisma.documentRev.findMany({ include: { item: true }, orderBy: { createdAt: "desc" } });
  return rows.map((r) => ({ id: r.id, name: r.name, rev: r.rev, note: r.note ?? null, itemName: r.item?.name ?? null, createdAt: r.createdAt.toISOString() }));
}
export async function createDocument(input: { name: string; rev?: string; note?: string; itemId?: string }) {
  if (!input.name.trim()) throw new Error("문서명은 필수입니다.");
  return prisma.documentRev.create({ data: { name: input.name, rev: input.rev || "A", note: input.note || null, itemId: input.itemId || null } });
}
