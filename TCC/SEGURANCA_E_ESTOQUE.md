# Segurança e consistência do estoque

## Primeiro acesso do administrador

A conta de atendente existente foi preservada. Nenhuma senha ou promoção automática foi aplicada ao banco real. A criação de um administrador separado é feita localmente, conforme solicitado.

Pare o backend antigo com Ctrl+C. No PowerShell do VS Code:

```powershell
cd pizza_integrador\pizza\pizza
.\start.ps1 -CriarAdministrador
```

Digite um e-mail diferente do atendente e uma senha com pelo menos 12 caracteres (até 72 bytes em UTF-8). A senha é solicitada sem exibição. O script procura o JDK 21, inicia o backend e passa as credenciais iniciais por variáveis do processo, não por arquivos nem argumentos da linha de comando. A aplicação só cria essa conta se ainda não houver administrador. Ela nunca sobrescreve uma conta existente.

Caso a política do PowerShell bloqueie o script, execute-o apenas nesse processo: `powershell -ExecutionPolicy Bypass -File .\start.ps1 -CriarAdministrador`. Não é necessário alterar permanentemente a política da máquina.

Depois, mantenha o frontend em execução ou inicie:

```powershell
cd pizza-front-end\frontend
node .\node_modules\react-scripts\bin\react-scripts.js start
```

Abra http://localhost:3000 e entre com o e-mail e a senha escolhidos. Nos próximos inícios do backend, use `.\start.ps1`, sem a opção de criação. Se precisar de recuperação de senha, não exclua registros nem altere hashes manualmente: ainda não foi implementado um fluxo de recuperação por e-mail.

## Acesso

- **Administrador:** operação, gestão, relatórios e usuários.
- **Gerente:** operação, gestão e relatórios; não administra usuários.
- **Atendente:** novo pedido, comandas, clientes e faturamento; não acessa dashboard gerencial, relatórios, financeiro ou cadastros de gestão. Consulta produtos e mesas para atendimento.

Permissões são verificadas no backend, além do menu. O usuário de abertura vem da sessão; o ID 1 fixo do frontend foi removido. Senhas e hashes não aparecem nas respostas JSON, inclusive em usuários relacionados a comandas.

Login usa sessão de servidor e cookie HttpOnly, com expiração por inatividade de 30 minutos. Não usa tokens em localStorage. CSRF protege operações de escrita, inclusive login e logout. O frontend consulta o token de segurança e o renova após login/logout. Troca de senha ou exclusão de conta invalida seu acesso em solicitações subsequentes; mudanças de perfil atualizam a autorização no backend. Recarregue a página para atualizar também o menu após mudar um perfil.

O administrador não pode excluir a própria conta nem retirar seu próprio acesso. O último administrador é protegido contra exclusão ou rebaixamento. O formulário foi corrigido para enviar o perfil ADMINISTRADOR, conforme o enum Java.

## Estoque e faturamento

Na tela atual de pedidos, os itens pertencem a **comandas**:

1. Abrir comanda ou adicionar itens NÃO baixa o estoque e NÃO reserva quantidades.
2. O servidor usa o preço cadastrado do produto para novos itens, em vez de confiar no preço enviado pelo navegador. Itens existentes mantêm seu preço histórico.
3. Faturar bloqueia a comanda, agrega quantidades por produto e bloqueia os saldos no banco em ordem estável.
4. A baixa e seus movimentos, o recebimento financeiro, o fechamento e a liberação da mesa são feitos na mesma transação.
5. Se faltar qualquer produto, a operação inteira é revertida. A comanda continua aberta e não há recebimento parcial.
6. Repetir o fechamento, inclusive simultaneamente, não cria outra baixa nem outro recebimento.

Administrador/gerente pode **Cancelar atendimento** na tela de comandas abertas. A mesa é liberada e a comanda permanece no banco como CANCELADA; não gera recebimento nem baixa de estoque. O endpoint DELETE legado agora cancela logicamente, sem apagar a comanda. Comanda faturada não pode ser excluída nem ter seus itens alterados pelo CRUD de itens. Estorno de venda faturada e reembolso continuam fora desta etapa.

Movimentações manuais exigem quantidade finita positiva e exatamente um produto OU insumo. Entradas/saídas de insumos agora atualizam seu saldo. Editar um movimento aplica a diferença ao saldo; excluir desfaz seu efeito, sendo recusado se produzir saldo negativo. Movimentos automáticos identificados como COMANDA/PEDIDO não podem ser editados ou excluídos isoladamente. Os relatórios mostram a origem e referência quando disponíveis.

Novos saldos iniciais de produtos/insumos e alterações do saldo de insumos geram movimentos. A unidade de um insumo existente não pode ser trocada, pois alteraria a leitura do histórico. Cadastre outro insumo para uma unidade diferente.

## Preservação e limites

- Vendas antigas não foram recalculadas, nem foram criadas baixas retroativas. Os campos novos de origem/referência são nulos nos movimentos antigos; não há tentativa de inferir sua origem.
- O esquema adiciona campos opcionais em movimentos de estoque no próximo início do backend (`ddl-auto=update`, configuração de desenvolvimento já existente). Faça backup antes de atualizar um ambiente importante.
- A API legada `/api/pedidos` tem um fluxo separado que baixa estoque ao cadastrar seus itens. Não confunda esse fluxo com as comandas da tela atual nem lance a mesma venda nos dois. Cancelamento/estorno completo dessa API e integração iFood não foram incluídos nesta etapa.
- Reservas de estoque de comandas abertas não foram implementadas. A disponibilidade é confirmada no faturamento.
- Não há ficha técnica ligando produtos a consumo automático de ingredientes; a venda de um produto não calcula consumo de farinha, queijo etc.
- Não foi implantado um histórico geral de auditoria nem migração completa dos campos monetários para BigDecimal. Permanecem melhorias futuras.

## Produção

Estas mudanças não substituem uma revisão de implantação. Para produção, usar HTTPS e `PIZZA_COOKIE_SECURE=true`, configurar `PIZZA_CORS_ORIGINS` com as origens exatas do frontend, gerenciar segredos fora do repositório, usar migrações controladas em vez de ddl-auto=update, backups testados e proteção contra tentativas repetidas de login. Utilize frontend e backend no mesmo site (idealmente proxy `/api`) para cookies; localmente, use localhost nos dois, evitando misturar localhost e 127.0.0.1.

## Testes

`PrioridadesIntegrationTest` usa banco H2 separado, recriado para testes, sem acesso ao PostgreSQL real. Verifica autenticação com BCrypt/CSRF/sessão, perfis, CORS, ausência de senha nas respostas, revogação de sessão, movimentos, insuficiência de estoque, rollback e fechamento concorrente.

```powershell
.\mvnw.cmd "-Dtest=PrioridadesIntegrationTest,RelatorioServiceTest,RelatorioControllerTest" test
```

Não execute testes de contexto antigos contra um banco de produção sem revisar sua configuração.
