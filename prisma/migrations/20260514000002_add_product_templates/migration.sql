-- AlterTable Product: add product type and template fields
ALTER TABLE "Product" ADD COLUMN "productType" TEXT NOT NULL DEFAULT 'capsule';
ALTER TABLE "Product" ADD COLUMN "capsulesPerServing" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "Product" ADD COLUMN "capsuleSizeGrams" DOUBLE PRECISION;
ALTER TABLE "Product" ADD COLUMN "gramsPerServing" DOUBLE PRECISION;

-- AlterTable Competitor: add claim, ingredients, servings
ALTER TABLE "Competitor" ADD COLUMN "claim" TEXT;
ALTER TABLE "Competitor" ADD COLUMN "ingredients" TEXT;
ALTER TABLE "Competitor" ADD COLUMN "servings" INTEGER;

-- AlterTable PriceSnapshot: add price per kg
ALTER TABLE "PriceSnapshot" ADD COLUMN "pricePerKg" DOUBLE PRECISION;
