import fs from 'fs';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { PDFDocument } from 'pdf-lib';

function formatarDataFiliacao(dataISO) {
    if (!dataISO) return 'Não informada';
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
}

export async function generatePdf(templatePath, formData) {
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

export async function generateDocument(templateConfig, formData) {
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

    if (templateConfig.name === 'residencia') {
        templateData.sexo = formData.sexo || 'Não informado';
        templateData.estado_civil = formData.estado_civil || 'Não informado';
        templateData.nacionalidade = formData.sexo === 'F' ? 'BRASILEIRA' : 'BRASILEIRO';
    }

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
        doc.render(templateData);
        return await doc.getZip().generate({ type: 'nodebuffer' });
    }
}
