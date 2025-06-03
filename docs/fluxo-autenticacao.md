# 🔐 Sistema de Autenticação EduMatch

**Versão:** 1.0  
**Data:** 06/01/2025  
**Autor:** Sistema EduMatch

---

## 📋 Índice

1. [Visão Geral](#-visão-geral)
2. [Arquitetura de Segurança](#-arquitetura-de-segurança)
3. [Fluxo de Registro](#-fluxo-de-registro)
4. [Verificação de Email](#-verificação-de-email)
5. [Fluxo de Login](#-fluxo-de-login)
6. [Gerenciamento de Tokens](#-gerenciamento-de-tokens)
7. [Recuperação de Senha](#-recuperação-de-senha)
8. [Alteração de Senha](#-alteração-de-senha)
9. [Logout e Segurança](#-logout-e-segurança)
10. [Auditoria e Monitoramento](#-auditoria-e-monitoramento)
11. [Rate Limiting](#-rate-limiting)
12. [Casos de Erro](#-casos-de-erro)

---

## 🎯 Visão Geral

O **Sistema de Autenticação EduMatch** implementa uma arquitetura de segurança robusta baseada em **verificação obrigatória de email**, **tokens JWT** seguros e **auditoria completa**. O sistema garante que apenas usuários com emails verificados possam acessar a plataforma, mantendo logs detalhados de todas as ações de segurança.

### **Características Principais**

- ✅ **Verificação Obrigatória de Email**: Usuários devem verificar email antes do primeiro login
- ✅ **Tokens Seguros**: JWT com refresh tokens em cookies HttpOnly
- ✅ **Rate Limiting**: Proteção contra ataques de força bruta
- ✅ **Auditoria Completa**: Logs de todas as ações sensíveis
- ✅ **Notificações de Segurança**: Alertas automáticos de atividades suspeitas
- ✅ **Recuperação Segura**: Sistema de reset de senha com tokens criptográficos
- ✅ **Validação Rigorosa**: Senhas fortes e validação de entrada
- ✅ **Proteção CSRF**: Cookies seguros e SameSite

---

## 🏗️ Arquitetura de Segurança

### **Componentes do Sistema**

```
┌─────────────────────────────────────────────────────────────┐
│                   AUTHENTICATION SYSTEM                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌──────────────────────────────┐    │
│  │  GraphQL API    │    │     JWT Strategy             │    │
│  │  (Auth Resolver)│───▶│     (Passport)               │    │
│  └─────────────────┘    └──────────────────────────────┘    │
│           │                           │                     │
│           ▼                           ▼                     │
│  ┌─────────────────┐    ┌──────────────────────────────┐    │
│  │ Authentication  │    │     Token Service            │    │
│  │ Service         │◄───│     (JWT Generation)         │    │
│  └─────────────────┘    └──────────────────────────────┘    │
│           │                           │                     │
│           ▼                           ▼                     │
│  ┌─────────────────┐    ┌──────────────────────────────┐    │
│  │ Email           │    │     Password Service         │    │
│  │ Verification    │    │     (bcrypt)                 │    │
│  │ Service         │    │                              │    │
│  └─────────────────┘    └──────────────────────────────┘    │
│           │                           │                     │
│           ▼                           ▼                     │
│  ┌─────────────────┐    ┌──────────────────────────────┐    │
│  │ Password Reset  │    │     Security Notification   │    │
│  │ Service         │    │     Service                  │    │
│  └─────────────────┘    └──────────────────────────────┘    │
│           │                           │                     │
│           ▼                           ▼                     │
│  ┌─────────────────┐    ┌──────────────────────────────┐    │
│  │ Audit           │    │     Database                 │    │
│  │ Interceptor     │    │     (PostgreSQL + Prisma)   │    │
│  └─────────────────┘    └──────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### **Fluxo de Segurança**

1. **Entrada**: Todas as requisições passam pelo Rate Limiter
2. **Validação**: DTOs validam formato e conteúdo dos dados
3. **Autenticação**: JWT Strategy verifica tokens e valida usuários
4. **Autorização**: CASL verifica permissões específicas
5. **Auditoria**: Interceptor registra todas as ações
6. **Notificação**: Security Service envia alertas automáticos

---

## 📝 Fluxo de Registro

### **Diagrama do Fluxo**

```mermaid
graph TD
    A[Cliente: Dados de Registro] --> B[Rate Limiter: 3/hora]
    B --> C[Validação: RegisterDto]
    C --> D{Dados válidos?}
    D -->|Não| E[Erro 400: Dados inválidos]
    D -->|Sim| F[Verificar duplicatas]
    F --> G{Email/Username existe?}
    G -->|Sim| H[Erro 409: Dados duplicados]
    G -->|Não| I[Hash da senha: bcrypt]
    I --> J[Criar usuário: emailVerified=false]
    J --> K[Gerar token de verificação]
    K --> L[Salvar token no banco]
    L --> M[Enviar email de verificação]
    M --> N[Auditoria: USER_REGISTER]
    N --> O[Resposta: Usuário criado]
```

### **Implementação Backend**

#### **1. Mutation GraphQL**

```graphql
mutation RegisterUser {
  register(
    registerInput: {
      email: "usuario@example.com"
      username: "usuario123"
      password: "MinhaSenh@123"
    }
  ) {
    id
    email
    username
    emailVerified
    createdAt
  }
}
```

#### **2. Validação de Entrada**

```typescript
// RegisterDto
export class RegisterDto {
  @Field()
  @IsEmail({}, { message: 'Email deve ter formato válido.' })
  @IsValidEmail() // Custom validator anti-spam
  email: string;

  @Field()
  @IsString()
  @Length(3, 30, { message: 'Username deve ter entre 3 e 30 caracteres.' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username deve conter apenas letras, números e underscore.',
  })
  username: string;

  @Field()
  @IsString()
  @IsStrongPassword() // Custom validator para senha forte
  password: string;
}
```

#### **3. Processamento no AuthenticationService**

```typescript
async register(registerDto: RegisterDto): Promise<Omit<User, 'password'>> {
  try {
    // 1. Criação do usuário com emailVerified=false
    const newUser = await this.usersService.createUser({
      email: registerDto.email,
      username: registerDto.username,
      password: registerDto.password, // UsersService faz o hash
    });

    // 2. Envio automático de email de verificação
    const emailSent = await this.emailVerificationService
      .sendVerificationEmail(
        newUser.id,
        newUser.email,
        newUser.username,
      );

    if (!emailSent) {
      this.logger.warn(
        `Falha ao enviar email de verificação para: ${newUser.email}`,
      );
      // Não falha o registro, apenas loga o aviso
    }

    // 3. Remove a senha do objeto retornado
    const { password: _, ...userWithoutPassword } = newUser;

    this.logger.log(`Novo usuário registrado: ${newUser.email}`);
    return userWithoutPassword;
  } catch (error) {
    // Tratamento de erros específicos
    if (error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002') {
      throw new ConflictException('Email ou nome de usuário já cadastrado.');
    }
    throw new InternalServerErrorException('Erro ao registrar usuário.');
  }
}
```

#### **4. Dados Persistidos**

```sql
-- Registro na tabela User
INSERT INTO "User" (
  id, email, username, password, role,
  emailVerified, emailVerificationToken, emailVerificationTokenExpires,
  createdAt, updatedAt
) VALUES (
  'uuid-generated',
  'usuario@example.com',
  'usuario123',
  '$2b$12$hash-bcrypt-da-senha',
  'USER',
  false, -- Importante: sempre false no registro
  'token-seguro-64-caracteres',
  NOW() + INTERVAL '24 hours',
  NOW(),
  NOW()
);
```

---

## ✉️ Verificação de Email

### **Diagrama do Fluxo**

```mermaid
graph TD
    A[Usuário clica no link] --> B[Frontend: /verify-email?token=...]
    B --> C[GraphQL: verifyEmail mutation]
    C --> D[Rate Limiter: 10/hora]
    D --> E[Validação: VerifyEmailDto]
    E --> F[Buscar token no banco]
    F --> G{Token existe?}
    G -->|Não| H[Erro 400: Token inválido]
    G -->|Sim| I{Token expirado?}
    I -->|Sim| J[Erro 400: Token expirado]
    I -->|Não| K[Atualizar: emailVerified=true]
    K --> L[Limpar token do banco]
    L --> M[Auditoria: EMAIL_VERIFICATION]
    M --> N[Resposta: Email verificado]
```

### **Implementação Backend**

#### **1. Mutation GraphQL**

```graphql
mutation VerifyEmail {
  verifyEmail(
    verifyEmailInput: { token: "token-de-64-caracteres-recebido-por-email" }
  ) {
    success
    message
  }
}
```

#### **2. EmailVerificationService**

```typescript
async verifyEmailToken(token: string): Promise<boolean> {
  const user = await this.prisma.user.findFirst({
    where: {
      emailVerificationToken: token,
      emailVerificationTokenExpires: {
        gte: new Date(), // Token ainda válido
      },
    },
  });

  if (!user) {
    throw new BadRequestException('Token inválido ou expirado.');
  }

  if (user.emailVerified) {
    throw new BadRequestException('Email já verificado.');
  }

  // Atualiza usuário e limpa token
  await this.prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationTokenExpires: null,
    },
  });

  this.logger.log(`Email verificado com sucesso: ${user.email}`);
  return true;
}
```

#### **3. Geração de Token Seguro**

```typescript
generateSecureToken(): string {
  // 64 caracteres hexadecimais (256 bits de entropia)
  return crypto.randomBytes(32).toString('hex');
}
```

---

## 🔑 Fluxo de Login

### **Diagrama do Fluxo**

```mermaid
graph TD
    A[Cliente: Credenciais] --> B[Rate Limiter: 10/15min]
    B --> C[Validação: LoginDto]
    C --> D[Buscar usuário por email/username]
    D --> E{Usuário existe?}
    E -->|Não| F[Log suspeito + Erro 401]
    E -->|Sim| G{Email verificado?}
    G -->|Não| H[Erro 401: Email não verificado]
    G -->|Sim| I[Comparar senha: bcrypt]
    I --> J{Senha correta?}
    J -->|Não| K[Log suspeito + Erro 401]
    J -->|Sim| L[Gerar JWT tokens]
    L --> M[Definir refresh token cookie]
    M --> N[Enviar notificação de login]
    N --> O[Auditoria: USER_LOGIN]
    O --> P[Resposta: Access token]
```

### **Implementação Backend**

#### **1. Mutation GraphQL**

```graphql
mutation Login {
  login(
    loginInput: {
      identifier: "usuario@example.com" # ou username
      password: "MinhaSenh@123"
    }
  ) {
    accessToken
  }
}
```

#### **2. Validação de Credenciais**

```typescript
async validateUser(
  identifier: string,
  password: string,
): Promise<Omit<User, 'password'> | null> {
  // 1. Buscar usuário por email OU username
  const user = await this.prisma.user.findFirst({
    where: {
      OR: [
        { email: identifier },
        { username: identifier }
      ],
    },
  });

  if (!user) {
    this.logger.warn(`Usuário não encontrado: ${identifier}`);
    return null;
  }

  // 2. Verificar se email foi verificado
  if (!user.emailVerified) {
    throw new UnauthorizedException(
      'Email não verificado. Verifique sua caixa de entrada.',
    );
  }

  // 3. Verificar senha
  const isPasswordValid = await this.passwordService.comparePassword(
    password,
    user.password,
  );

  if (!isPasswordValid) {
    this.logger.warn(`Senha inválida para usuário: ${identifier}`);
    return null;
  }

  // 4. Remover senha do retorno
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}
```

#### **3. Geração de Tokens JWT**

```typescript
async generateTokens(user: Omit<User, 'password'>): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
  };

  const [accessToken, refreshToken] = await Promise.all([
    this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m'),
    }),
    this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    }),
  ]);

  return { accessToken, refreshToken };
}
```

#### **4. Cookie de Refresh Token**

```typescript
setRefreshTokenCookie(response: Response, refreshToken: string): void {
  response.cookie('refresh_token', refreshToken, {
    httpOnly: true,        // Não acessível via JavaScript
    secure: process.env.NODE_ENV === 'production', // HTTPS apenas em prod
    sameSite: 'strict',    // Proteção CSRF
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    path: '/',
  });
}
```

#### **5. Notificação de Segurança**

```typescript
// Após login bem-sucedido
await this.securityNotificationService.sendLoginNotification(
  {
    id: validatedUser.id,
    username: validatedUser.username,
    email: validatedUser.email,
  },
  {
    ipAddress: req.ip || 'Não disponível',
    device: req.get('User-Agent') || 'Navegador',
    location: 'Não disponível', // TODO: Implementar geolocalização
  },
);
```

---

## 🔄 Gerenciamento de Tokens

### **Estrutura dos Tokens JWT**

#### **Access Token (15 minutos)**

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user-uuid",
    "email": "usuario@example.com",
    "username": "usuario123",
    "role": "USER",
    "iat": 1704531600,
    "exp": 1704532500
  },
  "signature": "hash-hmac-sha256"
}
```

#### **Refresh Token (7 dias)**

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user-uuid",
    "email": "usuario@example.com",
    "username": "usuario123",
    "role": "USER",
    "iat": 1704531600,
    "exp": 1705136400
  },
  "signature": "hash-hmac-sha256-refresh"
}
```

### **Refresh Token Flow**

```mermaid
graph TD
    A[Access Token expira] --> B[Frontend detecta 401]
    B --> C[Chama refreshToken mutation]
    C --> D[Verifica refresh token cookie]
    D --> E{Cookie válido?}
    E -->|Não| F[Erro 401: Re-login necessário]
    E -->|Sim| G[Valida refresh token JWT]
    G --> H{Token válido?}
    H -->|Não| I[Erro 401: Re-login necessário]
    H -->|Sim| J[Buscar usuário atual]
    J --> K{Usuário existe?}
    K -->|Não| L[Erro 401: Usuário inexistente]
    K -->|Sim| M[Gerar novo access token]
    M --> N[Auditoria: TOKEN_REFRESH]
    N --> O[Resposta: Novo access token]
```

#### **Implementação do Refresh**

```typescript
async refreshToken(
  user: Omit<User, 'password'>,
): Promise<{ accessToken: string }> {
  // Gera apenas um novo access token
  const accessToken = await this.generateAccessToken(user);

  this.logger.log(`Token renovado para usuário: ${user.email}`);
  return { accessToken };
}
```

---

## 🔐 Recuperação de Senha

### **Diagrama do Fluxo**

```mermaid
graph TD
    A[Usuário esqueceu senha] --> B[Frontend: formulário email]
    B --> C[GraphQL: forgotPassword]
    C --> D[Rate Limiter: 3/hora por email]
    D --> E[Validação: ForgotPasswordDto]
    E --> F[Buscar usuário por email]
    F --> G{Usuário existe?}
    G -->|Não| H[Log + Retorna sucesso igual]
    G -->|Sim| I[Gerar token seguro]
    I --> J[Salvar token + expiração]
    J --> K[Enviar email de reset]
    K --> L[Auditoria: PASSWORD_RESET_REQUEST]
    L --> M[Resposta: Sucesso sempre]
```

### **Implementação Backend**

#### **1. Mutation ForgotPassword**

```graphql
mutation ForgotPassword {
  forgotPassword(forgotPasswordInput: { email: "usuario@example.com" }) {
    success
    message
  }
}
```

#### **2. PasswordResetService**

```typescript
async forgotPassword(email: string): Promise<boolean> {
  const user = await this.prisma.user.findUnique({
    where: { email },
  });

  if (user) {
    // Gerar token seguro
    const resetToken = this.generateSecureToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // Salvar token no banco
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetTokenExpires: expiresAt,
      },
    });

    // Enviar email
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
    await this.notificationService.sendNotification({
      templateName: 'auth-password-reset',
      recipient: { email: user.email, name: user.username },
      data: { resetLink, token: resetToken },
    });

    this.logger.log(`Token de reset enviado para: ${email}`);
  } else {
    // Log para monitoramento de tentativas
    this.logger.warn(`Tentativa de reset para email inexistente: ${email}`);
  }

  // SEMPRE retorna true (segurança)
  return true;
}
```

#### **3. Mutation ResetPassword**

```graphql
mutation ResetPassword {
  resetPassword(
    resetPasswordInput: {
      token: "token-de-64-caracteres"
      newPassword: "MinhaNovaSenh@123"
    }
  ) {
    success
    message
  }
}
```

#### **4. Validação e Reset**

```typescript
async resetPassword(token: string, newPassword: string): Promise<boolean> {
  // 1. Buscar usuário pelo token
  const user = await this.prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetTokenExpires: {
        gte: new Date(), // Token ainda válido
      },
    },
  });

  if (!user) {
    throw new BadRequestException('Token inválido ou expirado.');
  }

  // 2. Hash da nova senha
  const hashedPassword = await this.passwordService.hashPassword(newPassword);

  // 3. Atualizar senha e limpar token
  await this.prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetTokenExpires: null,
    },
  });

  // 4. Notificação de segurança
  await this.securityNotificationService.sendPasswordChangedNotification(
    {
      id: user.id,
      username: user.username,
      email: user.email,
    },
    {
      ipAddress: 'Não disponível', // TODO: Extrair do contexto
      device: 'Navegador',
    },
  );

  this.logger.log(`Senha redefinida com sucesso para: ${user.email}`);
  return true;
}
```

---

## 🔧 Alteração de Senha

### **Diagrama do Fluxo**

```mermaid
graph TD
    A[Usuário logado quer alterar senha] --> B[GraphQL: changePassword]
    B --> C[Rate Limiter: 5/hora por usuário]
    C --> D[Autenticação: JWT válido]
    D --> E[Validação: ChangePasswordDto]
    E --> F[Buscar usuário atual]
    F --> G[Verificar senha atual]
    G --> H{Senha atual correta?}
    H -->|Não| I[Erro 401: Senha incorreta]
    H -->|Sim| J[Hash nova senha]
    J --> K[Atualizar no banco]
    K --> L[Enviar notificação de segurança]
    L --> M[Auditoria: PASSWORD_CHANGE]
    M --> N[Resposta: Senha alterada]
