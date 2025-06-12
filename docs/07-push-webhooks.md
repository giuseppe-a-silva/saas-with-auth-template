# 📱 Push Notifications & Webhooks - EduMatch

## 🎯 Visão Geral

Este tutorial mostra como configurar **Push Notifications** (OneSignal) e **Webhooks** no sistema de notificações do EduMatch.

---

## 📱 OneSignal - Push Notifications

### **Passo 1: Criar Conta OneSignal**

1. Acesse: https://onesignal.com/
2. Crie conta gratuita
3. Clique em "Add a new app"
4. Escolha plataforma (Web, iOS, Android)

### **Passo 2: Configurar Plataformas**

#### **Web Push (PWA)**

```javascript
// No OneSignal dashboard:
// 1. Adicione seu domínio: https://seudominio.com
// 2. Configure ícones e permissões
// 3. Anote App ID e API Key
```

#### **Mobile (React Native/Flutter)**

```javascript
// Siga guias específicos:
// iOS: Certificados Apple Push
// Android: Firebase Server Key
```

### **Passo 3: Configurar .env**

```env
# ========================================
# 📱 PUSH NOTIFICATIONS (ONESIGNAL)
# ========================================
ONESIGNAL_APP_ID="12345678-1234-1234-1234-123456789012"
ONESIGNAL_API_KEY="YourOneSignalAPIKey"

# Configurações avançadas
ONESIGNAL_WEBHOOK_URL="https://seuapi.com/webhooks/onesignal"
PUSH_NOTIFICATION_TIMEOUT=30000
PUSH_MAX_RETRY_ATTEMPTS=3
```

### **Passo 4: Instalar Dependencies**

```bash
npm install @onesignal/node-onesignal
npm install --save-dev @types/onesignal
```

### **Passo 5: Frontend Integration**

#### **Web (JavaScript)**

```html
<!-- No seu HTML head -->
<script src="https://cdn.onesignal.com/sdks/OneSignalSDK.js" async=""></script>
<script>
  window.OneSignal = window.OneSignal || [];
  OneSignal.push(function () {
    OneSignal.init({
      appId: 'YOUR_ONESIGNAL_APP_ID',
      allowLocalhostAsSecureOrigin: true, // Desenvolvimento
      notifyButton: {
        enable: true,
      },
    });
  });
</script>
```

#### **React Integration**

```typescript
// hooks/useOneSignal.ts
import { useEffect } from 'react';

export const useOneSignal = (userId: string) => {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.OneSignal) {
      window.OneSignal.push(() => {
        window.OneSignal.init({
          appId: process.env.REACT_APP_ONESIGNAL_APP_ID!,
          allowLocalhostAsSecureOrigin: true,
        });

        // Associar usuário
        window.OneSignal.setExternalUserId(userId);

        // Event listeners
        window.OneSignal.on('subscriptionChange', (isSubscribed) => {
          console.log('Push subscription:', isSubscribed);
        });
      });
    }
  }, [userId]);
};
```

### **Passo 6: Teste Push Notification**

```graphql
mutation SendPushNotification {
  sendNotification(
    input: {
      templateName: "system-alert"
      recipient: {
        id: "user-123"
        name: "Test User"
        email: "test@example.com"
      }
      data: "{\"title\":\"Nova Mensagem\",\"body\":\"Você tem uma nova mensagem!\",\"icon\":\"icon.png\"}"
      channel: PUSH
    }
  ) {
    status
    externalId
    metadata
    sentAt
  }
}
```

---

## 🌐 Webhooks

### **Visão Geral**

Webhooks permitem enviar notificações para sistemas externos quando eventos ocorrem no EduMatch.

### **Passo 1: Configurar .env**

```env
# ========================================
# 🌐 WEBHOOKS
# ========================================

# URLs de webhook para diferentes eventos
WEBHOOK_USER_REGISTERED="https://external-api.com/webhooks/user-registered"
WEBHOOK_USER_VERIFIED="https://external-api.com/webhooks/user-verified"
WEBHOOK_PASSWORD_RESET="https://external-api.com/webhooks/password-reset"

# Configurações gerais
WEBHOOK_TIMEOUT=30000
WEBHOOK_MAX_RETRY_ATTEMPTS=3
WEBHOOK_RETRY_DELAY_MS=5000

# Segurança
WEBHOOK_SECRET="your-webhook-signing-secret"
WEBHOOK_SIGNATURE_HEADER="X-EduMatch-Signature"

# Headers customizados
WEBHOOK_CUSTOM_HEADERS="{\"Authorization\":\"Bearer token123\",\"X-API-Key\":\"key123\"}"
```

### **Passo 2: Configurar Endpoints Webhook**

#### **Estrutura da Payload**

```json
{
  "event": "user.registered",
  "timestamp": "2025-01-13T10:30:00Z",
  "data": {
    "userId": "user-123",
    "email": "user@example.com",
    "metadata": {
      "source": "web",
      "userAgent": "Mozilla/5.0..."
    }
  },
  "signature": "sha256=abc123...",
  "requestId": "req-456"
}
```

