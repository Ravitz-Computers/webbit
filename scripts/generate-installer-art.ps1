$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Add-Type -AssemblyName System.Drawing
$logo=[Drawing.Image]::FromFile((Join-Path $root 'src-tauri/icons/icon.png'))
function New-Art([string]$name,[int]$width,[int]$height,[bool]$sidebar){
 $bmp=[Drawing.Bitmap]::new($width*3,$height*3,[Drawing.Imaging.PixelFormat]::Format24bppRgb)
 $g=[Drawing.Graphics]::FromImage($bmp)
 try {
  $g.ScaleTransform(3,3)
  $g.SmoothingMode='AntiAlias';$g.InterpolationMode='HighQualityBicubic';$g.TextRenderingHint='AntiAliasGridFit'
  if($sidebar){
   $g.Clear([Drawing.ColorTranslator]::FromHtml('#171827'))
   $bg=[Drawing.Drawing2D.LinearGradientBrush]::new([Drawing.Point]::new(0,0),[Drawing.Point]::new(164,400),[Drawing.ColorTranslator]::FromHtml('#28223e'),[Drawing.ColorTranslator]::FromHtml('#111722'))
   $g.FillRectangle($bg,0,0,164,400);$bg.Dispose()
   $accent=[Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#b59aff'));$muted=[Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#c5bddc'))
   $g.FillRectangle($accent,18,25,30,3)
   $f=[Drawing.Font]::new('Segoe UI',22,[Drawing.FontStyle]::Bold,[Drawing.GraphicsUnit]::Pixel);$g.DrawString('WEBBIT',$f,[Drawing.Brushes]::White,15,40);$f.Dispose()
   $f=[Drawing.Font]::new('Segoe UI',10,[Drawing.FontStyle]::Regular,[Drawing.GraphicsUnit]::Pixel);$g.DrawString('RAVITZ COMPUTERS',$f,$muted,18,72);$f.Dispose()
   # The square source is already proportionally padded from the original SVG.
   $g.DrawImage($logo,[Drawing.RectangleF]::new(15,135,134,134))
   $f=[Drawing.Font]::new('Segoe UI',12,[Drawing.FontStyle]::Regular,[Drawing.GraphicsUnit]::Pixel);$g.DrawString('Build it visually.',$f,[Drawing.Brushes]::White,18,330);$g.DrawString('Make it your own.',$f,$muted,18,350);$f.Dispose()
   $accent.Dispose();$muted.Dispose()
  }else{
   $g.Clear([Drawing.Color]::White);$g.DrawImage($logo,[Drawing.RectangleF]::new(3,4,49,49))
   $ink=[Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#302443'));$f=[Drawing.Font]::new('Segoe UI',17,[Drawing.FontStyle]::Bold,[Drawing.GraphicsUnit]::Pixel);$g.DrawString('WEBBIT',$f,$ink,55,12);$f.Dispose()
   $f=[Drawing.Font]::new('Segoe UI',9,[Drawing.FontStyle]::Regular,[Drawing.GraphicsUnit]::Pixel);$g.DrawString('BETA 1',$f,$ink,57,33);$f.Dispose();$ink.Dispose()
  }
  $bmp.Save((Join-Path $root "installer/$name.bmp"),[Drawing.Imaging.ImageFormat]::Bmp)
  $bmp.Save((Join-Path $root "installer/$name.png"),[Drawing.Imaging.ImageFormat]::Png)
 }finally{$g.Dispose();$bmp.Dispose()}
}
try{New-Art 'sidebar' 164 400 $true;New-Art 'header' 150 57 $false}finally{$logo.Dispose()}
Write-Host 'Installer artwork: 3x 24-bit BMPs, opaque backgrounds, proportionally fitted vector-derived logo.'

$notice=@('WEBBIT BETA 1 - LICENSES & ARTWORK','','Webbit source code is licensed under MIT. Vinny, Ravitz logos, medallion and branding are proprietary and excluded from MIT.','',(Get-Content -Raw -LiteralPath (Join-Path $root 'LICENSE')),'','PROPRIETARY ARTWORK','',(Get-Content -Raw -LiteralPath (Join-Path $root 'PROPRIETARY-ASSETS.md')),'','THIRD-PARTY SOFTWARE','','Third-party components retain their own licenses and copyright notices. The complete inventory is installed as THIRD-PARTY-NOTICES.md, with individual texts in the licenses folder. These are also included in the portable package and available through Help / About.','','Microsoft WebView2 is a separate Microsoft runtime with its own applicable terms. Setup checks for it and downloads it only if missing.') -join "`r`n"
[IO.File]::WriteAllText((Join-Path $root 'installer/LICENSES.txt'),$notice,[Text.UTF8Encoding]::new($true))