```

### **Implementação Backend**

#### **1. Mutation ChangePassword**

```graphql
mutation ChangePassword {
  changePassword(
    changePasswordInput: {
      currentPassword: "MinhaSenh@123"
      newPassword: "MinhaNovaSenh@456"
    }
  ) {
    success
    message
  }
}
```

#### **2. Validação e Alteração**

```typescript
async changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<boolean> {
  // 1. Buscar usuário
  const user = await this.usersService.findOneById(userId);
  if (!user) {
    throw new UnauthorizedException('Usuário não encontrado');
  }

  // 2. Validar senha atual
  const isCurrentPasswordValid = await this.passwordService.comparePassword(
    currentPassword,
    user.password,
  );
  if (!isCurrentPasswordValid) {
    throw new UnauthorizedException('Senha atual incorreta');
  }

  // 3. Hash da nova senha
  const hashedNewPassword = await this.passwordService.hashPassword(newPassword);

  // 4. Atualizar no banco
  await this.prisma.user.update({
    where: { id: userId },
    data: { password: hashedNewPassword },
  });

  // 5. Notificação de segurança
  await this.securityNotificationService.sendPasswordChangedNotification(
    {
      id: user.id,
      username: user.username,
      email: user.email,
    },
    {
      ipAddress: 'Não disponível', // TODO: Extrair IP do contexto
      device: 'Navegador',
    },
  );

  this.logger.log(`Senha alterada com sucesso para usuário: ${user.email}`);
  return true;
}
```

---

## 🚪 Logout e Segurança

### **Diagrama do Fluxo**

```mermaid
graph TD
    A[Cliente solicita logout] --> B[GraphQL: logout]
    B --> C[Limpar refresh token cookie]
    C --> D[Auditoria: USER_LOGOUT]
    D --> E[Resposta: Logout realizado]
    E --> F[Frontend: Limpar access token]
    F --> G[Frontend: Redirecionar para login]
