import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { NotificationChannel } from './interfaces/notification-dispatcher.interface';
import { NotificationsModule } from './notifications.module';
import { NotificationTemplateService } from './services/notification-template.service';
import { NotificationService } from './services/notification.service';
import { RateLimiterService } from './services/rate-limiter.service';
import { RetryService } from './services/retry.service';
import { TemplateRendererService } from './services/template-renderer.service';

describe('NotificationsModule - Integration Tests', () => {
  let app: TestingModule;
  let notificationService: NotificationService;
  let templateService: NotificationTemplateService;
  let rendererService: TemplateRendererService;
  let rateLimiterService: RateLimiterService;
  let retryService: RetryService;
  let prismaService: PrismaService;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        NotificationsModule,
      ],
    }).compile();

    notificationService = app.get<NotificationService>(NotificationService);
    templateService = app.get<NotificationTemplateService>(
      NotificationTemplateService,
    );
    rendererService = app.get<TemplateRendererService>(TemplateRendererService);
    rateLimiterService = app.get<RateLimiterService>(RateLimiterService);
    retryService = app.get<RetryService>(RetryService);
    prismaService = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Inicialização do Módulo', () => {
    it('deve inicializar todos os services corretamente', () => {
      expect(notificationService).toBeDefined();
      expect(templateService).toBeDefined();
      expect(rendererService).toBeDefined();
      expect(rateLimiterService).toBeDefined();
      expect(retryService).toBeDefined();
      expect(prismaService).toBeDefined();
    });

    it('deve ter todos os services como singleton', () => {
      const notificationService2 =
        app.get<NotificationService>(NotificationService);
      const templateService2 = app.get<NotificationTemplateService>(
        NotificationTemplateService,
      );

      expect(notificationService).toBe(notificationService2);
      expect(templateService).toBe(templateService2);
    });
  });

  describe('Integração TemplateRenderer', () => {
    it('deve renderizar template simples corretamente', async () => {
      const template = 'Olá {{ userName }}, bem-vindo!';
      const variables = { userName: 'João' };

      const result = await rendererService.renderTemplate(template, variables);

      expect(result).toBe('Olá João, bem-vindo!');
    });

    it('deve validar template corretamente', () => {
      const validTemplate = 'Olá {{ userName }}!';
      const invalidTemplate = '{% if condition %} sem fechamento';

      const validResult = rendererService.validateTemplate(validTemplate);
      const invalidResult = rendererService.validateTemplate(invalidTemplate);

      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.error).toBeDefined();
    });

    it('deve extrair variáveis do template', () => {
      const template = 'Olá {{ userName }}, você tem {{ count }} mensagens.';

      const variables = rendererService.extractTemplateVariables(template);

      expect(variables).toContain('userName');
      expect(variables).toContain('count');
      expect(variables).toHaveLength(2);
    });

    it('deve criar preview com dados automáticos', async () => {
      const template = 'Usuário: {{ userName }}, Email: {{ userEmail }}';

      const preview = await rendererService.createTemplatePreview(template);

      expect(preview).not.toContain('{{ userName }}');
      expect(preview).not.toContain('{{ userEmail }}');
      expect(preview).toContain('Usuário:');
      expect(preview).toContain('Email:');
    });
  });

  describe('Integração RateLimiter', () => {
    it('deve permitir primeira requisição', async () => {
      const channel = NotificationChannel.EMAIL;
      const recipient = 'test@example.com';

      const result = await rateLimiterService.checkLimit(channel, recipient);

      expect(result.allowed).toBe(true);
      expect(result.currentUsage).toBeDefined();
      expect(result.limits).toBeDefined();
    });

    it('deve registrar estatísticas de uso', async () => {
      const channel = NotificationChannel.EMAIL;
      const recipient = 'stats@example.com';

      await rateLimiterService.checkLimit(channel, recipient);
      await rateLimiterService.recordSuccess(channel, recipient);

      const stats = rateLimiterService.getUsageStatistics();

      expect(stats.totalContexts).toBeGreaterThan(0);
    });

    it('deve limpar limits específicos', async () => {
      const channel = NotificationChannel.EMAIL;
      const recipient = 'clear@example.com';

      await rateLimiterService.checkLimit(channel, recipient);
      const cleared = rateLimiterService.clearLimit(channel, recipient);

      expect(cleared).toBe(true);
    });

    it('deve limpar todos os limits', () => {
      const clearedCount = rateLimiterService.clearAllLimits();

      expect(typeof clearedCount).toBe('number');
    });
  });

  describe('Integração RetryService', () => {
    it('deve ter métodos básicos definidos', () => {
      expect(typeof retryService.getRetryContext).toBe('function');
      expect(typeof retryService.cleanupOldContexts).toBe('function');
    });

    it('deve limpar contextos antigos', () => {
      const cleaned = retryService.cleanupOldContexts();
      expect(typeof cleaned).toBe('number');
    });
  });

  describe('Integração NotificationService', () => {
    it('deve ter método de envio de notificação', () => {
      expect(typeof notificationService.sendNotification).toBe('function');
    });
  });

  describe('Integração Completa - Fluxo End-to-End', () => {
    it('deve completar fluxo básico de validação e renderização', async () => {
      // 1. Verificar rate limit
      const rateLimitResult = await rateLimiterService.checkLimit(
        NotificationChannel.EMAIL,
        'e2e@example.com',
      );
      expect(rateLimitResult.allowed).toBe(true);

      // 2. Validar template
      const templateContent = 'Olá {{ userName }}, teste E2E!';
      const validation = rendererService.validateTemplate(templateContent);
      expect(validation.isValid).toBe(true);

      // 3. Renderizar template
      const rendered = await rendererService.renderTemplate(templateContent, {
        userName: 'Usuário E2E',
      });
      expect(rendered).toBe('Olá Usuário E2E, teste E2E!');

      // 4. Registrar sucesso no rate limiter
      await rateLimiterService.recordSuccess(
        NotificationChannel.EMAIL,
        'e2e@example.com',
      );

      // 5. Verificar estatísticas finais
      const stats = rateLimiterService.getUsageStatistics();
      expect(stats.totalContexts).toBeGreaterThan(0);
    });
  });
});
