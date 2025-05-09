
function login() {
  const username = document.getElementById("user").value;
  const password = document.getElementById("pass").value;

  fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  .then(response => response.json())
  .then(data => {
    const msgDiv = document.getElementById("mensagem");

    if (data.token) {
      localStorage.setItem("token", data.token);

      msgDiv.innerHTML = `
        <div class="alert alert-success alert-dismissible fade show" role="alert">
          <strong>Sucesso!</strong> Login realizado com sucesso.
          <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
        </div>
      `;

      setTimeout(() => {
        window.location.href = "protected.html";
      }, 1500);
    } else {
      msgDiv.innerHTML = `
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
          <strong>Erro!</strong> Credenciais inválidas.
          <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
        </div>
      `;
    }
  })
  .catch(error => {
    console.error('Erro:', error);
  });
}

