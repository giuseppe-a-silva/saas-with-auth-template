import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../database/prisma.service';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Mock do PrismaService
const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

// Mock do bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    // Cria um módulo de teste com o UsersService e o mock do PrismaService
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get(PrismaService);

    // Limpa os mocks antes de cada teste
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    // Assert: Verifica se o serviço foi definido
    expect(service).toBeDefined();
  });

  // Teste para findOneById
  describe('findOneById', () => {
    it('deve retornar um usuário quando encontrado pelo ID', async () => {
      // Arrange: Define o usuário esperado e configura o mock do Prisma
      const userId = 'test-id';
      const expectedUser: User = {
        id: userId,
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashedPassword',
        role: Role.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.user.findUnique.mockResolvedValue(expectedUser);

      // Act: Chama o método do serviço
      const result = await service.findOneById(userId);

      // Assert: Verifica se o método do Prisma foi chamado corretamente e se o resultado está correto
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(result).toEqual(expectedUser);
    });

    it('deve retornar null se o usuário não for encontrado pelo ID', async () => {
      // Arrange: Configura o mock para retornar null
      const userId = 'not-found-id';
      prisma.user.findUnique.mockResolvedValue(null);

      // Act: Chama o método do serviço
      const result = await service.findOneById(userId);

      // Assert: Verifica se o método do Prisma foi chamado e se o resultado é null
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(result).toBeNull();
    });
  });

  // Teste para findOneByEmail
  describe('findOneByEmail', () => {
    it('deve retornar um usuário quando encontrado pelo email', async () => {
      // Arrange
      const userEmail = 'test@example.com';
      const expectedUser: User = {
        id: 'test-id',
        email: userEmail,
        username: 'test',
        password: 'pwd',
        role: Role.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.user.findUnique.mockResolvedValue(expectedUser);

      // Act
      const result = await service.findOneByEmail(userEmail);

      // Assert
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: userEmail },
      });
      expect(result).toEqual(expectedUser);
    });
  });

  // Teste para findOneByUsername
  describe('findOneByUsername', () => {
    it('deve retornar um usuário quando encontrado pelo username', async () => {
      // Arrange
      const username = 'testuser';
      const expectedUser: User = {
        id: 'test-id',
        email: 'test@example.com',
        username: username,
        password: 'pwd',
        role: Role.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.user.findUnique.mockResolvedValue(expectedUser);

      // Act
      const result = await service.findOneByUsername(username);

      // Assert
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { username: username },
      });
      expect(result).toEqual(expectedUser);
    });
  });

  // Teste para createUser
  describe('createUser', () => {
    it('deve criar e retornar um novo usuário com senha hasheada', async () => {
      // Arrange: Define os dados de entrada e o usuário esperado após a criação
      const inputData = {
        email: 'new@example.com',
        username: 'newuser',
        password: 'plainPassword',
      };
      const expectedCreatedUser: User = {
        id: 'new-id',
        ...inputData,
        password: 'hashedPassword', // Espera a senha hasheada
        role: Role.USER, // Role padrão definida no schema
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.user.create.mockResolvedValue(expectedCreatedUser);
      const bcryptHashMock = bcrypt.hash as jest.Mock;

      // Act: Chama o método do serviço
      const result = await service.createUser(inputData);

      // Assert: Verifica se bcrypt.hash e prisma.user.create foram chamados corretamente
      expect(bcryptHashMock).toHaveBeenCalledWith('plainPassword', 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          ...inputData,
          password: 'hashedPassword',
        },
      });
      expect(result).toEqual(expectedCreatedUser);
    });
  });

  // Adicionar testes para updateUser e deleteUser
});
