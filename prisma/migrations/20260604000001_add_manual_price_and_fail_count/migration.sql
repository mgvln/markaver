-- AlterTable
ALTER TABLE "Competitor" ADD COLUMN "scrapeFailCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Competitor" ADD COLUMN "manualPrice" DOUBLE PRECISION;