```

### **Implementação Backend**

#### **1. Mutation Logout**

```graphql
mutation Logout {
  logout {
    success
    message
  }
}
```

#### **2. Limpeza de Cookies**

```typescript
logout(response: Response): void {
  try {
    // Remove o refresh token cookie
    this.tokenService.clearRefreshTokenCookie(response);
    this.logger.log('Logout realizado com sucesso');
  } catch (error) {
    this.logger.error('Erro durante logout:', error);
    throw new InternalServerErrorException('Erro durante logout');
  }
}

// TokenService
clearRefreshTokenCookie(response: Response): void {
  response.clearCookie('refresh_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
}
```

---

## 📊 Auditoria e Monitoramento

### **Tipos de Eventos Auditados**

```typescript
enum AuditActionType {
  // Autenticação
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  USER_REGISTER = 'USER_REGISTER',
  LOGIN_FAILED = 'LOGIN_FAILED',

  // Verificação e Recuperação
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_CONFIRM = 'PASSWORD_RESET_CONFIRM',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',

  // Tokens e Sessões
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  ACCESS_DENIED = 'ACCESS_DENIED',

  // Dados
  DATA_UPDATE = 'DATA_UPDATE',
}
```

### **Estrutura dos Logs de Auditoria**

```json
{
  "id": "audit-uuid",
  "userId": "user-uuid",
  "action": "USER_LOGIN",
  "resource": "User",
  "resourceId": "user-uuid",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "endpoint": "/graphql",
  "method": "POST",
  "statusCode": 200,
  "requestData": {
    "operationName": "Login",
    "variables": {
      "loginInput": {
        "identifier": "user@example.com"
        // password omitida por segurança
      }
    }
  },
  "responseData": {
    "success": true
    // access token omitido por segurança
  },
  "metadata": {
    "operationType": "mutation",
    "userRole": "USER",
    "sessionId": "session-uuid"
  },
  "createdAt": "2025-01-06T10:30:00Z",
  "expiresAt": "2026-01-06T10:30:00Z"
}
```

### **Configuração do Interceptor**

```typescript
// main.ts - Configuração global
app.useGlobalInterceptors(
  new AuditInterceptor(auditService, featureFlags, reflector),
);

// Uso nos resolvers
@Audit(AuditActionType.USER_LOGIN, {
  includeRequestBody: true,
  sensitiveFields: ['password', 'token'],
})
@Mutation(() => AuthPayload)
async login(@Args('loginInput') loginDto: LoginDto) {
  // ...
}
```

---

## ⚡ Rate Limiting

### **Configurações por Endpoint**

| Endpoint           | Limite | Janela | Chave   | Motivo                   |
| ------------------ | ------ | ------ | ------- | ------------------------ |
| **register**       | 3 req  | 1 hora | IP      | Prevent spam accounts    |
| **login**          | 10 req | 15 min | IP      | Prevent brute force      |
| **forgotPassword** | 3 req  | 1 hora | Email   | Prevent email spam       |
| **resetPassword**  | 5 req  | 1 hora | Token   | Prevent token abuse      |
| **changePassword** | 5 req  | 1 hora | User ID | Prevent password cycling |
| **verifyEmail**    | 10 req | 1 hora | Token   | Allow multiple attempts  |
| **refreshToken**   | 20 req | 5 min  | User ID | Normal refresh usage     |

### **Implementação Rate Limiting**

```typescript
// Decorator customizado
@RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  maxRequests: 10,
  keyGenerator: (req) => req.ip,
  message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
})
@Mutation(() => AuthPayload)
async login(@Args('loginInput') loginDto: LoginDto) {
  // ...
}
```

### **Headers de Rate Limiting**

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1704532800
X-RateLimit-Window: 900
```

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1704532800
Retry-After: 600

