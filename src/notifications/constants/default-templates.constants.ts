import { NotificationChannel } from '@prisma/client';

/**
 * Interface para template padrão
 */
export interface DefaultTemplateDefinition {
  eventKey: string;
  channel: NotificationChannel;
  title: string;
  content: string;
  isActive: boolean;
}

/**
 * Templates padrão para EMAIL_VERIFICATION
 */
const EMAIL_VERIFICATION_TEMPLATES: DefaultTemplateDefinition[] = [
  {
    eventKey: 'EMAIL_VERIFICATION',
    channel: NotificationChannel.EMAIL,
    title: '✉️ Verificação de Email - {{ data.userName }}',
    content: `SUBJECT: ✉️ Verificar seu email - EduMatch
FROM: noreply@edumatch.com
---
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Verificação de Email</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; color: #2563eb; }
    .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { margin-top: 30px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1 class="header">🎓 Bem-vindo ao EduMatch!</h1>
    
    <p>Olá <strong>{{ data.userName }}</strong>,</p>
    
    <p>Obrigado por se cadastrar! Para completar seu registro, precisamos verificar seu endereço de email.</p>
    
    <div style="text-align: center;">
      <a href="{{ data.verificationUrl }}" class="button">✅ Verificar Email</a>
    </div>
    
    <p>Se você não conseguir clicar no botão, copie e cole este link no seu navegador:</p>
    <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">
      {{ data.verificationUrl }}
    </p>
    
    <div class="footer">
      <p>Se você não se cadastrou no EduMatch, pode ignorar este email.</p>
      <p>Precisa de ajuda? <a href="{{ data.supportUrl }}">Entre em contato conosco</a></p>
      <p>© {{ timestamp | date: "%Y" }} EduMatch - Conectando educação</p>
    </div>
  </div>
</body>
</html>`,
    isActive: true,
  },
  {
    eventKey: 'EMAIL_VERIFICATION',
    channel: NotificationChannel.PUSH,
    title: '✉️ Verificação de Email',
    content: `TITLE: ✉️ Verificar seu email
BODY: Clique aqui para verificar seu email no EduMatch
DATA: {
  "url": "{{ data.verificationUrl }}",
  "type": "email_verification",
  "userName": "{{ data.userName }}"
}`,
    isActive: true,
  },
  {
    eventKey: 'EMAIL_VERIFICATION',
    channel: NotificationChannel.REALTIME,
    title: 'Email Verification Event',
    content: `{
  "event": "EMAIL_VERIFICATION",
  "timestamp": "{{ timestamp }}",
  "user": {
    "id": "{{ user.id }}",
    "name": "{{ user.name }}",
    "email": "{{ user.email }}"
  },
  "data": {
    "verificationUrl": "{{ data.verificationUrl }}",
    "userName": "{{ data.userName }}"
  }
}`,
    isActive: true,
  },
];

/**
 * Templates padrão para PASSWORD_RESET
 */
const PASSWORD_RESET_TEMPLATES: DefaultTemplateDefinition[] = [
  {
    eventKey: 'PASSWORD_RESET',
    channel: NotificationChannel.EMAIL,
    title: '🔐 Redefinir Senha - {{ data.userName }}',
    content: `SUBJECT: 🔐 Redefinir sua senha - EduMatch
FROM: noreply@edumatch.com
---
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Redefinir Senha</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; color: #dc2626; }
    .button { display: inline-block; padding: 12px 24px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .alert { background-color: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .footer { margin-top: 30px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1 class="header">🔐 Redefinir Senha</h1>
    
    <p>Olá <strong>{{ data.userName }}</strong>,</p>
    
    <p>Recebemos uma solicitação para redefinir a senha da sua conta no EduMatch.</p>
    
    <div style="text-align: center;">
      <a href="{{ data.resetUrl }}" class="button">🔑 Redefinir Senha</a>
    </div>
    
    <div class="alert">
      <strong>⚠️ Importante:</strong>
      <ul>
        <li>Este link é válido até <strong>{{ data.expiresAt }}</strong></li>
        <li>Use este link apenas se você solicitou a redefinição</li>
        <li>Nunca compartilhe este link com outras pessoas</li>
      </ul>
    </div>
    
    <p>Se você não conseguir clicar no botão, copie e cole este link no seu navegador:</p>
    <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">
      {{ data.resetUrl }}
    </p>
    
    <div class="footer">
      <p>Se você não solicitou esta redefinição, pode ignorar este email com segurança.</p>
      <p>© {{ timestamp | date: "%Y" }} EduMatch - Conectando educação</p>
    </div>
  </div>
</body>
</html>`,
    isActive: true,
  },
  {
    eventKey: 'PASSWORD_RESET',
    channel: NotificationChannel.PUSH,
    title: '🔐 Redefinir Senha',
    content: `TITLE: 🔐 Redefinir senha solicitada
BODY: Clique aqui para redefinir sua senha no EduMatch
DATA: {
  "url": "{{ data.resetUrl }}",
  "type": "password_reset",
  "userName": "{{ data.userName }}",
  "expiresAt": "{{ data.expiresAt }}"
}`,
    isActive: true,
  },
  {
    eventKey: 'PASSWORD_RESET',
    channel: NotificationChannel.REALTIME,
    title: 'Password Reset Event',
    content: `{
  "event": "PASSWORD_RESET",
  "timestamp": "{{ timestamp }}",
  "user": {
    "id": "{{ user.id }}",
    "name": "{{ user.name }}",
    "email": "{{ user.email }}"
  },
  "data": {
    "resetUrl": "{{ data.resetUrl }}",
    "userName": "{{ data.userName }}",
    "expiresAt": "{{ data.expiresAt }}"
  }
}`,
    isActive: true,
  },
];

