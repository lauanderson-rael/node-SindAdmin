
import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { PDFDocument } from 'pdf-lib';

const app = express();
const port = 3000;

// Configurações
app.use(bodyParser.urlencoded({ extended: true }));
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
        displayName: 'Carteira de Sócio',
        outputFilename: 'carteira_socio.pdf',
        templatePath: './templates/carteira2.pdf',
        isPdf: true
    }
};

// Função para formatar a data de filiação (YYYY-MM-DD → DD/MM/YYYY)
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
        'text_2ulgj': "Mariano da Silva Costa",
        'text_8wcnl': "Maria do Amparo Barbosa",
        'text_10rxis': 'MUTIRAO',
        'text_11jvcb': 'COELHO NETO-MA', // naturalidade
        'text_14vkru': '10/09/1988',  // nasc
        'text_12npus': 'SOLTEIRO', // civil
        'text_4evix': '627', // n
        'text_18audv': '688',
        'text_5jsqr': formData.nome_completo, // nome socio
        'text_17vtnd': formData.cpf,  // cpf
        'text_15nixr': formData.rg || 'Não informado', // rg
        'text_9ci': formData.endereco || 'Não informado', // rua
        'text_19xymn': formData.data_filiacao || 'Não informada', // data_filia
        'text_7vupy': formData.data_filiacao || 'Não informada'  // data emissao
    };

    Object.entries(fields).forEach(([fieldName, value]) => {
        try {
            const field = form.getTextField(fieldName);
            field.setText(value);
        } catch (e) {
            console.warn(`Campo ${fieldName} não encontrado no PDF`);
        }
    });
    //form.flatten();
    return await pdfDoc.save();
}

// Função para gerar Documento (DOCX ou PDF)
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

    if (templateConfig.isPdf) {
        return await generatePdf(templateConfig.templatePath, templateData);
    } else {
        const content = fs.readFileSync(templateConfig.templatePath, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        });

        doc.render(templateData);
        return await doc.getZip().generate({ type: 'nodebuffer' });
    }
}

// Rotas
app.get('/', (req, res) => {
    res.sendFile(process.cwd() + '/public/index.html');
});

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

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});