#### **Validar Signature (Node.js)**

```javascript
const crypto = require('crypto');

function validateWebhookSignature(body, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('hex');

  return `sha256=${expectedSignature}` === signature;
}

// No seu endpoint
app.post('/webhooks/edumatch', (req, res) => {
  const signature = req.headers['x-edumatch-signature'];
  const body = JSON.stringify(req.body);

  if (!validateWebhookSignature(body, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  // Processar webhook
  console.log('Evento recebido:', req.body.event);
  res.status(200).send('OK');
});
```

### **Passo 3: Teste Webhook**

```graphql
mutation SendWebhookNotification {
  sendNotification(
    input: {
      templateName: "user-action"
      recipient: {
        id: "external-system"
        name: "External API"
        email: "webhooks@external.com"
      }
      data: "{\"action\":\"user_login\",\"userId\":\"123\",\"ip\":\"192.168.1.1\"}"
      channel: WEBHOOK
    }
  ) {
    status
    externalId
    metadata
    sentAt
  }
}
```

---

## 🧪 Monitoramento e Debug

### **Health Check Geral**

```graphql
query AllChannelsHealth {
  getChannelsHealthStatus {
    channel
    isHealthy
    isConfigured
    provider
    metadata
  }
}
```

### **Logs Detalhados**

```env
# Ativar logs para debug
LOG_LEVEL="debug"
AUDIT_DETAILED_LOGS=true

# Logs específicos por canal
PUSH_DEBUG_LOGS=true
WEBHOOK_DEBUG_LOGS=true
```

### **OneSignal Debug**

```javascript
// No frontend, ativar logs
window.OneSignal.push(() => {
  window.OneSignal.setLogLevel('trace');
});

// Verificar subscription
window.OneSignal.getUserId().then((userId) => {
  console.log('OneSignal User ID:', userId);
});
```

### **Webhook Monitoring**

```bash
# Testar webhook manualmente
curl -X POST https://seu-webhook-endpoint.com/webhook \
  -H "Content-Type: application/json" \
  -H "X-EduMatch-Signature: sha256=test" \
  -d '{"event":"test","data":{"message":"hello"}}'
```

---

## 🔐 Segurança

### **OneSignal Security**

```env
# Rate limiting
PUSH_RATE_LIMIT_PER_USER=10
PUSH_RATE_LIMIT_WINDOW_MS=60000

# Filtros de usuário
PUSH_ALLOWED_USER_SEGMENTS="active,premium"
PUSH_BLOCKED_USERS="user1,user2"
```

### **Webhook Security**

```env
# IP Whitelist
WEBHOOK_ALLOWED_IPS="192.168.1.0/24,10.0.0.0/8"

# SSL/TLS obrigatório
WEBHOOK_REQUIRE_HTTPS=true

# Timeout de segurança
WEBHOOK_MAX_RESPONSE_TIME=10000
```

---

## 📊 Analytics e Métricas

### **OneSignal Analytics**

```javascript
// Rastrear conversões
window.OneSignal.push(() => {
  window.OneSignal.on('notificationClick', (event) => {
    console.log('Push clicked:', event);
    // Enviar analytics
    analytics.track('push_notification_clicked', {
      notificationId: event.id,
      userId: event.userId,
    });
  });
});
```

### **Webhook Analytics**

```graphql
# Query para métricas de webhook
query WebhookMetrics {
  getNotificationMetrics(
    channel: WEBHOOK
    startDate: "2025-01-01"
    endDate: "2025-01-31"
  ) {
    totalSent
    successRate
    averageResponseTime
    failureReasons {
      reason
      count
    }
  }
}
```

---

## 🚀 Casos de Uso Avançados

### **Push Notification Personalizadas**

```typescript
// Diferentes tipos de push
const pushTemplates = {
  welcome: {
    title: 'Bem-vindo ao EduMatch!',
    body: 'Complete seu perfil para começar',
    icon: '/icons/welcome.png',
    badge: '/icons/badge.png',
    actions: [
      {
        action: 'complete-profile',
        title: 'Completar Perfil',
      },
    ],
  },
  match: {
    title: 'Novo Match!',
    body: 'Você tem um novo match educacional',
    icon: '/icons/match.png',
    data: {
      matchId: 'match-123',
      redirectUrl: '/matches/match-123',
    },
  },
};
```

### **Webhook Chains**

```env
# Múltiplos webhooks em sequência
WEBHOOK_CHAIN_USER_FLOW="webhook1->webhook2->webhook3"
WEBHOOK_PARALLEL_NOTIFICATIONS="crm,analytics,backup"
```

---

## 🎯 Resultado Final

Após configurar Push Notifications e Webhooks:

✅ **Push notifications** cross-platform (Web, iOS, Android)  
✅ **Webhooks seguros** com validação de assinatura  
✅ **Analytics detalhadas** de entrega e engajamento  
✅ **Rate limiting** e proteções de segurança  
✅ **Monitoramento** em tempo real  
✅ **Fallback automático** em caso de falhas

**🚀 Sistema completo de notificações multi-canal pronto para produção!**