/**
 * Templates padrão para PASSWORD_CHANGED
 */
const PASSWORD_CHANGED_TEMPLATES: DefaultTemplateDefinition[] = [
  {
    eventKey: 'PASSWORD_CHANGED',
    channel: NotificationChannel.EMAIL,
    title: '🔒 Senha Alterada - {{ data.userName }}',
    content: `SUBJECT: 🔒 Sua senha foi alterada - EduMatch
FROM: noreply@edumatch.com
---
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Senha Alterada</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; color: #059669; }
    .info-box { background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .security-tip { background-color: #fffbeb; border: 1px solid #fed7aa; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .button { display: inline-block; padding: 12px 24px; background-color: #059669; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { margin-top: 30px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1 class="header">🔒 Senha Alterada com Sucesso</h1>
    
    <p>Olá <strong>{{ data.userName }}</strong>,</p>
    
    <p>Confirmamos que sua senha foi alterada com sucesso em <strong>{{ data.changeDate }}</strong> às <strong>{{ data.changeTime }}</strong>.</p>
    
    <div class="info-box">
      <h3>📋 Detalhes da Alteração:</h3>
      <ul>
        <li><strong>Data:</strong> {{ data.changeDate }} às {{ data.changeTime }}</li>
        <li><strong>Dispositivo:</strong> {{ data.device }}</li>
        <li><strong>IP:</strong> {{ data.ipAddress }}</li>
      </ul>
    </div>
    
    <div class="security-tip">
      <h3>🛡️ Dicas de Segurança:</h3>
      <ul>
        <li>Use senhas únicas para cada conta</li>
        <li>Ative a autenticação em dois fatores quando disponível</li>
        <li>Nunca compartilhe suas credenciais</li>
        <li>Verifique regularmente a atividade da sua conta</li>
      </ul>
    </div>
    
    <div style="text-align: center;">
      <a href="{{ data.securityUrl }}" class="button">🔐 Ver Configurações de Segurança</a>
    </div>
    
    <div class="footer">
      <p><strong>Não foi você?</strong> Se você não alterou sua senha, entre em contato conosco imediatamente.</p>
      <p>© {{ timestamp | date: "%Y" }} EduMatch - Conectando educação</p>
    </div>
  </div>
</body>
</html>`,
    isActive: true,
  },
  {
    eventKey: 'PASSWORD_CHANGED',
    channel: NotificationChannel.PUSH,
    title: '🔒 Senha Alterada',
    content: `TITLE: 🔒 Senha alterada com sucesso
BODY: Sua senha foi alterada em {{ data.changeDate }} às {{ data.changeTime }}
DATA: {
  "type": "password_changed",
  "userName": "{{ data.userName }}",
  "changeDate": "{{ data.changeDate }}",
  "changeTime": "{{ data.changeTime }}",
  "device": "{{ data.device }}"
}`,
    isActive: true,
  },
  {
    eventKey: 'PASSWORD_CHANGED',
    channel: NotificationChannel.REALTIME,
    title: 'Password Changed Event',
    content: `{
  "event": "PASSWORD_CHANGED",
  "timestamp": "{{ timestamp }}",
  "user": {
    "id": "{{ user.id }}",
    "name": "{{ user.name }}",
    "email": "{{ user.email }}"
  },
  "data": {
    "userName": "{{ data.userName }}",
    "changeDate": "{{ data.changeDate }}",
    "changeTime": "{{ data.changeTime }}",
    "ipAddress": "{{ data.ipAddress }}",
    "device": "{{ data.device }}"
  }
}`,
    isActive: true,
  },
];

/**
 * Templates padrão para DATA_CHANGED
 */
