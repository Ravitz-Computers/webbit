param([string]$Destination=(Join-Path $PSScriptRoot '../dist-release'))
$ErrorActionPreference='Stop'
$sourceRoot=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
New-Item -ItemType Directory -Force -Path $Destination | Out-Null
$destinationRoot=(Resolve-Path -LiteralPath $Destination).Path
$archivePath=Join-Path $destinationRoot ('Webbit-Beta-1-Source-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.zip')
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$stream=[IO.File]::Open($archivePath,[IO.FileMode]::CreateNew)
$archive=[IO.Compression.ZipArchive]::new($stream,[IO.Compression.ZipArchiveMode]::Create)
$script:sourceCount=0
function Add-SourceFolder([string]$Folder){
  foreach($item in Get-ChildItem -LiteralPath $Folder -Force){
    if($item.Attributes -band [IO.FileAttributes]::ReparsePoint){continue}
    if($item.PSIsContainer){
      if($item.Name -in @('node_modules','target','dist','dist-release','.git','.webbit') -or $item.Name -like 'webview2-*' -or $item.FullName -eq $destinationRoot){continue}
      Add-SourceFolder $item.FullName
    }else{
      if($item.Extension -eq '.log' -or $item.Name -like '.env*' -or $item.FullName -eq $archivePath){continue}
      $relative=$item.FullName.Substring($sourceRoot.Length+1).Replace('\','/')
      [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive,$item.FullName,"Webbit-Beta-1/$relative",[IO.Compression.CompressionLevel]::Optimal) | Out-Null
      $script:sourceCount++
    }
  }
}
try{Add-SourceFolder $sourceRoot}finally{$archive.Dispose();$stream.Dispose()}
$hash=[Security.Cryptography.SHA256]::Create()
$inputStream=[IO.File]::OpenRead($archivePath)
try{$digest=[BitConverter]::ToString($hash.ComputeHash($inputStream)).Replace('-','')}finally{$inputStream.Dispose();$hash.Dispose()}
[IO.File]::WriteAllText("$archivePath.sha256","$digest  $([IO.Path]::GetFileName($archivePath))`n")
Write-Host "Source archive: $archivePath ($script:sourceCount files)"


