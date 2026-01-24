import PDFDocument from 'pdfkit';
import crypto from 'crypto';

/**
 * Gera codigo de verificacao unico para o comprovante
 */
function gerarCodigoVerificacao(donationId, createdAt) {
  const data = `${donationId}-${createdAt}-incentivabr`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16).toUpperCase();
}

/**
 * Formata valor em moeda brasileira
 */
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

/**
 * Formata data no padrao brasileiro
 */
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Formata data e hora no padrao brasileiro
 */
function formatDateTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Mascara CPF para exibicao parcial
 */
function maskCPF(cpf) {
  if (!cpf || cpf.length !== 11) return cpf;
  return `***.${cpf.substring(3, 6)}.${cpf.substring(6, 9)}-**`;
}

/**
 * Formata CPF com pontuacao
 */
function formatCPF(cpf) {
  if (!cpf || cpf.length !== 11) return cpf;
  return `${cpf.substring(0, 3)}.${cpf.substring(3, 6)}.${cpf.substring(6, 9)}-${cpf.substring(9, 11)}`;
}

/**
 * Gera comprovante de destinacao em PDF
 * @param {Object} donation - Dados da doacao
 * @param {Object} user - Dados do contribuinte
 * @param {Object} project - Dados do projeto
 * @param {Object} fund - Dados do fundo
 * @returns {PDFDocument} - Stream do PDF
 */
