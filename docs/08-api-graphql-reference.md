# 📚 Referência da API GraphQL - EduMatch

**Versão:** 1.0  
**Data:** Janeiro 2025

---

## 📋 Índice

1. [Visão Geral](#-visão-geral)
2. [Endpoint GraphQL](#-endpoint-graphql)
3. [Autenticação](#-autenticação)
4. [Rate Limiting](#-rate-limiting)
5. [Mutations de Autenticação](#-mutations-de-autenticação)
6. [Queries de Usuários](#-queries-de-usuários)
7. [Mutations de Usuários](#-mutations-de-usuários)
8. [Sistema de Notificações](#-sistema-de-notificações)
9. [Tipos e Enums](#-tipos-e-enums)
10. [Códigos de Erro](#-códigos-de-erro)
11. [Exemplos Práticos](#-exemplos-práticos)
12. [Troubleshooting](#-troubleshooting)

---

## 🎯 Visão Geral

A API GraphQL do EduMatch fornece acesso completo aos recursos de autenticação, gerenciamento de usuários e notificações. Toda a API é fortemente tipada, auto-documentada e inclui validação robusta de entrada.

### **Características da API**

- ✅ **Auto-documentação** via GraphQL Schema
- ✅ **Validação automática** de entrada e saída
- ✅ **Rate limiting** por IP e usuário
- ✅ **Autenticação JWT** obrigatória em recursos protegidos
- ✅ **Auditoria completa** de todas as operações sensíveis
- ✅ **Paginação** em queries de listagem
- ✅ **Filtragem avançada** por múltiplos critérios

---

## 🌐 Endpoint GraphQL

### **URL Principal**

```
POST https://api.edumatch.com/graphql
```

### **Headers Obrigatórios**

```http
Content-Type: application/json
Accept: application/json
```

### **Headers de Autenticação (quando necessário)**

```http
Authorization: Bearer <access_token>
```

### **Headers Opcionais**

```http
X-Request-ID: <uuid>          # Para rastreamento de requisições
X-Client-Version: <version>   # Versão do cliente
User-Agent: <client_info>     # Informações do cliente
```

---

## 🔐 Autenticação

### **Fluxo de Autenticação**

1. **Registro** → **Verificação de Email** → **Login** → **Access Token**
2. Quando o access token expira → **Refresh Token** → **Novo Access Token**

### **Tipos de Token**

#### **Access Token**

- **Duração**: 15 minutos
- **Uso**: Autenticação em recursos protegidos
- **Formato**: JWT no header `Authorization: Bearer <token>`

#### **Refresh Token**

- **Duração**: 7 dias
- **Uso**: Renovação do access token
- **Formato**: HTTP-only cookie automático

### **Verificação de Email Obrigatória**

⚠️ **IMPORTANTE**: Usuários devem verificar o email antes do primeiro login.

---

## ⚡ Rate Limiting

### **Limites por Endpoint**

| Endpoint         | Limite | Janela | Chave   | Status Code |
| ---------------- | ------ | ------ | ------- | ----------- |
| `register`       | 3 req  | 5 min  | IP      | 429         |
| `login`          | 5 req  | 1 min  | IP      | 429         |
| `forgotPassword` | 3 req  | 1 hora | Email   | 429         |
| `resetPassword`  | 5 req  | 1 hora | Token   | 429         |
| `changePassword` | 5 req  | 1 hora | User ID | 429         |
| `verifyEmail`    | 10 req | 1 hora | Token   | 429         |
| `refreshToken`   | 20 req | 5 min  | User ID | 429         |

### **Headers de Rate Limiting**

```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1641891600
Retry-After: 300
```

---

## 🔑 Mutations de Autenticação

### **1. Registro de Usuário**

```graphql
mutation Register {
  register(
    registerInput: {
      email: "usuario@example.com"
      username: "meuusuario"
      password: "MinhaSenh@123"
    }
  ) {
    id
    email
    username
    emailVerified
    role
    createdAt
  }
}
```

**Validações:**

- Email: formato válido, não descartável
- Username: 3-20 caracteres, alfanumérico + underscore
- Password: 8+ caracteres, maiúscula, minúscula, número, especial

**Comportamento:**

- Usuário criado com `emailVerified: false`
- Email de verificação enviado automaticamente
- Auditoria: `USER_REGISTER`

### **2. Verificação de Email**

```graphql
mutation VerifyEmail {
  verifyEmail(verifyEmailInput: { token: "token-recebido-por-email" }) {
    success
    message
  }
}
```

**Token:**

- Válido por 24 horas
- Uso único (invalidado após verificação)
- Criptograficamente seguro (32 bytes)

### **3. Login**

```graphql
mutation Login {
  login(
    loginInput: {
      identifier: "usuario@example.com" # Email ou username
      password: "MinhaSenh@123"
    }
  ) {
    accessToken
    user {
      id
      email
      username
      role
      emailVerified
    }
  }
}
```

**Validações:**

- Email deve estar verificado
- Credenciais devem estar corretas
- Conta não deve estar bloqueada

**Comportamento:**

- Define refresh token em cookie HTTP-only
- Envia notificação de login por email
- Auditoria: `USER_LOGIN`

### **4. Logout**

```graphql
mutation Logout {
  logout {
    success
    message
  }
}
```

**Comportamento:**

- Remove refresh token cookie
- Auditoria: `USER_LOGOUT`

### **5. Renovação de Token**

```graphql
mutation RefreshToken {
  refreshToken {
    accessToken
  }
}
```

**Comportamento:**

- Usa refresh token do cookie automaticamente
- Gera novo access token (15 min)
- Auditoria: `TOKEN_REFRESH`

### **6. Recuperação de Senha**

```graphql
mutation ForgotPassword {
  forgotPassword(forgotPasswordInput: { email: "usuario@example.com" }) {
    success
    message
  }
}
```

**Comportamento:**

- Sempre retorna sucesso (mesmo se email não existir)
- Envia email de reset apenas se usuário existir
- Token válido por 24 horas
- Auditoria: `PASSWORD_RESET_REQUEST`

### **7. Redefinição de Senha**

```graphql
mutation ResetPassword {
  resetPassword(
    resetPasswordInput: {
      token: "token-recebido-por-email"
      newPassword: "NovaSenha@456"
    }
  ) {
    success
    message
  }
}
```

**Comportamento:**

- Valida token de reset
- Atualiza senha com hash bcrypt
- Invalida token após uso
- Envia notificação de alteração
- Auditoria: `PASSWORD_RESET_CONFIRM`

### **8. Alteração de Senha**

```graphql
mutation ChangePassword {
  changePassword(
    changePasswordInput: {
      currentPassword: "SenhaAtual@123"
      newPassword: "NovaSenha@456"
    }
  ) {
    success
    message
  }
}
```

**Comportamento:**

- Requer autenticação
- Valida senha atual
- Atualiza para nova senha
- Envia notificação por email
- Auditoria: `PASSWORD_CHANGE`

---

## 👤 Queries de Usuários

### **1. Dados do Usuário Atual**

```graphql
query Me {
  me {
    id
    email
    username
    role
    emailVerified
    createdAt
    updatedAt
  }
}
```

**Autenticação:** Obrigatória  
**Permissões:** Próprio usuário

### **2. Buscar Usuário por ID**

```graphql
query FindUserById {
  findUserById(id: "user-uuid") {
    id
    email
    username
    role
    emailVerified
    createdAt
  }
}
```

**Autenticação:** Obrigatória  
**Permissões:** `Action.Read` em `User`

---

## ✏️ Mutations de Usuários

### **1. Atualizar Perfil**

```graphql
mutation UpdateMyProfile {
  updateMyProfile(
    updateUserInput: {
      username: "novousername"
      # email não pode ser alterado via API
    }
  ) {
    id
    email
    username
    updatedAt
  }
}
```

**Autenticação:** Obrigatória  
**Validações:** Username único, formato válido  
**Auditoria:** `DATA_UPDATE`

### **2. Deletar Usuário (Admin)**

```graphql
mutation DeleteUser {
  deleteUser(id: "user-uuid") {
    id
    email
    username
  }
}
```

**Autenticação:** Obrigatória  
**Permissões:** `Action.Delete` em `User`  
**Restrições:** Não pode deletar própria conta  
**Auditoria:** `DATA_UPDATE`

---

## 📧 Sistema de Notificações

### **1. Enviar Notificação**

```graphql
mutation SendNotification {
  sendNotification(
    input: {
      templateName: "auth-welcome"
      recipient: {
        id: "user-uuid"
        name: "João Silva"
        email: "joao@example.com"
      }
      data: "{\"curso\": \"Pós-graduação\", \"valor\": \"R$ 350\"}"
      channel: EMAIL
    }
  ) {
    status
    externalId
    sentAt
    retryCount
  }
}
```

### **2. Listar Templates**

```graphql
query GetNotificationTemplates {
  getNotificationTemplates(category: AUTH, channel: EMAIL, isActive: true) {
    id
    name
    title
    content
    category
    channel
    isActive
    createdAt
  }
}
```

### **3. Criar Template**

```graphql
mutation CreateNotificationTemplate {
  createNotificationTemplate(
    input: {
      name: "custom-welcome"
      title: "Bem-vindo, {{ user.name }}!"
      content: "Olá {{ user.name }}, bem-vindo ao EduMatch!"
      category: MARKETING
      channel: EMAIL
    }
  ) {
    id
    name
    title
    isActive
    createdAt
  }
}
```

---

## 🔧 Tipos e Enums

### **Enums Principais**

#### **Role (Papel do Usuário)**

```graphql
enum Role {
  ADMIN # Acesso total ao sistema
  EDITOR # Acesso de leitura e edição
  USER # Acesso básico de usuário
}
```

#### **NotificationCategory**

```graphql
enum NotificationCategory {
  SISTEMA # Notificações do sistema
  AUTH # Autenticação e segurança
  LEADS # Captação e leads
  MARKETING # Campanhas e promoções
  ADMIN # Administrativas
}
```

#### **NotificationChannel**

```graphql
enum NotificationChannel {
  EMAIL # Email SMTP/SES
  PUSH # Push notifications
  REALTIME # WebSocket/SSE
  THIRD_PARTY # Webhooks externos
}
```

#### **AuditActionType**

```graphql
enum AuditActionType {
  # Autenticação
  LOGIN
  LOGOUT
  LOGIN_FAILED
  USER_REGISTER

  # Senhas
  PASSWORD_CHANGE
  PASSWORD_RESET_REQUEST
  PASSWORD_RESET_CONFIRM

  # Verificações
  EMAIL_VERIFICATION

  # Dados
  DATA_UPDATE
  ACCESS_DENIED
  TOKEN_REFRESH
}
```

### **Tipos de Input**

#### **RegisterInput**

```graphql
input RegisterInput {
  email: String! # Email válido
  username: String! # 3-20 caracteres
  password: String! # 8+ caracteres, forte
}
```

#### **LoginInput**

```graphql
input LoginInput {
  identifier: String! # Email ou username
  password: String! # Senha do usuário
}
```

#### **UpdateUserInput**

```graphql
input UpdateUserInput {
  username: String # Novo username (opcional)
  # Email não é alterável via API
}
```

### **Tipos de Output**

#### **AuthPayload**

```graphql
type AuthPayload {
  accessToken: String!
  user: User!
}
```

#### **User**

```graphql
type User {
  id: ID!
  email: String!
  username: String!
  role: Role!
  emailVerified: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
  # password nunca é exposto
}
```

#### **StandardResponse**

```graphql
type StandardResponse {
  success: Boolean!
  message: String!
}
```

---

## ❌ Códigos de Erro

### **Autenticação (401)**

```json
{
  "message": "Unauthorized",
  "code": "UNAUTHORIZED",
  "details": "Access token required"
}
```

### **Autorização (403)**

```json
{
  "message": "Forbidden",
  "code": "FORBIDDEN",
  "details": "Insufficient permissions"
}
```

### **Rate Limiting (429)**

```json
{
  "message": "Too Many Requests",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": "5 attempts per minute exceeded",
  "retryAfter": 60
}
```

### **Validação (400)**

```json
{
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "password",
      "message": "Password must contain at least one uppercase letter"
    }
  ]
}
```

### **Email Não Verificado (403)**

```json
{
  "message": "Email verification required",
  "code": "EMAIL_NOT_VERIFIED",
  "details": "Please verify your email before logging in"
}
```

---

## 💡 Exemplos Práticos

### **Fluxo Completo de Novo Usuário**

```graphql
# 1. Registro
mutation {
  register(
    registerInput: {
      email: "novo@example.com"
      username: "novousuario"
      password: "MinhaSenh@123"
    }
  ) {
    id
    emailVerified # false
  }
}

# 2. Verificação (após receber email)
mutation {
  verifyEmail(verifyEmailInput: { token: "token-from-email" }) {
    success
    message
  }
}

# 3. Login
mutation {
  login(
    loginInput: { identifier: "novo@example.com", password: "MinhaSenh@123" }
  ) {
    accessToken
    user {
      id
      emailVerified # true
    }
  }
}

# 4. Acessar dados (usando token)
query {
  me {
    id
    email
    username
    role
  }
}
```

### **Recuperação de Senha**

```graphql
# 1. Solicitar reset
mutation {
  forgotPassword(forgotPasswordInput: { email: "usuario@example.com" }) {
    success
    message
  }
}

# 2. Redefinir senha (com token do email)
mutation {
  resetPassword(
    resetPasswordInput: {
      token: "reset-token-from-email"
      newPassword: "NovaSenhaSegura@456"
    }
  ) {
    success
    message
  }
}

# 3. Login com nova senha
mutation {
  login(
    loginInput: {
      identifier: "usuario@example.com"
      password: "NovaSenhaSegura@456"
    }
  ) {
    accessToken
  }
}
```

### **Gerenciamento de Tokens**

```graphql
# Access token expirou? Use refresh
mutation {
  refreshToken {
    accessToken # Novo token por 15 minutos
  }
}

# Logout completo
mutation {
  logout {
    success
    message
  }
}
```

---

## 🔧 Troubleshooting

### **Problemas Comuns**

#### **"Email not verified"**

- **Causa**: Login sem verificar email
- **Solução**: Verificar email com token recebido
- **Endpoint**: `verifyEmail` mutation

#### **"Rate limit exceeded"**

- **Causa**: Muitas tentativas em pouco tempo
- **Solução**: Aguardar tempo do `Retry-After` header
- **Prevenção**: Implementar debounce no frontend

#### **"Invalid or expired token"**

- **Causa**: Token de verificação/reset expirado
- **Solução**: Solicitar novo token
- **Prevenção**: Verificar dentro de 24h

#### **"Weak password"**

- **Causa**: Senha não atende critérios de segurança
- **Solução**: Usar senha com 8+ caracteres, maiúscula, minúscula, número, especial

### **Headers de Debug**

```http
X-Request-ID: uuid        # Para rastreamento
X-Debug-Mode: true        # Logs adicionais (dev only)
X-Client-Version: 1.0.0   # Versão do cliente
```

### **Logs de Auditoria**

Todas as operações sensíveis são auditadas automaticamente:

```json
{
  "userId": "uuid",
  "action": "USER_LOGIN",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2025-01-11T10:30:00Z",
  "success": true,
  "responseTime": 245
}
```

---

## 📞 Suporte

### **Recursos de Ajuda**

- **GraphQL Playground**: `/graphql` (desenvolvimento)
- **Documentação Schema**: Introspection automática
- **Logs de Erro**: Headers com Request-ID para rastreamento

### **Ambiente de Testes**

```bash
# Endpoint de desenvolvimento
https://dev-api.edumatch.com/graphql

# Endpoint de staging
https://staging-api.edumatch.com/graphql

# Endpoint de produção
https://api.edumatch.com/graphql
```

---

**📚 API GraphQL EduMatch - Referência Completa**  
_Última atualização: 11/01/2025_