{
  "error": "Rate limit exceeded",
  "message": "Muitas tentativas de login. Tente novamente em 15 minutos.",
  "retryAfter": 600
}
```

---

## ❌ Casos de Erro

### **Errors de Autenticação**

#### **1. Email não verificado**

```json
{
  "errors": [
    {
      "message": "Email não verificado. Verifique sua caixa de entrada.",
      "extensions": {
        "code": "UNAUTHENTICATED",
        "statusCode": 401,
        "action": "EMAIL_VERIFICATION_REQUIRED"
      }
    }
  ]
}
```

#### **2. Credenciais inválidas**

```json
{
  "errors": [
    {
      "message": "Credenciais inválidas.",
      "extensions": {
        "code": "UNAUTHENTICATED",
        "statusCode": 401
      }
    }
  ]
}
```

#### **3. Token expirado**

```json
{
  "errors": [
    {
      "message": "Token expirado.",
      "extensions": {
        "code": "UNAUTHENTICATED",
        "statusCode": 401,
        "action": "TOKEN_REFRESH_REQUIRED"
      }
    }
  ]
}
```

#### **4. Rate limit excedido**

```json
{
  "errors": [
    {
      "message": "Muitas tentativas de login. Tente novamente em 15 minutos.",
      "extensions": {
        "code": "TOO_MANY_REQUESTS",
        "statusCode": 429,
        "retryAfter": 900
      }
    }
  ]
}
```

### **Tratamento de Erros no Frontend**

```typescript
// Exemplo de tratamento no frontend
const handleAuthError = (error: GraphQLError) => {
  switch (error.extensions?.code) {
    case 'UNAUTHENTICATED':
      if (error.extensions?.action === 'EMAIL_VERIFICATION_REQUIRED') {
        router.push('/verify-email');
      } else if (error.extensions?.action === 'TOKEN_REFRESH_REQUIRED') {
        return refreshToken();
      } else {
        router.push('/login');
      }
      break;

    case 'TOO_MANY_REQUESTS':
      const retryAfter = error.extensions?.retryAfter || 300;
      showErrorMessage(`Tente novamente em ${retryAfter / 60} minutos`);
      break;

    default:
      showErrorMessage(error.message);
  }
};
```

---

## 🔧 Configuração e Variáveis

### **Variáveis de Ambiente Obrigatórias**

```bash
# JWT Secrets (256-bit random strings)
JWT_SECRET=sua-chave-super-secreta-256-bits
JWT_REFRESH_SECRET=sua-chave-refresh-diferente-256-bits