const DATA_CHANGED_TEMPLATES: DefaultTemplateDefinition[] = [
  {
    eventKey: 'DATA_CHANGED',
    channel: NotificationChannel.EMAIL,
    title: '📝 Dados Alterados - {{ data.userName }}',
    content: `SUBJECT: 📝 Seus dados foram alterados - EduMatch
FROM: noreply@edumatch.com
---
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Dados Alterados</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; color: #7c3aed; }
    .info-box { background-color: #faf5ff; border: 1px solid #e9d5ff; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .changes-list { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .button { display: inline-block; padding: 12px 24px; background-color: #7c3aed; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { margin-top: 30px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1 class="header">📝 Dados da Conta Alterados</h1>
    
    <p>Olá <strong>{{ data.userName }}</strong>,</p>
    
    <p>Informamos que alguns dados da sua conta foram alterados em <strong>{{ data.changeDate }}</strong> às <strong>{{ data.changeTime }}</strong>.</p>
    
    <div class="info-box">
      <h3>📋 Detalhes da Alteração:</h3>
      <ul>
        <li><strong>Data:</strong> {{ data.changeDate }} às {{ data.changeTime }}</li>
        <li><strong>Dispositivo:</strong> {{ data.device }}</li>
        <li><strong>IP:</strong> {{ data.ipAddress }}</li>
      </ul>
    </div>
    
    <div class="changes-list">
      <h3>🔄 Alterações Realizadas:</h3>
      {% for change in data.changes %}
      <div style="margin-bottom: 10px; padding: 8px; background-color: white; border-radius: 4px;">
        <strong>{{ change.field }}:</strong><br>
        <span style="color: #dc2626;">Anterior: {{ change.oldValue }}</span><br>
        <span style="color: #059669;">Novo: {{ change.newValue }}</span>
      </div>
      {% endfor %}
    </div>
    
    <div style="text-align: center;">
      <a href="{{ data.securityUrl }}" class="button">🔐 Ver Configurações de Segurança</a>
    </div>
    
    <div class="footer">
      <p><strong>Não foi você?</strong> Se você não fez essas alterações, <a href="{{ data.supportUrl }}">entre em contato conosco</a> imediatamente.</p>
      <p>© {{ timestamp | date: "%Y" }} EduMatch - Conectando educação</p>
    </div>
  </div>
</body>
</html>`,
    isActive: true,
  },
  {
    eventKey: 'DATA_CHANGED',
    channel: NotificationChannel.PUSH,
    title: '📝 Dados Alterados',
    content: `TITLE: 📝 Dados da conta alterados
BODY: Seus dados foram alterados em {{ data.changeDate }} às {{ data.changeTime }}
DATA: {
  "type": "data_changed",
  "userName": "{{ data.userName }}",
  "changeDate": "{{ data.changeDate }}",
  "changeTime": "{{ data.changeTime }}",
  "changesCount": "{{ data.changes | size }}"
}`,
    isActive: true,
  },
  {
    eventKey: 'DATA_CHANGED',
    channel: NotificationChannel.REALTIME,
    title: 'Data Changed Event',
    content: `{
  "event": "DATA_CHANGED",
  "timestamp": "{{ timestamp }}",
  "user": {
    "id": "{{ user.id }}",
    "name": "{{ user.name }}",
    "email": "{{ user.email }}"
  },
  "data": {
    "userName": "{{ data.userName }}",
    "changeDate": "{{ data.changeDate }}",
    "changeTime": "{{ data.changeTime }}",
    "changes": {{ data.changes | json }},
    "ipAddress": "{{ data.ipAddress }}",
    "device": "{{ data.device }}"
  }
}`,
    isActive: true,
  },
];

/**
 * Todos os templates padrão do sistema
 */
export const DEFAULT_TEMPLATES: DefaultTemplateDefinition[] = [
  ...EMAIL_VERIFICATION_TEMPLATES,
  ...PASSWORD_RESET_TEMPLATES,
  ...PASSWORD_CHANGED_TEMPLATES,
  ...DATA_CHANGED_TEMPLATES,
];

/**
 * Templates padrão agrupados por eventKey
 */
export const DEFAULT_TEMPLATES_BY_EVENT = {
  EMAIL_VERIFICATION: EMAIL_VERIFICATION_TEMPLATES,
  PASSWORD_RESET: PASSWORD_RESET_TEMPLATES,
  PASSWORD_CHANGED: PASSWORD_CHANGED_TEMPLATES,
  DATA_CHANGED: DATA_CHANGED_TEMPLATES,
};

/**
 * Lista das eventKeys que possuem templates padrão
 */
export const SUPPORTED_EVENT_KEYS = Object.keys(DEFAULT_TEMPLATES_BY_EVENT);
