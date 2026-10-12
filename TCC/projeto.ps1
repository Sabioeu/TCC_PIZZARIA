param(
    [ValidateSet('Status','Iniciar','Reiniciar','Parar')][string]$Acao = 'Status',
    [ValidateSet('Ambos','Backend','Frontend')][string]$Alvo = 'Ambos'
)
$ErrorActionPreference = 'Stop'
$raizProjeto = $PSScriptRoot
$pastaRuntime = Join-Path $raizProjeto '.dev-runtime'
$runner = Join-Path $raizProjeto 'scripts/executar-servico.ps1'
$servicos = @(
    @{Nome='Backend'; Porta=8080; Pasta=(Join-Path $raizProjeto 'pizza_integrador/pizza/pizza'); Url='http://localhost:8080/api/auth/csrf'},
    @{Nome='Frontend'; Porta=3000; Pasta=(Join-Path $raizProjeto 'pizza-front-end/frontend'); Url='http://localhost:3000'}
) | Where-Object { $Alvo -eq 'Ambos' -or $_.Nome -eq $Alvo }

function Get-PortaProcesso($servico) {
    $conexao=Get-NetTCPConnection -LocalPort $servico.Porta -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if($conexao) { return Get-CimInstance Win32_Process -Filter "ProcessId=$($conexao.OwningProcess)" }
}
function Test-Resposta($servico) {
    try {
        $resposta=Invoke-WebRequest $servico.Url -UseBasicParsing -TimeoutSec 4
        if($resposta.StatusCode -ne 200) { return $false }
        if($servico.Nome -eq 'Backend') {
            $token=$resposta.Content | ConvertFrom-Json
            return [bool]($token.token -and $token.headerName)
        }
        return $resposta.Content -match 'id="root"'
    } catch { return $false }
}
function Get-AncoraProjeto($processo,$servico,$inventario) {
    # A porta sozinha nunca autoriza encerrar um processo. Confere caminho e ancestrais.
    $atual=$processo
    for($nivel=0; $nivel -lt 8 -and $atual; $nivel++) {
        $cmd=[string]$atual.CommandLine
        $pasta=$servico.Pasta.Replace('/','\')
        $doProjeto=$cmd -match ([regex]::Escape($pasta)+'(?=[\\/"\s;]|$)')
        $runnerCorreto=$cmd -match ([regex]::Escape($runner)+'(?=["\s]|$)') -and $cmd -match "-Servico\s+$($servico.Nome)(?=\s|$)"
        if(($doProjeto -or $runnerCorreto) -and $atual.Name -match '^(java|node|powershell|pwsh)\.exe$') { return $atual }
        $pai=$inventario | Where-Object ProcessId -eq $atual.ParentProcessId | Select-Object -First 1
        if($pai -and $pai.CreationDate -gt $atual.CreationDate) { break }
        $atual=$pai
    }
    throw "Porta $($servico.Porta) ocupada por um processo que não pude confirmar como $($servico.Nome) deste projeto. Nenhuma aplicação externa foi encerrada."
}
function Stop-Arvore($ancora,$inventario) {
    # Captura descendentes da âncora comprovada; nunca encerra o terminal/VS Code acima dela.
    $filhos=$inventario | Where-Object { $_.ParentProcessId -eq $ancora.ProcessId -and $_.CreationDate -ge $ancora.CreationDate }
    foreach($filho in $filhos) { Stop-Arvore $filho $inventario }
    $atual=Get-CimInstance Win32_Process -Filter "ProcessId=$($ancora.ProcessId)"
    if($atual -and $atual.CreationDate -eq $ancora.CreationDate) { Stop-Process -Id $atual.ProcessId -Force -ErrorAction Stop }
}
function Get-RunnerRegistrado($servico) {
    $arquivo=Join-Path $pastaRuntime "$($servico.Nome).json"
    if(-not(Test-Path -LiteralPath $arquivo)) { return }
    $estado=Get-Content -LiteralPath $arquivo -Raw | ConvertFrom-Json
    $processo=Get-CimInstance Win32_Process -Filter "ProcessId=$($estado.processo)"
    if($processo -and $processo.CreationDate.ToUniversalTime().ToString('o') -eq $estado.criado -and $processo.CommandLine -match ([regex]::Escape($runner)+'(?=["\s]|$)') -and $processo.CommandLine -match "-Servico\s+$($servico.Nome)(?=\s|$)") { return $processo }
}

# Evita duas operações de início/reinício simultâneas neste checkout.
$bytes=[Text.Encoding]::UTF8.GetBytes($raizProjeto.ToLowerInvariant())
$sha=[Security.Cryptography.SHA256]::Create()
$chave=[BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-','')
$sha.Dispose()
$mutex=[Threading.Mutex]::new($false,"Local\PizzaProjeto$chave")
$travado=$false
try {
    try { $travado=$mutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $travado=$true }
    if(-not $travado) { throw 'Já existe uma operação em andamento. Aguarde e consulte Status.' }
    foreach($servico in $servicos) {
        $processo=Get-PortaProcesso $servico
        if($Acao -eq 'Status') {
            $estado=if(-not $processo) { 'desligado' } elseif(Test-Resposta $servico) { 'respondendo' } else { 'porta ocupada, mas aplicação não está pronta/atualizada' }
            Write-Host "$($servico.Nome): $estado — porta $($servico.Porta)"
            continue
        }
        $registrado=Get-RunnerRegistrado $servico
        if($Acao -in @('Reiniciar','Parar')) {
            $inventario=@(Get-CimInstance Win32_Process)
            if($registrado) { Stop-Arvore $registrado $inventario }
            elseif($processo) { $ancora=Get-AncoraProjeto $processo $servico $inventario; Stop-Arvore $ancora $inventario }
            Start-Sleep -Milliseconds 500
            $processo=Get-PortaProcesso $servico
            if($processo) { throw "A porta $($servico.Porta) continua ocupada. Não vou iniciar uma segunda instância." }
            Write-Host "$($servico.Nome): processo do projeto encerrado."
        }
        if($Acao -eq 'Parar') { continue }
        if($Acao -eq 'Iniciar' -and ($processo -or $registrado)) {
            if($processo) { $null=Get-AncoraProjeto $processo $servico @(Get-CimInstance Win32_Process) }
            Write-Host "$($servico.Nome): já iniciado. Use Reiniciar quando precisar substituir a instância atual."
            continue
        }
        if($servico.Nome -eq 'Backend' -and -not(Test-NetConnection localhost -Port 5432 -WarningAction SilentlyContinue -InformationLevel Quiet)) { throw 'PostgreSQL não está acessível na porta 5432. Inicie o banco antes do backend.' }
        if($servico.Nome -eq 'Frontend' -and -not(Test-Path -LiteralPath (Join-Path $servico.Pasta 'node_modules/react-scripts/bin/react-scripts.js'))) { throw 'Dependências do frontend não encontradas. Instale-as antes de iniciar.' }
        New-Item -ItemType Directory -Path $pastaRuntime -Force | Out-Null
        $shell=(Get-Command powershell.exe -ErrorAction Stop).Source
        $logSaida=Join-Path $pastaRuntime "$($servico.Nome).out.log"
        $logErro=Join-Path $pastaRuntime "$($servico.Nome).err.log"
        $argumentos="-NoProfile -ExecutionPolicy Bypass -File `"$runner`" -Servico $($servico.Nome)"
        $novo=Start-Process -FilePath $shell -ArgumentList $argumentos -WorkingDirectory $raizProjeto -WindowStyle Hidden -RedirectStandardOutput $logSaida -RedirectStandardError $logErro -PassThru
        $detalhe=Get-CimInstance Win32_Process -Filter "ProcessId=$($novo.Id)"
        if(-not $detalhe) { throw "Falha ao iniciar $($servico.Nome). Consulte os logs em $pastaRuntime." }
        @{processo=$novo.Id; criado=$detalhe.CreationDate.ToUniversalTime().ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $pastaRuntime "$($servico.Nome).json") -Encoding UTF8
        Write-Host "$($servico.Nome): iniciando em segundo plano. Logs: $logSaida"
        # Espera limitada; se demorar mais, não encerra o serviço: Status permite acompanhar.
        $limite=[DateTime]::UtcNow.AddSeconds(45)
        do {
            if(Test-Resposta $servico) { Write-Host "$($servico.Nome): pronto em $($servico.Url)"; break }
            if(-not(Get-Process -Id $novo.Id -ErrorAction SilentlyContinue)) { throw "$($servico.Nome) saiu durante o início. Consulte $logErro e $logSaida." }
            Start-Sleep -Milliseconds 800
        } while([DateTime]::UtcNow -lt $limite)
        if(-not(Test-Resposta $servico)) { Write-Warning "$($servico.Nome) ainda está iniciando ou apresentou erro. Consulte Status e os logs; não foi criado outro processo." }
    }
} finally {
    if($travado) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
