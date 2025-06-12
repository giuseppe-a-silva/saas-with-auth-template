# 📧 Configuração de Email - EduMatch

## 🎯 Visão Geral

O EduMatch suporta múltiplos provedores de email para máxima flexibilidade e confiabilidade. O sistema detecta automaticamente o provedor configurado e utiliza o mais apropriado.

### **Provedores Suportados**

| Provedor          | Uso Recomendado     | Limite       | Custo      | Configuração |
| ----------------- | ------------------- | ------------ | ---------- | ------------ |
| **SMTP Gmail**    | Desenvolvimento/MVP | 500-2000/dia | Gratuito   | 5 minutos    |
| **SMTP Genérico** | Desenvolvimento     | Varia        | Varia      | 5 minutos    |
| **AWS SES**       | Produção            | Ilimitado    | $0.10/1000 | 15 minutos   |

---

## 🚀 Opção 1: SMTP (Desenvolvimento)

### **Gmail SMTP - Configuração Rápida**

#### **1. Preparar Gmail (2 minutos)**

1. **Ativar 2FA**: [https://myaccount.google.com/security](https://myaccount.google.com/security)
2. **Gerar senha de app**: [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
   - Selecione "Outro (nome personalizado)"
   - Digite "EduMatch"
   - **Copie a senha de 16 caracteres**

#### **2. Configurar .env**

```env
# ========================================
# 📧 EMAIL CONFIGURATION (SMTP Gmail)
# ========================================
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="seu-email@gmail.com"
SMTP_PASS="sua-senha-de-app-16-chars"
NOTIFICATION_DEFAULT_FROM="noreply@edumatch.com"

# URLs do Frontend
FRONTEND_EMAIL_VERIFICATION_URL="http://localhost:3000/verify-email"
FRONTEND_PASSWORD_RESET_URL="http://localhost:3000/reset-password"

# Deixe vazio para usar apenas SMTP
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
```

#### **3. Testar Configuração**

```bash
# Testar SMTP
node test-smtp.js

# Deve exibir:
# ✅ Conexão SMTP estabelecida
# 📧 Email de teste enviado
```

### **Outros Provedores SMTP**

#### **Outlook/Hotmail**

```env
SMTP_HOST="smtp-mail.outlook.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="seu-email@outlook.com"
SMTP_PASS="sua-senha"
```

#### **Yahoo**

```env
SMTP_HOST="smtp.mail.yahoo.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="seu-email@yahoo.com"
SMTP_PASS="sua-senha-de-app"
```

#### **Zoho**

```env
SMTP_HOST="smtp.zoho.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="seu-email@zoho.com"
SMTP_PASS="sua-senha"
```

---

## ☁️ Opção 2: AWS SES (Produção)

### **Comparação SMTP vs AWS SES**

| Recurso            | SMTP Tradicional | AWS SES                    |
| ------------------ | ---------------- | -------------------------- |
| **Confiabilidade** | ⚠️ Limitada      | ✅ 99.9% SLA               |
| **Volume Diário**  | 📉 500-2000      | 📈 Ilimitado               |
| **Custo**          | 💰 Gratuito      | 💰 $0.10/1000 emails       |
| **Monitoramento**  | ❌ Básico        | ✅ Métricas detalhadas     |
| **Reputação**      | ⚠️ Compartilhada | ✅ Dedicada                |
| **Analytics**      | ❌ Nenhum        | ✅ Bounce, Complaint, Open |

### **Pré-requisitos AWS SES**

1. **Conta AWS** ativa
2. **Email/Domínio verificado** no SES
3. **Permissões IAM** configuradas
4. **Região configurada** (recomendado: `us-east-1`)

### **Configuração AWS SES**

#### **1. Instalar Dependencies**

```bash
npm install @aws-sdk/client-ses aws-sdk
npm install --save-dev @types/aws-sdk
```

#### **2. Configurar .env**

```env
# ========================================
# 📧 AWS SES CONFIGURATION
# ========================================
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="..."
AWS_SES_REGION="us-east-1"
SES_VERIFIED_EMAIL="noreply@seudominio.com"
SES_CONFIGURATION_SET="edumatch-config-set"

# O sistema detecta automaticamente e usa SES se configurado
# Para usar apenas SES, deixe SMTP vazio:
SMTP_HOST=""
SMTP_PORT=""
SMTP_USER=""
SMTP_PASS=""

NOTIFICATION_DEFAULT_FROM="noreply@seudominio.com"
```

#### **3. Permissões IAM**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail",
        "ses:GetSendQuota",
        "ses:GetSendStatistics",
        "ses:ListIdentities"
      ],
      "Resource": "*"
    }
  ]
}
```

#### **4. Verificar Domínio/Email**

1. Acesse AWS Console > SES
2. Vá para "Verified identities"
3. Clique "Create identity"
4. Configure DNS records (para domínios)

---

## 🔧 Troubleshooting

### **Problemas Comuns - SMTP**

#### **Error: Invalid login**

```bash
# Soluções:
# 1. Verificar se 2FA está ativo
# 2. Gerar nova senha de app
# 3. Verificar variáveis SMTP_USER e SMTP_PASS
```

#### **Error: Connection timeout**

```bash
# Soluções:
# 1. Verificar firewall/proxy
# 2. Testar porta 587 vs 465
# 3. Alternar SMTP_SECURE true/false
```

#### **Error: Self-signed certificate**

```bash
# Solução temporária (apenas desenvolvimento):
export NODE_TLS_REJECT_UNAUTHORIZED=0
```

### **Problemas Comuns - AWS SES**

#### **Email não verificado**

```bash
# Erro: Email address not verified
# Solução: Verificar email no AWS Console SES
```

#### **Sandbox mode**

```bash
# Erro: Can only send to verified addresses
# Solução: Solicitar saída do sandbox mode
```

#### **Region incorreta**

```bash
# Erro: Invalid region
# Solução: Verificar AWS_SES_REGION
```

---

## ✅ Verificação e Testes

### **1. Health Check**

```graphql
query {
  getChannelsHealthStatus {
    channel
    provider
    isHealthy
    isConfigured
  }
}
```

**Resultado esperado:**

```json
{
  "data": {
    "getChannelsHealthStatus": [
      {
        "channel": "EMAIL",
        "provider": "nodemailer", // ou "ses"
        "isHealthy": true,
        "isConfigured": true
      }
    ]
  }
}
```

### **2. Teste de Registro**

```graphql
mutation TestEmail {
  register(
    registerInput: {
      email: "seu-email@example.com"
      username: "testuser"
      password: "MinhaSenh@123"
    }
  ) {
    id
    email
    emailVerified
  }
}
```

### **3. Teste Manual de Envio**

```graphql
mutation SendTestEmail {
  sendNotification(
    input: {
      templateName: "auth-welcome"
      recipient: { id: "test-id", name: "Test User", email: "test@example.com" }
      data: "{\"username\":\"testuser\"}"
      channel: EMAIL
    }
  ) {
    status
    externalId
    sentAt
  }
}
```

---

## 📊 Monitoramento

### **Métricas Importantes**

- **Taxa de entrega**: > 95%
- **Taxa de bounce**: < 5%
- **Taxa de complaint**: < 0.1%
- **Tempo de entrega**: < 30 segundos

### **Logs para Monitorar**

```bash
# Ver logs de email
grep "EMAIL_SENT" logs/application.log
grep "EMAIL_FAILED" logs/application.log

