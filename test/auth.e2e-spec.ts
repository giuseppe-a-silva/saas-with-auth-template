import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Authentication (e2e)', () => {
  let app: INestApplication<App>;
  let prismaService: PrismaService;

  // Dados de teste
  const testUser = {
    email: 'test@example.com',
    username: 'testuser',
    password: 'TestPassword123!',
  };

  const existingUser = {
    email: 'existing@example.com',
    username: 'existinguser',
    password: 'ExistingPassword123!',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();

    // Limpa dados de teste anteriores
    await prismaService.user.deleteMany({
      where: {
        email: {
          in: [testUser.email, existingUser.email],
        },
      },
    });

    // Cria usuário existente para testes de login
    await prismaService.user.create({
      data: {
        email: existingUser.email,
        username: existingUser.username,
        password:
          '$2b$10$rQJ8kHWZ9Y.RVHN8nHdHyOXJ8YrJ8YrJ8YrJ8YrJ8YrJ8YrJ8YrJ8Y', // Hash de 'ExistingPassword123!'
        role: Role.USER,
      },
    });
  });

  afterAll(async () => {
    // Limpa dados de teste
    await prismaService.user.deleteMany({
      where: {
        email: {
          in: [testUser.email, existingUser.email],
        },
      },
    });

    await app.close();
  });

  describe('User Registration', () => {
    it('should register a new user successfully', async () => {
      const registerMutation = `
        mutation Register($input: RegisterInput!) {
          register(input: $input) {
            accessToken
            refreshToken
            user {
              id
              email
              username
              role
            }
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: registerMutation,
          variables: {
            input: testUser,
          },
        })
        .expect(200);

      expect(response.body.data.register).toBeDefined();
      expect(response.body.data.register.accessToken).toBeDefined();
      expect(response.body.data.register.refreshToken).toBeDefined();
      expect(response.body.data.register.user.email).toBe(testUser.email);
      expect(response.body.data.register.user.username).toBe(testUser.username);
      expect(response.body.data.register.user.role).toBe(Role.USER);
    });

    it('should fail to register with existing email', async () => {
      const registerMutation = `
        mutation Register($input: RegisterInput!) {
          register(input: $input) {
            accessToken
            refreshToken
            user {
              id
              email
              username
              role
            }
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: registerMutation,
          variables: {
            input: {
              ...testUser,
              username: 'differentusername',
            },
          },
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Email já está em uso');
    });

    it('should fail to register with invalid email format', async () => {
      const registerMutation = `
        mutation Register($input: RegisterInput!) {
          register(input: $input) {
            accessToken
            refreshToken
            user {
              id
              email
              username
              role
            }
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: registerMutation,
          variables: {
            input: {
              email: 'invalid-email',
              username: 'newuser',
              password: 'ValidPassword123!',
            },
          },
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('validation');
    });

    it('should fail to register with weak password', async () => {
      const registerMutation = `
        mutation Register($input: RegisterInput!) {
          register(input: $input) {
            accessToken
            refreshToken
            user {
              id
              email
              username
              role
            }
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: registerMutation,
          variables: {
            input: {
              email: 'newuser@example.com',
              username: 'newuser',
              password: '123', // Senha fraca
            },
          },
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('validation');
    });
  });

  describe('User Login', () => {
    it('should login with valid credentials', async () => {
      const loginMutation = `
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            accessToken
            refreshToken
            user {
              id
              email
              username
              role
            }
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: loginMutation,
          variables: {
            input: {
              email: testUser.email,
              password: testUser.password,
            },
          },
        })
        .expect(200);

      expect(response.body.data.login).toBeDefined();
      expect(response.body.data.login.accessToken).toBeDefined();
      expect(response.body.data.login.refreshToken).toBeDefined();
      expect(response.body.data.login.user.email).toBe(testUser.email);
    });

    it('should fail to login with invalid email', async () => {
      const loginMutation = `
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            accessToken
            refreshToken
            user {
              id
              email
              username
              role
            }
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: loginMutation,
          variables: {
            input: {
              email: 'nonexistent@example.com',
              password: testUser.password,
            },
          },
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain(
        'Credenciais inválidas',
      );
    });

    it('should fail to login with invalid password', async () => {
      const loginMutation = `
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            accessToken
            refreshToken
            user {
              id
              email
              username
              role
            }
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: loginMutation,
          variables: {
            input: {
              email: testUser.email,
              password: 'wrongpassword',
            },
          },
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain(
        'Credenciais inválidas',
      );
    });
  });

  describe('Token Refresh', () => {
    let refreshToken: string;

    beforeAll(async () => {
      // Faz login para obter refresh token
      const loginMutation = `
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            accessToken
            refreshToken
            user {
              id
              email
              username
              role
            }
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: loginMutation,
          variables: {
            input: {
              email: testUser.email,
              password: testUser.password,
            },
          },
        });

      refreshToken = response.body.data.login.refreshToken;
    });

    it('should refresh token with valid refresh token', async () => {
      const refreshMutation = `
        mutation RefreshToken($refreshToken: String!) {
          refreshToken(refreshToken: $refreshToken) {
            accessToken
            refreshToken
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: refreshMutation,
          variables: {
            refreshToken,
          },
        })
        .expect(200);

      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.refreshToken.accessToken).toBeDefined();
      expect(response.body.data.refreshToken.refreshToken).toBeDefined();
    });

    it('should fail to refresh with invalid token', async () => {
      const refreshMutation = `
        mutation RefreshToken($refreshToken: String!) {
          refreshToken(refreshToken: $refreshToken) {
            accessToken
            refreshToken
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: refreshMutation,
          variables: {
            refreshToken: 'invalid-token',
          },
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Token inválido');
    });
  });

  describe('Protected Routes', () => {
    let accessToken: string;

    beforeAll(async () => {
      // Faz login para obter access token
      const loginMutation = `
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            accessToken
            refreshToken
            user {
              id
              email
              username
              role
            }
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: loginMutation,
          variables: {
            input: {
              email: testUser.email,
              password: testUser.password,
            },
          },
        });

      accessToken = response.body.data.login.accessToken;
    });

    it('should access protected route with valid token', async () => {
      const meQuery = `
        query Me {
          me {
            id
            email
            username
            role
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: meQuery,
        })
        .expect(200);

      expect(response.body.data.me).toBeDefined();
      expect(response.body.data.me.email).toBe(testUser.email);
    });

    it('should fail to access protected route without token', async () => {
      const meQuery = `
        query Me {
          me {
            id
            email
            username
            role
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: meQuery,
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Unauthorized');
    });

    it('should fail to access protected route with invalid token', async () => {
      const meQuery = `
        query Me {
          me {
            id
            email
            username
            role
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          query: meQuery,
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Unauthorized');
    });
  });

  describe('Logout', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Faz login para obter access token
      const loginMutation = `
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            accessToken
            refreshToken
            user {
              id
              email
              username
              role
            }
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: loginMutation,
          variables: {
            input: {
              email: testUser.email,
              password: testUser.password,
            },
          },
        });

      accessToken = response.body.data.login.accessToken;
    });

    it('should logout successfully with valid token', async () => {
      const logoutMutation = `
        mutation Logout {
          logout
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: logoutMutation,
        })
        .expect(200);

      expect(response.body.data.logout).toBe(true);
    });

    it('should fail to logout without token', async () => {
      const logoutMutation = `
        mutation Logout {
          logout
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: logoutMutation,
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Unauthorized');
    });
  });
});
