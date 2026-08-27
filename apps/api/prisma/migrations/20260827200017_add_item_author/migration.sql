-- AlterTable
ALTER TABLE "items" ADD COLUMN     "createdById" UUID;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

