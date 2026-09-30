$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location -LiteralPath $root
. (Join-Path $PSScriptRoot 'bootstrap.ps1')
function Run([string]$Program,[string[]]$Arguments) {
  & $Program @Arguments
  if($LASTEXITCODE -ne 0){throw "$Program failed with exit code $LASTEXITCODE"}
}
foreach($tool in @('node','pnpm','cargo','rustc','cl','link','php')){
  if(-not (Get-Command $tool -ErrorAction SilentlyContinue)){throw "Missing $tool. Run from an x64 Visual Studio Developer PowerShell with Node, pnpm and Rust installed. See README.md."}
}
if(-not $env:WEBBIT_WEBVIEW2_DIR){throw 'Set WEBBIT_WEBVIEW2_DIR to an extracted Microsoft WebView2 Fixed Version x64 runtime folder containing msedgewebview2.exe. Portable releases must include their runtime.'}
$runtime=(Resolve-Path -LiteralPath $env:WEBBIT_WEBVIEW2_DIR).Path
if(-not (Test-Path -LiteralPath (Join-Path $runtime 'msedgewebview2.exe') -PathType Leaf)){throw 'The fixed runtime folder does not contain msedgewebview2.exe.'}
# Unique output directories avoid overwriting an earlier release.
$stamp=Get-Date -Format 'yyyyMMdd-HHmmss-fff'
$release=Join-Path $root "dist-release\$stamp"
$stage=Join-Path $release 'portable'
New-Item -ItemType Directory -Path $stage -Force | Out-Null
Run pnpm @('install','--frozen-lockfile')
Run pnpm @('test')
Run php @('manager-runtime/tests/security.php')
Run php @('manager-runtime/tests/content.php')
Run php @('manager-runtime/tests/uploads.php')
Run node @('scripts/test-manager-http.mjs')
Run node @('scripts/test-members-http.mjs')
Run cargo @('test','--locked','--manifest-path','src-tauri/Cargo.toml')
$metadata=Join-Path $release 'cargo-metadata.json'
$nativeMetadata=& cargo metadata --locked --manifest-path src-tauri/Cargo.toml --format-version 1 --filter-platform x86_64-pc-windows-msvc
if($LASTEXITCODE -ne 0){throw 'Cargo metadata failed'}
[IO.File]::WriteAllText($metadata,($nativeMetadata -join "`n"))
Run node @('scripts/generate-notices.mjs',$metadata)
if(-not (Select-String -LiteralPath 'THIRD-PARTY-NOTICES.md' -Pattern '^None missing from this installed dependency inventory\.$' -Quiet)){throw 'Dependency license texts are incomplete. Resolve the review entries in THIRD-PARTY-NOTICES.md before distributing.'}
# Regenerate the proportional bitmap artwork and current license notices.
& (Join-Path $PSScriptRoot 'generate-installer-art.ps1')
# NSIS checks for WebView2 and downloads the bootstrapper only if the runtime is missing.
Run pnpm @('tauri','build','--bundles','nsis','--','--locked')
$installers=@(Get-ChildItem -LiteralPath 'src-tauri/target/release/bundle/nsis' -Filter '*_x64-setup.exe')
if($installers.Count -ne 1){throw 'Expected exactly one x64 NSIS installer; inspect the bundle directory.'}
Copy-Item -LiteralPath $installers[0].FullName -Destination (Join-Path $release 'Webbit-Beta-1-Setup.exe')
# A separate executable embeds the relative Fixed Version runtime path.
$runtimeName="webview2-$stamp"
$runtimeStage=Join-Path $root "src-tauri\$runtimeName"
Copy-Item -LiteralPath $runtime -Destination $runtimeStage -Recurse
$override=Join-Path $release 'portable.config.json'
[IO.File]::WriteAllText($override,(@{bundle=@{windows=@{webviewInstallMode=@{type='fixedRuntime';path=$runtimeName}}}} | ConvertTo-Json -Depth 10))
Run pnpm @('tauri','build','--no-bundle','--config',$override,'--','--locked')
Copy-Item -LiteralPath 'src-tauri/target/release/webbit.exe' -Destination (Join-Path $stage 'Webbit.exe')
Copy-Item -LiteralPath $runtimeStage -Destination (Join-Path $stage $runtimeName) -Recurse
foreach($item in @('help','licenses','LICENSE','PROPRIETARY-ASSETS.md','THIRD-PARTY-NOTICES.md')){Copy-Item -LiteralPath (Join-Path $root $item) -Destination $stage -Recurse}
$manifest=@{product='Webbit Beta 1';builtAt=(Get-Date).ToUniversalTime().ToString('o');target='x86_64-pc-windows-msvc';runtime=(Get-Item -LiteralPath (Join-Path $runtime 'msedgewebview2.exe')).VersionInfo.FileVersion;node=(& node --version);pnpm=(& pnpm --version);rust=(& rustc --version);locks=@{pnpm=(Get-WebbitHash (Join-Path $root 'pnpm-lock.yaml'));cargo=(Get-WebbitHash (Join-Path $root 'src-tauri/Cargo.lock'))}}
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $stage 'build-manifest.json')
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$zipStream=[IO.File]::Open((Join-Path $release 'Webbit-Beta-1-Portable.zip'),[IO.FileMode]::CreateNew)
$zipArchive=[IO.Compression.ZipArchive]::new($zipStream,[IO.Compression.ZipArchiveMode]::Create)
try {
  foreach($item in Get-ChildItem -LiteralPath $stage -File -Recurse -Force){
    $entryName=$item.FullName.Substring($stage.Length+1).Replace('\','/')
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zipArchive,$item.FullName,$entryName,[IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
} finally {$zipArchive.Dispose();$zipStream.Dispose()}
Get-ChildItem -LiteralPath $release -File | Where-Object {$_.Extension -in '.exe','.zip'} | ForEach-Object {@{Hash=(Get-WebbitHash $_.FullName);File=$_.Name}} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $release 'SHA256SUMS.json')
Write-Host "Release files: $release"
Write-Host 'Test both packages on clean Windows machines before publishing. No developer toolchain is included.'
