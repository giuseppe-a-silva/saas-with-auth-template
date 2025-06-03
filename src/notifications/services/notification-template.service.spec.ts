import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { NotificationTemplateService } from './notification-template.service';
import { TemplateRendererService } from './template-renderer.service';

describe('NotificationTemplateService', () => {
  let service: NotificationTemplateService;

  beforeEach(async () => {
    const mockPrismaService = {
      notificationTemplate: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const mockTemplateRenderer = {
      validateTemplate: jest.fn(),
      renderTemplate: jest.fn(),
      extractTemplateVariables: jest.fn(),
      createTemplatePreview: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationTemplateService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: TemplateRendererService,
          useValue: mockTemplateRenderer,
        },
      ],
    }).compile();

    service = module.get<NotificationTemplateService>(
      NotificationTemplateService,
    );
  });

  describe('Inicialização', () => {
    it('deve ser definido corretamente', () => {
      expect(service).toBeDefined();
    });
  });

  describe('Métodos públicos', () => {
    it('deve ter método createTemplate', () => {
      expect(typeof service.createTemplate).toBe('function');
    });

    it('deve ter método findTemplateByName', () => {
      expect(typeof service.findTemplateByName).toBe('function');
    });

    it('deve ter método listTemplates', () => {
      expect(typeof service.listTemplates).toBe('function');
    });

    it('deve ter método updateTemplate', () => {
      expect(typeof service.updateTemplate).toBe('function');
    });
  });
});
