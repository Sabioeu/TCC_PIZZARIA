# Execução local gerenciada

O gerenciador `projeto.ps1` inicia e reinicia backend/frontend em segundo plano, sem abrir janelas. Confere a identidade e a origem dos processos antes de encerrá-los: não encerra qualquer aplicação apenas porque ocupa a porta 3000/8080 e não encerra o VS Code nem o terminal acima do processo da aplicação.

## Comandos na pasta TCC

```powershell
.\projeto.ps1 -Acao Status
.\projeto.ps1 -Acao Iniciar -Alvo Ambos
.\projeto.ps1 -Acao Reiniciar -Alvo Backend
.\projeto.ps1 -Acao Reiniciar -Alvo Frontend
.\projeto.ps1 -Acao Reiniciar -Alvo Ambos
.\projeto.ps1 -Acao Parar -Alvo Ambos
```

O alvo padrão é Ambos, e a ação padrão é Status. Se a política local bloquear o arquivo, pode-se executar apenas este processo com `powershell -ExecutionPolicy Bypass -File .\projeto.ps1 -Acao Status`; nenhuma política global é alterada.

Requisitos: PostgreSQL já iniciado em localhost:5432, Java 21, Node e dependências frontend instaladas. O backend usa o script `start.ps1` existente e a configuração do banco atual. Variáveis de ambiente do terminal são herdadas pelos processos, mas segredos não são persistidos pelo gerenciador. Ele não cria administrador nem apaga/recria o banco.

O frontend continua com atualização automática do React Scripts. Para alterações Java, executar Reiniciar após editar e testar recompila/inicia a API. Não há serviço instalado no Windows, agendamento, inicialização automática ao ligar o computador ou vigilância permanente de arquivos do backend.

Após alterações feitas pelo assistente, ele usará essa rotina quando necessário e verificará se a aplicação responde. As instruções estão em `AGENTS.md`. Inspeção de processos e início podem exigir autorização no ambiente restrito do assistente.

## Diagnóstico

Logs e identidade dos processos ficam em `.dev-runtime/Backend.out.log`, `Backend.err.log`, `Frontend.out.log`, `Frontend.err.log` e arquivos JSON de estado. Essa pasta tem `.gitignore` próprio; não publique os logs, que podem conter informações operacionais.

Cada serviço tem até 45 segundos de verificação inicial. Se ainda não estiver pronto, o script avisa e deixa o processo iniciando: consulte Status e os logs, não inicie outra cópia. Iniciar não duplica uma instância já registrada. Reiniciar substitui apenas processos comprovados do projeto. As portas permanecem 8080 e 3000.

Abra http://localhost:3000. Depois de reiniciar o backend, talvez seja preciso entrar novamente: sessões em memória não sobrevivem ao reinício. Se necessário, atualize o navegador com Ctrl+F5.

Essa configuração é só para desenvolvimento local, não para hospedagem/produção. Não envia alterações ao GitHub automaticamente.
