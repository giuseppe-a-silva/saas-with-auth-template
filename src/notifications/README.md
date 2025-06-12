# 📣 Módulo de Notificações

## 🎯 Visão Geral

O módulo de notificações centraliza e padroniza o envio de notificações em diferentes canais, permitindo comunicação clara, rastreável e escalável.

## 📦 Canais Suportados

- **Email** - Nodemailer (SMTP) e AWS SES
- **Push Notifications** - OneSignal
- **Real-time** - Soketi/Pusher
- **Third Party** - Webhooks HTTP

## 🚀 Como Usar

### 1. Configuração

Adicione as variáveis de ambiente necessárias:

```env
# Email (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
NOTIFICATION_DEFAULT_FROM="noreply@edumatch.com"

# OneSignal (Push)
ONESIGNAL_APP_ID="your-onesignal-app-id"
ONESIGNAL_API_KEY="your-onesignal-api-key"

# Pusher/Soketi (Realtime)
PUSHER_APP_ID="your-pusher-app-id"
PUSHER_KEY="your-pusher-key"
PUSHER_SECRET="your-pusher-secret"
PUSHER_CLUSTER="mt1"

# Redis (para filas)
REDIS_HOST="localhost"
REDIS_PORT=6379
```

### 2. Integração no App Module

```typescript
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    // ... outros módulos
    NotificationsModule,
  ],
})
export class AppModule {}
```

### 3. Criando Templates

```typescript
// Via service
const template = await this.notificationTemplateService.createTemplate({
  name: 'welcome_email',
  title: 'Bem-vindo ao EduMatch!',
  content: `
SUBJECT: Bem-vindo, {{ user.name }}!
FROM: welcome@edumatch.com
---
<h1>Olá, {{ user.name }}!</h1>
<p>Bem-vindo ao EduMatch. Seu curso {{ data.nomeCurso }} está disponível.</p>
  `,
  category: NotificationCategory.SISTEMA,
  channel: NotificationChannel.EMAIL,
});
```

### 4. Enviando Notificações

```typescript
// Via GraphQL Mutation (quando implementado)
mutation SendNotification {
  sendNotification(input: {
    templateName: "welcome_email"
    recipient: {
      id: "user-123"
      name: "João Silva"
      email: "joao@exemplo.com"
    }
    data: "{\"nomeCurso\": \"Pós-graduação em Gestão\"}"
  }) {
    status
    externalId
    sentAt
  }
}
```

## 🎨 Sintaxe de Templates

Os templates utilizam **LiquidJS** para interpolação:

```liquid
Olá, {{ user.name }}!

{% if data.vip %}
  Você é um usuário VIP!
{% endif %}

Seus cursos:
{% for curso in data.cursos %}
  - {{ curso.nome }} ({{ curso.valor }})
{% endfor %}
```

## 📊 Estrutura de Dados

### Payload Padrão

```json
{
  "event": "user.created",
  "category": "sistema",
  "timestamp": "2025-01-26T18:32:00Z",
  "recipient": {
    "id": "uuid",
    "name": "João Silva",
    "email": "joao@email.com",
    "externalId": "123456"
  },
  "data": {
    "nomeCurso": "Pós-graduação em Gestão Pública",
    "valor": "R$ 350,00"
  },
  "meta": {
    "origin": "app",
    "requestId": "req_xyz"
  }
}
```

## 🔧 Status da Implementação

- [x] ✅ Estrutura base e interfaces
- [x] ✅ Service de renderização (LiquidJS)
- [x] ✅ Service de templates (CRUD)
- [x] ✅ DTOs e validações
- [x] ✅ Dispatcher de email básico
- [ ] 🚧 Resolvers GraphQL
- [ ] 🚧 Sistema de filas (Bull/Redis)
- [ ] 🚧 Rate limiting
- [ ] 🚧 Outros dispatchers (Push, Realtime, Webhooks)
- [ ] 🚧 Seeds de templates padrão
- [ ] 🚧 Testes automatizados

## 📝 Próximos Passos

