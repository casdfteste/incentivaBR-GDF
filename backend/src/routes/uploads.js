import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pool from '../../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Criar pasta de uploads se não existir
const uploadDir = path.join(__dirname, '../../uploads/receipts');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuração do multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('Apenas JPG, PNG e PDF são permitidos'));
  }
});

// POST /api/uploads/receipt/:donationId - Upload de comprovante
router.post('/receipt/:donationId', authenticateToken, upload.single('receipt'), async (req, res) => {
  try {
    const { donationId } = req.params;
    const userId = req.user.userId;

    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'Nenhum arquivo enviado' });
    }

    // Verificar se a doação existe e pertence ao usuário
    const donationResult = await pool.query(
      'SELECT * FROM donations WHERE id = $1 AND user_id = $2',
      [donationId, userId]
    );

    if (donationResult.rows.length === 0) {
      // Remover arquivo se doação não encontrada
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ status: 'error', message: 'Doação não encontrada' });
    }

    const receiptUrl = `/uploads/receipts/${req.file.filename}`;

    // Atualizar doação com URL do comprovante
    await pool.query(`
      UPDATE donations
      SET receipt_url = $1, receipt_filename = $2, status = 'awaiting_confirmation'
      WHERE id = $3
    `, [receiptUrl, req.file.originalname, donationId]);

    console.log('Comprovante salvo:', receiptUrl);

    res.json({
      status: 'success',
      message: 'Comprovante enviado com sucesso',
      receipt_url: receiptUrl
    });

  } catch (error) {
    console.error('Erro no upload:', error);
    // Remover arquivo em caso de erro
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(500).json({ status: 'error', message: 'Erro ao enviar comprovante' });
  }
});

// GET /api/uploads/receipt/:donationId - Visualizar comprovante
router.get('/receipt/:donationId', authenticateToken, async (req, res) => {
  try {
    const { donationId } = req.params;
    const userId = req.user.userId;

    const result = await pool.query(
      'SELECT receipt_url, receipt_filename FROM donations WHERE id = $1 AND user_id = $2',
      [donationId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Doação não encontrada' });
    }

    const donation = result.rows[0];
    if (!donation.receipt_url) {
      return res.status(404).json({ status: 'error', message: 'Comprovante não encontrado' });
    }

    res.json({
      status: 'success',
      receipt_url: donation.receipt_url,
      receipt_filename: donation.receipt_filename
    });

  } catch (error) {
    console.error('Erro ao buscar comprovante:', error);
    res.status(500).json({ status: 'error', message: 'Erro ao buscar comprovante' });
  }
});

export default router;
