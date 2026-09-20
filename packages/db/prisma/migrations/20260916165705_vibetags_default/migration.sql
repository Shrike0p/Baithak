-- Better Auth never writes vibeTags on signup, so it needs a DB-level default
ALTER TABLE "User" ALTER COLUMN "vibeTags" SET DEFAULT ARRAY[]::TEXT[];