# JWT Expiration
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Database
DATABASE_URL=postgresql://user:pass@host:5432/edumatch

# Email Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=noreply@edumatch.com
SMTP_PASS=senha-do-email

# Frontend URLs
FRONTEND_URL=https://app.edumatch.com
FRONTEND_EMAIL_VERIFICATION_URL=https://app.edumatch.com/verify-email
FRONTEND_PASSWORD_RESET_URL=https://app.edumatch.com/reset-password

# Security
BCRYPT_ROUNDS=12
TOKEN_EXPIRY_HOURS=24

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=10
```

### **Configuração de Segurança**

```typescript
// security.config.ts
export const securityConfig = {
  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  tokens: {
    expiryHours: parseInt(process.env.TOKEN_EXPIRY_HOURS || '24'),
    length: 32, // 32 bytes = 64 hex chars
  },
  cookies: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
};
```

---

## 📚 Exemplos de Uso Completos

### **Fluxo Completo de Registro e Login**

```typescript
// 1. REGISTRO
const registerResponse = await client.mutate({
  mutation: REGISTER_MUTATION,
  variables: {
    registerInput: {
      email: 'usuario@example.com',
      username: 'usuario123',
      password: 'MinhaSenh@123',
    },
  },
});
// Usuário criado com emailVerified: false
// Email de verificação enviado automaticamente

