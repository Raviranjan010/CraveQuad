-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "couponId" TEXT;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "vendorResponse" TEXT;

-- CreateIndex
CREATE INDEX "Order_couponId_idx" ON "Order"("couponId");
