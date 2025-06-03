-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditActionType" ADD VALUE 'USER_LOGIN';
ALTER TYPE "AuditActionType" ADD VALUE 'USER_LOGOUT';
ALTER TYPE "AuditActionType" ADD VALUE 'USER_REGISTER';
ALTER TYPE "AuditActionType" ADD VALUE 'PASSWORD_RESET_REQUEST';
ALTER TYPE "AuditActionType" ADD VALUE 'PASSWORD_RESET_CONFIRM';
ALTER TYPE "AuditActionType" ADD VALUE 'EMAIL_VERIFICATION';
