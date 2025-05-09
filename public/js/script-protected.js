// Máscara para CPF
document.querySelector('[name="cpf"]').addEventListener('input', function (e) {
    let value = e.target.value.replace(/\D/g, '');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    e.target.value = value;
});

// Função para atualizar campos visíveis
function atualizarCampos() {
    const templateSelecionado = document.getElementById('selectedTemplate').value;

    const camposResidencia = document.getElementById('camposResidencia');
    const camposCarteira = document.getElementById('camposCarteira');

    camposResidencia.style.display = templateSelecionado === 'residencia' ? 'block' : 'none';
    camposCarteira.style.display = templateSelecionado === 'carteira' ? 'block' : 'none';
}

// Carrega os templates disponíveis
document.addEventListener('DOMContentLoaded', function () {
    fetch('/templates')
        .then(response => response.json())
        .then(templates => {
            const container = document.getElementById('documentOptions');
            container.innerHTML = '';

            templates.forEach(template => {
                const col = document.createElement('div');
                col.className = 'col-md-4 mb-3';

                const option = document.createElement('div');
                option.className = 'card document-option p-3 text-center';
                option.innerHTML = `
                    <h5>${template.displayName}</h5>
                    <small class="text-muted">${template.name}</small>
                `;

                option.addEventListener('click', function () {
                    // Remove a classe active de todas as opções
                    document.querySelectorAll('.document-option').forEach(el => {
                        el.classList.remove('active');
                    });

                    // Adiciona a classe active na opção selecionada
                    this.classList.add('active');

                    // Atualiza o template selecionado (em minúsculas)
                    document.getElementById('selectedTemplate').value = template.name;

                    // Atualiza o texto do botão
                    document.getElementById('generateButton').textContent = `Gerar ${template.displayName}`;

                    // Atualiza a visibilidade dos campos
                    atualizarCampos();
                });

                // Seleciona o primeiro template por padrão
                if (template.name === 'filiacao') {
                    option.classList.add('active');
                    document.getElementById('generateButton').textContent = `Gerar ${template.displayName}`;
                }

                col.appendChild(option);
                container.appendChild(col);
            });

            // Configura campos inicialmente
            atualizarCampos();
        })
        .catch(error => {
            console.error('Erro ao carregar templates:', error);
            document.getElementById('documentOptions').innerHTML = `
                <div class="col-12">
                    <div class="alert alert-danger">Erro ao carregar os templates disponíveis</div>
                </div>
            `;
        });
});

async function verificarAcesso() {
    const token = localStorage.getItem('token');
    const res = await fetch('/protected', {
        headers: { 'Authorization': 'Bearer ' + token }
    });

    if (res.ok) {
        const data = await res.json();
        document.getElementById('conteudo').innerText = data.message;
    } else {
        //alert('Acesso negado');
        window.location.href = '/unauthorized.html';
    }
}

verificarAcesso();

 // Data de hoje no formato YYYY-MM-DD
 const hoje = new Date().toISOString().split('T')[0];
 document.getElementById('data_filiacao').value = hoje;



 //<button onclick="logout()" class="btn btn-danger px-4">Sair</button>
 function logout() {
    localStorage.removeItem('token');
    window.location.href = '/';
}


// Mostra o modal
function showLogoutModal() {
    const modal = new bootstrap.Modal(document.getElementById('logoutModal'));
    modal.show();
  }
  
  // Configura o botão de confirmação
  document.getElementById('confirmLogout').addEventListener('click', function() {
    localStorage.removeItem('token');
    window.location.href = '/';
  });
  