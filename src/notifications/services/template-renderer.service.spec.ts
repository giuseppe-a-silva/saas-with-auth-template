import { Test, TestingModule } from '@nestjs/testing';
import { TemplateRendererService } from './template-renderer.service';

describe('TemplateRendererService', () => {
  let service: TemplateRendererService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TemplateRendererService],
    }).compile();

    service = module.get<TemplateRendererService>(TemplateRendererService);
  });

  describe('Inicialização', () => {
    it('deve ser definido corretamente', () => {
      expect(service).toBeDefined();
    });
  });

  describe('renderTemplate', () => {
    it('deve renderizar template simples com variáveis', async () => {
      // Arrange
      const mockTemplate =
        'Olá {{ userName }}, você tem {{ messageCount }} mensagens.';
      const mockVariables = {
        userName: 'João',
        messageCount: 5,
      };
      const expectedResult = 'Olá João, você tem 5 mensagens.';

      // Act
      const actualResult = await service.renderTemplate(
        mockTemplate,
        mockVariables,
      );

      // Assert
      expect(actualResult).toBe(expectedResult);
    });

    it('deve renderizar template com loops LiquidJS', async () => {
      // Arrange
      const mockTemplate = `
Lista de itens:
{% for item in items %}
- {{ item.name }}: {{ item.price }}
{% endfor %}`;
      const mockVariables = {
        items: [
          { name: 'Produto A', price: 100 },
          { name: 'Produto B', price: 200 },
        ],
      };

      // Act
      const actualResult = await service.renderTemplate(
        mockTemplate,
        mockVariables,
      );

      // Assert
      expect(actualResult).toContain('- Produto A: 100');
      expect(actualResult).toContain('- Produto B: 200');
    });

    it('deve renderizar template com condicionais', async () => {
      // Arrange
      const mockTemplate = `
{% if user.isVip %}
Bem-vindo, usuário VIP {{ user.name }}!
{% else %}
Olá {{ user.name }}.
{% endif %}`;
      const mockVipUser = { user: { name: 'Carlos', isVip: true } };
      const mockRegularUser = { user: { name: 'Ana', isVip: false } };

      // Act
      const vipResult = await service.renderTemplate(mockTemplate, mockVipUser);
      const regularResult = await service.renderTemplate(
        mockTemplate,
        mockRegularUser,
      );

      // Assert
      expect(vipResult).toContain('Bem-vindo, usuário VIP Carlos!');
      expect(regularResult).toContain('Olá Ana.');
    });

    it('deve lidar com variáveis inexistentes graciosamente', async () => {
      // Arrange
      const mockTemplate =
        'Olá {{ userName }}, sua pontuação é {{ score | default: 0 }}.';
      const mockVariables = { userName: 'João' }; // score não definido

      // Act
      const actualResult = await service.renderTemplate(
        mockTemplate,
        mockVariables,
      );

      // Assert
      expect(actualResult).toContain('Olá João');
      expect(actualResult).toContain('sua pontuação é 0');
    });

    it('deve aplicar filtros LiquidJS corretamente', async () => {
      // Arrange
      const mockTemplate = '{{ title | capitalize }}';
      const mockVariables = {
        title: 'meu artigo',
      };

      // Act
      const actualResult = await service.renderTemplate(
        mockTemplate,
        mockVariables,
      );

      // Assert
      expect(actualResult).toContain('Meu artigo');
    });

    it('deve lidar com dados null/undefined graciosamente', async () => {
      // Arrange
      const mockTemplate = 'Olá {{ userName | default: "Usuário" }}!';

      // Act & Assert
      // Para null/undefined, esperamos que o service lance erro ou trate graciosamente
      await expect(
        service.renderTemplate(
          mockTemplate,
          null as unknown as Record<string, unknown>,
        ),
      ).rejects.toThrow();

      await expect(
        service.renderTemplate(
          mockTemplate,
          undefined as unknown as Record<string, unknown>,
        ),
      ).rejects.toThrow();
    });
  });

  describe('validateTemplate', () => {
    it('deve validar template com sintaxe correta', () => {
      // Arrange
      const mockValidTemplate =
        'Olá {{ userName }}, você tem {{ count }} itens.';

      // Act
      const actualResult = service.validateTemplate(mockValidTemplate);

      // Assert
      expect(actualResult.isValid).toBe(true);
      expect(actualResult.error).toBeUndefined();
    });

    it('deve detectar erro de sintaxe em template', () => {
      // Arrange
      const mockInvalidTemplate =
        'Olá {{ userName, você tem {% endfor %} itens.';

      // Act
      const actualResult = service.validateTemplate(mockInvalidTemplate);

      // Assert
      expect(actualResult.isValid).toBe(false);
      expect(actualResult.error).toBeDefined();
      expect(typeof actualResult.error).toBe('string');
    });

    it('deve validar template complexo com loops e condicionais', () => {
      // Arrange
      const mockComplexTemplate = `
{% if items.size > 0 %}
  {% for item in items %}
    - {{ item.name }}
  {% endfor %}
{% else %}
  Nenhum item encontrado.
{% endif %}`;

      // Act
      const actualResult = service.validateTemplate(mockComplexTemplate);

      // Assert
      expect(actualResult.isValid).toBe(true);
    });

    it('deve detectar erro em tag não fechada', () => {
      // Arrange
      const mockInvalidTemplate = '{% if condition %} Conteúdo';

      // Act
      const actualResult = service.validateTemplate(mockInvalidTemplate);

      // Assert
      expect(actualResult.isValid).toBe(false);
      expect(actualResult.error).toContain('if');
    });
  });

  describe('extractTemplateVariables', () => {
    it('deve extrair variáveis simples do template', () => {
      // Arrange
      const mockTemplate =
        'Olá {{ userName }}, você tem {{ messageCount }} mensagens.';
      const expectedVariables = ['userName', 'messageCount'];

      // Act
      const actualVariables = service.extractTemplateVariables(mockTemplate);

      // Assert
      expect(actualVariables).toEqual(
        expect.arrayContaining(expectedVariables),
      );
      expect(actualVariables).toHaveLength(2);
    });

    it('deve extrair variáveis aninhadas', () => {
      // Arrange
      const mockTemplate =
        'Olá {{ user.name }}, sua empresa é {{ company.name }}.';
      const expectedVariables = ['user.name', 'company.name'];

      // Act
      const actualVariables = service.extractTemplateVariables(mockTemplate);

      // Assert
      expect(actualVariables).toEqual(
        expect.arrayContaining(expectedVariables),
      );
    });

    it('deve ignorar variáveis duplicadas', () => {
      // Arrange
      const mockTemplate = 'Olá {{ userName }}, {{ userName }}, bem-vindo!';
      const expectedVariables = ['userName'];

      // Act
      const actualVariables = service.extractTemplateVariables(mockTemplate);

      // Assert
      expect(actualVariables).toEqual(expectedVariables);
      expect(actualVariables).toHaveLength(1);
    });

    it('deve extrair variáveis de loops', () => {
      // Arrange
      const mockTemplate = `
{% for item in items %}
  {{ item.name }} - {{ item.price }}
{% endfor %}
Total: {{ total }}`;
      const expectedVariables = ['items', 'item.name', 'item.price', 'total'];

      // Act
      const actualVariables = service.extractTemplateVariables(mockTemplate);

      // Assert
      expect(actualVariables).toEqual(
        expect.arrayContaining(expectedVariables),
      );
    });

    it('deve retornar array vazio para template sem variáveis', () => {
      // Arrange
      const mockTemplate = 'Este é um template estático sem variáveis.';

      // Act
      const actualVariables = service.extractTemplateVariables(mockTemplate);

      // Assert
      expect(actualVariables).toEqual([]);
    });
  });

  describe('createTemplatePreview', () => {
    it('deve criar preview com dados fornecidos', async () => {
      // Arrange
      const mockTemplate =
        'Olá {{ userName }}, você tem {{ count }} notificações.';
      const mockSampleData = { userName: 'Ana', count: 3 };

      // Act
      const actualPreview = await service.createTemplatePreview(
        mockTemplate,
        mockSampleData,
      );

      // Assert
      expect(actualPreview).toBe('Olá Ana, você tem 3 notificações.');
    });

    it('deve criar preview com dados automáticos quando não fornecidos', async () => {
      // Arrange
      const mockTemplate =
        'Olá {{ userName }}, você tem {{ count }} mensagens.';

      // Act
      const actualPreview = await service.createTemplatePreview(mockTemplate);

      // Assert
      expect(actualPreview).toContain('Olá');
      expect(actualPreview).toContain('mensagens');
      // Deve conter valores de exemplo gerados automaticamente
      expect(actualPreview).not.toContain('{{ userName }}');
      expect(actualPreview).not.toContain('{{ count }}');
    });

    it('deve mesclar dados fornecidos com dados automáticos', async () => {
      // Arrange
      const mockTemplate =
        'Usuário: {{ userName }}, Email: {{ userEmail }}, Pontos: {{ points }}';
      const mockPartialData = { userName: 'Carlos' };

      // Act
      const actualPreview = await service.createTemplatePreview(
        mockTemplate,
        mockPartialData,
      );

      // Assert
      expect(actualPreview).toContain('Usuário: Carlos');
      // userEmail e points devem ser preenchidos automaticamente
      expect(actualPreview).not.toContain('{{ userEmail }}');
      expect(actualPreview).not.toContain('{{ points }}');
    });

    it('deve lidar com template complexo no preview', async () => {
      // Arrange
      const mockTemplate = `
{% if items.size > 0 %}
Seus itens:
{% for item in items %}
- {{ item.name }}
{% endfor %}
{% else %}
Nenhum item encontrado.
{% endif %}`;
      const mockData = {
        items: [{ name: 'Item 1' }, { name: 'Item 2' }],
      };

      // Act
      const actualPreview = await service.createTemplatePreview(
        mockTemplate,
        mockData,
      );

      // Assert
      expect(actualPreview).toContain('Seus itens:');
      expect(actualPreview).toContain('- Item 1');
      expect(actualPreview).toContain('- Item 2');
      expect(actualPreview).not.toContain('Nenhum item encontrado');
    });
  });

  describe('Cenários de Erro', () => {
    it('deve capturar erro em renderização com template inválido', async () => {
      // Arrange
      const mockInvalidTemplate = '{% if condition %} sem fechamento';
      const mockVariables = { condition: true };

      // Act & Assert
      await expect(
        service.renderTemplate(mockInvalidTemplate, mockVariables),
      ).rejects.toThrow();
    });
  });
});
