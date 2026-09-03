# Aurora Pizza OS

Plataforma full-stack para gestão de pizzarias: PDV, cozinha (KDS), delivery, salão, reservas, cardápio, fichas técnicas, estoque, compras, CRM, fidelidade, caixa, financeiro, jornada da equipe, avaliações verificadas, LGPD, auditoria e inteligência operacional.

## Requisitos

- Java 21
- Node.js 20 ou superior
- npm

## Como executar no Windows (CMD)

Abra **dois** terminais na pasta `TCC`.

### Terminal 1 — API

```cmd
cd pizza_integrador\pizza\pizza
mvnw.cmd spring-boot:run
```

A API ficará em `http://localhost:8081` e a documentação Swagger em `http://localhost:8081/swagger-ui.html`.

### Terminal 2 — interface

```cmd
cd pizza-front-end\frontend
npm install
npm start
```

Abra `http://localhost:3000` no navegador.

> Se a porta 8081 ou 3000 já estiver ocupada, encerre o processo anterior antes de iniciar novamente. A interface continua em modo demonstração se a API estiver desligada.

## Acesso de demonstração

| Perfil | E-mail | Senha |
| --- | --- | --- |
| Administrador | `admin@aurora.pizza` | `Aurora@2026` |
| Gerente | `gerente@aurora.pizza` | `Aurora@2026` |
| Cozinha | `cozinha@aurora.pizza` | `Aurora@2026` |
| Caixa | `caixa@aurora.pizza` | `Aurora@2026` |
| Entregador | `entregador@aurora.pizza` | `Aurora@2026` |

## Dados e ambiente

No primeiro início, o back-end cria uma base H2 persistente em `pizza_integrador\pizza\pizza\data\aurora-v2.mv.db`, já com dados demonstrativos. O arquivo legado `aurora.mv.db`, caso exista, é preservado.

Para produção, execute com o perfil PostgreSQL e defina `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD` e `AURORA_JWT_SECRET`.

## Execução com Docker e PostgreSQL

Copie `.env.example` para `.env` e substitua todas as senhas/chaves de exemplo. Em seguida:

```powershell
docker compose up --build -d
```

O Aurora ficará disponível em `http://localhost:8080`. O Nginx entrega a interface e encaminha API/WebSocket para o backend; o PostgreSQL usa volume persistente. Em um servidor público, coloque um proxy TLS/HTTPS ou serviço gerenciado na frente da porta configurada.

## Qualidade

```cmd
cd pizza_integrador\pizza\pizza
mvnw.cmd test

cd ..\..\..\pizza-front-end\frontend
npm test
npm run build
```

O projeto usa migrações Flyway, autenticação JWT com perfis de acesso, isolamento por unidade, WebSocket autenticado por filial, CI no GitHub e fila local de pedidos para tolerar quedas temporárias da API.

## Novos fluxos operacionais

- **Minha jornada:** qualquer colaborador registra entrada e saída; administradores e gerentes acompanham o histórico da unidade.
- **Minhas entregas:** o entregador assume o pedido, abre a rota e confirma a entrega sem disputar o mesmo pedido com outro usuário.
- **Experiência & qualidade:** gera link de avaliação por pedido concluído e consolida nota média e comentários.
- **Privacidade & LGPD:** administrador exporta os dados de um titular e pode anonimizá-los, preservando registros financeiros necessários.
- **Impressão automática:** habilite `Imprimir comanda` em Configurações → Pedidos e taxas.

## Central comercial

O menu **Central comercial** reúne cobrança PIX por pedido (QR Code e código copia e cola), uma fila auditável de WhatsApp/CRM, preparação de NFC-e e exportação de backup operacional. Os conectores foram projetados para receber credenciais de provedores como Mercado Pago, WhatsApp Business e emissor fiscal sem expor segredos no navegador. A ativação de envio/cobrança/emissão real exige as credenciais e homologação da empresa.

### Dependências externas para produção

- Meta Business verificada, token e `Phone Number ID` para WhatsApp.
- Token e segredo de webhook do gateway selecionado.
- Certificado A1 e token do provedor de NFC-e.
- Domínio, HTTPS e serviço de hospedagem.
- Bucket e credenciais com privilégio mínimo para backup em nuvem.

Nunca coloque essas credenciais em arquivos versionados ou no frontend. Use variáveis de ambiente/secret manager do ambiente de hospedagem.
