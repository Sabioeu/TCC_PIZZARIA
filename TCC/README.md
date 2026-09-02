# Aurora Pizza OS

Sistema full-stack de gestão para pizzarias, reconstruído a partir da base do TCC. A aplicação reúne frente de caixa, cozinha, salão, cardápio, estoque, relacionamento, financeiro e inteligência gerencial em uma experiência responsiva.

## Módulos

- **Visão geral:** indicadores de receita, ticket médio, canais e alertas inteligentes.
- **PDV:** pedidos para salão, delivery ou retirada, catálogo filtrável e carrinho.
- **KDS:** fila de produção em tempo real com avanço de etapas.
- **Pedidos:** central omnichannel com busca, filtros e histórico.
- **Mesas:** mapa do salão e ciclo de ocupação, reserva e limpeza.
- **Cardápio:** produtos, preços, custos e margem de contribuição.
- **Estoque:** posição de insumos, níveis mínimos, validade e fornecedores.
- **Clientes:** cadastro, histórico e segmentação de fidelidade.
- **Financeiro:** fluxo de caixa, contas a pagar e receber.
- **Inteligência:** KPIs, horários de pico e ranking do cardápio.
- **Configurações:** identidade e parâmetros operacionais.

## Executar

### API

```powershell
cd pizza_integrador\pizza\pizza
.\mvnw.cmd spring-boot:run
```

A API inicia em `http://localhost:8081`. A documentação interativa fica em `http://localhost:8081/swagger-ui.html`.

O perfil padrão usa H2 em memória. Para PostgreSQL, ative o perfil `prod` e informe `DATABASE_URL`, `DATABASE_USERNAME` e `DATABASE_PASSWORD`.

### Front-end

```powershell
cd pizza-front-end\frontend
npm install
npm start
```

A interface inicia em `http://localhost:3000`. Para apontar para outro endereço da API, defina `REACT_APP_API_URL` antes de iniciar.

## Qualidade

```powershell
# Back-end
.\mvnw.cmd test

# Front-end
npm test -- --watchAll=false --runInBand
npm run build
```

O front-end mantém dados de demonstração locais quando a API está indisponível, permitindo apresentações sem dependência de infraestrutura.
