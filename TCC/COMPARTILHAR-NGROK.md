# Demonstração externa

Na raiz do TCC, execute `./compartilhar.ps1 -Acao Iniciar`. Para consultar o link: `./compartilhar.ps1 -Acao Status`. Para despublicar: `./compartilhar.ps1 -Acao Parar`.

O script mantém os serviços locais pelo gerenciador projeto.ps1, compila uma cópia do frontend em .dev-runtime/demo-public com API relativa /api e sem source maps, abre um gateway apenas em 127.0.0.1:3100 e inicia um túnel HTTPS ngrok. Não expõe o servidor CRA, o banco, o código-fonte, nem a documentação Swagger. O acesso à API mantém sessão, CSRF e perfis do Spring. O gateway recusa origens externas e acrescenta Secure aos cookies transmitidos pelo túnel HTTPS. Não é necessário ampliar o CORS local ou reiniciar o backend.

Conforme solicitado, não há restrição adicional por e-mail: qualquer pessoa com o link vê o login. Compartilhe apenas com pessoas de confiança. A inspeção de corpos de requisições do ngrok foi desativada. Logs e registros ficam em .dev-runtime; não publique essa pasta.

Se faltar autenticação do ngrok, acesse o dashboard oficial da sua conta e siga a instalação/autenticação no terminal local. Nunca envie authtoken ou senha pelo chat. O script não lê nem imprime o conteúdo do arquivo de credenciais.

Use uma conta separada, preferencialmente ATENDENTE; para testes administrativos, crie/aprove o usuário e atribua o perfil pela tela de Usuários usando sua conta de administrador. A senha existente não pode ser recuperada e nenhuma conta administrativa é criada por este script.

**Os testes usam o banco atual e podem alterar pedidos, estoque e financeiro.** A máquina precisa permanecer ligada. Ao terminar, use Parar; isso não encerra os serviços locais. Depois de mudanças no frontend, pare e inicie o compartilhamento para recompilar a cópia publicada. Não é implantação de produção: não há isolamento de banco, proteção adicional de borda ou garantia de disponibilidade. Nenhum arquivo é enviado ao GitHub automaticamente.
