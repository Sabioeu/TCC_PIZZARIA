# Revisão de interface e integridade

Esta etapa mantém React, CSS próprio e Radix. Não altera o esquema do banco, não cria
administradores e não publica alterações no GitHub.

## O que foi padronizado

- Cadastros, estoque, financeiro e relatórios compartilham a mesma tabela responsiva.
  Cadastros e consultas locais possuem busca sem acentos, ordenação, paginação e tamanho de página.
  Nos relatórios, os filtros continuam sendo aplicados no servidor; PDF/CSV incluem toda a consulta.
- Confirmações e modais mantêm o foco, respondem ao teclado e mostram falhas dentro da janela.
- Avisos Radix informam sucesso sem bloquear a navegação. Erros permanecem nas telas para correção.
- Operações de cadastro, pedido, faturamento, baixa e exclusão têm travas de envio em andamento.
  Isso evita cliques duplicados; não equivale a idempotência universal entre navegadores ou após timeout.
- Pedidos têm orientação de preenchimento; delivery/retirada mostram etapas e próxima ação.
- Mesas e comandas possuem busca/filtros; o menu móvel usa o controle de foco do Radix.
- Estoque distingue saldo físico, reservado e disponível, sem mudar a regra de baixa no faturamento.
- Financeiro mantém o histórico pago ao excluir parcelas abertas; parcelamento preserva centavos.
- Axios e React Router foram atualizados dentro das versões principais já adotadas, após auditoria npm.

## Roteiro de conferência manual

Usar uma base de homologação ou registros de teste, nunca excluir históricos reais para experimentar.

1. Entrar como atendente e administrador; confirmar os módulos permitidos para cada perfil.
2. Buscar nomes com e sem acentos, ordenar números, mudar página e limpar filtros em cada cadastro.
3. Editar, cancelar e salvar um cadastro. Simular falha de conexão e confirmar que campos não somem.
4. Montar pedido presencial, delivery e retirada. Testar estoque insuficiente, etapas e faturamento.
5. Abrir modais pelo teclado: Tab, Shift+Tab e Escape. Escape em uma lista deve fechar só a lista.
6. Conferir entrada de estoque e relatórios; não repetir um lançamento se ele foi salvo mas o saldo
   falhou ao atualizar. Atualizar a consulta antes de decidir qualquer nova operação.
7. Criar parcelamento de R$ 100 em três parcelas: R$ 33,33 + R$ 33,33 + R$ 33,34.
   Pagar uma parcela e excluir uma em aberto: a paga deve continuar no histórico.
8. Testar os layouts em telefone, tablet e desktop, incluindo zoom e nomes/descrições longos.
9. Conferir PDF e CSV com os mesmos filtros; paginação da tela não limita o arquivo exportado.

## Limites da validação

Os testes frontend usam APIs simuladas. Os testes backend usam H2 isolado, não o banco real.
A inspeção automática de navegador foi bloqueada por política do ambiente; não foi contornada.
É necessária conferência visual manual em navegadores reais e teste de concorrência no PostgreSQL.

A auditoria npm após as atualizações ainda registra 104 alertas (6 baixos, 16 moderados,
78 altos e 4 críticos), incluindo a cadeia antiga de `react-scripts` e um alerta moderado
na cadeia de React Router. Os números incluem dependências transitivas e não representam
104 falhas confirmadas na aplicação; também não podem ser tratados como risco zero.
Não aplicar `npm audit fix --force`: a sugestão para `react-scripts@0.0.0` não é uma migração
funcional. Planejar substituição da ferramenta de build, revalidando scripts locais, CI e testes,
antes de exposição pública/comercial. Dependências de construção/testes não devem ser servidas
como servidor de desenvolvimento em produção.

## Validação automatizada desta etapa

- Frontend: 20 suítes, 85 testes aprovados, APIs simuladas.
- Backend: 50 testes aprovados, H2 isolado.
- Compilação de produção do frontend concluída; ESLint sem erros ou avisos de código.
- Aviso da base Browserslist desatualizada ainda emitido pela ferramenta legada.

Esta etapa não certifica o sistema para venda ou produção. Consultar
[SEGURANCA-E-INTEGRIDADE.md](pizza_integrador/pizza/pizza/SEGURANCA-E-INTEGRIDADE.md)
para HTTPS, backups, recuperação de senha, limitação de tentativas, isolamento de estabelecimentos
e consolidação da API legada de pedidos antes de novas integrações.

## Refinamento do login e dos cadastros — 11/10/2026

- Os cinco cadastros (clientes, produtos, insumos, fornecedores e usuários) mostram a lista
  em largura total. Os botões Novo e Editar abrem um painel lateral Radix com foco controlado.
  Clique fora não descarta o preenchimento; Voltar, Fechar e Escape fecham quando não há envio.
  Erros mantêm os campos; sucesso atualiza a lista e fecha o painel.
- Campos agrupados em seções, com exemplos, obrigatoriedade/opcionalidade, mensagens de
  validação associadas por ARIA e foco no primeiro erro. Envio em andamento bloqueia controles
  e fechamento. A interface prevê rolagem interna, rodapé de ações e adaptação ao celular.
- CPF é apresentado com máscara e enviado com 11 dígitos, conforme o DTO existente.
  Não foi acrescentada validação de autenticidade ou dígitos verificadores do documento.
  Contatos/documentos de fornecedores legados são preservados; a busca aceita as formas
  com e sem pontuação. Editar cliente sem mudar o telefone mantém o valor persistido.
- Preço e quantidade mantêm o passo de 0,01 dos controles anteriores, com mensagem explícita
  para frações menores, sem arredondar silenciosamente. Insumo continua com unidade imutável
  na edição, conforme regra já aplicada pelo backend.
- Login com apresentação da marca no desktop, versão compacta no celular, seleção Entrar /
  Criar meu login, mostrar/ocultar senha e validação de confirmação. Cadastro público continua
  criando atendente pendente de aprovação; não cria administrador. Senha vazia na edição de
  usuário mantém a senha atual. As senhas não são gravadas pela aplicação no armazenamento
  do navegador, mas não se promete controlar o gerenciador de senhas do navegador.
- Ícone próprio de pizza substitui o React na aba, no favicon de compatibilidade e nos ícones
  de instalação/celular. Nome, descrição, idioma e cores do manifesto/HTML usam Modelos Pizza.
  O script `pizza-front-end/frontend/scripts/gerar-icones.ps1` reproduz os arquivos raster.
- Nenhuma alteração de banco, contrato de autenticação, regra de autorização ou dependência
  foi necessária. Nenhuma alteração foi enviada ao GitHub.

Conferência manual adicional: testar o login nos dois modos e no celular; confirmar aprovação
de atendente; abrir Novo/Editar em cada cadastro, usar Tab/Escape e salvar um registro de teste;
simular falha de conexão para verificar preservação dos campos; buscar CPF/telefone com e sem
pontuação; recarregar com Ctrl+F5 para conferir o ícone da aba. A validação visual de navegador
permanece manual, conforme a limitação de ambiente descrita acima.

Validação final deste refinamento: 25 suítes e 133 testes frontend aprovados (APIs simuladas),
compilação de produção concluída e ESLint sem erros/avisos de código. A ferramenta ainda emite
o aviso preexistente de Browserslist desatualizado. O backend não foi alterado nesta etapa.
O gerenciador confirmou backend na porta 8080 e frontend na porta 3000 respondendo; o frontend
aplicou as alterações automaticamente, sem reinício desnecessário. Requisições HTTP locais
confirmaram a rota HTML do login, o SVG da pizza e o manifesto com a identificação nova.