# Verificar performance
grep "NOTIFICATION_DURATION" logs/application.log
```

---

## 🚀 Configuração Avançada

### **Templates Customizados**

Os templates de email estão em:

- **Banco de dados**: Tabela `notification_templates`
- **Renderização**: LiquidJS engine
- **Variáveis**: `{{username}}`, `{{verificationUrl}}`, etc.

### **Configurações de Retry**

```env
# Configuração de retry para emails
NOTIFICATION_RETRY_MAX_ATTEMPTS=3
NOTIFICATION_RETRY_DELAY_MS=60000
EMAIL_TIMEOUT=30000
```

### **Rate Limiting**

```env
# Limites por usuário/IP
RATE_LIMIT_EMAIL_VERIFICATION=10/hour
RATE_LIMIT_PASSWORD_RESET=3/hour
RATE_LIMIT_REGISTER=3/5min
```

---

## 🔄 Migração SMTP → AWS SES

Para migrar de SMTP para AWS SES:

1. **Configure AWS SES** (mantenha SMTP ativo)
2. **Teste SES** em ambiente staging
3. **Atualize .env** em produção:
   ```env
   # Adicione configurações SES
   AWS_ACCESS_KEY_ID="..."
   # Sistema automaticamente prioriza SES
   ```
4. **Monitore métricas** por 48h
5. **Remova configurações SMTP** quando estável

---

**🎯 Próximo passo**: Configure [Notificações Real-time](./06-notificacoes-realtime.md) para completar o sistema de comunicações.
