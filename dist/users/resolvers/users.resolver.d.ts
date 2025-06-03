import { User as PrismaUser } from '@prisma/client';
import { User as UserEntity } from '../entities/user.entity';
import { UsersService } from '../users.service';
declare class CreateUserInput {
    email: string;
    username: string;
    password: string;
}
declare const UpdateUserInput_base: import("@nestjs/common").Type<Partial<CreateUserInput>>;
declare class UpdateUserInput extends UpdateUserInput_base {
    password?: string;
}
export declare class UsersResolver {
    private readonly usersService;
    constructor(usersService: UsersService);
    me(user: PrismaUser): UserEntity;
    findUserById(id: string): Promise<UserEntity | null>;
    updateMyProfile(currentUser: PrismaUser, updateUserInput: UpdateUserInput): Promise<UserEntity>;
    deleteUser(id: string, currentUser: PrismaUser): Promise<UserEntity>;
}
export {};
