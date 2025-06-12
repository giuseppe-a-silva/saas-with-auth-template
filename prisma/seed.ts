import { PrismaClient } from '@prisma/client';
import { DEFAULT_TEMPLATES } from '../src/notifications/constants/default-templates.constants';

const prisma = new PrismaClient();

/**
 * Função para fazer seed dos templates padrão de notificação
 */
async function seedNotificationTemplates(): Promise<void> {
  console.log('📧 Fazendo seed dos templates de notificação...');

  let createdCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];

  for (const template of DEFAULT_TEMPLATES) {
    try {
      // Verifica se template já existe
      const existingTemplate =
        await prisma.eventNotificationTemplate.findUnique({
          where: {
            eventKey_channel: {
              eventKey: template.eventKey,
              channel: template.channel,
            },
          },
        });

      if (existingTemplate) {
        console.log(
          `   ⏭️  Template ${template.eventKey}/${template.channel} já existe`,
        );
        skippedCount++;
        continue;
      }

      // Cria template
      await prisma.eventNotificationTemplate.create({
        data: {
          eventKey: template.eventKey,
          channel: template.channel,
          title: template.title,
          content: template.content,
          isActive: template.isActive,
          createdBy: null, // Templates do sistema
        },
      });

      console.log(
        `   ✅ Template ${template.eventKey}/${template.channel} criado`,
      );
      createdCount++;
    } catch (error) {
      const errorMessage = `Erro ao criar template ${template.eventKey}/${template.channel}: ${
        error instanceof Error ? error.message : 'Erro desconhecido'
      }`;
      console.error(`   ❌ ${errorMessage}`);
      errors.push(errorMessage);
    }
  }

  console.log(
    `📧 Templates processados: ${createdCount} criados, ${skippedCount} pulados`,
  );

  if (errors.length > 0) {
    console.error('❌ Erros encontrados:');
    errors.forEach((error) => console.error(`   - ${error}`));
    throw new Error(`Falha no seed de templates: ${errors.length} erros`);
  }
}

/**
 * Função principal de seed
 */
async function main(): Promise<void> {
  console.log('🌱 Iniciando seed do sistema...');

  // Limpa templates antigos apenas em desenvolvimento se solicitado
  if (process.env.RESEED_TEMPLATES === 'true') {
    console.log('🧹 Removendo templates existentes...');
    const deletedTemplates = await prisma.eventNotificationTemplate.deleteMany({
      where: {
        createdBy: null, // Apenas templates do sistema
      },
    });
    console.log(`🧹 ${deletedTemplates.count} templates removidos`);
  }

  // Seed dos templates de notificação
  await seedNotificationTemplates();

  console.log('🎉 Seed do sistema concluído!');
  console.log(
    'ℹ️  Para recriar templates: RESEED_TEMPLATES=true npm run db:seed',
  );
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
