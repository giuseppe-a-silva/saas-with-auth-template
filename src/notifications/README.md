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
