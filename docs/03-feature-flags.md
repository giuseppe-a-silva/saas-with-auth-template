# 🚩 Sistema de Feature Flags - EduMatch

## Visão Geral

O sistema de feature flags permite habilitar/desabilitar funcionalidades específicas sem necessidade de redeploy, facilitando rollbacks rápidos e implementação gradual de novas features.

## Configuração

### Variáveis de Ambiente

As feature flags são controladas através de variáveis de ambiente no arquivo `.env`:

```env
# Feature Flags - Sistema de Autenticação
FEATURE_NEW_AUTH_SERVICES=false              # Nova arquitetura de serviços de autenticação
FEATURE_STRONG_PASSWORD_VALIDATION=false     # Validações robustas de senha
FEATURE_AUDIT_SYSTEM=false                   # Sistema de auditoria completo
FEATURE_STRUCTURED_AUDIT_LOGS=false          # Logs estruturados no banco
FEATURE_AUDIT_LOG_CLEANUP=false              # Limpeza automática de logs antigos
```

### Ambientes

#### Desenvolvimento (development)

```env
FEATURE_NEW_AUTH_SERVICES=true               # Ativa para testes
FEATURE_STRONG_PASSWORD_VALIDATION=true      # Ativa para validação
FEATURE_AUDIT_SYSTEM=true                    # Ativa para desenvolvimento
FEATURE_STRUCTURED_AUDIT_LOGS=true           # Ativa para testes completos
FEATURE_AUDIT_LOG_CLEANUP=false              # Desativa para preservar logs de debug
```

#### Teste (test)

```env
FEATURE_NEW_AUTH_SERVICES=true               # Ativa para testes automatizados
FEATURE_STRONG_PASSWORD_VALIDATION=true      # Ativa para testes de validação
FEATURE_AUDIT_SYSTEM=false                   # Desativa para performance nos testes
FEATURE_STRUCTURED_AUDIT_LOGS=false          # Desativa para velocidade
FEATURE_AUDIT_LOG_CLEANUP=false              # Desativa nos testes
```

#### Produção (production)

```env
FEATURE_NEW_AUTH_SERVICES=false              # Inicia desabilitado para rollback seguro
FEATURE_STRONG_PASSWORD_VALIDATION=false     # Gradual - ativar após validação
FEATURE_AUDIT_SYSTEM=false                   # Gradual - ativar após testes de performance
FEATURE_STRUCTURED_AUDIT_LOGS=false          # Ativar após confirmação do sistema
FEATURE_AUDIT_LOG_CLEANUP=true               # Sempre ativo em produção
```

## Uso no Código

### 1. Injeção do Serviço

```typescript
import { FeatureFlagsConfig } from '../common/config/feature-flags.config';

@Injectable()
export class ExampleService {
  constructor(private readonly featureFlags: FeatureFlagsConfig) {}
}
```

### 2. Verificação Condicional

```typescript
async someMethod() {
  if (this.featureFlags.useNewAuthServices) {
    // Usa nova implementação
    return this.newAuthenticationService.login(credentials);
  } else {
    // Usa implementação legacy
    return this.legacyAuthService.login(credentials);
  }
}
```

### 3. Guards e Interceptors

```typescript
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly featureFlags: FeatureFlagsConfig) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (!this.featureFlags.enableAuditSystem) {
      return next.handle();
    }

    // Lógica de auditoria apenas se habilitada
    return next.handle().pipe(tap(() => this.logAuditEvent(context)));
  }
}
```

## Feature Flags Disponíveis

### `useNewAuthServices`

- **Propósito**: Controla o uso da nova arquitetura de serviços de autenticação
- **Impacto**: TokenService, PasswordService, AuthenticationService
- **Rollback**: Reverte para AuthService monolítico original
- **Dependências**: Nenhuma

### `enableAuditSystem`

- **Propósito**: Ativa/desativa todo o sistema de auditoria
- **Impacto**: Interceptors de auditoria, logs de ações sensíveis
- **Rollback**: Remove overhead de auditoria completamente
- **Dependências**: Nenhuma

### `enableStrongPasswordValidation`

- **Propósito**: Ativa validações robustas de senha
- **Impacto**: DTOs de registro e alteração de senha
- **Rollback**: Mantém validações básicas (8+ caracteres)
- **Dependências**: Nenhuma

