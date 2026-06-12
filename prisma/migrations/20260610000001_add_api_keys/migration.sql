CREATE TABLE "ApiKey" (
  "id"         TEXT NOT NULL PRIMARY KEY,
  "name"       TEXT NOT NULL,
  "keyHash"    TEXT NOT NULL UNIQUE,
  "keyPrefix"  TEXT NOT NULL,
  "orgId"      TEXT NOT NULL,
  "lastUsedAt" TIMESTAMP(3),
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApiKey_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ApiKey_orgId_idx" ON "ApiKey"("orgId");
