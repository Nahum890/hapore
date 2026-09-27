# Inicia PyFis IA con un solo comando para una demo.
#
#   start.bat            -> versión de producción local (build + vite preview, con service worker)
#   start.bat dev        -> servidor de desarrollo (recarga en caliente)
#   start.bat mock       -> desarrollo + Supabase simulado local (probar clases/chat sin cuenta)
#
# Qué levanta:
#   - Vite (la app y el endpoint /api/chat, que usa GEMINI_API_KEY del archivo .env).
#   - Opcional (modo mock): supabase/mock-server.mjs en el puerto 54321.
# Supabase real NO se levanta acá: es un servicio en la nube (ver docs/PRESENTACION.md).
param([ValidateSet('preview', 'dev', 'mock')][string]$Mode = 'preview')

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Write-Step($text) { Write-Host "`n==> $text" -ForegroundColor Cyan }
function Write-Warn($text) { Write-Host "  ! $text" -ForegroundColor Yellow }
function Write-Fail($text) { Write-Host "`nERROR: $text" -ForegroundColor Red; Read-Host 'Presioná Enter para cerrar'; exit 1 }
function Test-Port($port) {
  try { return [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop) } catch { return $false }
}
function Get-LanIp {
  try {
    (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
      Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.PrefixOrigin -ne 'WellKnown' } |
      Select-Object -First 1).IPAddress
  } catch { $null }
}

Write-Step 'Revisando requisitos'
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { Write-Fail 'No se encontró Node.js. Instalá Node 20 o superior desde https://nodejs.org y volvé a intentar.' }
$nodeVersion = (& node -v)
Write-Host "  Node $nodeVersion"
if ([int]($nodeVersion.TrimStart('v').Split('.')[0]) -lt 20) { Write-Warn 'Se recomienda Node 20 o superior.' }

if (-not (Test-Path (Join-Path $root 'node_modules'))) {
  Write-Step 'Instalando dependencias (solo la primera vez)'
  & npm install
  if ($LASTEXITCODE -ne 0) { Write-Fail 'npm install falló. Revisá la conexión a internet y el mensaje de arriba.' }
}

$envFile = Join-Path $root '.env'
$envText = if (Test-Path $envFile) { Get-Content $envFile -Raw } else { '' }
if (-not $envText) { Write-Warn 'No existe .env: la app funciona, pero sin Gemini (tutor local) y sin clases en la nube.' }
elseif ($envText -notmatch 'GEMINI_API_KEY=\S+' -or $envText -match 'TU_API_KEY') { Write-Warn 'GEMINI_API_KEY vacía: el tutor usará el modo local sin internet.' }
if ($Mode -ne 'mock' -and ($envText -notmatch 'VITE_SUPABASE_URL=https://\S+' -or $envText -match 'TU-PROYECTO')) {
  Write-Warn 'Supabase no configurado: clases, chat y resultados NO se comparten entre teléfonos.'
}

$port = if ($Mode -eq 'preview') { 4173 } else { 5173 }
if (Test-Port $port) {
  Write-Step "Ya hay un servidor en el puerto ${port}; no se abre otro."
  Write-Host "  Abrí http://localhost:$port" -ForegroundColor Green
  Read-Host 'Presioná Enter para cerrar'
  exit 0
}

if ($Mode -eq 'mock') {
  if (Test-Port 54321) { Write-Host '  Supabase simulado ya estaba corriendo (54321).' }
  else {
    Write-Step 'Iniciando Supabase simulado (puerto 54321)'
    Start-Process -FilePath 'node' -ArgumentList 'supabase/mock-server.mjs' -WorkingDirectory $root -WindowStyle Minimized
  }
  $env:VITE_SUPABASE_URL = 'http://127.0.0.1:54321'
  $env:VITE_SUPABASE_ANON_KEY = 'mock-anon-key'
}

$lan = Get-LanIp
Write-Step 'Direcciones de la app'
Write-Host "  En esta computadora:    http://localhost:$port" -ForegroundColor Green
if ($lan) { Write-Host "  En la misma red Wi-Fi:  http://${lan}:$port  (solo para pruebas; para la demo usá la URL pública)" -ForegroundColor Green }

if ($Mode -eq 'preview') {
  Write-Step 'Compilando la versión de producción'
  & node node_modules/vite/bin/vite.js build
  if ($LASTEXITCODE -ne 0) { Write-Fail 'La compilación falló. Revisá el mensaje de arriba.' }
  Write-Step "Sirviendo la app (Ctrl+C para detener)"
  & node node_modules/vite/bin/vite.js preview --host 0.0.0.0 --port $port --strictPort
} else {
  Write-Step "Servidor de desarrollo (Ctrl+C para detener)"
  & node node_modules/vite/bin/vite.js --host 0.0.0.0 --port $port --strictPort
}
if ($LASTEXITCODE -ne 0) { Write-Fail "El servidor se detuvo con error (código $LASTEXITCODE)." }
