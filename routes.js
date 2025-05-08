import express from 'express';
import path from 'path';
import jwt from 'jsonwebtoken';
import { generateDocument } from './documentService.js';
import { authToken } from './middleware/auth.js';

const router = express.Router();

const TEMPLATES = {
    filiacao: {
        name: 'filiacao',
        displayName: 'Declaração de Filiação',
        outputFilename: 'declaracao_filiacao.docx',
        templatePath: './templates/filiacao.docx'
    },
    residencia: {
        name: 'residencia',
        displayName: 'Declaração de Residencia',
        outputFilename: 'declaracao_residencia.docx',
        templatePath: './templates/residencia.docx'
    },
    carteira: {
        name: 'carteira',
        displayName: 'Carteira de Sócio (Pescador)',
        outputFilename: 'carteira_socio.pdf',
        templatePath: './templates/carteira6.pdf',
        isPdf: true
    }
};

const USERS = [{ id: 1, username: 'admin', password: 'admin' }];

router.get('/templates', (req, res) => {
    res.json(Object.values(TEMPLATES).map(t => ({
        name: t.name,
        displayName: t.displayName
    })));
});

router.post('/generate-docs', async (req, res) => {
    try {
        const { nome_completo, cpf, template } = req.body;
        if (!nome_completo || !cpf) {
            return res.status(400).send('Nome completo e CPF são obrigatórios');
        }

        const templateConfig = TEMPLATES[template.toLowerCase()] || TEMPLATES.filiacao;
        const buffer = await generateDocument(templateConfig, req.body);

        const contentType = templateConfig.isPdf
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename=${templateConfig.outputFilename}`);
        res.end(buffer);
    } catch (error) {
        console.error('Erro ao gerar documento:', error);
        res.status(500).send(`Erro ao gerar documento: ${error.message}`);
    }
});

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = USERS.find(u => u.username === username && u.password === password);
    if (!user) return res.status(401).json({ message: 'Credenciais inválidas!' });

    const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET, { expiresIn: '3h' });
    res.json({ token });
});

router.get('/protected', authToken, (req, res) => {
    res.json({ message: `Olá, ${req.user.username}. Você está autenticado!` });
});

export default router;