1. Executar migration do banco (`npx prisma migrate dev`)
2. Implementar resolvers GraphQL
3. Adicionar sistema de filas
4. Implementar rate limiting
5. Criar dispatchers restantes
6. Adicionar testes

# 📧 Módulo de Notificações - Nova API

## 🎯 Visão Geral

O módulo de notificações foi completamente refatorado para usar uma arquitetura orientada a eventos com BullMQ. A nova API é simples, performática e altamente escalável.

## 🚀 Nova API Simplificada

### Uso Básico

```typescript
import { EventNotificationService } from './notifications/services/event-notification.service';

// Injetar o serviço
constructor(
  private readonly eventNotificationService: EventNotificationService,
) {}

// Enviar notificação
await this.eventNotificationService.sendNotification('USER_REGISTERED', {
  timestamp: new Date().toISOString(),
  data: {
    userName: 'João Silva',
    email: 'joao@exemplo.com',
  },
  recipient: {
    id: 'user-123',
    name: 'João Silva',
    email: 'joao@exemplo.com',
  },
});
```

## 📋 Eventos Suportados

O sistema suporta qualquer `eventKey` dinâmico. Exemplos comuns:

- `USER_REGISTERED` - Novo usuário cadastrado
- `LOGIN` - Login realizado
- `PASSWORD_RESET` - Solicitação de reset de senha
- `EMAIL_VERIFICATION` - Verificação de email
- `PAYMENT_RECEIVED` - Pagamento recebido
- `ORDER_COMPLETED` - Pedido finalizado

## 🔧 Canais Disponíveis

### 1. EMAIL

- **Providers**: SMTP ou AWS SES (detecção automática)
- **Formato**: HTML com subject e from
- **Configuração**: Via variáveis de ambiente

### 2. PUSH

- **Provider**: OneSignal
- **Formato**: Título + corpo + dados customizados
- **Plataformas**: iOS, Android, Web

### 3. REALTIME

- **Providers**: Pusher ou Soketi
- **Formato**: JSON com dados do evento
- **Uso**: Notificações em tempo real na interface

## 🎨 Templates Automáticos

### Comportamento Padrão

Quando não há templates customizados para um `eventKey`, o sistema gera automaticamente templates padrão para todos os 3 canais:

#### Email Padrão

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>{{ eventKey }}</title>
  </head>
  <body>
    <h2>🔔 Notificação: {{ eventKey }}</h2>
    <p><strong>Data:</strong> {{ timestamp }}</p>
    <div>
      <h3>📋 Dados:</h3>
      <pre>{{ data | json }}</pre>
    </div>
  </body>
</html>
```

#### Push Padrão

```
TITLE: 🔔 {{ eventKey }}
---
Nova notificação: {{ eventKey }}
Data: {{ timestamp }}
```

#### Realtime Padrão

```json
{
  "type": "notification",
  "eventKey": "{{ eventKey }}",
  "timestamp": "{{ timestamp }}",
  "data": {{ data | json }}
}
```

## 🛠️ Gestão de Templates

### TemplateManagerService

```typescript
import { TemplateManagerService } from './notifications/services/template-manager.service';

// Criar template customizado
await templateManager.createTemplate({
  eventKey: 'USER_REGISTERED',
  channel: NotificationChannel.EMAIL,
  title: 'Bem-vindo!',
  content: `
    <!DOCTYPE html>
    <html>
    <body>
        <h1>Bem-vindo, {{ data.userName }}!</h1>
        <p>Sua conta foi criada com sucesso.</p>
    </body>
    </html>
  `,
});

// Buscar template
const template = await templateManager.findTemplate(
  'USER_REGISTERED',
  NotificationChannel.EMAIL,
);

// Listar todos os templates de um evento
const templates =
  await templateManager.findTemplatesByEventKey('USER_REGISTERED');
