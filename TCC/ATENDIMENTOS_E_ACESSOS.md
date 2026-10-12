# Atendimento presencial, delivery e retirada

## O que foi adaptado

- Novo pedido permite escolher PRESENCIAL, DELIVERY ou RETIRADA.
- Presencial exige mesa na interface e na nova API, preservando registros e clientes antigos.
- Delivery exige cliente cadastrado, endereço e telefone; taxa não negativa com até duas casas decimais.
- Retirada exige cliente cadastrado, mas não exige mesa nem endereço.
- Delivery/retirada podem ter uma mesa de referência: não ocupam nem liberam essa mesa, mesmo que ela esteja ocupada por uma comanda presencial.
- A origem é SISTEMA, separada do tipo. Nenhuma integração iFood foi ativada.
- Taxa compõe o total e o recebimento, mas não interfere na quantidade baixada do estoque. Recalcular itens mantém a taxa.
- Atendimentos abertos permitem filtrar por tipo e visualizar cliente, endereço, contato e etapa.

## Fluxo e pagamento

Delivery: Recebido → Em preparo → Pronto → Em entrega → Concluído → Faturar.

Retirada: Recebido → Em preparo → Pronto → Concluído → Faturar.

As transições são validadas pelo backend e repetir a mesma etapa não duplica operação. Após iniciar preparo, itens de delivery/retirada não podem ser alterados. Dados de contato e taxa são registrados na abertura (não há edição posterior nesta primeira versão).

Faturar registra um recebimento manual e baixa estoque, usando a mesma transação e proteção contra duplicidade do presencial. Não processa pagamento real por Pix/cartão. Ainda não há pagamento antecipado ou misto, gateway, estorno automático, entregador, geolocalização ou confirmação do destinatário. Operador deve confirmar a entrega/retirada e o recebimento antes de faturar.

**O estoque físico continua sendo baixado somente no faturamento, mas os itens dos atendimentos abertos agora reservam logicamente esse saldo.** Disponível para novo pedido = estoque físico menos quantidade dos itens em comandas ABERTAS, de todos os tipos. A abertura, inclusão e aumento de itens validam essa disponibilidade no backend com bloqueio de produto. Produtos sem saldo disponível ficam desabilitados no cardápio, e há um botão para atualizar o estoque.

Cancelar um atendimento ou reduzir/excluir itens libera sua reserva sem gerar movimento físico. Faturar baixa o estoque físico e encerra a reserva na mesma transação. Saídas/alterações manuais não podem consumir saldo reservado para outros atendimentos. A mesma proteção se aplica às saídas da API legada de pedidos; não duplique vendas nas duas APIs. Relatórios de posição continuam mostrando estoque físico, não disponível para venda.

Atendimentos antigos ainda abertos também contam nas reservas: se foram criados sem saldo, será necessário repor estoque ou revisar/cancelar os itens para normalizar. Esta atualização não cancela nem altera esses registros automaticamente. A reserva é de produtos vendidos, não de ingredientes por ficha técnica. Consumo de ingredientes e tratamento de perdas/cancelamentos após preparo ainda precisam ser definidos antes do uso comercial.

## Novas contas

Cadastros pela tela de login são ATENDENTE e ficam bloqueados aguardando aprovação. Administrador acessa Usuários, edita o cadastro, define o perfil e seleciona “Liberado — aprovar acesso”. Também pode bloquear contas. Sessões de usuários bloqueados são revogadas na próxima requisição.

Contas existentes não são bloqueadas: o novo campo nulo é interpretado como acesso liberado para preservar compatibilidade. Contas criadas diretamente pelo administrador são liberadas por padrão. O último administrador ativo não pode ser desativado, excluído ou rebaixado; não é permitido desativar/excluir/rebaixar a própria conta administrativa.

Não há confirmação de propriedade do e-mail, recuperação por e-mail, limite de tentativas ou proteção antirrobô. Aprovação não substitui essas proteções para exposição pública.

## Como testar localmente

1. Faça backup do PostgreSQL antes de iniciar a versão atualizada. A configuração de desenvolvimento usa `ddl-auto=update` e acrescentará campos no próximo início; registros anteriores não são excluídos nem recalculados.
2. Reinicie backend (`.\start.ps1` na sua pasta) e frontend; atualize a página.
3. Em Novo pedido, teste presencial com mesa; retirada sem mesa; delivery com endereço, telefone e taxa.
4. Em Comandas, filtre os atendimentos, avance cada etapa e registre o recebimento após concluir. Confira o total com taxa e o saldo de estoque após faturar.
5. Teste delivery com mesa de referência já ocupada: ela deve continuar ocupada após faturar ou cancelar o delivery.
6. Solicite uma conta nova pelo login: ela não pode entrar antes da aprovação em Usuários. As contas anteriores continuam acessíveis.

## Limites para futura venda

Esta entrega é uma evolução local, não uma certificação de produção. Antes de vender/hospedar: migrações versionadas, backups e restauração, HTTPS, segredos fora do código, auditoria, controle de abuso, fichas técnicas/consumo de insumos, regras de cancelamento e isolamento por estabelecimento. A API legada `/api/pedidos` permanece diferente do fluxo `/api/comandas`: não registre a mesma venda nas duas. Novos tipos são usados no fluxo de comandas da interface.

As mudanças desta etapa não foram enviadas automaticamente ao GitHub. O checkout `github-atualizacao` é uma cópia de publicação anterior, não a pasta de desenvolvimento atual.
