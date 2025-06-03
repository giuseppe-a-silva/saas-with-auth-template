import { Permission, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
export declare class PermissionsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    findUserPermissions(userId: string): Promise<Permission[]>;
    createPermission(data: Prisma.PermissionCreateInput): Promise<Permission>;
}
