# Numeração diária das comandas

As telas usam números como #001, #002 e #003. Cada nova data de abertura começa
em #001, no fuso `America/Sao_Paulo` por padrão (`pizza.operacao.fuso`). Não existe
uma tarefa que apaga ou reinicia registros à meia-noite: o próximo número é
calculado para a data daquele atendimento, já sob bloqueio no banco.

O ID continua único e é usado em todas as operações e vínculos de estoque e
financeiro. O campo `numero` anterior permanece preservado para compatibilidade;
os novos campos `numeroDiario` e `dataNumeracao` formam a referência de exibição.
O backend também devolve `referenciaExibicao`, por exemplo `11/10/2026 · #003`.

O banco tem uma restrição única em data + número diário. Uma linha de coordenação
na tabela `controle_numeracao_comanda` é travada antes da abertura, impedindo
que requisições simultâneas escolham o mesmo próximo número. O bloqueio dura
até o commit/rollback da abertura; não é apenas uma variável em memória. O ID,
e não o número diário, continua nas URLs de alteração/cancelamento/faturamento.

No primeiro início com esta versão, as comandas antigas recebem referência
diária pela data de abertura, em ordem cronológica (ID desempata horários
iguais). A rotina é transacional e repetível: registros já numerados não são
renumerados. Nenhum saldo, pagamento, número original ou ID é reescrito.
Descrições financeiras antigas são preservadas no banco e recebem uma
descrição de apresentação atualizada somente na consulta.

Comandas abertas antes da meia-noite mantêm seu dia e número, mesmo quando
faturadas no dia seguinte. Cancelar não reutiliza o número de uma comanda que
já foi registrada. Números maiores que 999 continuam inteiros, sem truncamento.
Histórico financeiro, relatórios e confirmações exibem data + número para evitar
confusão; os cards mostram o número curto junto da data de abertura.

A atualização adiciona campos, índice único e tabela de coordenação; não apaga
nem recria o banco. A implementação é para o contexto atual de uma operação
por banco. Uma futura versão multiempresa precisará incluir a empresa nas
chaves e na coordenação da sequência.

Validação local em 11/10/2026: 160 testes do frontend e 74 do backend aprovados;
compilação de produção e ESLint aprovados. Cobertura inclui criação simultânea,
reinício em nova data, unicidade no banco, atualização repetível dos legados,
preservação de descrições e operações da interface vinculadas ao ID correto.
Os testes de migração são executados somente em H2 isolado; não criam vendas
no banco local do projeto. A validação visual no navegador permanece manual.
