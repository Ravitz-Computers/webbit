$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if(-not $env:HARE_PATH){throw 'Set HARE_PATH to the supplied HARE checkout.'}
$hare=(Resolve-Path -LiteralPath $env:HARE_PATH).Path
$dest=Join-Path $root 'public/hare'
$mapping=@{'hello.png'='src/assets/vinny/hello.png';'investigating.png'='src/assets/vinny/investigating.png';'love.png'='src/assets/vinny/love.png';'badge-rgb.png'='src/assets/vinny/badge-rgb.png';'ravitz-logo.png'='src/assets/ravitz-logo.png'}
foreach($name in @('hello','investigating','love','logo-no-words')){$mapping[$name+'.svg']='src/assets/vinny/dark/'+$name+'.svg'}
foreach($name in $mapping.Keys){if(-not(Test-Path -LiteralPath (Join-Path $hare $mapping[$name]))){throw "Missing asset: $($mapping[$name])"}}
New-Item -ItemType Directory -Force -Path $dest | Out-Null
foreach($name in $mapping.Keys){Copy-Item -LiteralPath (Join-Path $hare $mapping[$name]) -Destination (Join-Path $dest $name) -Force}
Write-Host 'Copied the approved HARE bitmap and vector assets. Update provenance and regenerate icons before release.'
