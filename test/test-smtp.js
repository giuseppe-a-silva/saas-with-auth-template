/**
 * Script para testar a configuração SMTP do EduMatch
 * Execute: node test-smtp.js
 */
require('dotenv').config();
const nodemailer = require('nodemailer');

async function testSMTP() {
  console.log('🔧 Testando configuração SMTP...\n');

  // Verificar variáveis de ambiente
  const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.NOTIFICATION_DEFAULT_FROM || 'noreply@edumatch.com'
  };

  console.log('📋 Configuração atual:');
  console.log(`  Host: ${config.host}`);
  console.log(`  Port: ${config.port}`);
  console.log(`  Secure: ${config.secure}`);
  console.log(`  User: ${config.user || '❌ NÃO CONFIGURADO'}`);
  console.log(`  Password: ${config.pass ? '✅ Configurada' : '❌ NÃO CONFIGURADA'}`);
  console.log(`  From: ${config.from}\n`);

  if (!config.user || !config.pass) {
    console.log('❌ Erro: SMTP_USER e SMTP_PASS devem estar configurados no arquivo .env');
    console.log('📖 Consulte o arquivo smtp-setup.md para instruções');
    console.log('\n💡 Passos rápidos:');
    console.log('   1. Crie uma senha de app no Gmail');
    console.log('   2. Configure as variáveis no arquivo .env');
    console.log('   3. Execute este teste novamente');
    return;
  }

  try {
    // Criar transporter
    console.log('🔄 Criando transporter...');
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    // Verificar conexão
    console.log('🔄 Verificando conexão SMTP...');
    await transporter.verify();
    console.log('✅ Conexão SMTP estabelecida com sucesso!\n');

    // Enviar email de teste
    console.log('📧 Enviando email de teste...');
    const testEmail = {
      from: config.from,
      to: config.user, // Envia para o próprio email configurado
      subject: '✅ Teste SMTP - EduMatch',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">🎉 Teste SMTP Bem-sucedido!</h2>
          <p>Parabéns! Sua configuração SMTP está funcionando corretamente.</p>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #495057; margin-top: 0;">📋 Detalhes da Configuração</h3>
            <ul style="color: #6c757d;">
              <li><strong>Servidor SMTP:</strong> ${config.host}:${config.port}</li>
              <li><strong>Usuário:</strong> ${config.user}</li>
              <li><strong>Secure:</strong> ${config.secure ? 'Sim' : 'Não'}</li>
              <li><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</li>
            </ul>
          </div>
          
          <div style="background: #d4edda; padding: 15px; border-radius: 5px; border-left: 4px solid #28a745;">
            <p style="margin: 0; color: #155724;">
              <strong>✅ Próximo passo:</strong> Execute <code>npm run start:dev</code> e teste o registro de usuário!
            </p>
          </div>
          
          <hr style="margin: 30px 0;">
          <p style="color: #6c757d; font-size: 12px;">
            Este email foi enviado automaticamente pelo sistema de teste SMTP do EduMatch.
          </p>
        </div>
      `,
      text: `
        Teste SMTP Bem-sucedido!
        
        Parabéns! Sua configuração SMTP está funcionando corretamente.
        
        Detalhes da Configuração:
        - Servidor SMTP: ${config.host}:${config.port}
        - Usuário: ${config.user}
        - Secure: ${config.secure ? 'Sim' : 'Não'}
        - Data/Hora: ${new Date().toLocaleString('pt-BR')}
        
        Próximo passo: Execute 'npm run start:dev' e teste o registro de usuário!
        
        Este email foi enviado automaticamente pelo sistema de teste SMTP do EduMatch.
      `
    };

    const result = await transporter.sendMail(testEmail);
    console.log('✅ Email de teste enviado com sucesso!');
    console.log(`📬 Message ID: ${result.messageId}`);
    console.log(`📧 Email enviado para: ${config.user}\n`);

    console.log('🎉 Configuração SMTP está funcionando perfeitamente!');
    console.log('🚀 Agora você pode usar o sistema de registro com envio de emails.');
    console.log('\n📖 Próximos passos:');
    console.log('   1. Inicie o servidor: npm run start:dev');
    console.log('   2. Teste o registro de usuário via GraphQL');
    console.log('   3. Verifique se o email de verificação chega');

  } catch (error) {
    console.log('❌ Erro ao testar SMTP:');
    console.log(`   ${error.message}\n`);

    if (error.message.includes('Invalid login')) {
      console.log('💡 Dicas para resolver "Invalid login":');
      console.log('   1. Verifique se a autenticação em duas etapas está ativada no Gmail');
      console.log('   2. Use uma senha de app (16 caracteres) - NÃO a senha normal');
      console.log('   3. Confirme se o email está correto');
      console.log('   4. Gere uma nova senha de app se necessário');
      console.log('   📖 Guia: https://myaccount.google.com/apppasswords');
    } else if (error.message.includes('connect') || error.message.includes('timeout')) {
      console.log('💡 Dicas para resolver problemas de conexão:');
      console.log('   1. Verifique sua conexão com a internet');
      console.log('   2. Tente alterar SMTP_PORT para 465 e SMTP_SECURE=true');
      console.log('   3. Verifique se não há firewall bloqueando a porta 587/465');
      console.log('   4. Teste com outro provedor SMTP se persistir');
    } else {
      console.log('💡 Dicas gerais:');
      console.log('   1. Verifique todas as variáveis no arquivo .env');
      console.log('   2. Confirme se não há espaços extras nas variáveis');
      console.log('   3. Consulte o arquivo smtp-setup.md para mais detalhes');
    }
  }
}

// Executar teste
console.log('🎯 EduMatch - Teste de Configuração SMTP\n');
testSMTP().catch(console.error); 