export function gerarComprovante(donation, user, project, fund) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: {
      Title: 'Comprovante de Destinacao - IncentivaBR',
      Author: 'IncentivaBR',
      Subject: 'Comprovante de Destinacao de Incentivo Fiscal',
      Keywords: 'incentivo, fiscal, destinacao, comprovante'
    }
  });

  const codigoVerificacao = gerarCodigoVerificacao(donation.id, donation.created_at);
  const dataEmissao = new Date().toLocaleString('pt-BR');

  // Cores
  const primaryColor = '#1E3A5F';
  const secondaryColor = '#F7941D';
  const textColor = '#333333';
  const mutedColor = '#666666';

  // ===== CABECALHO =====
  doc.fontSize(24)
     .fillColor(primaryColor)
     .text('IncentivaBR', { align: 'center' });

  doc.moveDown(0.3);
  doc.fontSize(10)
     .fillColor(mutedColor)
     .text('Transforme seu imposto em impacto social', { align: 'center' });

  doc.moveDown(1);

  // Linha separadora
  doc.strokeColor(secondaryColor)
     .lineWidth(2)
     .moveTo(50, doc.y)
     .lineTo(545, doc.y)
     .stroke();

  doc.moveDown(1);

  // ===== TITULO =====
  doc.fontSize(16)
     .fillColor(primaryColor)
     .text('COMPROVANTE DE DESTINACAO', { align: 'center' });

  doc.fontSize(14)
     .text('DE INCENTIVO FISCAL', { align: 'center' });

  doc.moveDown(0.5);

  // Aviso sem valor fiscal
  doc.fontSize(10)
     .fillColor('#c0392b')
     .text('(Documento sem valor fiscal - apenas para controle)', { align: 'center' });

  doc.moveDown(1.5);

  // ===== DADOS DO CONTRIBUINTE =====
  doc.fontSize(12)
     .fillColor(primaryColor)
     .text('DADOS DO CONTRIBUINTE', { underline: true });

  doc.moveDown(0.5);
  doc.fontSize(10)
     .fillColor(textColor);

  const cpfExibicao = maskCPF(user.cpf);

  doc.text(`Nome: ${user.nome}`);
  doc.text(`CPF: ${cpfExibicao}`);
  if (user.email) {
    doc.text(`Email: ${user.email}`);
  }

  doc.moveDown(1);

  // ===== DADOS DA DESTINACAO =====
  doc.fontSize(12)
     .fillColor(primaryColor)
     .text('DADOS DA DESTINACAO', { underline: true });

  doc.moveDown(0.5);
  doc.fontSize(10)
     .fillColor(textColor);

  const percentual = donation.ir_total > 0
    ? ((donation.donation_amount / donation.ir_total) * 100).toFixed(2)
    : '0.00';

  doc.text(`Valor Destinado: ${formatCurrency(donation.donation_amount)}`);
  doc.text(`IR Total Declarado: ${formatCurrency(donation.ir_total)}`);
  doc.text(`Percentual do IR: ${percentual}%`);
  doc.text(`Ano-Calendario: ${donation.fiscal_year}`);
  doc.text(`Data da Destinacao: ${formatDateTime(donation.created_at)}`);
  doc.text(`Data da Confirmacao: ${donation.confirmed_at ? formatDateTime(donation.confirmed_at) : 'N/A'}`);

  doc.moveDown(1);

  // ===== DADOS DO PROJETO =====
  if (project && project.title) {
    doc.fontSize(12)
       .fillColor(primaryColor)
       .text('PROJETO BENEFICIADO', { underline: true });

    doc.moveDown(0.5);
    doc.fontSize(10)
       .fillColor(textColor);

    doc.text(`Projeto: ${project.title}`);
    if (project.code) {
      doc.text(`Codigo: ${project.code}`);
    }
  }

  doc.moveDown(1);

  // ===== DADOS DO FUNDO =====
  doc.fontSize(12)
     .fillColor(primaryColor)
     .text('FUNDO DESTINATARIO', { underline: true });

  doc.moveDown(0.5);
  doc.fontSize(10)
     .fillColor(textColor);

  doc.text(`Fundo: ${fund.name || 'N/A'}`);
  if (fund.cnpj) {
    doc.text(`CNPJ: ${fund.cnpj}`);
  }
  if (fund.bank_code) {
    doc.text(`Dados Bancarios: Banco ${fund.bank_code} | Ag: ${fund.agency} | CC: ${fund.account}`);
  }

  // Base legal
  doc.moveDown(0.5);
  doc.fontSize(9)
     .fillColor(mutedColor);

  if (fund.code === 'FDCA') {
    doc.text('Base Legal: Art. 260 do ECA (Lei 8.069/90) - Deducao de ate 3% do IR');
  } else if (fund.code === 'FDI') {
    doc.text('Base Legal: Art. 3º da Lei 12.213/10 - Deducao de ate 3% do IR');
  } else {
    doc.text('Base Legal: Legislacao de incentivo fiscal vigente');
  }

  doc.moveDown(2);

  // ===== CODIGO DE VERIFICACAO =====
  doc.rect(50, doc.y, 495, 60)
     .fillAndStroke('#f5f5f5', '#ddd');

  doc.moveDown(0.3);
  doc.fontSize(10)
     .fillColor(primaryColor)
     .text('CODIGO DE VERIFICACAO', { align: 'center' });

  doc.moveDown(0.3);
  doc.fontSize(14)
     .fillColor(textColor)
     .text(codigoVerificacao, { align: 'center', characterSpacing: 2 });

  doc.moveDown(2);

  // ===== AVISO IMPORTANTE =====
  doc.moveDown(1);
  doc.rect(50, doc.y, 495, 70)
     .fillAndStroke('#fff3cd', '#ffc107');

  doc.moveDown(0.3);
  doc.fontSize(10)
     .fillColor('#856404')
     .text('AVISO IMPORTANTE', { align: 'center' });

  doc.moveDown(0.3);
  doc.fontSize(9)
     .text('Este comprovante e apenas para seu controle pessoal e NAO possui valor fiscal.', { align: 'center' });
  doc.text('Para fins de declaracao do Imposto de Renda, utilize o RECIBO OFICIAL', { align: 'center' });
  doc.text('emitido pelo Fundo, disponivel para download apos confirmacao do deposito.', { align: 'center' });

  // ===== RODAPE =====
  doc.moveDown(3);
  doc.fontSize(8)
     .fillColor(mutedColor)
     .text(`Documento emitido em: ${dataEmissao}`, { align: 'center' });

  doc.text(`ID da Destinacao: ${donation.id}`, { align: 'center' });

  doc.moveDown(1);
  doc.fontSize(8)
     .text('IncentivaBR - Plataforma de Destinacao de Incentivo Fiscal', { align: 'center' });
  doc.text('www.incentivabr.com.br', { align: 'center' });

  return doc;
}

export default { gerarComprovante };
