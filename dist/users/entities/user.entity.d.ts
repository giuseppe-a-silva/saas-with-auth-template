import { Role } from '@prisma/client';
export declare class User {
    id: string;
    email: string;
    username: string;
    role: Role;
    createdAt: Date;
    updatedAt: Date;
}
