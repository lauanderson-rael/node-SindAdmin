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

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(process.cwd() + '/public/index.html');
});

// Rota para gerar documento
app.post('/generate-doc', (req, res) => {
    try {
        const { nome, email, telefone, endereco, mensagem } = req.body;

        // Validação básica
        if (!nome || !email) {
            return res.status(400).send('Nome e email são obrigatórios');
        }

        // Carrega o template
        const content = fs.readFileSync('./templates/template.docx', 'binary');
        const zip = new PizZip(content);
        
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        });

        // Preenche o template
        doc.render({
            nome: nome,
            email: email,
            telefone: telefone || 'Não informado',
            endereco: endereco || 'Não informado',
            mensagem: mensagem || 'Nenhuma mensagem adicional',
            data: new Date().toLocaleDateString('pt-BR'),
        });

        // Gera o buffer
        const buffer = doc.getZip().generate({
            type: 'nodebuffer',
            compression: 'DEFLATE',
        });

        // Configura headers para download
        res.setHeader(
            'Content-Disposition',
            'attachment; filename=documento_preenchido.docx'
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

// Inicia o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});