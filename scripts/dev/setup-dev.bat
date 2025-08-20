@echo off
echo Setting up development environment...

echo.
echo Generating Prisma client...
npx prisma generate
if errorlevel 1 (
    echo Failed to generate Prisma client
    pause
    exit /b 1
)

echo.
echo Pushing database schema...
npx prisma db push
if errorlevel 1 (
    echo Failed to push database schema
    pause
    exit /b 1
)

echo.
echo Seeding database...
npx tsx prisma/seed-simple.ts
if errorlevel 1 (
    echo Failed to seed database
    pause
    exit /b 1
)

echo.
echo Starting development server...
npm run dev

pause
