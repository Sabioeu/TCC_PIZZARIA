# Sistema de gestão de pizzaria

Versão do TCC desenvolvida localmente: React, Java/Spring Boot e PostgreSQL.

## Funcionalidades

- Dashboard, pedidos presenciais, delivery, retirada, comandas e mesas.
- Clientes, produtos, insumos, fornecedores e usuários.
- Estoque: entradas, saídas e posição atual, com relatórios PDF e CSV.
- Financeiro, contas a pagar e relatórios.
- Login por sessão, senhas BCrypt, administrador, gerente e atendente.
- Cadastro público de atendentes com confirmação de senha e aprovação administrativa.
- Faturamento de comandas com baixa de estoque e recebimento transacionais.
- Fichas técnicas com consumo de ingredientes, reserva lógica de estoque e validação ao abrir pedidos.
- Numeração curta e diária de comandas, preservando IDs e referências por data no histórico.
- Interface com componentes Radix UI, listas pesquisáveis, formulários em painéis e identidade visual de pizza.

Delivery e retirada são modalidades internas disponíveis. A integração com iFood e pagamentos externos ainda não está implementada. Novas contas de atendente precisam de aprovação; as permissões também são verificadas no backend.

## Requisitos

Java 21, Node.js (testado com 22), npm e PostgreSQL. Crie um banco vazio `pizzaria_db`. Não use o banco da versão Aurora anterior: o modelo de dados é diferente e não há migração automática entre versões.

## Backend no PowerShell

```powershell
cd pizza_integrador\pizza\pizza
$env:DATABASE_USERNAME = 'postgres'
$credencialBanco = Read-Host 'Senha do PostgreSQL' -AsSecureString
$env:DATABASE_PASSWORD = [System.Net.NetworkCredential]::new('', $credencialBanco).Password
.\start.ps1 -CriarAdministrador
```

O administrador inicial só é criado se não existir outro. Escolha e-mail diferente dos atendentes e senha de pelo menos 12 caracteres. Nas próximas execuções configure as variáveis do banco e execute `.\start.ps1`.

API: `http://localhost:8080`. `DATABASE_URL` permite escolher outro banco PostgreSQL. Não publique credenciais. Arquivos `.env` não são carregados automaticamente pelo Spring ou pelo script.

## Frontend em outro terminal

```powershell
cd pizza-front-end\frontend
npm ci
npm start
```

Interface: `http://localhost:3000`. API padrão: `http://localhost:8080/api`. Para mudar, configure `REACT_APP_API_URL` antes de iniciar/compilar. Outras origens além de localhost/127.0.0.1 na porta 3000 exigem `PIZZA_CORS_ORIGINS`, separadas por vírgula.

## Testes

Na pasta do backend (H2 temporário, sem alterar o PostgreSQL):

```powershell
.\mvnw.cmd test
```

Na pasta do frontend:

```powershell
npm test -- --watchAll=false --runInBand
npm run build
```

## Documentação e limites

Veja [Relatórios](RELATORIOS.md), [Segurança e estoque](SEGURANCA_E_ESTOQUE.md), [Fichas técnicas](FICHAS-TECNICAS-E-ESTOQUE.md), [Numeração diária](NUMERACAO-DIARIA-COMANDAS.md) e [Execução automática](EXECUCAO_AUTOMATICA.md). Swagger exige administrador. Em desenvolvimento o esquema é atualizado automaticamente; produção requer migrações planejadas, HTTPS, backups e proteção contra abuso. Esta versão não fornece configuração Docker compatível.

## Demonstração externa e serviços locais

Na pasta TCC, `./projeto.ps1 -Acao Iniciar` gerencia os serviços em segundo plano no Windows. Configure as variáveis de ambiente do banco antes de executá-lo. Use `-Acao Status`, `-Acao Reiniciar` ou `-Acao Parar` para gerenciamento. Não são incluídos banco de dados nem credenciais.

O [compartilhamento ngrok](COMPARTILHAR-NGROK.md) é opcional: após autenticar o ngrok localmente, execute `./compartilhar.ps1 -Acao Iniciar`. Frontend compilado e API ficam no mesmo endereço, mantendo sessão, CSRF e perfis. `./compartilhar.ps1 -Acao Parar` encerra o túnel. Não há restrição adicional por e-mail; o login continua obrigatório. O link usa seu banco atual e não representa uma implantação de produção. Logs e builds de demonstração ficam em .dev-runtime, ignorada pelo Git.

A versão anterior permanece recuperável no histórico Git, commit `dd0b0bc`.
