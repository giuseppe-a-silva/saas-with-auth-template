import { Test, TestingModule } from '@nestjs/testing';
import { Permission as PrismaPermission, Role, User } from '@prisma/client';
import { Action } from '../permissions/entities/permission.entity';
import { PermissionsService } from '../permissions/permissions.service';
import { CaslAbilityFactory } from './casl-ability.factory';

// Mock PermissionsService
const mockPermissionsService = {
  findUserPermissions: jest.fn(),
};

// Mocks
const mockUserAdmin: Omit<User, 'password'> = {
  id: 'admin-id',
  email: 'admin@example.com',
  username: 'admin',
  role: Role.ADMIN,
  createdAt: new Date(),
  updatedAt: new Date(),
  emailVerified: true,
  emailVerificationToken: null,
  emailVerificationTokenExpires: null,
  passwordResetToken: null,
  passwordResetTokenExpires: null,
};

const mockUserEditor: Omit<User, 'password'> = {
  id: 'editor-id',
  email: 'editor@example.com',
  username: 'editor',
  role: Role.EDITOR,
  createdAt: new Date(),
  updatedAt: new Date(),
  emailVerified: true,
  emailVerificationToken: null,
  emailVerificationTokenExpires: null,
  passwordResetToken: null,
  passwordResetTokenExpires: null,
};

const mockUserRegular: Omit<User, 'password'> = {
  id: 'user-id',
  email: 'user@example.com',
  username: 'user',
  role: Role.USER,
  createdAt: new Date(),
  updatedAt: new Date(),
  emailVerified: true,
  emailVerificationToken: null,
  emailVerificationTokenExpires: null,
  passwordResetToken: null,
  passwordResetTokenExpires: null,
};

describe('CaslAbilityFactory', () => {
  let factory: CaslAbilityFactory;
  let permissionsService: typeof mockPermissionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CaslAbilityFactory,
        {
          provide: PermissionsService,
          useValue: mockPermissionsService,
        },
      ],
    }).compile();

    factory = module.get<CaslAbilityFactory>(CaslAbilityFactory);
    permissionsService = module.get(PermissionsService);

    // Limpa mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(factory).toBeDefined();
  });

  describe('createForUser', () => {
    it('deve conceder permissão Manage All para ADMIN', async () => {
      // Arrange: Admin não tem permissões específicas no DB neste teste
      permissionsService.findUserPermissions.mockResolvedValue([]);

      // Act: Cria a ability para o admin
      const ability = await factory.createForUser(mockUserAdmin);

      // Assert: Verifica se o admin pode gerenciar tudo
      expect(ability.can(Action.Manage, 'all')).toBe(true);
      expect(ability.can(Action.Create, 'User')).toBe(true);
      expect(ability.can(Action.Delete, 'Post')).toBe(true); // 'Post' como exemplo
      expect(permissionsService.findUserPermissions).toHaveBeenCalledWith(
        mockUserAdmin.id,
      );
    });

    it('deve conceder permissões de Editor (Read All)', async () => {
      // Arrange: Editor sem permissões específicas no DB
      permissionsService.findUserPermissions.mockResolvedValue([]);

      // Act
      const ability = await factory.createForUser(mockUserEditor);

      // Assert
      expect(ability.can(Action.Read, 'all')).toBe(true);
      expect(ability.cannot(Action.Update, 'Post')).toBe(true); // Editor não tem Update por padrão
      expect(ability.cannot(Action.Delete, 'User')).toBe(true); // Não deve poder deletar User por padrão
      expect(ability.can(Action.Manage, 'all')).toBe(false);
      expect(permissionsService.findUserPermissions).toHaveBeenCalledWith(
        mockUserEditor.id,
      );
    });

    it('deve conceder permissões de Usuário comum (Read All)', async () => {
      // Arrange: Usuário sem permissões específicas no DB
      permissionsService.findUserPermissions.mockResolvedValue([]);

      // Act
      const ability = await factory.createForUser(mockUserRegular);

      // Assert
      expect(ability.can(Action.Read, 'all')).toBe(true);
      expect(ability.cannot(Action.Update, 'Post')).toBe(true);
      expect(ability.cannot(Action.Create, 'User')).toBe(true);
      expect(permissionsService.findUserPermissions).toHaveBeenCalledWith(
        mockUserRegular.id,
      );
    });

    it('deve adicionar permissões específicas do banco de dados', async () => {
      // Arrange: Usuário comum com permissão específica para criar Post
      const dbPermissions: PrismaPermission[] = [
        {
          id: 'perm-1',
          userId: mockUserRegular.id,
          action: Action.Create,
          subject: 'Post',
          condition: null,
          inverted: false,
          reason: 'Permissão específica do DB',
        },
      ];
      permissionsService.findUserPermissions.mockResolvedValue(dbPermissions);

      // Act
      const ability = await factory.createForUser(mockUserRegular);

      // Assert: Verifica permissões padrão + específica do DB
      expect(ability.can(Action.Read, 'all')).toBe(true); // Padrão USER
      expect(ability.can(Action.Create, 'Post')).toBe(true); // Específica do DB
      expect(ability.cannot(Action.Update, 'Post')).toBe(true); // Não tem permissão de update
      expect(permissionsService.findUserPermissions).toHaveBeenCalledWith(
        mockUserRegular.id,
      );
    });

    it('deve aplicar permissões invertidas (cannot) do banco de dados', async () => {
      // Arrange: Editor com permissão invertida para ler 'Post'
      const dbPermissions: PrismaPermission[] = [
        {
          id: 'perm-2',
          userId: mockUserEditor.id,
          action: Action.Read,
          subject: 'Post',
          condition: null,
          inverted: true, // Permissão invertida
          reason: 'Não pode ler posts específicos',
        },
      ];
      permissionsService.findUserPermissions.mockResolvedValue(dbPermissions);

      // Act
      const ability = await factory.createForUser(mockUserEditor);

      // Assert: Verifica permissões padrão + cannot do DB
      expect(ability.can(Action.Read, 'all')).toBe(true); // Padrão EDITOR
      expect(ability.cannot(Action.Update, 'Post')).toBe(true); // Editor não tem Update por padrão
      expect(ability.cannot(Action.Read, 'Post')).toBe(true); // Invertida do DB
      expect(ability.can(Action.Read, 'User')).toBe(true); // Pode ler usuários normalmente
      expect(permissionsService.findUserPermissions).toHaveBeenCalledWith(
        mockUserEditor.id,
      );
    });

    it('deve aplicar condições das permissões do banco de dados', async () => {
      // Arrange: Usuário comum com permissão para atualizar User APENAS se for o próprio usuário
      const condition = JSON.stringify({ id: mockUserRegular.id });
      const dbPermissions: PrismaPermission[] = [
        {
          id: 'perm-3',
          userId: mockUserRegular.id,
          action: Action.Update,
          subject: 'User',
          condition: condition,
          inverted: false,
          reason: 'Pode atualizar próprio perfil',
        },
      ];
      permissionsService.findUserPermissions.mockResolvedValue(dbPermissions);

      // Act
      const ability = await factory.createForUser(mockUserRegular);

      // Assert: Verifica a permissão com a condição
      expect(
        ability.can(Action.Update, 'User', JSON.stringify(condition)),
      ).toBe(true); // Verificação genérica da regra
      expect(permissionsService.findUserPermissions).toHaveBeenCalledWith(
        mockUserRegular.id,
      );
      // Nota: Testar condições complexas pode exigir mais configuração ou mocks específicos
      // dependendo de como o `detectSubjectType` e as condições são usadas.
    });
  });
});
