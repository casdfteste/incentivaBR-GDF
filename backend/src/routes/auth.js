import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Validações
function isValidCPF(cpf) {
  // Remove caracteres não numéricos
  const cleaned = cpf.replace(/\D/g, '');
  return cleaned.length === 11 && /^\d+$/.test(cleaned);
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function cleanCPF(cpf) {
  return cpf.replace(/\D/g, '');
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { cpf, nome, email, phone, senha, jurisdiction_id, accepted_terms } = req.body;

    // Validações
    if (!cpf || !nome || !email || !senha) {
      return res.status(400).json({
        status: 'error',
        message: 'Campos obrigatórios: cpf, nome, email, senha'
      });
    }

    // Validar aceite dos termos
    if (!accepted_terms) {
      return res.status(400).json({
        status: 'error',
        message: 'Você deve aceitar a Política de Privacidade e os Termos de Uso para se cadastrar.'
      });
    }

    const cleanedCPF = cleanCPF(cpf);

    if (!isValidCPF(cleanedCPF)) {
      return res.status(400).json({
        status: 'error',
        message: 'CPF inválido. Deve conter 11 dígitos numéricos.'
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        status: 'error',
        message: 'Email inválido.'
      });
    }

    if (senha.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'Senha deve ter no mínimo 6 caracteres.'
      });
    }

    if (nome.length < 3) {
      return res.status(400).json({
        status: 'error',
        message: 'Nome deve ter no mínimo 3 caracteres.'
      });
    }

    // Verificar se CPF já existe
    const cpfExists = await pool.query(
      'SELECT id FROM users WHERE cpf = $1',
      [cleanedCPF]
    );

    if (cpfExists.rows.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'CPF já cadastrado.'
      });
    }

    // Verificar se email já existe
    const emailExists = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (emailExists.rows.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'Email já cadastrado.'
      });
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(senha, 10);

    // Inserir usuário com aceite dos termos
    const result = await pool.query(
      `INSERT INTO users (cpf, nome, email, phone, senha_hash, jurisdiction_id, accepted_terms_at, accepted_terms_version)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), '1.0')
       RETURNING id, nome, email, cpf, created_at`,
      [cleanedCPF, nome, email.toLowerCase(), phone || null, senhaHash, jurisdiction_id || null]
    );

    const user = result.rows[0];

    res.status(201).json({
      status: 'success',
      message: 'Usuário cadastrado com sucesso!',
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        cpf: user.cpf
      }
    });

  } catch (error) {
    console.error('Erro no registro:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Erro interno ao registrar usuário.'
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { cpf, email, senha } = req.body;

    // Validações
    if ((!cpf && !email) || !senha) {
      return res.status(400).json({
        status: 'error',
        message: 'Informe CPF ou email e senha.'
      });
    }

    let user;

    // Buscar por CPF ou email
    if (cpf) {
      const cleanedCPF = cleanCPF(cpf);
      const result = await pool.query(
        'SELECT id, cpf, nome, email, phone, senha_hash, total_donated, created_at FROM users WHERE cpf = $1',
        [cleanedCPF]
      );
      user = result.rows[0];
    } else {
      const result = await pool.query(
        'SELECT id, cpf, nome, email, phone, senha_hash, total_donated, created_at FROM users WHERE email = $1',
        [email.toLowerCase()]
      );
      user = result.rows[0];
    }

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Credenciais inválidas.'
      });
    }

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, user.senha_hash);

    if (!senhaValida) {
      return res.status(401).json({
        status: 'error',
        message: 'Credenciais inválidas.'
      });
    }

    // Gerar token JWT (expira em 7 dias)
    const token = jwt.sign(
      { userId: user.id, cpf: user.cpf },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      status: 'success',
      message: 'Login realizado com sucesso!',
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        cpf: user.cpf,
        total_donated: parseFloat(user.total_donated) || 0
      }
    });

  } catch (error) {
    console.error('Erro no login:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Erro interno ao fazer login.'
    });
  }
});

// GET /api/auth/me (protegido)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, cpf, nome, email, phone, email_verified, total_donated, jurisdiction_id, created_at
       FROM users WHERE id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Usuário não encontrado.'
      });
    }

    const user = result.rows[0];

    res.json({
      status: 'success',
      user: {
        id: user.id,
        cpf: user.cpf,
        nome: user.nome,
        email: user.email,
        phone: user.phone,
        email_verified: user.email_verified,
        total_donated: parseFloat(user.total_donated) || 0,
        jurisdiction_id: user.jurisdiction_id,
        created_at: user.created_at
      }
    });

  } catch (error) {
    console.error('Erro ao buscar usuário:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Erro interno ao buscar dados do usuário.'
    });
  }
});

export default router;
