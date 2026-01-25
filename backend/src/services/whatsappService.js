// Serviço de WhatsApp para MVP
// Modo: Gera links wa.me + simulação no console

// Formatar número para WhatsApp (55 + DDD + número)
export function formatPhone(phone) {
  if (!phone) return null;
  const numbers = phone.replace(/\D/g, '');
  if (numbers.length === 11) return '55' + numbers; // Ex: 61999999999
  if (numbers.length === 13 && numbers.startsWith('55')) return numbers;
  if (numbers.length === 10) return '55' + numbers; // Sem o 9
  return null;
}

// Gerar link wa.me
export function generateWhatsAppLink(phone, message) {
  const formattedPhone = formatPhone(phone);
  if (!formattedPhone) return null;
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
}

// Log da mensagem (simulação)
function logWhatsAppMessage(phone, message, type) {
  console.log('');
  console.log('📱 ═══════════════════════════════════════════════════');
  console.log(`📱 WHATSAPP ${type.toUpperCase()}`);
  console.log('📱 ═══════════════════════════════════════════════════');
  console.log(`📱 Para: ${phone}`);
  console.log('📱 ───────────────────────────────────────────────────');
  console.log(message);
  console.log('📱 ───────────────────────────────────────────────────');
  const link = generateWhatsAppLink(phone, message);
  if (link) {
    console.log(`📱 Link: ${link}`);
  }
  console.log('📱 ═══════════════════════════════════════════════════');
  console.log('');
  return link;
}

// Mensagem de boas-vindas
export function sendWelcomeWhatsApp(phone, userName) {
  const message = `🎉 *Bem-vindo(a) ao IncentivaBR, ${userName}!*

Sua conta foi criada com sucesso!

Agora você pode:
✅ Calcular quanto pode destinar do seu IR
✅ Conhecer projetos sociais
✅ Transformar seu imposto em impacto!

Acesse: https://incentivabr.com.br

_IncentivaBR - Incentivos Fiscais Simplificados_`;

  return logWhatsAppMessage(phone, message, 'Boas-vindas');
}

// Mensagem de destinação registrada
export function sendDestinationRegisteredWhatsApp(phone, userName, valor, projeto) {
  const message = `📝 *Destinação Registrada!*

Olá, ${userName}!

Sua destinação foi registrada:
📌 *Projeto:* ${projeto}
💰 *Valor:* ${valor}
⏳ *Status:* Aguardando confirmação

*Próximo passo:*
Faça o PIX/depósito com os dados informados no sistema.

Acompanhe em: https://incentivabr.com.br/dashboard

_IncentivaBR_`;

  return logWhatsAppMessage(phone, message, 'Destinação Registrada');
}

// Mensagem de destinação confirmada
export function sendDestinationConfirmedWhatsApp(phone, userName, valor, projeto) {
  const message = `✅ *Destinação Confirmada!*

Olá, ${userName}!

Ótima notícia! Sua destinação foi confirmada:
📌 *Projeto:* ${projeto}
💰 *Valor:* ${valor}
✅ *Status:* Confirmado

📄 Seus documentos já estão disponíveis para download!

Acesse: https://incentivabr.com.br/dashboard

🎉 *Obrigado por transformar seu imposto em impacto social!*

_IncentivaBR_`;

  return logWhatsAppMessage(phone, message, 'Destinação Confirmada');
}

// Mensagem para admin - nova destinação
export function sendAdminNotificationWhatsApp(phone, userName, valor, projeto) {
  const message = `🔔 *Nova Destinação Pendente!*

📋 *Detalhes:*
👤 Contribuinte: ${userName}
📌 Projeto: ${projeto}
💰 Valor: ${valor}

Acesse o painel para confirmar:
https://incentivabr.com.br/admin

_IncentivaBR Admin_`;

  return logWhatsAppMessage(phone, message, 'Admin - Nova Destinação');
}
