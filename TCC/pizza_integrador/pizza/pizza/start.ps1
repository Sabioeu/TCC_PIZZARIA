param([switch]$CriarAdministrador)
$ErrorActionPreference = 'Stop'
# Credenciais iniciais são digitadas localmente, não persistidas em arquivos.
$adminEmailAnterior = $env:PIZZA_ADMIN_EMAIL
$adminSenhaAnterior = $env:PIZZA_ADMIN_SENHA
Push-Location $PSScriptRoot
try {
    $perfilLocal = [Environment]::GetFolderPath('UserProfile')
    $javaLocal = Join-Path $perfilLocal '.jdks'
    $javaAtualValido = $env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME 'release')) -and (Select-String -LiteralPath (Join-Path $env:JAVA_HOME 'release') -Pattern '^JAVA_VERSION="21' -Quiet)
    if (-not $javaAtualValido) {
        $jdkEncontrado = Get-ChildItem $javaLocal -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '21' } | Sort-Object Name -Descending | Select-Object -First 1
        if (-not $jdkEncontrado) { throw 'Configure JAVA_HOME com o caminho do JDK 21 antes de iniciar.' }
        $env:JAVA_HOME = $jdkEncontrado.FullName
    }
    if ($CriarAdministrador) {
        $emailInicial = Read-Host 'E-mail do novo administrador (diferente do atendente)'
        $senhaSegura = Read-Host 'Senha do administrador (12 a 72 caracteres)' -AsSecureString
        $senhaConfirmacao = Read-Host 'Repita a senha' -AsSecureString
        $ponteiroSenha = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($senhaSegura)
        $ponteiroConfirmacao = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($senhaConfirmacao)
        try {
            $senhaInicial = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ponteiroSenha)
            $senhaRepetida = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ponteiroConfirmacao)
            if ($senhaInicial -cne $senhaRepetida) { throw 'As senhas não coincidem.' }
            if ($senhaInicial.Length -lt 12 -or [Text.Encoding]::UTF8.GetByteCount($senhaInicial) -gt 72) { throw 'Use pelo menos 12 caracteres e no máximo 72 bytes na senha.' }
            $env:PIZZA_ADMIN_EMAIL = $emailInicial.Trim()
            $env:PIZZA_ADMIN_SENHA = $senhaInicial
        } finally {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ponteiroSenha)
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ponteiroConfirmacao)
            $senhaInicial = $null
            $senhaRepetida = $null
        }
    }
    $cacheMaven = Join-Path $perfilLocal '.m2/repository'
    Write-Host 'Iniciando Pizza. O administrador inicial só é criado se ainda não existir outro.' -ForegroundColor Green
    & .\mvnw.cmd "-Dmaven.repo.local=$cacheMaven" spring-boot:run
} finally {
    $env:PIZZA_ADMIN_EMAIL = $adminEmailAnterior
    $env:PIZZA_ADMIN_SENHA = $adminSenhaAnterior
    Pop-Location
}
