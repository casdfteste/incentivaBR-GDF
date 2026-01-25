import nodemailer from 'nodemailer';

// Configuração do transporter
// Produção: usa SMTP configurado no .env (Locaweb, SendGrid, AWS SES, etc.)
// Desenvolvimento: usa Ethereal (emails fake para testes)
let transporter;

export async function initEmailService() {
  // Se tiver configuração SMTP no .env, usar produção
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 465,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    console.log('📧 Serviço de email inicializado (PRODUÇÃO)');
    console.log('📧 SMTP:', process.env.SMTP_HOST);
    console.log('📧 Usuário:', process.env.SMTP_USER);
  } else {
    // Modo desenvolvimento/testes: usar Ethereal (emails fake)
    const testAccount = await nodemailer.createTestAccount();

    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });

    console.log('📧 Serviço de email inicializado (TESTE - Ethereal)');
    console.log('📧 Usuário Ethereal:', testAccount.user);
    console.log('📧 Para ver emails enviados, acesse: https://ethereal.email');
  }

  return transporter;
}

// Remetente padrão
const getFromAddress = () => process.env.SMTP_FROM || '"IncentivaBR" <noreply@incentivabr.com.br>';

// Template base do email
function getEmailTemplate(content, org = null) {
  const orgName = org?.name || 'IncentivaBR';
  const primaryColor = org?.primary_color || '#00A859';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${primaryColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: ${primaryColor}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        .highlight { background: #e8f5e9; padding: 15px; border-radius: 5px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${orgName}</h1>
          <p>Incentivos Fiscais Simplificados</p>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p>Este é um email automático do ${orgName}.</p>
          <p>Plataforma IncentivaBR - Transforme seu imposto em impacto social</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Email de boas-vindas
export async function sendWelcomeEmail(user, org = null) {
  if (!transporter) {
    console.warn('📧 Serviço de email não inicializado. Email não enviado.');
    return null;
  }

  const content = `
    <h2>Bem-vindo(a), ${user.name}! 🎉</h2>
    <p>Sua conta foi criada com sucesso na plataforma IncentivaBR.</p>
    <p>Agora você pode:</p>
    <ul>
      <li>✅ Calcular quanto do seu IR pode destinar</li>
      <li>✅ Conhecer projetos sociais que transformam vidas</li>
      <li>✅ Destinar seu imposto para causas que você acredita</li>
    </ul>
    <div class="highlight">
      <strong>💡 Sabia que?</strong><br>
      Destinar parte do seu IR não custa nada a mais! É um direito seu escolher para onde vai o seu imposto.
    </div>
    <a href="http://localhost:3000/calculadora.html" class="button">Calcular meu potencial</a>
  `;

  const info = await transporter.sendMail({
    from: getFromAddress(),
    to: user.email,
    subject: 'Bem-vindo ao IncentivaBR! 🎉',
    html: getEmailTemplate(content, org)
  });

  console.log('📧 Email de boas-vindas enviado:', info.messageId);
  console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
  return info;
}

// Email de destinação registrada
export async function sendDestinationRegisteredEmail(user, donation, project, org = null) {
  if (!transporter) {
    console.warn('📧 Serviço de email não inicializado. Email não enviado.');
    return null;
  }

  const valor = parseFloat(donation.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const content = `
    <h2>Destinação Registrada! 📝</h2>
    <p>Olá, ${user.name}!</p>
    <p>Sua destinação foi registrada com sucesso. Confira os detalhes:</p>
    <div class="highlight">
      <strong>Projeto:</strong> ${project.title}<br>
      <strong>Valor:</strong> ${valor}<br>
      <strong>Status:</strong> ⏳ Aguardando confirmação do depósito
    </div>
    <p><strong>Próximo passo:</strong></p>
    <p>Faça o PIX ou transferência para a conta informada no sistema. Após a confirmação do depósito pelo fundo, você receberá o recibo oficial.</p>
    <a href="http://localhost:3000/dashboard.html" class="button">Ver minhas destinações</a>
  `;

  const info = await transporter.sendMail({
    from: getFromAddress(),
    to: user.email,
    subject: `Destinação registrada - ${project.title}`,
    html: getEmailTemplate(content, org)
  });

  console.log('📧 Email de destinação registrada enviado:', info.messageId);
  console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
  return info;
}

// Email de destinação confirmada
export async function sendDestinationConfirmedEmail(user, donation, project, org = null) {
  if (!transporter) {
    console.warn('📧 Serviço de email não inicializado. Email não enviado.');
    return null;
  }

  const valor = parseFloat(donation.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const content = `
    <h2>Destinação Confirmada! ✅</h2>
    <p>Olá, ${user.name}!</p>
    <p>Ótima notícia! Sua destinação foi confirmada pelo fundo.</p>
    <div class="highlight">
      <strong>Projeto:</strong> ${project.title}<br>
      <strong>Valor:</strong> ${valor}<br>
      <strong>Status:</strong> ✅ Confirmado
    </div>
    <p><strong>Documentos disponíveis:</strong></p>
    <ul>
      <li>📄 Comprovante de Destinação (IncentivaBR)</li>
      <li>📄 Recibo Oficial do Fundo (para declaração do IR)</li>
    </ul>
    <p>Acesse seu dashboard para baixar os documentos.</p>
    <a href="http://localhost:3000/dashboard.html" class="button">Baixar documentos</a>
    <p style="margin-top: 20px; color: #00A859; font-weight: bold;">
      🎉 Obrigado por transformar seu imposto em impacto social!
    </p>
  `;

  const info = await transporter.sendMail({
    from: getFromAddress(),
    to: user.email,
    subject: `✅ Destinação confirmada - ${project.title}`,
    html: getEmailTemplate(content, org)
  });

  console.log('📧 Email de confirmação enviado:', info.messageId);
  console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
  return info;
}

// Email para admin: nova destinação pendente
export async function sendNewDonationToAdminEmail(adminEmail, user, donation, project, org = null) {
  if (!transporter) {
    console.warn('📧 Serviço de email não inicializado. Email não enviado.');
    return null;
  }

  const valor = parseFloat(donation.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const content = `
    <h2>Nova Destinação Pendente! 🔔</h2>
    <p>Uma nova destinação foi registrada e aguarda confirmação.</p>
    <div class="highlight">
      <strong>Contribuinte:</strong> ${user.name}<br>
      <strong>Email:</strong> ${user.email}<br>
      <strong>Projeto:</strong> ${project.title}<br>
      <strong>Valor:</strong> ${valor}<br>
      <strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}
    </div>
    <p>Acesse o painel administrativo para verificar o depósito e confirmar a destinação.</p>
    <a href="http://localhost:3000/admin.html" class="button">Acessar Painel Admin</a>
  `;

  const info = await transporter.sendMail({
    from: getFromAddress(),
    to: adminEmail,
    subject: `🔔 Nova destinação pendente - ${valor}`,
    html: getEmailTemplate(content, org)
  });

  console.log('📧 Email para admin enviado:', info.messageId);
  console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
  return info;
}