### `enableStructuredAuditLogs`

- **Propósito**: Salva logs estruturados na base de dados
- **Impacto**: Performance de I/O, espaço em disco do banco
- **Rollback**: Mantém apenas logs simples em arquivo
- **Dependências**: `enableAuditSystem`

### `enableAuditLogCleanup`

- **Propósito**: Ativa limpeza automática de logs antigos
- **Impacto**: Job scheduler, remoção baseada em política de retenção
- **Rollback**: Logs permanecem indefinidamente
- **Dependências**: `enableAuditSystem`, `enableStructuredAuditLogs`

## Estratégia de Rollout

### Fase 1: Desenvolvimento e Testes

1. Ativar todas as flags em desenvolvimento
2. Executar suite completa de testes
3. Validar performance e funcionalidade

### Fase 2: Staging

1. Replicar ambiente de produção
2. Ativar flags progressivamente
3. Monitorar métricas de performance

### Fase 3: Produção (Rollout Gradual)

1. **Semana 1**: `enableAuditLogCleanup` apenas
2. **Semana 2**: `enableAuditSystem` + `enableAuditLogCleanup`
3. **Semana 3**: `enableStrongPasswordValidation`
4. **Semana 4**: `enableStructuredAuditLogs`
5. **Semana 5**: `useNewAuthServices` (se tudo estável)

## Monitoramento

### Métricas Importantes

- **Performance**: Tempo de resposta antes/depois
- **Erros**: Taxa de erro por feature flag
- **Recursos**: CPU, Memória, I/O de disco
- **Auditoria**: Volume de logs, espaço utilizado

### Alertas Recomendados

- Aumento > 20% no tempo de resposta
- Taxa de erro > 1% após ativação de flag
- Uso de disco > 80% (logs de auditoria)
- Falhas no sistema de limpeza automática

## Rollback de Emergência

### Procedimento Rápido

1. **Identificar** a flag problemática
2. **Alterar** variável de ambiente para `false`
3. **Reiniciar** aplicação (ou usar hot reload se disponível)
4. **Verificar** que o sistema voltou ao normal
5. **Investigar** causa raiz

### Exemplo de Rollback

```bash
# Em caso de problemas com nova autenticação
export FEATURE_NEW_AUTH_SERVICES=false

# Reiniciar aplicação
pm2 restart edumatch-api

# Verificar logs
pm2 logs edumatch-api --lines 100
```

## Debug e Troubleshooting

### Verificar Status das Flags

```typescript
// Via endpoint de debug (apenas em desenvolvimento)
GET /debug/feature-flags

// Retorna:
{
  "useNewAuthServices": false,
  "enableAuditSystem": true,
  "enableStrongPasswordValidation": false,
  // ...
}
```

### Logs de Feature Flags

```typescript
// Adicionar logs para debug
this.logger.debug(
  `Feature flag useNewAuthServices: ${this.featureFlags.useNewAuthServices}`,
);
```

### Testes com Feature Flags

```typescript
// Em testes unitários
beforeEach(() => {
  const mockFeatureFlags = {
    useNewAuthServices: true,
    enableAuditSystem: false,
  };

  module = await Test.createTestingModule({
    providers: [{ provide: FeatureFlagsConfig, useValue: mockFeatureFlags }],
  }).compile();
});
```

## Boas Práticas

### ✅ Fazer

- Sempre ter um caminho de rollback claro
- Testar ambos os cenários (flag ON/OFF)
- Documentar dependências entre flags
- Monitorar performance após ativação
- Remover flags obsoletas após estabilização

### ❌ Não Fazer

- Deixar flags ativas indefinidamente
- Criar dependências circulares entre flags
- Ativar múltiplas flags simultaneamente em produção
- Esquecer de testar cenário de rollback
- Usar flags para lógica de negócio permanente

## Cronograma de Remoção

Após 3 meses de estabilidade em produção:

1. **Mês 4**: Marcar flags como deprecated
2. **Mês 5**: Remover código legacy
3. **Mês 6**: Remover configurações de feature flags

## Suporte

Para dúvidas ou problemas com feature flags:

1. Consultar este documento
2. Verificar logs da aplicação
3. Revisar métricas de monitoramento
4. Contactar equipe de desenvolvimento
