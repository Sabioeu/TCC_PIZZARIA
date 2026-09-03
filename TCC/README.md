# Aurora Pizza OS

Plataforma full-stack para gestão de pizzarias: PDV, cozinha (KDS), delivery, salão, reservas, cardápio, fichas técnicas, estoque, compras, CRM, fidelidade, caixa, financeiro, auditoria e inteligência operacional.

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

## Dados e ambiente

No primeiro início, o back-end cria uma base H2 persistente em `pizza_integrador\pizza\pizza\data\aurora-v2.mv.db`, já com dados demonstrativos. O arquivo legado `aurora.mv.db`, caso exista, é preservado.

Para produção, execute com o perfil PostgreSQL e defina `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD` e `AURORA_JWT_SECRET`.

## Qualidade

```cmd
cd pizza_integrador\pizza\pizza
mvnw.cmd test

cd ..\..\..\pizza-front-end\frontend
npm test
npm run build
```

O projeto usa migrações Flyway, autenticação JWT com perfis de acesso, isolamento por unidade, WebSocket autenticado por filial e fila local de pedidos para tolerar quedas temporárias da API.

## Central comercial

O menu **Central comercial** reúne cobrança PIX por pedido (QR Code e código copia e cola), uma fila auditável de WhatsApp/CRM, preparação de NFC-e e exportação de backup operacional. Os conectores foram projetados para receber credenciais de provedores como Mercado Pago, WhatsApp Business e emissor fiscal sem expor segredos no navegador. A ativação de envio/cobrança/emissão real exige as credenciais e homologação da empresa.
