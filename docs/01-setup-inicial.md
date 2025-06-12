# 🚀 Setup Inicial EduMatch - 5 Minutos

## 🎯 Visão Geral

Este guia permite configurar o **EduMatch** em 5 minutos com as funcionalidades essenciais: autenticação, notificações por email e real-time.

## ⚡ Configuração Rápida

### 1. **Configure Providers**

#### 📧 Email (Gmail SMTP):

- Ative autenticação 2FA: https://myaccount.google.com/security
- Gere senha de app: https://myaccount.google.com/apppasswords

#### 📱 Realtime (Pusher):

- Crie conta: https://pusher.com/
- Anote: APP_ID, KEY, SECRET, CLUSTER

#### 📲 Push (OneSignal):

- Crie conta: https://onesignal.com/
- Anote: APP_ID, API_KEY

### 2. **Configure o .env**

```env
# ========================================
# 📧 EMAIL (SMTP Gmail) - BÁSICO
# ========================================
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="seu-email@gmail.com"
SMTP_PASS="sua-senha-de-app-16-chars"
NOTIFICATION_DEFAULT_FROM="noreply@edumatch.com"

# ========================================
# 🚀 REALTIME (Pusher) - BÁSICO
# ========================================
REALTIME_PROVIDER="pusher"
PUSHER_APP_ID="seu-app-id"
PUSHER_KEY="sua-key"
PUSHER_SECRET="seu-secret"
PUSHER_CLUSTER="mt1"

# ========================================
# 📱 PUSH (OneSignal) - BÁSICO
# ========================================
ONESIGNAL_APP_ID="seu-onesignal-app-id"
ONESIGNAL_API_KEY="sua-onesignal-api-key"

# URLs
FRONTEND_EMAIL_VERIFICATION_URL="http://localhost:3000/verify-email"
FRONTEND_PASSWORD_RESET_URL="http://localhost:3000/reset-password"
```

### 3. **Execute o projeto**

```bash
npm run start:dev
```

### 4. **Teste o registro**

```graphql
mutation Register {
  register(
    registerInput: {
      email: "seu-email@gmail.com"
      password: "SuaSenha123@"
      username: "testuser"
    }
  ) {
    email
    emailVerified
    id
  }
}
```

### 5. **Teste realtime**

```graphql
# Enviar notificação realtime
mutation SendRealtimeNotification {
  sendNotification(
    input: {
      templateName: "system-alert"
      recipient: { id: "user-id", name: "User", email: "user@test.com" }
      data: "{\"message\":\"Hello realtime!\"}"
      channel: REALTIME
    }
  ) {
    status
    externalId
  }
}
```

## ✅ Verificações

- [ ] Senha de app criada no Gmail
- [ ] Arquivo .env configurado
- [ ] Script test-smtp.js executado com sucesso
- [ ] Servidor iniciado sem erros
- [ ] Email de verificação recebido

---

## 🚀 Próximos Passos

- **Problemas?** Consulte [Configuração de Email](./05-configuracao-email.md) para troubleshooting detalhado
- **Real-time**: Configure [Notificações Real-time](./06-notificacoes-realtime.md)
- **API**: Explore a [Referência da API GraphQL](./08-api-graphql-reference.md)

---

**✅ Sucesso!** Seu ambiente EduMatch está funcionando. Continue com as configurações avançadas conforme necessário.
