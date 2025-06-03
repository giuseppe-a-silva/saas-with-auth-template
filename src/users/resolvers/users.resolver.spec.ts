import { Test, TestingModule } from '@nestjs/testing';
import { User as PrismaUser, Role } from '@prisma/client';
import { CaslGuard } from '../../casl/guards/casl.guard';
import { UsersService } from '../users.service';
import { UsersResolver } from './users.resolver';

// Mock do UsersService
const mockUsersService = {
  findOneById: jest.fn(),
  updateUser: jest.fn(),
};

// Mock do CaslGuard
const mockCaslGuard = {
  canActivate: jest.fn().mockReturnValue(true),
};

describe('UsersResolver', () => {
  let resolver: UsersResolver;
  let usersService: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersResolver,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    })
      .overrideGuard(CaslGuard)
      .useValue(mockCaslGuard)
      .compile();

    resolver = module.get<UsersResolver>(UsersResolver);
    usersService = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('me', () => {
    const mockCurrentUser: PrismaUser = {
      id: 'user-id',
      email: 'current@example.com',
      username: 'currentuser',
      password: 'hashedPassword',
      role: Role.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationTokenExpires: null,
      passwordResetToken: null,
      passwordResetTokenExpires: null,
    };

    it('deve retornar dados do usuário autenticado', () => {
      const result = resolver.me(mockCurrentUser);

      expect(result).toEqual(mockCurrentUser);
    });
  });

  describe('findUserById', () => {
    const mockUser: PrismaUser = {
      id: 'user-id',
      email: 'user@example.com',
      username: 'username',
      password: 'hashedPassword',
      role: Role.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationTokenExpires: null,
      passwordResetToken: null,
      passwordResetTokenExpires: null,
    };

    it('deve retornar usuário por ID válido', async () => {
      mockUsersService.findOneById.mockResolvedValue(mockUser);

      const result = await resolver.findUserById('user-id');

      expect(result).toEqual(mockUser);
      expect(usersService.findOneById).toHaveBeenCalledWith('user-id');
    });

    it('deve retornar null para ID não encontrado', async () => {
      mockUsersService.findOneById.mockResolvedValue(null);

      const result = await resolver.findUserById('invalid-id');

      expect(result).toBeNull();
      expect(usersService.findOneById).toHaveBeenCalledWith('invalid-id');
    });
  });

  describe('updateMyProfile', () => {
    const mockCurrentUser: PrismaUser = {
      id: 'current-user-id',
      email: 'current@example.com',
      username: 'currentuser',
      password: 'hashedPassword',
      role: Role.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationTokenExpires: null,
      passwordResetToken: null,
      passwordResetTokenExpires: null,
    };

    const updateUserInput = {
      email: 'updated@example.com',
      username: 'updateduser',
    };

    const updatedUser: PrismaUser = {
      ...mockCurrentUser,
      email: 'updated@example.com',
      username: 'updateduser',
      updatedAt: new Date(),
    };

    it('deve atualizar perfil do usuário com dados válidos', async () => {
      mockUsersService.updateUser.mockResolvedValue(updatedUser);

      const result = await resolver.updateMyProfile(
        mockCurrentUser,
        updateUserInput,
      );

      expect(result).toEqual(updatedUser);
      expect(usersService.updateUser).toHaveBeenCalledWith({
        where: { id: 'current-user-id' },
        data: {
          email: 'updated@example.com',
          username: 'updateduser',
        },
      });
    });

    it('deve retornar usuário atual quando não há dados para atualizar', async () => {
      const result = await resolver.updateMyProfile(mockCurrentUser, {});

      expect(result).toEqual(mockCurrentUser);
      expect(usersService.updateUser).not.toHaveBeenCalled();
    });

    it('deve atualizar apenas campos fornecidos', async () => {
      const partialUpdate = { email: 'newemail@example.com' };
      const partialUpdatedUser = {
        ...mockCurrentUser,
        email: 'newemail@example.com',
      };

      mockUsersService.updateUser.mockResolvedValue(partialUpdatedUser);

      const result = await resolver.updateMyProfile(
        mockCurrentUser,
        partialUpdate,
      );

      expect(result).toEqual(partialUpdatedUser);
      expect(usersService.updateUser).toHaveBeenCalledWith({
        where: { id: 'current-user-id' },
        data: { email: 'newemail@example.com' },
      });
    });
  });
});
