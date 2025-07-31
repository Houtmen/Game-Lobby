# PowerShell setup script
Write-Host "Setting up development environment..." -ForegroundColor Green

Write-Host "`nGenerating Prisma client..." -ForegroundColor Yellow
try {
    npx prisma generate
    Write-Host "Prisma client generated successfully!" -ForegroundColor Green
} catch {
    Write-Host "Failed to generate Prisma client: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`nPushing database schema..." -ForegroundColor Yellow
try {
    npx prisma db push
    Write-Host "Database schema pushed successfully!" -ForegroundColor Green
} catch {
    Write-Host "Failed to push database schema: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`nSeeding database..." -ForegroundColor Yellow
try {
    npx tsx prisma/seed-simple.ts
    Write-Host "Database seeded successfully!" -ForegroundColor Green
} catch {
    Write-Host "Failed to seed database: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`nStarting development server..." -ForegroundColor Yellow
npm run dev
