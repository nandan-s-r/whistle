@echo off
echo ==========================================
echo       VC SCOPE OS AUTOMATED DEPLOYER     
echo ==========================================
echo.
echo Step 1: Pushing latest code changes to GitHub...
git push origin master
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Git push failed. Please make sure you are connected to the internet.
    goto end
)

echo.
echo Step 2: Deploying frontend to Vercel Production...
cd frontend
call npx vercel --prod --yes
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Vercel deployment failed.
    goto end
)

echo.
echo ==========================================
echo   SUCCESS! Frontend deployed to Vercel.   
echo ==========================================
echo.
echo Next step:
echo 1. Go to Render.com -> Click New + -> Blueprint
echo 2. Link your 'vc-scope-os' GitHub repo
echo 3. Click Apply (all environment keys are pre-filled!)
echo.

:end
pause
