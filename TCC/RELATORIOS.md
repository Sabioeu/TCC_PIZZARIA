# Central de relatórios

Reinicie o backend e o frontend e abra **Relatórios** no menu. A consulta inicial usa o mês atual. Escolha um modelo, ajuste os filtros e clique em **Consultar**. **Limpar filtros** consulta todos os registros. Exportações PDF e CSV incluem todos os registros filtrados, não apenas a página da tela. Ao alterar os filtros, é necessário consultar novamente antes de exportar.

## Modelos

- **Entradas de estoque:** movimentos ENTRADA, por data, item, categoria e unidade. Quantidades são totalizadas por unidade, sem somar kg com unidades.
- **Saídas de estoque:** movimentos SAIDA, com os mesmos critérios.
- **Posição do estoque:** saldos atuais dos produtos e insumos. Não representa posição histórica. Produtos com saldo até 5 unidades seguem o critério de estoque baixo da tela atual. Insumos não possuem limite mínimo cadastrado. Saldo nulo aparece como não informado.
- **Financeiro:** transações de recebimento por data/hora da transação e contas PAGA por data de pagamento. Mostra recebimentos, despesas pagas e a diferença. Crédito e débito são meios de pagamento, não despesas. O resultado NÃO representa lucro, extrato bancário ou confirmação de cobrança. Conta paga sem data de pagamento não entra na soma e deve ser conferida no relatório de contas a pagar.
- **Contas a pagar:** período por vencimento, busca na descrição/fornecedor e situação. Vencidas são calculadas na consulta, sem atualizar a tabela. O total vencido faz parte do total em aberto, não deve ser somado novamente.

## Modelo editável

O modelo compartilhado está em `pizza_integrador/pizza/pizza/src/main/resources/relatorios/gerencial.jrxml`, editável no Jaspersoft Studio. O backend compila esse arquivo com a mesma versão JasperReports da aplicação, mantém em memória e preenche com os dados da consulta. Reinicie o backend após editar o modelo. Não é necessário compilar manualmente um arquivo .jasper. O antigo `relatorio_final.jasper` foi preservado, mas o endpoint legado agora usa o modelo novo.

O módulo não altera os fluxos de vendas, movimentação de estoque ou pagamentos. Relatórios refletem somente o que foi registrado. Eles não corrigem automaticamente diferenças entre histórico de movimentos e saldo cadastrado, nem criam movimentos ausentes de outros fluxos.

## API

`GET /api/relatorios/{nome}/dados` retorna título, filtros aplicados, observação, colunas, linhas e indicadores.

`GET /api/relatorios/{nome}?formato=pdf` baixa PDF. Use `formato=csv` para planilha (UTF-8 com BOM, separador ponto e vírgula, proteção de células com início de fórmula).

Nomes: `estoque-entradas`, `estoque-saidas`, `estoque-posicao`, `financeiro`, `contas-a-pagar`. Alias legado: `relatorio_final` (movimentos de ambos os tipos).

Parâmetros opcionais: `inicio` e `fim` em YYYY-MM-DD, `busca`; `status` em PENDENTE, VENCIDA ou PAGA somente para contas. Datas são inclusivas. Posição atual ignora o período. Filtros financeiros de busca são aplicados tanto aos recebimentos quanto às despesas; os totais correspondem aos registros encontrados.

## Verificação

Backend: `./mvnw.cmd -Dtest=RelatorioServiceTest test`.

Frontend: `npm test -- --watch=false --runInBand` e `npm run build`.

Os testes do backend usam dados fictícios e geram PDFs vazios e paginados em `target/relatorios-qa`, além de um `gerencial.jasper` de verificação. Nenhum dado real é alterado.

Antes de utilizar em produção, conferir uma amostra de dados reais com os registros originais. Os relatórios agora exigem login com perfil ADMINISTRADOR ou GERENTE; consulte SEGURANCA_E_ESTOQUE.md para o primeiro acesso e limites de implantação. As consultas atuais carregam os registros via repositórios: para bases grandes, evoluir para filtros e paginação no banco.
