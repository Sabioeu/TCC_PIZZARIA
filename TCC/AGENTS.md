# Trabalho no projeto TCC

As pastas de desenvolvimento são `pizza-front-end/frontend` e `pizza_integrador/pizza/pizza`. `github-atualizacao` é um checkout de publicação separado; não desenvolver nele por engano.

O usuário autorizou gerenciar os serviços locais deste projeto após alterações. Após implementar e testar mudanças que exigem reinício, executar `projeto.ps1 -Acao Reiniciar -Alvo Backend`, `Frontend` ou `Ambos`, conforme necessário, e verificar `projeto.ps1 -Acao Status`. O frontend normalmente aplica alterações automaticamente; não reiniciar sem necessidade. Análise, leitura e documentação não exigem reinício. Não enviar alterações ao GitHub automaticamente.

Usar o gerenciador em vez de encerrar processos por nome ou apenas por porta. Ele confere caminhos/ancestrais e identidade do processo. Se não puder confirmar a origem, parar e pedir orientação. Se o ambiente restringir inspeção/início, usar o fluxo de aprovação apropriado.

Serviços são iniciados em segundo plano com janelas ocultas. Logs e identificadores ficam em `.dev-runtime`, nunca devem ser publicados. Nunca solicitar senhas pelo chat, criar novos administradores automaticamente ou apagar/recriar o banco. A aplicação usa atualização de esquema de desenvolvimento: avisar antes de mudanças de banco relevantes e preservar os dados.
