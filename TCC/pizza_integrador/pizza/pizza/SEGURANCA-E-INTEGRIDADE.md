# Segurança e integridade do backend

## Proteções existentes preservadas

- Login por sessão, senha protegida por BCrypt e proteção CSRF em operações de escrita.
- Perfis de acesso conferidos no servidor, não apenas nos menus do navegador.
- Cadastro público sempre cria atendente pendente de aprovação; não aceita promoção via payload.
- Contas bloqueadas ou excluídas perdem acesso; troca de senha invalida sessões anteriores.
- Estoque e faturamento usam transações e bloqueios para evitar reserva ou recebimento duplicados.

## Reforços desta revisão

- Contas a pagar validam descrição, valor positivo, centavos, fornecedor e quantidade de parcelas.
- Parcelamento preserva o valor total; a última parcela absorve os centavos restantes.
- Consultar contas calcula vencimentos somente na resposta, sem salvar sobre outro pagamento.
- Pagamento, edição e exclusão bloqueiam o mesmo grupo em ordem estável. A exclusão remove apenas
  parcelas em aberto e conserva as pagas no histórico.
- Recebimentos vinculados a comandas são criados pelo faturamento e não podem ser editados,
  excluídos nem duplicados pelo CRUD manual de transações.
- Na API legada de pedidos, preço vem do cadastro do servidor, itens exigem quantidade positiva,
  e tipo/situação são validados. A baixa imediata de estoque do fluxo legado foi preservada.
- Erros inesperados não expõem SQL ou detalhes internos e retornam HTTP 500. Dados inválidos
  retornam 400; conflitos de integridade/concorrência retornam 409 com orientação de recuperação.
- Testes de contexto usam H2 em memória, sem carregar a configuração do banco real.

## Antes de comercializar ou publicar

Esta revisão não é uma certificação de segurança nem substitui validação de produção.

1. Servir aplicação e API por HTTPS; ativar `PIZZA_COOKIE_SECURE=true` e configurar somente origens CORS necessárias.
2. Configurar credenciais por ambiente/cofre de segredos. Não publicar senhas locais, arquivos de execução ou dumps.
3. Planejar backups automáticos e testar restauração; definir retenção, acesso e proteção dos dados pessoais.
4. Adicionar limites de tentativas no login e monitoramento/auditoria de operações sensíveis.
5. Definir recuperação de senha e verificação de e-mail antes de oferecer cadastro a usuários externos.
6. Se a mesma instalação atender empresas distintas, projetar isolamento de dados por estabelecimento.
7. Testar carga, navegadores reais e uso simultâneo no PostgreSQL; a suíte H2 não substitui esses testes.
8. Validar o ciclo de pedidos/pagamentos com o provedor antes de ativar integrações de produção.
9. Consolidar o uso da API legada de pedidos e da API de comandas antes de oferecer novas integrações.
   A interface atual usa comandas; não registrar a mesma venda pelos dois fluxos, pois a baixa de
   estoque do pedido legado é imediata e a da comanda ocorre no faturamento.

Referências: [bloqueios no Spring Data JPA](https://docs.spring.io/spring-data/jpa/reference/jpa/locking.html)
e [cabeçalhos de segurança no Spring Security](https://docs.spring.io/spring-security/reference/features/exploits/headers.html).
