# 🎯 EduMatch - Sistema de Autenticação e Notificações

Sistema completo de autenticação baseado em **NestJS + GraphQL + TypeScript** com funcionalidades avançadas de segurança, notificações e auditoria.

## 📋 Funcionalidades Implementadas

### 🔐 **Sistema de Autenticação Completo**

#### ✅ **Autenticação e Autorização**

- **Login/Logout** com JWT + Refresh Token
- **Registro de usuários** com validação robusta
- **Verificação obrigatória de email**
- **Sistema de permissões** baseado em CASL
- **Rate limiting** em todos os endpoints sensíveis

#### ✅ **Gerenciamento de Senhas**

- **Alteração de senha** com validação da senha atual
- **Recuperação de senha** via email com tokens seguros
- **Redefinição de senha** com tokens de 24h
- **Validação de senhas fortes** (maiúscula, minúscula, número, caractere especial)
- **Notificações automáticas** de alterações de segurança

#### ✅ **Verificação de Email**

- **Verificação obrigatória** no primeiro login
- **Tokens de verificação** com expiração de 24h
- **Reenvio de emails** de verificação
- **Integração completa** com sistema de notificações

### 📧 **Sistema de Notificações**

#### ✅ **Múltiplos Canais**

- **Email** (SMTP padrão + AWS SES)
- **Push Notifications**
- **Notificações em tempo real** (WebSocket)
- **Webhooks** para integração com terceiros

#### ✅ **Templates Inteligentes**

- **Sistema de templates** com Nunjucks
- **Templates específicos** para cada tipo de notificação
- **Fallback automático** entre canais
- **Personalização** por usuário/categoria

#### ✅ **Funcionalidades Avançadas**

- **Rate limiting** para prevenção de spam
- **Sistema de retry** com backoff exponencial
- **Auditoria completa** de envios
- **Disparo em lote** e **agendamento**

### 🔒 **Segurança e Auditoria**

#### ✅ **Auditoria Completa**

- **Logs estruturados** de todas as ações sensíveis
- **Rastreamento de IP, User-Agent** e metadados
- **Retenção configurável** por tipo de ação
- **Integração com analytics** externos

#### ✅ **Notificações de Segurança**

- **Alertas de login** suspeito
- **Notificações de alteração** de dados
- **Avisos de alteração** de senha
- **Detecção de novos dispositivos**

#### ✅ **Proteções Implementadas**

- **Rate limiting** por IP/usuário/endpoint
- **Proteção contra timing attacks**
- **Sanitização** de dados sensíveis nos logs
- **Tokens criptograficamente seguros**
- **Validação rigorosa** de entrada

## 🚀 Como Usar

### **Mutations GraphQL Disponíveis**

#### **Autenticação**

```graphql
# Login do usuário
mutation {
  login(
    loginInput: { identifier: "user@example.com", password: "senhaSegura123!" }
  ) {
    accessToken
  }
}

# Registro de novo usuário
mutation {
  register(
    registerInput: {
      email: "novo@example.com"
      username: "novousuario"
      password: "senhaSegura123!"
    }
  ) {
    id
    email
    username
    emailVerified
  }
}

# Verificação de email
mutation {
  verifyEmail(verifyEmailInput: { token: "token-recebido-por-email" }) {
    success
    message
  }
}
```

#### **Gerenciamento de Senha**

```graphql
# Alteração de senha (usuário logado)
mutation {
  changePassword(
    changePasswordInput: {
      currentPassword: "senhaAtual123!"
      newPassword: "novaSenhaSegura456!"
    }
  ) {
    success
    message
  }
}

# Solicitar recuperação de senha
mutation {
  forgotPassword(forgotPasswordInput: { email: "user@example.com" }) {
    success
    message
  }
}

# Redefinir senha com token
mutation {
  resetPassword(
    resetPasswordInput: {
      token: "token-recebido-por-email"
      newPassword: "novaSenhaSegura123!"
    }
  ) {
    success
    message
  }
}
```

#### **Tokens e Logout**

```graphql
# Renovar access token
mutation {
  refreshToken {
    accessToken
  }
}

# Logout
mutation {
  logout {
    success
    message
  }
}
```

### **Rate Limits Configurados**

