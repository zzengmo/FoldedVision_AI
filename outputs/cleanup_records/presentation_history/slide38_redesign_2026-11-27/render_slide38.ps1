$ErrorActionPreference='Stop'
$projectRoot='C:\Users\kdt66\Desktop\FoldedVision_AI'
$workRoot=Join-Path $projectRoot 'outputs\cleanup_records\presentation_history\slide38_redesign_2026-11-27'
$outputRoot=Join-Path $projectRoot 'outputs\presentation'
$source=Get-ChildItem -LiteralPath 'C:\Users\kdt66\Downloads' -Filter 'FoldedVision_* (2).pptx' | Select-Object -First 1
$output=Get-ChildItem -LiteralPath $outputRoot -Filter 'FoldedVision_38*.pptx' | Select-Object -First 1
$app=New-Object -ComObject PowerPoint.Application
$presentation=$null
try {
    $presentation=$app.Presentations.Open($source.FullName,-1,0,0)
    $presentation.Slides.Item(38).Export((Join-Path $workRoot 'before.png'),'PNG',1920,1080)
    $presentation.Close()
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($presentation)
    $presentation=$null
    $presentation=$app.Presentations.Open($output.FullName,-1,0,0)
    if ($presentation.Slides.Count -ne 1) {throw 'Expected exactly one slide'}
    $previewPath=[IO.Path]::ChangeExtension($output.FullName,'.png')
    $presentation.Slides.Item(1).Export($previewPath,'PNG',1920,1080)
    $presentation.SaveAs([IO.Path]::ChangeExtension($output.FullName,'.pdf'),32)
    $overflow=@()
    foreach ($shape in $presentation.Slides.Item(1).Shapes) {
        if ($shape.HasTextFrame -eq -1 -and $shape.TextFrame2.HasText -eq -1) {
            $t=$shape.TextFrame2.TextRange
            if ($t.BoundHeight -gt $shape.Height+1.5 -or $t.BoundWidth -gt $shape.Width+1.5) {
                $overflow += [ordered]@{name=$shape.Name;text=$t.Text;height=$shape.Height;bound_height=$t.BoundHeight;width=$shape.Width;bound_width=$t.BoundWidth}
            }
        }
    }
    [ordered]@{slides=$presentation.Slides.Count;overflow=@($overflow);preview=$previewPath} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $workRoot 'render.json') -Encoding UTF8
    Write-Output ('Rendered slide 38. Overflow candidates: '+$overflow.Count)
} finally {
    if ($null -ne $presentation) {$presentation.Close();[void][Runtime.InteropServices.Marshal]::ReleaseComObject($presentation)}
    $app.Quit()
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($app)
}
