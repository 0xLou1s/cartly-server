-- update manual to set partial unique since prisma not support in schema file
CREATE UNIQUE INDEX permission_path_method_unique
ON "Permission" (path, method)
WHERE "deletedAt" IS NULL;