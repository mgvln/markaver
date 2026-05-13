-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "slackBotToken" TEXT,
ADD COLUMN     "slackChannel" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;
