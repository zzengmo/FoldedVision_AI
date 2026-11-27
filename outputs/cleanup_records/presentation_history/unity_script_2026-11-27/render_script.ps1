$ErrorActionPreference = 'Stop'
$projectRoot = 'C:\Users\kdt66\Desktop\FoldedVision_AI'
$workRoot = Join-Path $projectRoot 'outputs\cleanup_records\presentation_history\unity_script_2026-11-27'
$content = Get-Content -LiteralPath (Join-Path $workRoot 'content.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$outputRoot = Join-Path $projectRoot 'outputs\presentation'
$pdfPath = Join-Path $outputRoot ($content.output_stem + '.pdf')
if (Test-Path -LiteralPath $pdfPath) { throw 'Output exists; preserve it before regeneration' }
$previewRoot = Join-Path $workRoot 'script_previews'
New-Item -ItemType Directory -Path $previewRoot -Force | Out-Null
$navy = 77 * 65536 + 50 * 256 + 23
$teal = 130 * 65536 + 119 * 256
$gray = 125 * 65536 + 107 * 256 + 88
$light = 245 * 65536 + 241 * 256 + 237
$app = New-Object -ComObject PowerPoint.Application
$presentation = $null
$pageMetrics = @()
function Add-Text {
    param($Slide, [string]$Text, [single]$Top, [single]$Size, [int]$Ink, [bool]$Bold = $false)
    $shape = $Slide.Shapes.AddTextbox(1, 48, $Top, 499.3, 20)
    $shape.TextFrame.MarginLeft = 0
    $shape.TextFrame.MarginRight = 0
    $shape.TextFrame.MarginTop = 0
    $shape.TextFrame.MarginBottom = 0
    $shape.TextFrame.WordWrap = -1
    $shape.TextFrame.TextRange.Text = $Text
    $shape.TextFrame.TextRange.Font.Name = 'Malgun Gothic'
    $shape.TextFrame.TextRange.Font.Size = $Size
    $shape.TextFrame.TextRange.Font.Color.RGB = $Ink
    $shape.TextFrame.TextRange.Font.Bold = $(if ($Bold) {-1} else {0})
    $shape.TextFrame.TextRange.ParagraphFormat.LineRuleWithin = -1
    $shape.TextFrame.TextRange.ParagraphFormat.SpaceWithin = 1.3
    $shape.TextFrame2.AutoSize = 1
    $shape.Height = [single]$shape.TextFrame2.TextRange.BoundHeight + 2
    return $shape
}
try {
    $presentation = $app.Presentations.Add(0)
    $presentation.PageSetup.SlideWidth = 595.276
    $presentation.PageSetup.SlideHeight = 841.89
    for ($page = 0; $page -lt 2; $page++) {
        $slide = $presentation.Slides.Add($page + 1, 12)
        $slide.FollowMasterBackground = 0
        $slide.Background.Fill.ForeColor.RGB = 16777215
        $head = Add-Text $slide $content.title 43 18 $navy $true
        $sub = Add-Text $slide $content.subtitle 75 9 $gray
        $cursor = [single]106
        if ($page -eq 0) {
            $judgment = Add-Text $slide $content.judgment $cursor 9 $gray
            $cursor += $judgment.Height + 15
        }
        foreach ($sectionIndex in ($page * 3)..($page * 3 + 2)) {
            $section = $content.sections[$sectionIndex]
            $title = Add-Text $slide ($section.slide.ToString() + '  ' + $section.title) $cursor 12.5 $teal $true
            $cursor += $title.Height + 4
            $cue = Add-Text $slide $section.cue $cursor 8.5 $gray
            $cursor += $cue.Height + 7
            for ($paragraphIndex = 0; $paragraphIndex -lt $section.speech.Count; $paragraphIndex++) {
                $body = Add-Text $slide $section.speech[$paragraphIndex] $cursor 11 $navy
                $cursor += $body.Height + 7
                if ($section.PSObject.Properties.Name -contains 'pause_after_paragraph' -and $paragraphIndex -eq $section.pause_after_paragraph) {
                    $pause = Add-Text $slide $section.pause_label $cursor 9 $teal
                    $cursor += $pause.Height + 7
                }
            }
            $cursor += 14
        }
        if ($cursor -gt 768) { throw ('Script page overflow: ' + ($page + 1) + ', y=' + $cursor) }
        $footer = Add-Text $slide $content.source_label 781 8 $gray
        $pageNo = Add-Text $slide (($page + 1).ToString() + ' / 2') 799 8 $gray
        $slide.Export((Join-Path $previewRoot ('script-{0}.png' -f ($page + 1))), 'PNG', 1000, 1414)
        $pageMetrics += [ordered]@{page=$page+1; content_bottom=$cursor; limit=768}
    }
    $presentation.SaveAs($pdfPath, 32)
    $presentation.Saved = -1
    [ordered]@{pages=2; file=$pdfPath; page_metrics=$pageMetrics} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $workRoot 'script_render.json') -Encoding UTF8
    Write-Output ('Created script PDF: ' + $pdfPath)
} finally {
    if ($null -ne $presentation) { $presentation.Close(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($presentation) }
    $app.Quit()
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($app)
}
