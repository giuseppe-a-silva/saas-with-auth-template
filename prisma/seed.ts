import {
  NotificationCategory,
  NotificationChannel,
  PrismaClient,
} from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Templates padrão para o sistema de notificações
 */
const defaultTemplates = [
  // TEMPLATES DE SISTEMA
  {
    name: 'system-maintenance',
    title: 'Manutenção Programada do Sistema',
    content: `SUBJECT: Manutenção Programada - {{ maintenanceDate }}
FROM: sistema@edumatch.com
---
<h2>🔧 Manutenção Programada</h2>
<p>Olá {{ userName }},</p>
<p>Informamos que haverá uma manutenção programada em nosso sistema:</p>
<ul>
  <li><strong>Data:</strong> {{ maintenanceDate }}</li>
  <li><strong>Horário:</strong> {{ maintenanceTime }}</li>
  <li><strong>Duração estimada:</strong> {{ estimatedDuration }}</li>
</ul>
<p>Durante este período, o sistema ficará temporariamente indisponível.</p>
<p>Agradecemos sua compreensão.</p>
<hr>
<p><small>Equipe EduMatch</small></p>`,
    category: NotificationCategory.SISTEMA,
    channel: NotificationChannel.EMAIL,
    isActive: true,
  },
  {
    name: 'system-error-alert',
    title: 'Alerta de Erro Crítico',
    content: `SUBJECT: 🚨 Erro Crítico Detectado
FROM: alerts@edumatch.com
---
<h2>🚨 Alerta de Erro Crítico</h2>
<p><strong>Erro:</strong> {{ errorMessage }}</p>
<p><strong>Componente:</strong> {{ component }}</p>
<p><strong>Timestamp:</strong> {{ timestamp }}</p>
<p><strong>Usuário:</strong> {{ userId }}</p>
<p><strong>Stack Trace:</strong></p>
<pre>{{ stackTrace }}</pre>`,
    category: NotificationCategory.SISTEMA,
    channel: NotificationChannel.EMAIL,
    isActive: true,
  },

  // TEMPLATES DE AUTENTICAÇÃO
  {
    name: 'auth-welcome',
    title: 'Bem-vindo ao EduMatch!',
    content: `SUBJECT: Bem-vindo ao EduMatch, {{ userName }}! 🎉
FROM: onboarding@edumatch.com
---
<h1>🎉 Bem-vindo ao EduMatch!</h1>
<p>Olá {{ userName }},</p>
<p>É com grande prazer que te damos as boas-vindas à nossa plataforma!</p>
<h3>✨ Próximos Passos:</h3>
<ol>
  <li>Complete seu perfil</li>
  <li>Explore nossas funcionalidades</li>
  <li>Conecte-se com outros usuários</li>
</ol>
<a href="{{ platformUrl }}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Acessar Plataforma</a>
<p>Se precisar de ajuda, nossa equipe está sempre disponível!</p>
<hr>
<p><small>Equipe EduMatch | <a href="{{ supportUrl }}">Central de Ajuda</a></small></p>`,
    category: NotificationCategory.AUTH,
    channel: NotificationChannel.EMAIL,
    isActive: true,
  },
  {
    name: 'auth-password-reset',
    title: 'Redefinição de Senha',
    content: `SUBJECT: Redefinir sua senha - EduMatch
FROM: security@edumatch.com
---
<h2>🔐 Redefinição de Senha</h2>
<p>Olá {{ userName }},</p>
<p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
<p>Clique no botão abaixo para criar uma nova senha:</p>
<a href="{{ resetUrl }}" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Redefinir Senha</a>
<p><strong>⏰ Este link expira em {{ expirationTime }} horas.</strong></p>
<p>Se você não solicitou esta redefinição, ignore este email.</p>
<hr>
<p><small>Por segurança, nunca compartilhe este link com terceiros.</small></p>`,
    category: NotificationCategory.AUTH,
    channel: NotificationChannel.EMAIL,
    isActive: true,
  },
  {
    name: 'auth-login-notification',
    title: 'Novo Acesso Detectado',
    content: `SUBJECT: Novo acesso à sua conta
FROM: security@edumatch.com
---
<h2>🔒 Novo Acesso Detectado</h2>
<p>Olá {{ userName }},</p>
<p>Detectamos um novo acesso à sua conta:</p>
<ul>
  <li><strong>Data:</strong> {{ loginDate }}</li>
  <li><strong>Horário:</strong> {{ loginTime }}</li>
  <li><strong>IP:</strong> {{ ipAddress }}</li>
  <li><strong>Dispositivo:</strong> {{ device }}</li>
  <li><strong>Localização:</strong> {{ location }}</li>
</ul>
<p>Se foi você, pode ignorar este email. Caso contrário, recomendamos que altere sua senha imediatamente.</p>
<a href="{{ securityUrl }}">Verificar Segurança da Conta</a>`,
    category: NotificationCategory.AUTH,
    channel: NotificationChannel.EMAIL,
    isActive: true,
  },
  {
    name: 'auth-email-verification',
    title: 'Verificação de Email - EduMatch',
    content: `SUBJECT: Verifique seu email - EduMatch ✉️
FROM: verification@edumatch.com
---
<h1>✉️ Verificação de Email</h1>
<p>Olá {{ userName }},</p>
<p>Obrigado por se cadastrar no EduMatch! Para completar seu registro, precisamos verificar seu endereço de email.</p>
<p>Clique no botão abaixo para verificar sua conta:</p>
<div style="text-align: center; margin: 30px 0;">
  <a href="{{ verificationUrl }}" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Verificar Email</a>
</div>
<p><strong>⏰ Este link expira em 24 horas.</strong></p>
<p>Se você não se cadastrou no EduMatch, pode ignorar este email.</p>
<hr>
<p><small>Se o botão não funcionar, copie e cole este link no seu navegador: {{ verificationUrl }}</small></p>
<p><small>Equipe EduMatch | <a href="{{ supportUrl }}">Central de Ajuda</a></small></p>`,
    category: NotificationCategory.AUTH,
    channel: NotificationChannel.EMAIL,
    isActive: true,
  },
  {
    name: 'auth-password-changed',
    title: 'Senha Alterada com Sucesso',
    content: `SUBJECT: Sua senha foi alterada - EduMatch 🔐
FROM: security@edumatch.com
---
<h2>🔐 Senha Alterada com Sucesso</h2>
<p>Olá {{ userName }},</p>
<p>Sua senha foi alterada com sucesso em <strong>{{ changeDate }}</strong> às <strong>{{ changeTime }}</strong>.</p>
<h3>📋 Detalhes da alteração:</h3>
<ul>
  <li><strong>Data:</strong> {{ changeDate }}</li>
  <li><strong>Horário:</strong> {{ changeTime }}</li>
  <li><strong>IP:</strong> {{ ipAddress }}</li>
  <li><strong>Dispositivo:</strong> {{ device }}</li>
</ul>
<p>Se foi você quem alterou a senha, pode ignorar este email. Sua conta está segura.</p>
<div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
  <p><strong>⚠️ Se você NÃO alterou sua senha:</strong></p>
  <ol>
    <li>Acesse sua conta imediatamente</li>
    <li>Altere sua senha novamente</li>
    <li>Entre em contato com nosso suporte</li>
  </ol>
</div>
<a href="{{ securityUrl }}" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Verificar Segurança da Conta</a>
<hr>
<p><small>Por sua segurança, nunca compartilhe suas credenciais com terceiros.</small></p>`,
    category: NotificationCategory.AUTH,
    channel: NotificationChannel.EMAIL,
    isActive: true,
  },
  {
    name: 'auth-data-changed',
    title: 'Dados da Conta Alterados',
    content: `SUBJECT: Dados da sua conta foram alterados - EduMatch 📝
FROM: security@edumatch.com
---
<h2>📝 Dados da Conta Alterados</h2>
<p>Olá {{ userName }},</p>
<p>Informamos que alguns dados da sua conta foram alterados em <strong>{{ changeDate }}</strong> às <strong>{{ changeTime }}</strong>.</p>
<h3>📋 Alterações realizadas:</h3>
<ul>
{% for change in changes %}
  <li><strong>{{ change.field }}:</strong> {{ change.oldValue }} → {{ change.newValue }}</li>
{% endfor %}
</ul>
<h3>🔍 Detalhes da alteração:</h3>
<ul>
  <li><strong>Data:</strong> {{ changeDate }}</li>
  <li><strong>Horário:</strong> {{ changeTime }}</li>
  <li><strong>IP:</strong> {{ ipAddress }}</li>
  <li><strong>Dispositivo:</strong> {{ device }}</li>
</ul>
<p>Se foi você quem fez essas alterações, pode ignorar este email.</p>
<div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
  <p><strong>⚠️ Se você NÃO fez essas alterações:</strong></p>
  <ol>
    <li>Acesse sua conta imediatamente</li>
    <li>Verifique seus dados</li>
    <li>Altere sua senha</li>
    <li>Entre em contato com nosso suporte</li>
  </ol>
</div>
<a href="{{ securityUrl }}" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Verificar Segurança da Conta</a>
<hr>
<p><small>Equipe EduMatch | <a href="{{ supportUrl }}">Central de Ajuda</a></small></p>`,
    category: NotificationCategory.AUTH,
    channel: NotificationChannel.EMAIL,
    isActive: true,
  },

  // TEMPLATES DE LEADS
  {
    name: 'leads-new-inquiry',
    title: 'Nova Solicitação de Contato',
    content: `SUBJECT: 📧 Nova solicitação de {{ contactType }}
FROM: leads@edumatch.com
---
<h2>📧 Nova Solicitação de Contato</h2>
<p><strong>Nome:</strong> {{ contactName }}</p>
<p><strong>Email:</strong> {{ contactEmail }}</p>
<p><strong>Telefone:</strong> {{ contactPhone }}</p>
<p><strong>Tipo:</strong> {{ contactType }}</p>
<p><strong>Assunto:</strong> {{ subject }}</p>
<h3>Mensagem:</h3>
<div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #007bff;">
{{ message }}
</div>
<p><strong>Data:</strong> {{ submissionDate }}</p>`,
    category: NotificationCategory.LEADS,
    channel: NotificationChannel.EMAIL,
    isActive: true,
  },
  {
    name: 'leads-follow-up',
    title: 'Follow-up Automático',
    content: `SUBJECT: Seguimento da sua solicitação - EduMatch
FROM: atendimento@edumatch.com
---
<h2>👋 Obrigado pelo seu interesse!</h2>
<p>Olá {{ contactName }},</p>
<p>Recebemos sua solicitação sobre {{ subject }} e nossa equipe já está analisando.</p>
<h3>📋 Resumo da sua solicitação:</h3>
<ul>
  <li><strong>Protocolo:</strong> {{ ticketId }}</li>
  <li><strong>Data:</strong> {{ submissionDate }}</li>
  <li><strong>Tipo:</strong> {{ contactType }}</li>
</ul>
<p>Retornaremos o contato em até {{ responseTime }} úteis.</p>
<p>Acompanhe o status: <a href="{{ trackingUrl }}">Acompanhar Solicitação</a></p>`,
    category: NotificationCategory.LEADS,
    channel: NotificationChannel.EMAIL,
    isActive: true,
  },

  // TEMPLATES DE MARKETING
  {
    name: 'marketing-newsletter',
    title: 'Newsletter Semanal',
    content: `SUBJECT: 📰 Newsletter EduMatch - {{ weekOf }}
FROM: newsletter@edumatch.com
---
<h1>📰 EduMatch Newsletter</h1>
<p>Olá {{ userName }},</p>
<p>Confira as novidades desta semana!</p>

<h2>🚀 Destaques da Semana</h2>
{% for highlight in weekHighlights %}
<div style="margin: 20px 0; padding: 15px; border: 1px solid #ddd;">
  <h3>{{ highlight.title }}</h3>
  <p>{{ highlight.description }}</p>
  <a href="{{ highlight.url }}">Leia mais</a>
</div>
{% endfor %}

<h2>📊 Suas Estatísticas</h2>
<ul>
  <li>Perfil visitado: {{ profileViews }} vezes</li>
  <li>Novas conexões: {{ newConnections }}</li>
  <li>Atividades concluídas: {{ completedActivities }}</li>
</ul>

<p>Continue explorando a plataforma!</p>
<a href="{{ platformUrl }}">Acessar Plataforma</a>`,
    category: NotificationCategory.MARKETING,
    channel: NotificationChannel.EMAIL,
    isActive: true,
  },
  {
    name: 'marketing-promotion',
    title: 'Oferta Especial',
    content: `SUBJECT: 🎯 Oferta Especial por Tempo Limitado!
FROM: promocoes@edumatch.com
---
<h1>🎯 Oferta Especial para Você!</h1>
<p>Olá {{ userName }},</p>
<p>Preparamos uma oferta exclusiva que você não pode perder!</p>

<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px;">
  <h2>{{ promotionTitle }}</h2>
  <p style="font-size: 18px;">{{ promotionDescription }}</p>
  <div style="font-size: 24px; font-weight: bold; margin: 20px 0;">
    {{ discountValue }} OFF
  </div>
  <a href="{{ promotionUrl }}" style="background: white; color: #667eea; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">APROVEITAR OFERTA</a>
</div>

<p>⏰ <strong>Válido até {{ expirationDate }}</strong></p>
<p><small>Oferta válida para novos usuários. Termos e condições se aplicam.</small></p>`,
    category: NotificationCategory.MARKETING,
    channel: NotificationChannel.EMAIL,
    isActive: true,
  },

  // TEMPLATES DE ADMIN
  {
    name: 'admin-user-report',
    title: 'Relatório de Usuários',
    content: `SUBJECT: 📊 Relatório Diário de Usuários - {{ reportDate }}
FROM: admin@edumatch.com
---
<h2>📊 Relatório Diário de Usuários</h2>
<p><strong>Data:</strong> {{ reportDate }}</p>

<h3>📈 Estatísticas Gerais</h3>
<ul>
  <li>Total de usuários: {{ totalUsers }}</li>
  <li>Novos registros hoje: {{ newRegistrations }}</li>
  <li>Usuários ativos: {{ activeUsers }}</li>
  <li>Taxa de retenção: {{ retentionRate }}%</li>
</ul>

<h3>🎯 Atividades</h3>
<ul>
  <li>Logins hoje: {{ todayLogins }}</li>
  <li>Sessões ativas: {{ activeSessions }}</li>
  <li>Ações realizadas: {{ userActions }}</li>
</ul>

<h3>🚨 Alertas</h3>
{% if alerts.size > 0 %}
  {% for alert in alerts %}
  <div style="background: #fff3cd; padding: 10px; margin: 5px 0; border-left: 4px solid #ffc107;">
    {{ alert.message }}
  </div>
  {% endfor %}
{% else %}
  <p style="color: green;">✅ Nenhum alerta registrado</p>
{% endif %}`,
    category: NotificationCategory.ADMIN,
    channel: NotificationChannel.EMAIL,
    isActive: true,
  },

  // TEMPLATES PUSH
  {
    name: 'push-welcome',
    title: 'Bem-vindo!',
    content: `{
  "heading": "Bem-vindo ao EduMatch! 🎉",
  "content": "{{ userName }}, sua jornada de aprendizado começa agora!",
  "data": {
    "action": "open_app",
    "screen": "dashboard"
  }
}`,
    category: NotificationCategory.AUTH,
    channel: NotificationChannel.PUSH,
    isActive: true,
  },
  {
    name: 'push-new-message',
    title: 'Nova Mensagem',
    content: `{
  "heading": "Nova mensagem 💬",
  "content": "{{ senderName }}: {{ messagePreview }}",
  "data": {
    "action": "open_chat",
    "chatId": "{{ chatId }}"
  }
}`,
    category: NotificationCategory.SISTEMA,
    channel: NotificationChannel.PUSH,
    isActive: true,
  },

  // TEMPLATES REALTIME
  {
    name: 'realtime-user-online',
    title: 'Usuário Online',
    content: `CHANNEL: user-status
EVENT: user-online
---
{
  "type": "user_status",
  "userId": "{{ userId }}",
  "status": "online",
  "timestamp": "{{ timestamp }}"
}`,
    category: NotificationCategory.SISTEMA,
    channel: NotificationChannel.REALTIME,
    isActive: true,
  },
  {
    name: 'realtime-notification',
    title: 'Notificação em Tempo Real',
    content: `CHANNEL: notifications-{{ userId }}
EVENT: new-notification
---
{
  "type": "notification",
  "title": "{{ title }}",
  "message": "{{ message }}",
  "priority": "{{ priority }}",
  "timestamp": "{{ timestamp }}"
}`,
    category: NotificationCategory.SISTEMA,
    channel: NotificationChannel.REALTIME,
    isActive: true,
  },

  // TEMPLATES WEBHOOK
  {
    name: 'webhook-user-registered',
    title: 'Usuário Registrado',
    content: `URL: {{ webhookUrl }}
METHOD: POST
TIMEOUT: 15000
HEADERS:
  Authorization: Bearer {{ apiKey }}
  Content-Type: application/json
---
{
  "event": "user.registered",
  "data": {
    "userId": "{{ userId }}",
    "email": "{{ userEmail }}",
    "registrationDate": "{{ registrationDate }}",
    "source": "edumatch"
  }
}`,
    category: NotificationCategory.AUTH,
    channel: NotificationChannel.THIRD_PARTY,
    isActive: true,
  },
  {
    name: 'webhook-lead-created',
    title: 'Lead Criado',
    content: `URL: {{ crmWebhookUrl }}
METHOD: POST
TIMEOUT: 10000
HEADERS:
  X-API-Key: {{ crmApiKey }}
  Content-Type: application/json
---
{
  "lead": {
    "name": "{{ contactName }}",
    "email": "{{ contactEmail }}",
    "phone": "{{ contactPhone }}",
    "source": "edumatch_website",
    "interest": "{{ contactType }}",
    "message": "{{ message }}",
    "created_at": "{{ submissionDate }}"
  }
}`,
    category: NotificationCategory.LEADS,
    channel: NotificationChannel.THIRD_PARTY,
    isActive: true,
  },
];

/**
 * Função principal de seed
 */
async function main(): Promise<void> {
  console.log('🌱 Iniciando seed de templates de notificação...');

  // Limpa templates existentes (apenas em desenvolvimento)
  if (process.env.NODE_ENV === 'development') {
    console.log('🧹 Limpando templates existentes...');
    await prisma.notificationTemplate.deleteMany({});
  }

  // Cria templates padrão
  console.log('📝 Criando templates padrão...');
  for (const template of defaultTemplates) {
    await prisma.notificationTemplate.upsert({
      where: { name: template.name },
      update: template,
      create: template,
    });
    console.log(`✅ Template criado: ${template.name}`);
  }

  console.log('🎉 Seed concluído com sucesso!');
  console.log(`📊 Total de templates criados: ${defaultTemplates.length}`);

  // Estatísticas
  const stats = await prisma.notificationTemplate.groupBy({
    by: ['category', 'channel'],
    _count: true,
  });

  console.log('\n📈 Estatísticas por categoria/canal:');
  for (const stat of stats) {
    console.log(
      `  ${stat.category} → ${stat.channel}: ${stat._count} templates`,
    );
  }
}

void main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
