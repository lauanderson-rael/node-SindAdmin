// Função de login
function login() {
   const username = document.getElementById("user").value;
   const password = document.getElementById("pass").value;

   fetch('http://localhost:3000/login', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
     },
     body: JSON.stringify({ username, password })
   })
   .then(response => response.json())
   .then(data => {
     if (data.token) {
       localStorage.setItem("token", data.token);  // Armazena o token no localStorage
       alert("Login realizado com sucesso!");
       window.location.href = "protected.html";  // Redireciona para a página protegida
     } else {
       alert("Credenciais inválidas!");
     }
   })
   .catch(error => {
     console.error('Erro:', error);
   });
 }

 // Função para acessar a rota protegida
 function rotaProtegida() {
   const token = localStorage.getItem("token");  // Recupera o token do localStorage

   if (!token) {
     alert("Você precisa estar logado!");
     return;
   }

   fetch('http://localhost:3000/protected', {
     method: 'GET',
     headers: {
       'Authorization': `Bearer ${token}`  // Envia o token no cabeçalho
     }
   })
   .then(response => response.json())
   .then(data => {
     document.getElementById("saida").textContent = JSON.stringify(data, null, 2);  // Exibe a resposta
   })
   .catch(error => {
     console.error('Erro:', error);
   });
 }
