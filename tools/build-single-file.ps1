# Builds dist\FRC-Manager.html: the whole game (HTML, CSS and all scripts) in one file you can share.
# Run from anywhere:  powershell -NoProfile -ExecutionPolicy Bypass -File tools\build-single-file.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$scripts = @(
  'js/core.js', 'js/data/seasons.js', 'js/data/world.js',
  'js/sim/engine.js', 'js/sim/rules.js', 'js/sim/ai.js', 'js/sim/event.js',
  'js/systems/robot.js', 'js/systems/career.js', 'js/systems/shop.js', 'js/systems/news.js', 'js/render/draw.js',
  'js/ui/ui.js', 'js/ui/screens-event.js', 'js/ui/screens-menu.js',
  'js/dev.js', 'js/local.js'
)
function Read-Utf8($rel) { [IO.File]::ReadAllText((Join-Path $root $rel), [Text.Encoding]::UTF8) }

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine('<!doctype html>')
[void]$sb.AppendLine('<html lang="en">')
[void]$sb.AppendLine('<head>')
[void]$sb.AppendLine('<meta charset="utf-8">')
[void]$sb.AppendLine('<meta name="viewport" content="width=device-width, initial-scale=1">')
[void]$sb.AppendLine('<title>FRC Manager</title>')
[void]$sb.AppendLine('<style>')
[void]$sb.AppendLine((Read-Utf8 'css/style.css'))
[void]$sb.AppendLine('</style>')
[void]$sb.AppendLine('</head>')
[void]$sb.AppendLine('<body>')
[void]$sb.AppendLine('<div id="app"></div>')
foreach ($f in $scripts) {
  $js = Read-Utf8 $f
  if ($js -match '</script') { throw "$f contains '</script' and cannot be inlined" }
  [void]$sb.AppendLine("<script>/* $f */")
  [void]$sb.AppendLine($js)
  [void]$sb.AppendLine('</script>')
}
[void]$sb.AppendLine('<script>')
[void]$sb.AppendLine("window.addEventListener('error', e => { try { G.UI.toast('Error: ' + e.message, 'bad'); } catch (_) {} });")
[void]$sb.AppendLine("G.UI.go('menu');")
[void]$sb.AppendLine('</script>')
[void]$sb.AppendLine('</body>')
[void]$sb.AppendLine('</html>')

$dist = Join-Path $root 'dist'
New-Item -ItemType Directory -Force $dist | Out-Null
$out = Join-Path $dist 'FRC-Manager.html'
[IO.File]::WriteAllText($out, $sb.ToString(), (New-Object Text.UTF8Encoding($false)))
$kb = [Math]::Round((Get-Item $out).Length / 1KB)
Write-Host "Built $out ($kb KB)"
