@echo off
cd /d "%~dp0"
where py >nul 2>&1
if %errorlevel%==0 (
    start "" "http://localhost:8000"
    py -m http.server 8000
) else (
    where python >nul 2>&1
    if %errorlevel%==0 (
        start "" "http://localhost:8000"
        python -m http.server 8000
    ) else (
        echo Python is needed to run LineRunner locally.
        echo Install Python from python.org, then double-click this file again.
        pause
    )
)
