$ErrorActionPreference = 'Stop'
$projectRoot = 'C:\Users\kdt66\Desktop\FoldedVision_AI'
$workRoot = Join-Path $projectRoot 'outputs\cleanup_records\presentation_history\ring_consolidation_2026-11-27'
$backupRoot = Join-Path $projectRoot 'archive\2026-11-27_before_ring_consolidation'
$previewRoot = Join-Path $workRoot 'previews'
New-Item -ItemType Directory -Path $previewRoot -Force | Out-Null
$app = New-Object -ComObject PowerPoint.Application
$presentation = $null
$overflow = @()
try {
    $presentation = $app.Presentations.Open((Get-ChildItem -LiteralPath $backupRoot -Filter *.pptx).FullName, -1, 0, 0)
    foreach ($slideNumber in @(1,15,26,50)) {
        $presentation.Slides.Item($slideNumber).Export((Join-Path $backupRoot ('ring_previews\outside-{0:D2}.png' -f $slideNumber)), 'PNG', 1600, 900)
    }
    $presentation.Close()
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($presentation)
    $presentation = $null
    $presentation = $app.Presentations.Open((Join-Path $workRoot 'revised.pptx'), -1, 0, 0)
    if ($presentation.Slides.Count -ne 49) { throw 'Unexpected slide count' }
    foreach ($slideNumber in @((16..24) + @(1,15,25,49))) {
        $slide = $presentation.Slides.Item($slideNumber)
        $slide.Export((Join-Path $previewRoot ('slide-{0:D2}.png' -f $slideNumber)), 'PNG', 1600, 900)
        if ($slideNumber -ge 16 -and $slideNumber -le 24) {
            foreach ($shape in $slide.Shapes) {
                if ($shape.HasTextFrame -eq -1 -and $shape.TextFrame2.HasText -eq -1) {
                    $range = $shape.TextFrame2.TextRange
                    $boundHeight = [double]$range.BoundHeight
                    $boundWidth = [double]$range.BoundWidth
                    if ($boundHeight -gt [double]$shape.Height + 1.5 -or $boundWidth -gt [double]$shape.Width + 1.5) {
                        $overflow += [ordered]@{slide=$slideNumber; name=$shape.Name; text=$range.Text; shape_width=$shape.Width; shape_height=$shape.Height; text_width=$boundWidth; text_height=$boundHeight}
                    }
                }
            }
        }
    }
    [ordered]@{slides=$presentation.Slides.Count; ring_rendered=9; overflow_candidates=@($overflow)} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $workRoot 'powerpoint_render.json') -Encoding UTF8
    Write-Output ('Rendered 9 revised Ring slides and 4 unchanged-part samples. Overflow candidates: ' + $overflow.Count)
} finally {
    if ($null -ne $presentation) { $presentation.Close(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($presentation) }
    $app.Quit()
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($app)
}
$scriptApp = New-Object -ComObject PowerPoint.Application
$scriptPresentation = $null
function Add-ScriptText {
    param($Slide, [string]$Text, [single]$Top, [single]$Size, [int]$Ink, [bool]$Bold = $false)
    $textShape = $Slide.Shapes.AddTextbox(1, 51, $Top, 493, 20)
    $textShape.TextFrame.MarginLeft = 0
    $textShape.TextFrame.MarginRight = 0
    $textShape.TextFrame.MarginTop = 0
    $textShape.TextFrame.MarginBottom = 0
    $textShape.TextFrame.WordWrap = -1
    $textShape.TextFrame.TextRange.Text = $Text
    $textShape.TextFrame.TextRange.Font.Name = 'Malgun Gothic'
    $textShape.TextFrame.TextRange.Font.Size = $Size
    $textShape.TextFrame.TextRange.Font.Color.RGB = $Ink
    $textShape.TextFrame.TextRange.Font.Bold = $(if ($Bold) {-1} else {0})
    $textShape.TextFrame.TextRange.ParagraphFormat.LineRuleWithin = -1
    $textShape.TextFrame.TextRange.ParagraphFormat.SpaceWithin = 1.3
    $textShape.TextFrame2.AutoSize = 1
    $textShape.Height = [single]$textShape.TextFrame2.TextRange.BoundHeight + 2
    return $textShape
}
try {
    $scriptContent = Get-Content -LiteralPath (Join-Path $workRoot 'content.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    $scriptPresentation = $scriptApp.Presentations.Add(0)
    $scriptPresentation.PageSetup.SlideWidth = 595.276
    $scriptPresentation.PageSetup.SlideHeight = 841.89
    $scriptPreviewRoot = Join-Path $workRoot 'script_previews'
    New-Item -ItemType Directory -Path $scriptPreviewRoot -Force | Out-Null
    $navy = 77 * 65536 + 50 * 256 + 23
    $teal = 163 * 65536 + 141 * 256
    $gray = 139 * 65536 + 117 * 256 + 89
    for ($page = 0; $page -lt 3; $page++) {
        $scriptSlide = $scriptPresentation.Slides.Add($page + 1, 12)
        $scriptSlide.FollowMasterBackground = 0
        $scriptSlide.Background.Fill.ForeColor.RGB = 16777215
        $head = Add-ScriptText $scriptSlide 'FoldedVision AI / Ring' 46 18 $navy $true
        $sub = Add-ScriptText $scriptSlide ($scriptContent.speaker + ' | 2026-11-27 | PPT 16-24') 77 9 $gray
        $cursor = [single]108
        foreach ($sectionIndex in ($page * 3)..($page * 3 + 2)) {
            $section = $scriptContent.sections[$sectionIndex]
            $title = Add-ScriptText $scriptSlide ($section.slide.ToString() + '  ' + $section.title) $cursor 13 $teal $true
            $cursor += $title.Height + 5
            $cue = Add-ScriptText $scriptSlide $section.cue $cursor 9 $gray
            $cursor += $cue.Height + 7
            foreach ($paragraph in $section.speech) {
                $body = Add-ScriptText $scriptSlide $paragraph $cursor 10.5 $navy
                $cursor += $body.Height + 7
            }
            $cursor += 13
        }
        if ($cursor -gt 787) { throw ('Script page overflow: ' + ($page + 1) + ' at ' + $cursor) }
        $foot = Add-ScriptText $scriptSlide (($page + 1).ToString() + ' / 3') 797 9 $gray
        $scriptSlide.Export((Join-Path $scriptPreviewRoot ('script-{0}.png' -f ($page + 1))), 'PNG', 892, 1263)
    }
    $scriptPresentation.SaveAs((Join-Path $workRoot 'script.pdf'), 32)
    $scriptPresentation.Saved = -1
    Write-Output ('Rewritten script PDF pages: ' + $scriptPresentation.Slides.Count)
} finally {
    if ($null -ne $scriptPresentation) { $scriptPresentation.Close(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($scriptPresentation) }
    $scriptApp.Quit()
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($scriptApp)
}
