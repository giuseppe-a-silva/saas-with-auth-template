# 📡 Notificações Real-time - EduMatch

## 🎯 Visão Geral

Este tutorial mostra como configurar notificações realtime usando **Pusher** ou **Soketi** (alternativa self-hosted) no sistema de notificações do EduMatch.

## 🆚 Pusher vs Soketi

| Recurso            | Pusher (Cloud)        | Soketi (Self-hosted)   |
| ------------------ | --------------------- | ---------------------- |
| **Setup**          | ✅ Plug & Play        | ⚙️ Configuração manual |
| **Custo**          | 💰 Pago após 100 conn | 🆓 Gratuito            |
| **Manutenção**     | ✅ Zero               | ⚠️ Você mantém         |
| **Escalabilidade** | ✅ Automática         | ⚙️ Manual              |
| **Compliance**     | ✅ Global             | 🔒 Controle total      |

---

## 🚀 Opção 1: Pusher (Recomendado para início)

### **Passo 1: Criar Conta Pusher**

1. Acesse: https://pusher.com/
2. Crie conta gratuita
3. Crie um novo app
4. Anote as credenciais:

```
App ID: 1234567
Key: abcd1234efgh5678
Secret: secret1234secret
Cluster: mt1 (ou us2, eu, ap3)
```

### **Passo 2: Configurar .env**

```env
# ========================================
# 🚀 REALTIME (PUSHER)
# ========================================
REALTIME_PROVIDER="pusher"

# Pusher Configuration
PUSHER_APP_ID="1234567"
PUSHER_KEY="abcd1234efgh5678"
PUSHER_SECRET="secret1234secret"
PUSHER_CLUSTER="mt1"

# ========================================
# 🌐 CORS & SECURITY
# ========================================
# Adicione seu domínio frontend
CORS_ORIGIN="http://localhost:3000,https://seudominio.com"
```

### **Passo 3: Instalar Dependencies**

```bash
npm install pusher
npm install --save-dev @types/pusher
```

### **Passo 4: Teste Realtime**

```graphql
mutation TestRealtime {
  sendNotification(
    input: {
      templateName: "system-alert"
      recipient: {
        id: "user-123"
        name: "Test User"
        email: "test@example.com"
      }
      data: "{\"message\":\"Hello Realtime!\",\"type\":\"info\"}"
      channel: REALTIME
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

## 🔧 Opção 2: Soketi (Self-hosted)

### **Passo 1: Instalar Soketi**

```bash
# Opção 1: Docker (Recomendado)
docker run -p 6001:6001 -p 9601:9601 quay.io/soketi/soketi:latest-16-alpine

# Opção 2: NPM Global
npm install -g @soketi/soketi
soketi start
```

### **Passo 2: Configurar .env**

```env
# ========================================
# 🚀 REALTIME (SOKETI)
# ========================================
REALTIME_PROVIDER="soketi"

# Soketi Configuration
SOKETI_HOST="localhost"
SOKETI_PORT=6001
SOKETI_APP_ID="app-id"
SOKETI_KEY="app-key"
SOKETI_SECRET="app-secret"
SOKETI_USE_TLS=false

# Para produção com TLS
# SOKETI_HOST="realtime.seudominio.com"
# SOKETI_USE_TLS=true
```

### **Passo 3: Configurar Docker Compose (Produção)**

```yaml
# docker-compose.yml
version: '3.8'
services:
  soketi:
    image: quay.io/soketi/soketi:latest-16-alpine
    ports:
      - '6001:6001'
      - '9601:9601'
    environment:
      - DEFAULT_APP_ID=app-id
      - DEFAULT_APP_KEY=app-key
      - DEFAULT_APP_SECRET=app-secret
      - DEFAULT_APP_ENABLE_CLIENT_MESSAGES=true
      - DEFAULT_APP_ENABLED=true
      - DEFAULT_APP_MAX_CONNECTIONS=100
    volumes:
      - ./soketi-config.json:/app/config.json
```

---

## 📱 Frontend Integration

### **JavaScript/TypeScript Client**

```typescript
import Pusher from 'pusher-js';

// Para Pusher
const pusher = new Pusher(process.env.PUSHER_KEY!, {
  cluster: process.env.PUSHER_CLUSTER!,
});

// Para Soketi
const pusher = new Pusher(process.env.SOKETI_KEY!, {
  wsHost: process.env.SOKETI_HOST!,
  wsPort: process.env.SOKETI_PORT!,
  wssPort: process.env.SOKETI_PORT!,
  forceTLS: process.env.SOKETI_USE_TLS === 'true',
  enabledTransports: ['ws', 'wss'],
});

// Escutar notificações
const channel = pusher.subscribe(`user.${userId}`);
channel.bind('notification', (data: any) => {
  console.log('Nova notificação:', data);
  // Exibir toast, atualizar UI, etc.
});
```

### **React Hook Example**

```typescript
import { useEffect, useState } from 'react';
import Pusher from 'pusher-js';

export const useRealtimeNotifications = (userId: string) => {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const pusher = new Pusher(process.env.REACT_APP_PUSHER_KEY!, {
      cluster: process.env.REACT_APP_PUSHER_CLUSTER!,
    });

    const channel = pusher.subscribe(`user.${userId}`);

    channel.bind('notification', (data: any) => {
      setNotifications((prev) => [data, ...prev]);
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`user.${userId}`);
    };
  }, [userId]);

  return notifications;
};
```

---

## 🧪 Testes e Debug

### **Health Check**

```graphql
query RealtimeHealth {
  getChannelsHealthStatus {
    channel
    isHealthy
    isConfigured
    provider
  }
}
```

### **Debug Logs**

```env
# Ativar logs detalhados
LOG_LEVEL="debug"
AUDIT_DETAILED_LOGS=true
```

### **Pusher Debug Dashboard**

1. Acesse: https://dashboard.pusher.com/
2. Vá em "Debug Console"
3. Monitore eventos em tempo real

### **Soketi Debug**

```bash
# Ver logs do container
docker logs soketi-container

# Debug endpoint
curl http://localhost:9601/
```

---

## 🔐 Segurança e Performance

### **Rate Limiting**

```env
# Limites de conexão
MAX_REALTIME_CONNECTIONS_PER_USER=5
REALTIME_MESSAGE_RATE_LIMIT=100
```

### **Authentication**

```typescript
// Autenticação de canais privados
const pusher = new Pusher(key, {
  cluster: 'mt1',
  authEndpoint: '/api/pusher/auth',
  auth: {
    headers: {
      Authorization: `Bearer ${userToken}`,
    },
  },
});
```

### **SSL/TLS (Produção)**

```env
# Soketi com SSL
SOKETI_USE_TLS=true
SOKETI_HOST="realtime.seudominio.com"

# Pusher (automático)
PUSHER_CLUSTER="mt1"
```

---

## 📊 Monitoring

### **Métricas Importantes**

- Conexões ativas
- Mensagens enviadas/segundo
- Latência média
- Erro de conexão

### **Alerts CloudWatch (Pusher)**

```json
{
  "metrics": ["connections.peak", "messages.count", "webhook.count"],
  "thresholds": {
    "connections": 1000,
    "latency": 100
  }
}
```

---

## 🎯 Resultado Final

Após implementar o sistema realtime, você terá:

✅ **Notificações instantâneas** para usuários online  
✅ **Fallback automático** entre Pusher/Soketi  
✅ **Escalabilidade** para milhares de conexões  
✅ **Debug fácil** com logs detalhados  
✅ **Segurança** com autenticação de canais  
✅ **Monitoramento** completo de performance

**🚀 Sistema realtime enterprise-grade pronto para produção!**
