param([string]$Mode = 'before')
$ErrorActionPreference = 'Stop'
$projectRoot = 'C:\Users\kdt66\Desktop\FoldedVision_AI'
$workRoot = Join-Path $projectRoot 'outputs\cleanup_records\presentation_history\common_revision_2026-11-27'
$snapshot = Get-Content -LiteralPath (Join-Path $workRoot 'source_snapshot.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$source = $snapshot.source
if ($Mode -eq 'before') {
    $path = $source
    $previewRoot = Join-Path $workRoot 'before'
} else {
    $delivery = Get-Content -LiteralPath (Join-Path $workRoot 'delivery.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    $path = Join-Path $projectRoot $delivery.pptx
    $previewRoot = Join-Path $workRoot 'after'
}
New-Item -ItemType Directory -Path $previewRoot -Force | Out-Null
$app = New-Object -ComObject PowerPoint.Application
$presentation = $null
$overflow = @()
$outside = @()
try {
    $presentation = $app.Presentations.Open($path, -1, 0, 0)
    if ($Mode -eq 'before' -and $presentation.Slides.Count -ne 44) { throw 'Expected user deck with 44 slides' }
    if ($Mode -ne 'before' -and $presentation.Slides.Count -ne 6) { throw 'Expected common-only deck with 6 slides' }
    foreach ($slideNumber in 1..6) {
        $slide = $presentation.Slides.Item($slideNumber)
        $slide.Export((Join-Path $previewRoot ('slide-{0:D2}.png' -f $slideNumber)), 'PNG', 1920, 1080)
        if ($Mode -ne 'before' -and $slideNumber -ge 2) {
            foreach ($shape in $slide.Shapes) {
                if ($shape.Left -lt -0.5 -or $shape.Top -lt -0.5 -or ($shape.Left + $shape.Width) -gt $presentation.PageSetup.SlideWidth + 0.5 -or ($shape.Top + $shape.Height) -gt $presentation.PageSetup.SlideHeight + 0.5) {
                    $outside += [ordered]@{slide=$slideNumber; name=$shape.Name; left=$shape.Left; top=$shape.Top; width=$shape.Width; height=$shape.Height}
                }
                if ($shape.HasTextFrame -eq -1 -and $shape.TextFrame2.HasText -eq -1) {
                    $range = $shape.TextFrame2.TextRange
                    if ($range.BoundHeight -gt $shape.Height + 1.5 -or $range.BoundWidth -gt $shape.Width + 1.5) {
                        $overflow += [ordered]@{slide=$slideNumber; name=$shape.Name; text=$range.Text; width=$shape.Width; height=$shape.Height; bound_width=$range.BoundWidth; bound_height=$range.BoundHeight}
                    }
                }
            }
        }
    }
    if ($Mode -eq 'before') {
        $presentation.Slides.Item(7).Export((Join-Path $previewRoot 'lens-boundary-07.png'), 'PNG', 1920, 1080)
    } else {
        $pdfPath = [IO.Path]::ChangeExtension($path, '.pdf')
        $presentation.SaveAs($pdfPath, 32)
        [ordered]@{slides=$presentation.Slides.Count; overflow=@($overflow); outside=@($outside); pdf=$pdfPath} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $workRoot 'render_validation.json') -Encoding UTF8
    }
    Write-Output ('Rendered mode ' + $Mode + ': slides=' + $presentation.Slides.Count + ', overflow=' + $overflow.Count + ', outside=' + $outside.Count)
} finally {
    if ($null -ne $presentation) { $presentation.Close(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($presentation) }
    $app.Quit()
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($app)
}
if ((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLower() -ne $snapshot.sha256) { throw 'Original source was modified' }
