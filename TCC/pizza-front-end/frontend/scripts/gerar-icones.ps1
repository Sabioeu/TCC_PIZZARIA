# Recria os ícones raster da marca a partir da mesma geometria de public/pizza.svg.
# Nenhum pacote externo é necessário; os arquivos são artefatos gerados.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$pastaPublic = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../public'))
$pastaFrontend = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if ($pastaPublic -ne (Join-Path $pastaFrontend 'public')) { throw 'Destino de ícones fora da pasta public.' }

function New-PizzaIcon([int]$tamanho) {
    $bitmap = [Drawing.Bitmap]::new($tamanho, $tamanho)
    $grafico = [Drawing.Graphics]::FromImage($bitmap)
    $grafico.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $grafico.ScaleTransform($tamanho / 64.0, $tamanho / 64.0)
    $marca = [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#e86419'))
    $queijo = [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#ffcf69'))
    $cobertura = [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#c8432b'))
    $folha = [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#287448'))
    $borda = [Drawing.Pen]::new([Drawing.ColorTranslator]::FromHtml('#ffe8bd'), 7)
    $borda.StartCap = $borda.EndCap = [Drawing.Drawing2D.LineCap]::Round
    $fundo = [Drawing.Drawing2D.GraphicsPath]::new()
    $pizza = [Drawing.Drawing2D.GraphicsPath]::new()
    $crosta = [Drawing.Drawing2D.GraphicsPath]::new()
    $manjericao = [Drawing.Drawing2D.GraphicsPath]::new()
    try {
        $fundo.AddArc(0, 0, 32, 32, 180, 90)
        $fundo.AddArc(32, 0, 32, 32, 270, 90)
        $fundo.AddArc(32, 32, 32, 32, 0, 90)
        $fundo.AddArc(0, 32, 32, 32, 90, 90)
        $fundo.CloseFigure()
        $grafico.FillPath($marca, $fundo)
        # Curvas quadráticas do SVG convertidas em cúbicas.
        $pizza.AddBezier(12, 20, 25.333, 12, 38.667, 12, 52, 20)
        $pizza.AddLine(52, 20, 32, 55)
        $pizza.CloseFigure()
        $grafico.FillPath($queijo, $pizza)
        $crosta.AddBezier(10, 17, 24.667, 7.667, 39.333, 7.667, 54, 17)
        $grafico.DrawPath($borda, $crosta)
        $grafico.FillEllipse($cobertura, 20, 20, 8, 8)
        $grafico.FillEllipse($cobertura, 36, 21, 8, 8)
        $grafico.FillEllipse($cobertura, 27, 34, 8, 8)
        $manjericao.AddBezier(33, 21, 30.333, 23.667, 30.667, 26, 34, 28)
        $manjericao.AddBezier(34, 28, 36.667, 25.333, 36.333, 23, 33, 21)
        $manjericao.CloseFigure()
        $grafico.FillPath($folha, $manjericao)
        return ,$bitmap
    } catch { $bitmap.Dispose(); throw }
    finally {
        $grafico.Dispose(); $marca.Dispose(); $queijo.Dispose(); $cobertura.Dispose(); $folha.Dispose()
        $borda.Dispose(); $fundo.Dispose(); $pizza.Dispose(); $crosta.Dispose(); $manjericao.Dispose()
    }
}

foreach ($tamanho in @(192, 512)) {
    $bitmap = New-PizzaIcon $tamanho
    try { $bitmap.Save((Join-Path $pastaPublic "logo$tamanho.png"), [Drawing.Imaging.ImageFormat]::Png) }
    finally { $bitmap.Dispose() }
}
# ICO com dois tamanhos, incluindo o ícone de 16px da aba do navegador.
$imagens = foreach ($tamanho in @(16, 32)) {
    $bitmap = New-PizzaIcon $tamanho
    $memoria = [IO.MemoryStream]::new()
    try {
        $bitmap.Save($memoria, [Drawing.Imaging.ImageFormat]::Png)
        @{ Tamanho = $tamanho; Bytes = $memoria.ToArray() }
    } finally { $bitmap.Dispose(); $memoria.Dispose() }
}
$arquivo = [IO.File]::Create((Join-Path $pastaPublic 'favicon.ico'))
$writer = [IO.BinaryWriter]::new($arquivo)
try {
    $writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]$imagens.Count)
    $offset = 6 + 16 * $imagens.Count
    foreach ($imagem in $imagens) {
        $writer.Write([byte]$imagem.Tamanho); $writer.Write([byte]$imagem.Tamanho)
        $writer.Write([byte]0); $writer.Write([byte]0)
        $writer.Write([uint16]1); $writer.Write([uint16]32)
        $writer.Write([uint32]$imagem.Bytes.Length); $writer.Write([uint32]$offset)
        $offset += $imagem.Bytes.Length
    }
    foreach ($imagem in $imagens) { $writer.Write([byte[]]$imagem.Bytes) }
} finally { $writer.Dispose(); $arquivo.Dispose() }
Write-Host 'Ícones de pizza gerados: favicon.ico, logo192.png e logo512.png.'
