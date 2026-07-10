-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SUPPLIER'
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ORDERED',
    "orderedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchaseOrder_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GoodsReceipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "purchaseOrderId" TEXT,
    "itemId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GoodsReceipt_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GoodsReceipt_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalesOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ORDERED',
    "dueDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalesOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SalesOrder_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "salesOrderId" TEXT,
    "itemId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "shippedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Shipment_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Shipment_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Concession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" DATETIME,
    CONSTRAINT "Concession_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductModel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "spec" TEXT,
    CONSTRAINT "ProductModel_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentRev" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT,
    "name" TEXT NOT NULL,
    "rev" TEXT NOT NULL DEFAULT 'A',
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentRev_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_code_key" ON "Supplier"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_code_key" ON "PurchaseOrder"("code");

-- CreateIndex
CREATE UNIQUE INDEX "GoodsReceipt_code_key" ON "GoodsReceipt"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_code_key" ON "SalesOrder"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_code_key" ON "Shipment"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ProductModel_code_key" ON "ProductModel"("code");
