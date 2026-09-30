param([switch]$SkipCompiler, [switch]$SkipWebView)
$ErrorActionPreference='Stop'
[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
$cache=Join-Path $env:LOCALAPPDATA 'Webbit\BuildTools'
New-Item -ItemType Directory -Force -Path $cache | Out-Null
function Get-WebbitHash([string]$File){
  $algorithm=[Security.Cryptography.SHA256]::Create()
  $stream=[IO.File]::OpenRead([IO.Path]::GetFullPath($File))
  try{return [BitConverter]::ToString($algorithm.ComputeHash($stream)).Replace('-','')}finally{$stream.Dispose();$algorithm.Dispose()}
}
function Download([string]$Url,[string]$File,[string]$Sha256='') {
  if(-not(Test-Path -LiteralPath $File)){
    Write-Host "Downloading $([IO.Path]::GetFileName($File))"
    Invoke-WebRequest -UseBasicParsing -Uri $Url -OutFile "$File.part"
    Move-Item -LiteralPath "$File.part" -Destination $File -Force
  }
  if($Sha256 -and (Get-WebbitHash $File) -ne $Sha256){throw "Checksum mismatch: $File. Remove this cached file and retry."}
}
function MicrosoftSignature([string]$File){
  $signature=Get-AuthenticodeSignature -LiteralPath $File
  if($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'O=Microsoft Corporation'){throw "Microsoft signature verification failed: $File"}
}
function Checked([string]$Program,[string[]]$Arguments){
  & $Program @Arguments
  if($LASTEXITCODE -ne 0){throw "$Program exited with $LASTEXITCODE"}
}
if(-not [Environment]::Is64BitOperatingSystem){throw 'Webbit builds require 64-bit Windows.'}

# Only the compiler/SDK is installed machine-wide. Other tools remain in Webbit's cache.
if(-not $SkipCompiler){
  $vswhere=Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
  $installation=$null
  if(Test-Path -LiteralPath $vswhere){$installation=& $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath}
  if(-not $installation){
    $installer=Join-Path $cache 'vs_buildtools.exe'
    Download 'https://aka.ms/vs/17/release/vs_buildtools.exe' $installer
    MicrosoftSignature $installer
    Write-Host 'Installing Microsoft C++ Build Tools and Windows SDK. Windows may request administrator approval. This can take several minutes.'
    $process=Start-Process -FilePath $installer -WindowStyle Hidden -ArgumentList '--quiet --wait --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended' -Wait -PassThru
    if($process.ExitCode -eq 3010){throw 'Microsoft Build Tools installed. Restart Windows, then run build.bat again.'}
    if($process.ExitCode -ne 0){throw "Microsoft Build Tools installer exited with $($process.ExitCode). Check its logs in TEMP, then rerun build.bat."}
    $installation=& $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
  }
  if(-not $installation){throw 'Microsoft C++ tools were not detected after installation.'}
  & (Join-Path $installation 'Common7\Tools\Launch-VsDevShell.ps1') -Arch amd64 -HostArch amd64 -SkipAutomaticLocation
}

$nodeVersion='24.21.0'
$nodeFolder=Join-Path $cache "node-v$nodeVersion-win-x64"
if(-not(Test-Path -LiteralPath (Join-Path $nodeFolder 'node.exe'))){
  $nodeZip=Join-Path $cache "node-v$nodeVersion-win-x64.zip"
  Download "https://nodejs.org/dist/v$nodeVersion/node-v$nodeVersion-win-x64.zip" $nodeZip '158f7685b44de51f6c0df1d153526cbcd3e1bc739a8dfc607721cef75de9e541'
  Expand-Archive -LiteralPath $nodeZip -DestinationPath $cache -Force
}
$env:PATH="$nodeFolder;$env:PATH"
$pnpmFolder=Join-Path $cache 'pnpm-11.19.0'
if(-not(Test-Path -LiteralPath (Join-Path $pnpmFolder 'pnpm.cmd'))){Checked (Join-Path $nodeFolder 'npm.cmd') @('install','--global','--prefix',$pnpmFolder,'--no-audit','--no-fund','--ignore-scripts','pnpm@11.19.0')}
$env:PATH="$pnpmFolder;$env:PATH"

$env:CARGO_HOME=Join-Path $cache 'cargo'
$env:RUSTUP_HOME=Join-Path $cache 'rustup'
$env:PATH="$(Join-Path $env:CARGO_HOME 'bin');$env:PATH"
if(-not(Test-Path -LiteralPath (Join-Path $env:CARGO_HOME 'bin\rustup.exe'))){
  $rustInstaller=Join-Path $cache 'rustup-init.exe'
  $checksum=(Invoke-WebRequest -UseBasicParsing 'https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe.sha256').Content
  if($checksum -is [byte[]]){$checksum=[Text.Encoding]::UTF8.GetString($checksum)}
  $checksum=($checksum.Trim() -split '\s+')[0]
  Download 'https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe' $rustInstaller $checksum
  $env:RUSTUP_INIT_SKIP_MSVC_CHECK='yes'
  Checked $rustInstaller @('-y','--no-modify-path','--profile','minimal','--default-toolchain','1.98.1')
}else{Checked rustup @('toolchain','install','1.98.1','--profile','minimal')}

$phpFolder=Join-Path $cache 'php-8.4.25'
if(-not(Test-Path -LiteralPath (Join-Path $phpFolder 'php.exe'))){
  $phpZip=Join-Path $cache 'php-8.4.25.zip'
  Download 'https://www.php.net/~windows/releases/php-8.4.25-nts-Win32-vs17-x64.zip' $phpZip '43a8f67ed2e5223fafb21293c85976361808855405278cef2cf3037c3ae2529c'
  Expand-Archive -LiteralPath $phpZip -DestinationPath $phpFolder -Force
}
@("extension_dir=`"$phpFolder\ext`"",'extension=sodium','extension=pdo_sqlite','extension=openssl','extension=gd','display_errors=Off','log_errors=On') | Set-Content -LiteralPath (Join-Path $phpFolder 'php.ini')
$env:PATH="$phpFolder;$env:PATH"
$env:PHPRC=$phpFolder

if(-not $SkipWebView -and -not $env:WEBBIT_WEBVIEW2_DIR){
  $runtimeMarker=Join-Path $cache 'webview2-runtime-path.txt'
  if(Test-Path -LiteralPath $runtimeMarker){$candidate=(Get-Content -LiteralPath $runtimeMarker -Raw).Trim();if(Test-Path -LiteralPath (Join-Path $candidate 'msedgewebview2.exe')){$env:WEBBIT_WEBVIEW2_DIR=$candidate}}
  if(-not $env:WEBBIT_WEBVIEW2_DIR){
    $page=(Invoke-WebRequest -UseBasicParsing 'https://developer.microsoft.com/en-us/microsoft-edge/webview2/').Content
    $urls=[regex]::Matches($page,'https[^"<> ]+\.cab') | ForEach-Object {$_.Value.Replace('\u002F','/')} | Where-Object {$_ -match '^https://msedge\.sf\.dl\.delivery\.mp\.microsoft\.com/.+/Microsoft\.WebView2\.FixedVersionRuntime\.[0-9.]+\.x64\.cab$'}
    $url=$urls | Sort-Object {[version]([regex]::Match($_,'Runtime\.([0-9.]+)\.x64').Groups[1].Value)} -Descending | Select-Object -First 1
    if(-not $url){throw 'Microsoft changed its runtime download page. Set WEBBIT_WEBVIEW2_DIR to an extracted official x64 Fixed Version runtime and rerun.'}
    $cab=Join-Path $cache ([IO.Path]::GetFileName($url))
    Download $url $cab
    $extract=Join-Path $cache ([IO.Path]::GetFileNameWithoutExtension($cab)+'-extracted')
    New-Item -ItemType Directory -Path $extract -Force | Out-Null
    Checked "$env:SystemRoot\System32\expand.exe" @($cab,'-F:*',$extract)
    $runtimeExe=Get-ChildItem -LiteralPath $extract -Filter msedgewebview2.exe -Recurse | Select-Object -First 1
    if(-not $runtimeExe){throw 'Fixed WebView2 runtime was not extracted correctly.'}
    MicrosoftSignature $runtimeExe.FullName
    $env:WEBBIT_WEBVIEW2_DIR=$runtimeExe.DirectoryName
    $env:WEBBIT_WEBVIEW2_DIR | Set-Content -LiteralPath $runtimeMarker
  }
}
Write-Host 'Webbit build prerequisites are ready.'