// 2. VERIFICAÇÃO DE EMAIL
const verifyResponse = await client.mutate({
  mutation: VERIFY_EMAIL_MUTATION,
  variables: {
    verifyEmailInput: {
      token: 'token-recebido-por-email',
    },
  },
});
// emailVerified atualizado para true

// 3. LOGIN
const loginResponse = await client.mutate({
  mutation: LOGIN_MUTATION,
  variables: {
    loginInput: {
      identifier: 'usuario@example.com',
      password: 'MinhaSenh@123',
    },
  },
});
// Retorna access token
// Define refresh token em cookie HttpOnly
// Envia notificação de login

// 4. ACESSAR RECURSOS PROTEGIDOS
const userResponse = await client.query({
  query: ME_QUERY,
  context: {
    headers: {
      Authorization: `Bearer ${loginResponse.data.login.accessToken}`,
    },
  },
});

// 5. REFRESH TOKEN (automático quando access token expira)
const refreshResponse = await client.mutate({
  mutation: REFRESH_TOKEN_MUTATION,
  // Cookie refresh_token enviado automaticamente
});
// Retorna novo access token
```

### **Fluxo de Recuperação de Senha**

```typescript
// 1. SOLICITAR RESET
const forgotResponse = await client.mutate({
  mutation: FORGOT_PASSWORD_MUTATION,
  variables: {
    forgotPasswordInput: {
      email: 'usuario@example.com',
    },
  },
});
// Sempre retorna sucesso
// Email enviado se usuário existir

// 2. RESET SENHA
const resetResponse = await client.mutate({
  mutation: RESET_PASSWORD_MUTATION,
  variables: {
    resetPasswordInput: {
      token: 'token-recebido-por-email',
      newPassword: 'MinhaNovaSenh@456',
    },
  },
});
// Senha atualizada
// Token limpo do banco
// Notificação de alteração enviada
```

---

**🔐 Sistema de Autenticação EduMatch - Documentação Completa**  
_Última atualização: 06/01/2025_
