$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

if (-not (Test-Path '.\.venv\Scripts\python.exe')) {
    Write-Host 'Creating Python virtual environment...' -ForegroundColor Cyan
    python -m venv .venv
}

if (-not (Test-Path '.\.env')) {
    Copy-Item '.\.env.example' '.\.env'
    Write-Host 'Created .env from .env.example. Review the model tags if needed.' -ForegroundColor Yellow
}

$python = Resolve-Path '.\.venv\Scripts\python.exe'
Write-Host 'Installing/updating backend dependencies...' -ForegroundColor Cyan
& $python -m pip install --upgrade pip
& $python -m pip install -r '.\requirements.txt'
Write-Host 'Starting API at http://127.0.0.1:8010' -ForegroundColor Green
& $python -m uvicorn app.main:app --host 127.0.0.1 --port 8010 --reload
