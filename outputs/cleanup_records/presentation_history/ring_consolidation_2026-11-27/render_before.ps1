$ErrorActionPreference = 'Stop'
$projectRoot = 'C:\Users\kdt66\Desktop\FoldedVision_AI'
$backupRoot = Join-Path $projectRoot 'archive\2026-11-27_before_ring_consolidation'
$previewRoot = Join-Path $backupRoot 'ring_previews'
New-Item -ItemType Directory -Path $previewRoot -Force | Out-Null
$app = New-Object -ComObject PowerPoint.Application
$presentation = $null
try {
    $presentation = $app.Presentations.Open((Get-ChildItem -LiteralPath $backupRoot -Filter *.pptx).FullName, -1, 0, 0)
    foreach ($slideNumber in 16..25) {
        $presentation.Slides.Item($slideNumber).Export((Join-Path $previewRoot ('slide-{0:D2}.png' -f $slideNumber)), 'PNG', 1600, 900)
    }
    Write-Output ('Rendered original Ring slides. Total slides: ' + $presentation.Slides.Count)
} finally {
    if ($null -ne $presentation) { $presentation.Close(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($presentation) }
    $app.Quit()
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($app)
}
