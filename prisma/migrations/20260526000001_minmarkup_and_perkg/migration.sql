-- AlterTable Product: raise default minimum markup from 4x to 5x (spec requirement)
ALTER TABLE "Product" ALTER COLUMN "minMarkup" SET DEFAULT 5;

-- AlterTable PricingRecommendation: add per-kg AMP fields for powder products
ALTER TABLE "PricingRecommendation" ADD COLUMN "ampMeanPerKg" DOUBLE PRECISION;
ALTER TABLE "PricingRecommendation" ADD COLUMN "ampMedianPerKg" DOUBLE PRECISION;
ALTER TABLE "PricingRecommendation" ADD COLUMN "ampTrimmedPerKg" DOUBLE PRECISION;
