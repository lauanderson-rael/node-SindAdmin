
import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';

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
    }
};

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(process.cwd() + '/public/index.html');
});

// Função para formatar a data de filiação (YYYY-MM-DD → DD/MM/YYYY)
function formatarDataFiliacao(dataISO) {
    if (!dataISO) return 'Não informada';
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
}

function generateDocument(templateConfig, formData) {
    // Carrega o template
    const content = fs.readFileSync(templateConfig.templatePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
    });

    // Dados base (comuns a todos templates)
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
        }).replace(/ de /g, ' de '),
    };

    //  campos específicos para residência
    if (templateConfig.name === 'residencia') {
        templateData.sexo = formData.sexo || 'Não informado';
        templateData.estado_civil = formData.estado_civil || 'Não informado';
        templateData.nacionalidade = formData.sexo === 'F' ? 'BRASILEIRA' : 'BRASILEIRO';
    }

    // Preenche o template
    doc.render(templateData);
    return doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
    });
}


// Rota para listar templates disponíveis (opcional, para frontend)
app.get('/templates', (req, res) => {
    res.json(Object.values(TEMPLATES).map(t => ({
        name: t.name,
        displayName: t.displayName
    })));
});


// Rota para gerar documento
app.post('/generate-docs', (req, res) => {
    try {
        const { nome_completo, cpf, template } = req.body;
        if (!nome_completo || !cpf) {
            return res.status(400).send('Nome completo e CPF são obrigatórios');
        }

        // Verifica se o template solicitado existe
        const templateConfig = TEMPLATES[template.toLowerCase()] || TEMPLATES.filiacao;
        const buffer = generateDocument(templateConfig, req.body);
        // Configura headers para download
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=${templateConfig.outputFilename}`
        );
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        );
        // Envia o arquivo
        res.send(buffer);
    } catch (error) {
        console.error('Erro ao gerar documento:', error);
        res.status(500).send('Erro ao gerar documento');
    }
});


app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});