import * as emailService from './emailService.js';
import * as whatsappService from './whatsappService.js';

// Notificar boas-vindas (email + whatsapp)
export async function notifyWelcome(user) {
  const results = { email: null, whatsapp: null };

  // Email
  try {
    results.email = await emailService.sendWelcomeEmail(user);
  } catch (err) {
    console.error('❌ Erro email boas-vindas:', err.message);
  }

  // WhatsApp (se tiver telefone)
  if (user.phone) {
    results.whatsapp = whatsappService.sendWelcomeWhatsApp(user.phone, user.name);
  }

  return results;
}

// Notificar destinação registrada
export async function notifyDestinationRegistered(user, donation, project, org = null) {
  const results = { email: null, whatsapp: null };
  const valor = `R$ ${parseFloat(donation.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  // Email
  try {
    results.email = await emailService.sendDestinationRegisteredEmail(user, donation, project, org);
  } catch (err) {
    console.error('❌ Erro email destinação:', err.message);
  }

  // WhatsApp
  if (user.phone) {
    results.whatsapp = whatsappService.sendDestinationRegisteredWhatsApp(user.phone, user.name, valor, project.title);
  }

  return results;
}

// Notificar destinação confirmada
export async function notifyDestinationConfirmed(user, donation, project, org = null) {
  const results = { email: null, whatsapp: null };
  const valor = `R$ ${parseFloat(donation.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  // Email
  try {
    results.email = await emailService.sendDestinationConfirmedEmail(user, donation, project, org);
  } catch (err) {
    console.error('❌ Erro email confirmação:', err.message);
  }

  // WhatsApp
  if (user.phone) {
    results.whatsapp = whatsappService.sendDestinationConfirmedWhatsApp(user.phone, user.name, valor, project.title);
  }

  return results;
}

// Notificar admin sobre nova destinação
export async function notifyAdminNewDonation(adminEmail, adminPhone, user, donation, project, org = null) {
  const results = { email: null, whatsapp: null };
  const valor = `R$ ${parseFloat(donation.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  // Email
  if (adminEmail) {
    try {
      results.email = await emailService.sendNewDonationToAdminEmail(adminEmail, user, donation, project, org);
    } catch (err) {
      console.error('❌ Erro email admin:', err.message);
    }
  }

  // WhatsApp
  if (adminPhone) {
    results.whatsapp = whatsappService.sendAdminNotificationWhatsApp(adminPhone, user.name, valor, project.title);
  }

  return results;
}