```

## ⚡ BullMQ e Performance

### Configuração de Queue

- **Workers**: 4 simultâneos
- **Retry**: 3 tentativas máximas
- **Backoff**: Exponencial
- **Redis**: Conexão configurável

### Monitoramento

```typescript
// O sistema registra automaticamente logs de auditoria
// Cada notificação gera logs detalhados para rastreamento
```

## 🔧 Configuração

### Variáveis de Ambiente

```bash
# Redis (BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=sua_senha
REDIS_DB=0

# Email - SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASS=sua_senha

# Email - AWS SES
AWS_ACCESS_KEY_ID=sua_key
AWS_SECRET_ACCESS_KEY=sua_secret
AWS_SES_REGION=us-east-1

# Push - OneSignal
ONESIGNAL_APP_ID=seu_app_id
ONESIGNAL_API_KEY=sua_api_key

# Realtime - Pusher
PUSHER_APP_ID=seu_app_id
PUSHER_KEY=sua_key
PUSHER_SECRET=seu_secret
PUSHER_CLUSTER=mt1

# Realtime - Soketi
REALTIME_PROVIDER=soketi
SOKETI_APP_ID=seu_app_id
SOKETI_KEY=sua_key
SOKETI_SECRET=seu_secret
SOKETI_HOST=localhost
SOKETI_PORT=6001
SOKETI_USE_TLS=false
```

## 📊 Exemplos de Uso

### 1. Registro de Usuário

```typescript
await eventNotificationService.sendNotification('USER_REGISTERED', {
  timestamp: new Date().toISOString(),
  data: {
    userName: user.name,
    email: user.email,
    registrationDate: user.createdAt,
  },
  recipient: {
    id: user.id,
    name: user.name,
    email: user.email,
  },
});
```

### 2. Reset de Senha

```typescript
await eventNotificationService.sendNotification('PASSWORD_RESET', {
  timestamp: new Date().toISOString(),
  data: {
    resetToken: token,
    expiresAt: expirationDate,
    resetUrl: `https://app.com/reset?token=${token}`,
  },
  recipient: {
    id: user.id,
    name: user.name,
    email: user.email,
  },
});
```

### 3. Notificação de Pagamento

```typescript
await eventNotificationService.sendNotification('PAYMENT_RECEIVED', {
  timestamp: new Date().toISOString(),
  data: {
    amount: payment.amount,
    currency: payment.currency,
    paymentMethod: payment.method,
    transactionId: payment.id,
  },
  recipient: {
    id: user.id,
    name: user.name,
    email: user.email,
  },
});
```

## 🔍 Health Checks

```typescript
import { DispatcherFactory } from './notifications/dispatchers/dispatcher.factory';

// Verificar status de todos os canais
const status = await dispatcherFactory.getChannelsStatus();

// Verificar se todos estão funcionais
const allHealthy = await dispatcherFactory.areAllChannelsHealthy();

// Verificar canal específico
const emailAvailable = await dispatcherFactory.isChannelAvailable(
  NotificationChannel.EMAIL,
);
```

## 🎯 Benefícios da Nova Arquitetura

1. **Simplicidade**: Uma única chamada para enviar notificações
2. **Performance**: Processamento assíncrono com BullMQ
3. **Escalabilidade**: Workers configuráveis e retry automático
4. **Flexibilidade**: Templates dinâmicos por evento + canal
5. **Observabilidade**: Logs detalhados e auditoria completa
6. **Manutenibilidade**: Código limpo e bem estruturado

## 🚨 Migração da API Antiga

A API antiga com GraphQL foi removida. Para migrar:

**Antes:**

```typescript
// GraphQL mutation
mutation SendNotification($input: NotificationInput!) {
  sendNotification(input: $input) {
    id
    status
  }
}
```

**Depois:**

```typescript
// Service direto
await eventNotificationService.sendNotification(eventKey, payload);
```

## 📝 Logs e Auditoria

Todas as notificações são automaticamente registradas no sistema de auditoria com:

- ✅ Status de envio por canal
- 🕐 Timestamps detalhados
- 📧 Dados do destinatário
- 🔍 Metadados de cada provider
- ❌ Erros e tentativas de retry

---

**Desenvolvido com ❤️ para máxima performance e simplicidade**
