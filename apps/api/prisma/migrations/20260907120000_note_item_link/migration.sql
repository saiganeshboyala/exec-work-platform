-- AlterTable
ALTER TABLE "notes" ADD COLUMN     "itemId" UUID;

-- CreateIndex
CREATE INDEX "notes_itemId_idx" ON "notes"("itemId");

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
