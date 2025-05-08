
import express from 'express';
import fs from 'fs';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { PDFDocument } from 'pdf-lib';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { authToken } from './middleware/auth.js';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERS = [{ id: 1, username: 'admin', password: 'admin000' }];

// Configurações
const app = express();
app.use(express.json()); //new
const port = 3000;
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/templates', express.static('templates'));

// Definição dos templates disponíveis
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

function formatarDataFiliacao(dataISO) {
    if (!dataISO) return 'Não informada';
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
}

// Função para gerar PDF
async function generatePdf(templatePath, formData) {
    const pdfBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = {
        'mae': formData.mae,
        'rg': formData.rg,
        'cpf': formData.cpf,
        'n': formData.numero || 'Não informado',
        'emissao': formData.data_filiacao || 'Não informada',
        'rua': formData.endereco || 'Não informado',
        'data': formData.data_filiacao || 'Não informada',
        'bairro': formData.bairro || 'Não informado',
        'n2': formData.numero || 'Não informado',
        'pai': formData.pai,
        'nome': formData.nome_completo,
        'natu': formData.naturalidade || 'Não informado',

        'nasc': formData.nasc,
        'estadocv': formData.estadocivil2 || 'Não informado',
    };

    Object.entries(fields).forEach(([fieldName, value]) => {
        try {
            const field = form.getTextField(fieldName);
            field.setText(value);

        } catch (e) {
            console.warn(`Campo ${fieldName} não encontrado no PDF`);
        }
    });
    return await pdfDoc.save();
}

async function generateDocument(templateConfig, formData) {
    // Dados comuns a todos templates
    const templateData = {
        nome_completo: formData.nome_completo,
        cpf: formData.cpf,
        rg: formData.rg || 'Não informado',
        endereco: formData.endereco || 'Não informado',
        bairro: formData.bairro || 'Não informado',
        data_filiacao: formatarDataFiliacao(formData.data_filiacao),
        data_emissao: new Date().toLocaleDateString('pt-BR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        })
    };

    // Campos específicos para residência
    if (templateConfig.name === 'residencia') {
        templateData.sexo = formData.sexo || 'Não informado';
        templateData.estado_civil = formData.estado_civil || 'Não informado';
        templateData.nacionalidade = formData.sexo === 'F' ? 'BRASILEIRA' : 'BRASILEIRO';
    }

    // Campos específicos para Carteira de Sócio
    if (templateConfig.name === 'carteira') {
        templateData.mae = formData.mae || 'Não informada';
        templateData.pai = formData.pai || 'Não informado';
        templateData.naturalidade = formData.naturalidade || 'Não informada';
        templateData.numero = formData.numero || 'Não informado';
        templateData.bairro = formData.bairro || 'Não informado';
       templateData.estadocivil2 = formData.estado_civil2 || 'Não informado';
       templateData.nasc = formatarDataFiliacao(formData.data_nasc) || 'Não informada';
    }

    if (templateConfig.isPdf) {
        return await generatePdf(templateConfig.templatePath, templateData);
    } else {
        const content = fs.readFileSync(templateConfig.templatePath, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        });
        //console.log('Dados enviados ao template:', templateData);
        doc.render(templateData);
        return await doc.getZip().generate({ type: 'nodebuffer' });
    }
}

app.get('/templates', (req, res) => {
    res.json(Object.values(TEMPLATES).map(t => ({
        name: t.name,
        displayName: t.displayName
    })));
});

app.post('/generate-docs', async (req, res) => {
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


// -----------------------------


// rota de login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = USERS.find(u => u.username === username && u.password === password);

    const JWT_SECRET = 'your_jwt_secret'
    if (!user) return res.status(401).json({ message: 'Credenciais inválidas!' });
    const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET, { expiresIn: '3h' });
    res.json({ token });
  });

  // rota protegida
  app.get('/protected', authToken, (req, res) => {
    console.log(req.user);
    res.json({ message: `Olá, ${req.user.username}. Você está autenticado!` });
  });

  // rota da página de login
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
  });



app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
