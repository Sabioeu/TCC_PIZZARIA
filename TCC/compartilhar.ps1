param([ValidateSet('Iniciar','Status','Parar')][string]$Acao = 'Status')
$ErrorActionPreference = 'Stop'
$runtime = Join-Path $PSScriptRoot '.dev-runtime'
$gateway = Join-Path $PSScriptRoot 'scripts/demo-gateway.cjs'
$registro = Join-Path $runtime 'Compartilhamento.json'
$build = Join-Path $runtime 'demo-public'
$mutex = [Threading.Mutex]::new($false, 'Local\PizzaCompartilhamentoNgrok')
$travado = $false
try {
    try { $travado = $mutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $travado = $true }
    if (-not $travado) { throw 'Outra operação de compartilhamento está em andamento.' }

function Get-Registrados {
    if (Test-Path -LiteralPath $registro) { return @(Get-Content -LiteralPath $registro -Raw | ConvertFrom-Json) }
    return @()
}
function Get-Confirmado($item) {
    $processo = Get-CimInstance Win32_Process -Filter "ProcessId=$($item.id)"
    if (-not $processo) { return }
    if ($processo.CreationDate.ToUniversalTime().ToString('o') -ne $item.criado -or $processo.ExecutablePath -ne $item.executavel) { throw 'Identidade do processo mudou. Nenhum processo foi encerrado.' }
    if ($item.tipo -eq 'Gateway' -and $processo.CommandLine -notlike "*$gateway*") { throw 'Gateway não confirmado.' }
    if ($item.tipo -eq 'Ngrok' -and ($processo.CommandLine -notmatch 'http\s+http://127.0.0.1:3100' -or $processo.CommandLine -notmatch '--inspect=false')) { throw 'Túnel não confirmado.' }
    return $processo
}
function Get-Link {
    try {
        $dados = Invoke-RestMethod 'http://127.0.0.1:4040/api/tunnels' -TimeoutSec 3
        return ($dados.tunnels | Where-Object { $_.public_url -like 'https://*' -and $_.config.addr -eq 'http://127.0.0.1:3100' } | Select-Object -First 1).public_url
    } catch { return $null }
}
$itens = @(Get-Registrados)
if ($Acao -eq 'Parar') {
    # Apenas PIDs registrados, conferidos por data, executável e linha de comando.
    $confirmados = @($itens | ForEach-Object { Get-Confirmado $_ })
    foreach ($processo in $confirmados) { Stop-Process -Id $processo.ProcessId -ErrorAction Stop }
    if (Test-Path -LiteralPath $registro) { Remove-Item -LiteralPath $registro }
    Write-Host 'Compartilhamento encerrado. Backend e frontend local permanecem ligados.'
    exit
}
if ($Acao -eq 'Status') {
    foreach ($item in $itens) { $p = Get-Confirmado $item; Write-Host "$($item.tipo): $(if ($p) {'ligado'} else {'desligado'})" }
    $link = Get-Link
    if ($link) { Write-Host "Link: $link" } else { Write-Host 'Nenhum link público ativo deste compartilhamento.' }
    exit
}
if (@($itens | ForEach-Object { Get-Confirmado $_ }).Count) { throw 'Compartilhamento já iniciado. Consulte Status ou encerre com Parar.' }
foreach ($porta in @(3100,4040)) {
    if (Get-NetTCPConnection -LocalPort $porta -State Listen -ErrorAction SilentlyContinue) { throw "Porta $porta ocupada. Nenhum processo externo será encerrado." }
}
$ngrok = (Get-Command ngrok -ErrorAction Stop).Source
& $ngrok config check
if ($LASTEXITCODE -ne 0) { throw 'Configure o ngrok localmente antes de continuar. Não envie token pelo chat.' }
& (Join-Path $PSScriptRoot 'projeto.ps1') -Acao Iniciar -Alvo Ambos
$null = Invoke-RestMethod 'http://localhost:8080/api/auth/csrf' -TimeoutSec 8
New-Item -ItemType Directory -Path $runtime -Force | Out-Null
$node = (Get-Command node -ErrorAction Stop).Source
$nomes = @('REACT_APP_API_URL','BUILD_PATH','GENERATE_SOURCEMAP')
$anteriores = @{}
foreach ($nome in $nomes) { $anteriores[$nome] = [Environment]::GetEnvironmentVariable($nome, 'Process') }
try {
    $env:REACT_APP_API_URL = '/api'; $env:BUILD_PATH = $build; $env:GENERATE_SOURCEMAP = 'false'
    Push-Location (Join-Path $PSScriptRoot 'pizza-front-end/frontend')
    try { & $node node_modules/react-scripts/bin/react-scripts.js build; if ($LASTEXITCODE -ne 0) { throw 'Falha ao compilar a demonstração.' } } finally { Pop-Location }
} finally { foreach ($nome in $nomes) { [Environment]::SetEnvironmentVariable($nome, $anteriores[$nome], 'Process') } }
$novos = @()
try {
    foreach ($tipo in @('Gateway','Ngrok')) {
        if ($tipo -eq 'Gateway') { $exe = $node; $argumentos = "`"$gateway`" `"$build`"" }
        else { $exe = $ngrok; $argumentos = 'http http://127.0.0.1:3100 --inspect=false --log=stdout --log-format=json' }
        $p = Start-Process -FilePath $exe -ArgumentList $argumentos -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtime "$tipo.out.log") -RedirectStandardError (Join-Path $runtime "$tipo.err.log") -PassThru
        $info = Get-CimInstance Win32_Process -Filter "ProcessId=$($p.Id)"
        if (-not $info) { throw "$tipo não permaneceu ativo. Consulte o log em .dev-runtime." }
        $novos += @{ tipo=$tipo; id=$p.Id; criado=$info.CreationDate.ToUniversalTime().ToString('o'); executavel=$info.ExecutablePath }
        ConvertTo-Json -InputObject @($novos) | Set-Content -LiteralPath $registro
    }
    $link = $null
    for ($tentativa=0; $tentativa -lt 20; $tentativa++) {
        $link = Get-Link
        if ($link) { break }
        Start-Sleep -Milliseconds 500
    }
    if (-not $link) { throw 'Ngrok não criou o link. Confira a autenticação da conta e os logs locais.' }
    Write-Host "Link para compartilhar: $link"
    Write-Host 'Login do sistema obrigatório. Os testes usam o banco atual. Encerre com .\compartilhar.ps1 -Acao Parar.'
} catch {
    foreach ($item in $novos) { $p = Get-Confirmado $item; if ($p) { Stop-Process -Id $p.ProcessId } }
    if (Test-Path -LiteralPath $registro) { Remove-Item -LiteralPath $registro }
    throw
}
} finally {
    if ($travado) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
