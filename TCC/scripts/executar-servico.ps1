param([ValidateSet('Backend','Frontend')][string]$Servico)
$ErrorActionPreference = 'Stop'
$raizProjeto = Split-Path $PSScriptRoot -Parent
if ($Servico -eq 'Backend') {
    & (Join-Path $raizProjeto 'pizza_integrador/pizza/pizza/start.ps1')
    exit $LASTEXITCODE
}
$env:BROWSER = 'none'
$env:PORT = '3000'
Set-Location (Join-Path $raizProjeto 'pizza-front-end/frontend')
& node 'node_modules/react-scripts/bin/react-scripts.js' start
exit $LASTEXITCODE
