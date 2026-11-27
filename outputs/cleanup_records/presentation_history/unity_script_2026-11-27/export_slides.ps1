$ErrorActionPreference = 'Stop'
$projectRoot = 'C:\Users\kdt66\Desktop\FoldedVision_AI'
$workRoot = Join-Path $projectRoot 'outputs\cleanup_records\presentation_history\unity_script_2026-11-27'
$source = @(Get-ChildItem -LiteralPath 'C:\Users\kdt66\Downloads' -Filter 'FoldedVision_* (2).pptx')
if ($source.Count -ne 1) { throw 'Expected one latest user deck' }
$source = $source[0]
$previewRoot = Join-Path $workRoot 'slide_previews'
New-Item -ItemType Directory -Path $previewRoot -Force | Out-Null
$beforeHash = (Get-FileHash -LiteralPath $source.FullName -Algorithm SHA256).Hash
$app = New-Object -ComObject PowerPoint.Application
$presentation = $null
$bounds = @()
try {
    $presentation = $app.Presentations.Open($source.FullName, -1, 0, 0)
    if ($presentation.Slides.Count -ne 45) { throw 'Expected latest user deck with 45 slides' }
    foreach ($slideNumber in 40..45) {
        $slide = $presentation.Slides.Item($slideNumber)
        $slide.Export((Join-Path $previewRoot ('slide-{0:D2}.png' -f $slideNumber)), 'PNG', 1600, 900)
        foreach ($shape in $slide.Shapes) {
            if ($shape.HasTextFrame -eq -1 -and $shape.TextFrame2.HasText -eq -1) {
                $range = $shape.TextFrame2.TextRange
                if ($range.BoundHeight -gt $shape.Height + 2 -or $range.BoundWidth -gt $shape.Width + 2) {
                    $bounds += [ordered]@{slide=$slideNumber; name=$shape.Name; text=$range.Text; height=$shape.Height; width=$shape.Width; text_height=$range.BoundHeight; text_width=$range.BoundWidth}
                }
            }
        }
    }
} finally {
    if ($null -ne $presentation) { $presentation.Close(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($presentation) }
    $app.Quit()
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($app)
}
$afterHash = (Get-FileHash -LiteralPath $source.FullName -Algorithm SHA256).Hash
if ($beforeHash -ne $afterHash) { throw 'Source deck changed' }
[ordered]@{source=$source.FullName; sha256=$afterHash.ToLower(); slides=45; rendered=@(40..45); source_unchanged=$true; overflow_candidates=@($bounds)} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $workRoot 'render_validation.json') -Encoding UTF8
Write-Output ('Exported Unity slides 40-45. Source unchanged. Text overflow candidates: ' + $bounds.Count)
