# API GraphQL - Templates de Notificação

Este documento descreve os endpoints GraphQL disponíveis para gerenciar templates de notificação baseados em eventos.

## Visão Geral

O sistema de templates permite criar, atualizar, buscar e remover templates de notificação para diferentes eventos e canais. Cada template é identificado pela combinação única de `eventKey` + `channel`.

## Tipos GraphQL

### EventNotificationTemplate

```graphql
type EventNotificationTemplate {
  id: ID!
  eventKey: String!
  channel: NotificationChannel!
  title: String!
  content: String!
  isActive: Boolean!
  createdBy: ID
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

### NotificationChannel (Enum)

```graphql
enum NotificationChannel {
  EMAIL
  PUSH
  REALTIME
}
```

## Queries

### 1. Buscar Templates com Filtros

```graphql
query NotificationTemplates($filters: TemplateFiltersDto) {
  notificationTemplates(filters: $filters) {
    id
    eventKey
    channel
    title
    content
    isActive
    createdBy
    createdAt
    updatedAt
  }
}
```

**Variáveis:**

```json
{
  "filters": {
    "eventKey": "USER_REGISTERED",
    "channel": "EMAIL",
    "isActive": true
  }
}
```

### 2. Buscar Template Específico

```graphql
query NotificationTemplate($eventKey: String!, $channel: NotificationChannel!) {
  notificationTemplate(eventKey: $eventKey, channel: $channel) {
    id
    eventKey
    channel
    title
    content
    isActive
    createdBy
    createdAt
    updatedAt
  }
}
```

**Variáveis:**

```json
{
  "eventKey": "USER_REGISTERED",
  "channel": "EMAIL"
}
```

### 3. Buscar Templates por Evento

```graphql
query NotificationTemplatesByEvent($eventKey: String!) {
  notificationTemplatesByEvent(eventKey: $eventKey) {
    id
    eventKey
    channel
    title
    content
    isActive
    createdBy
    createdAt
    updatedAt
  }
}
```

**Variáveis:**

```json
{
  "eventKey": "USER_REGISTERED"
}
```

### 4. Listar Chaves de Eventos

```graphql
query EventKeysWithTemplates {
  eventKeysWithTemplates
}
```

## Mutations

### 1. Criar Template

```graphql
mutation CreateNotificationTemplate($input: CreateEventTemplateDto!) {
  createNotificationTemplate(input: $input) {
    id
    eventKey
    channel
    title
    content
    isActive
    createdBy
    createdAt
    updatedAt
  }
}
```

**Variáveis:**

```json
{
  "input": {
    "eventKey": "USER_REGISTERED",
    "channel": "EMAIL",
    "title": "Bem-vindo ao EduMatch!",
    "content": "SUBJECT: Bem-vindo ao EduMatch, {{ user.name }}!\nFROM: noreply@edumatch.com\n---\n<h1>Olá {{ user.name }}!</h1>\n<p>Seja bem-vindo ao EduMatch. Sua conta foi criada com sucesso.</p>",
    "isActive": true
  }
}
```

### 2. Atualizar Template

```graphql
mutation UpdateNotificationTemplate(
  $eventKey: String!
  $channel: NotificationChannel!
  $input: UpdateTemplateDto!
) {
  updateNotificationTemplate(
    eventKey: $eventKey
    channel: $channel
    input: $input
  ) {
    id
    eventKey
    channel
    title
    content
    isActive
    createdBy
    createdAt
    updatedAt
  }
}
```

**Variáveis:**

```json
{
  "eventKey": "USER_REGISTERED",
  "channel": "EMAIL",
  "input": {
    "title": "Bem-vindo ao EduMatch - Atualizado!",
    "content": "SUBJECT: Bem-vindo ao EduMatch, {{ user.name }}!\nFROM: noreply@edumatch.com\n---\n<h1>Olá {{ user.name }}!</h1>\n<p>Seja bem-vindo ao EduMatch. Sua conta foi criada com sucesso em {{ timestamp }}.</p>"
  }
}
```

### 3. Remover Template

```graphql
mutation DeleteNotificationTemplate(
  $eventKey: String!
  $channel: NotificationChannel!
) {
  deleteNotificationTemplate(eventKey: $eventKey, channel: $channel)
}
```

**Variáveis:**

```json
{
  "eventKey": "USER_REGISTERED",
  "channel": "EMAIL"
}
```

### 4. Alternar Status do Template

```graphql
mutation ToggleNotificationTemplateStatus(
  $eventKey: String!
  $channel: NotificationChannel!
  $isActive: Boolean!
) {
  toggleNotificationTemplateStatus(
    eventKey: $eventKey
    channel: $channel
    isActive: $isActive
  ) {
    id
    eventKey
    channel
    title
    content
    isActive
    createdBy
    createdAt
    updatedAt
  }
}
```

**Variáveis:**

```json
{
  "eventKey": "USER_REGISTERED",
  "channel": "EMAIL",
  "isActive": false
}
```

## Eventos Disponíveis

Os seguintes eventos estão sendo utilizados no sistema:

- `EMAIL_VERIFICATION` - Verificação de email
- `PASSWORD_RESET` - Recuperação de senha
- `PASSWORD_CHANGED` - Senha alterada
- `LOGIN_NOTIFICATION` - Notificação de login
- `DATA_CHANGED` - Dados do usuário alterados

## Canais Disponíveis

- `EMAIL` - Notificações por email
- `PUSH` - Notificações push
- `REALTIME` - Notificações em tempo real

## Sintaxe de Templates

Os templates utilizam a sintaxe LiquidJS para interpolação de variáveis:

### Variáveis Disponíveis

- `{{ eventKey }}` - Chave do evento
- `{{ timestamp }}` - Data/hora do evento
- `{{ user.id }}` - ID do usuário
- `{{ user.name }}` - Nome do usuário
- `{{ user.email }}` - Email do usuário
- `{{ data.* }}` - Dados específicos do evento

### Exemplo de Template de Email

```liquid
SUBJECT: {{ title }}
FROM: noreply@edumatch.com
---
<h1>Olá {{ user.name }}!</h1>
<p>{{ content }}</p>
<p>Data do evento: {{ timestamp | date: "%d/%m/%Y %H:%M" }}</p>

{% if data.verificationUrl %}
<a href="{{ data.verificationUrl }}">Clique aqui para verificar</a>
{% endif %}
```

## Autenticação

Todos os endpoints requerem autenticação JWT. Inclua o token no header:

```
Authorization: Bearer <seu-jwt-token>
```

## Tratamento de Erros

### Erros Comuns

- `400 Bad Request` - Dados inválidos ou template já existe
- `401 Unauthorized` - Token JWT inválido ou ausente
- `404 Not Found` - Template não encontrado
- `500 Internal Server Error` - Erro interno do servidor

### Exemplo de Resposta de Erro

```json
{
  "errors": [
    {
      "message": "Já existe um template para o evento 'USER_REGISTERED' no canal 'EMAIL'",
      "extensions": {
        "code": "BAD_REQUEST"
      }
    }
  ]
}
```