| Endpoint         | Limite        | Janela | Observações |
| ---------------- | ------------- | ------ | ----------- |
| `register`       | 3 tentativas  | 5 min  | Por IP      |
| `login`          | 5 tentativas  | 1 min  | Por IP      |
| `forgotPassword` | 3 tentativas  | 1 hora | Por email   |
| `resetPassword`  | 5 tentativas  | 1 hora | Por token   |
| `changePassword` | 5 tentativas  | 1 hora | Por usuário |
| `verifyEmail`    | 10 tentativas | 1 hora | Por token   |

### **Templates de Notificação**

#### **Templates de Autenticação**

- `auth-email-verification` - Verificação de email
- `auth-password-reset` - Recuperação de senha
- `auth-password-changed` - Senha alterada
- `auth-login-notification` - Notificação de login
- `auth-data-changed` - Dados alterados
- `auth-welcome` - Boas-vindas

#### **Templates de Sistema**

- `system-maintenance` - Manutenção programada
- `system-error-alert` - Alertas de erro

## 🛠️ Configuração

### **Variáveis de Ambiente**

```bash
# JWT
JWT_SECRET=seu-jwt-secret-super-seguro
JWT_ACCESS_TOKEN_EXPIRES_IN=15m
JWT_REFRESH_TOKEN_EXPIRES_IN=7d

# Email
EMAIL_VERIFICATION_EXPIRATION_HOURS=24
PASSWORD_RESET_EXPIRATION_HOURS=24

# Aplicação
APP_BASE_URL=http://localhost:3000

# Auditoria
AUDIT_ENABLED=true
AUDIT_DETAILED_LOGS=true

# Rate Limiting
RATE_LIMIT_ENABLED=true
```

### **Banco de Dados**

```bash
# Aplicar migrações
npx prisma migrate deploy

# Gerar cliente Prisma
npx prisma generate

# Executar seed (templates de notificação)
npm run db:seed
```

## 📊 Logs e Auditoria

### **Tipos de Auditoria**

- `USER_LOGIN` - Login de usuário
- `USER_LOGOUT` - Logout de usuário
- `USER_REGISTER` - Registro de usuário
- `PASSWORD_CHANGE` - Alteração de senha
- `PASSWORD_RESET_REQUEST` - Solicitação de recuperação
- `PASSWORD_RESET_CONFIRM` - Confirmação de recuperação
- `EMAIL_VERIFICATION` - Verificação de email
- `TOKEN_REFRESH` - Renovação de token

### **Estrutura dos Logs**

```json
{
  "userId": "uuid",
  "action": "USER_LOGIN",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "endpoint": "/graphql",
  "method": "POST",
  "success": true,
  "timestamp": "2025-06-03T15:30:00.000Z",
  "responseTime": 245,
  "requestData": {
    "body": "[SANITIZED]"
  }
}
```

## 🔧 Arquitetura

### **Módulos Principais**

- **AuthModule** - Autenticação, autorização e segurança
- **UsersModule** - Gerenciamento de usuários
- **NotificationsModule** - Sistema de notificações
- **AuditModule** - Auditoria e logs

### **Serviços Especializados**

- `AuthenticationService` - Lógica de autenticação
- `PasswordService` - Gerenciamento de senhas
- `TokenService` - Geração e validação de JWT
- `EmailVerificationService` - Verificação de email
- `PasswordResetService` - Recuperação de senha
- `SecurityNotificationService` - Notificações de segurança

## 🧪 Testes

```bash
# Testes unitários
npm run test

# Testes com coverage
npm run test:cov

# Testes e2e
npm run test:e2e

# Build do projeto
npm run build
```

## 📚 Documentação Adicional

### **Fluxos Implementados**

1. **Registro de Usuário**

   - Validação de dados → Criação do usuário → Envio de email de verificação

2. **Login**

   - Verificação de credenciais → Verificação de email → Geração de tokens → Notificação de login

3. **Recuperação de Senha**

   - Solicitação → Geração de token → Envio de email → Redefinição → Notificação de alteração

4. **Alteração de Senha**
   - Validação da senha atual → Atualização → Notificação de alteração

### **Próximos Passos**

- [ ] Implementar autenticação 2FA
- [ ] Adicionar suporte a OAuth providers
- [ ] Implementar sistema de sessões ativas
- [ ] Adicionar métricas de segurança

---

**🎯 EduMatch** - Sistema robusto e seguro para autenticação e comunicação.
