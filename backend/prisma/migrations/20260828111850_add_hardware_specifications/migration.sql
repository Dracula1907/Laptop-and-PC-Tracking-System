-- AlterTable
ALTER TABLE "AssetSpecification" ADD COLUMN IF NOT EXISTS "monitor" TEXT;
ALTER TABLE "AssetSpecification" ADD COLUMN IF NOT EXISTS "keyboard" TEXT;
ALTER TABLE "AssetSpecification" ADD COLUMN IF NOT EXISTS "mouse" TEXT;
ALTER TABLE "AssetSpecification" ADD COLUMN IF NOT EXISTS "chargerAdapter" TEXT;
ALTER TABLE "AssetSpecification" ADD COLUMN IF NOT EXISTS "otherHardware" TEXT;
