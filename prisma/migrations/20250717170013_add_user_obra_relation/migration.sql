-- AlterTable
ALTER TABLE "Obra" ADD COLUMN     "userId" TEXT;

-- AddForeignKey
ALTER TABLE "Obra" ADD CONSTRAINT "Obra_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
