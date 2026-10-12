# Fichas técnicas e fluxo de vendas

## O que foi implementado

A primeira etapa da evolução comercial consolida as vendas em `/api/comandas`
e acrescenta o controle de produtos preparados por ingredientes. Não é uma
integração com iFood nem um módulo de cobrança online.

- Produtos sem ficha ativa continuam usando o estoque de unidades do próprio produto.
- Produtos com ficha ativa usam a composição cadastrada para uma unidade.
- Ao abrir ou adicionar itens, o backend valida o carrinho inteiro e reserva os
  ingredientes, incluindo ingredientes compartilhados entre pizzas diferentes.
- A reserva é lógica: o saldo físico só diminui no faturamento. Cancelar o
  atendimento ou remover/reduzir itens libera a reserva correspondente.
- Faturar registra saídas de insumos com origem `COMANDA` e referência ao
  atendimento, além do recebimento já existente. Não baixa o produto e os
  ingredientes duas vezes para a mesma venda.
- Cada item guarda uma cópia da composição utilizada. Alterações futuras da
  ficha não mudam o consumo de vendas anteriores.
- A ficha e o modo de estoque não podem ser alterados enquanto o produto
  estiver em comandas abertas. Administradores e gerentes podem configurá-los;
  atendentes consultam a disponibilidade e usam o fluxo normal de atendimento.
- Reduções manuais do saldo de insumos também respeitam as reservas.

## Como experimentar

1. Em **Insumos**, cadastre ou confira os ingredientes reais, a unidade e o saldo
   físico. Reposição pode ser feita editando o saldo; a diferença gera entrada
   ou saída no histórico. Não altere a unidade de um cadastro existente.
2. Em **Produtos**, clique em **Ficha técnica** na pizza desejada.
3. Selecione **Preparado por ingredientes** e informe a composição de uma
   unidade, sem repetir o mesmo insumo. Salve.
4. Em **Estoque**, confira a capacidade livre de preparo. Ela não é estoque
   físico da pizza nem pode ser somada à capacidade de outra pizza que usa os
   mesmos ingredientes.
5. Crie um pedido presencial, delivery ou retirada. Um conjunto que excede o
   saldo dos ingredientes é recusado, mesmo que cada pizza isolada caiba no saldo.
6. Confira a reserva em **Estoque**. Cancele para liberá-la ou siga as etapas
   normais do atendimento e fature para registrar o consumo.
7. Consulte **Relatórios → Saídas de estoque** para ver os ingredientes
   consumidos e a referência da comanda.

Exemplo apenas ilustrativo: um insumo cadastrado em kg com saldo de 1 kg e
consumo de 0,25 kg por pizza permite quatro preparos. Se duas receitas usam
esse mesmo insumo, elas compartilham esse limite; não existem oito preparos
independentes. Os valores reais precisam ser informados pelo responsável.

As quantidades da composição aceitam até seis casas decimais. Não há conversão
automática: se o insumo está em kg, 200 g devem ser informados como 0,2 kg.
Cadastro, mensagens e relatórios preservam essa precisão de apresentação.
O preço de venda continua vindo do cadastro do produto. Custos e CMV ainda não
são calculados, pois os insumos não possuem custo de compra estruturado.

## Histórico e compatibilidade

As consultas `GET /api/pedidos` e `GET /api/pedidos/{id}` permanecem disponíveis
para o histórico anterior. Escritas nesse recurso antigo retornam HTTP 410,
orientando o uso de `/api/comandas`. Isso impede manter duas rotas de venda com
momentos diferentes de baixa de estoque. O frontend atual já usa comandas.
Não houve conversão de pedidos antigos, repetição de saídas ou exclusão de dados.

A atualização do esquema é aditiva: tabelas `componentes_ficha_tecnica` e
`consumos_itens_comanda`, além de flags de estoque por ingredientes nos produtos
e itens. Campos antigos sem flag/snapshot continuam sendo tratados como estoque
do produto. Ativar uma ficha não converte nem apaga o saldo físico anterior.

O relatório de posição mostra saldo físico, sem descontar reservas. Produtos
preparados são identificados como saldo pelos insumos, sem apresentar o saldo
antigo de unidades como se fosse capacidade de produção. O dashboard usa a
disponibilidade livre para os alertas dos produtos.

## Validação e limites

Os testes usam H2 isolado, sem cadastrar vendas no banco local. Cobrem carrinhos
compartilhados, reservas simultâneas, faturamento idempotente, rollback, legado,
edição de itens, proteção das reservas, permissões e consultas dos relatórios.
Concorrência também deve ser validada no PostgreSQL de produção antes da venda.

A verificação visual no navegador continua sendo uma etapa manual; testes de
componentes não substituem testar a operação e o layout nas telas reais.

Verificação local em 11/10/2026: 27 suítes / 157 testes do frontend aprovados;
68 testes do backend aprovados, com repetição dos testes de relatórios após o
ajuste de precisão. Compilação de produção e ESLint do frontend aprovados.
Não houve envio ao GitHub nem ativação automática de fichas nos produtos reais.

Próximas etapas: tamanhos/sabores/bordas/adicionais com regra de preço definida,
abertura e fechamento de caixa, painel de cozinha, cardápio público e integração
homologada com fornecedores. Pagamentos online, multiempresa, recuperação de
conta, backups/restauração e endurecimento de produção não são concluídos por
esta etapa. Não considerar o sistema pronto para comercialização apenas porque
as verificações locais passaram.
