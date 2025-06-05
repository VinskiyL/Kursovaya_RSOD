@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

REM Переходим в корень проекта (избегаем проблем с путями)
cd /d "C:\Users\katuh\Desktop\РСОД\backend"

REM Активация виртуального окружения
if exist "env\Scripts\activate.bat" (
    call "env\Scripts\activate.bat"
) else (
    echo [ERROR] Виртуальное окружение не найдено
    pause
    exit /b 1
)

REM Основная команда с проверкой
python manage.py cleanup_expired_bookings > cleanup.log 2>&1

if !errorlevel! neq 0 (
    echo [ОШИБКА] Код: !errorlevel! | tee -a cleanup.log
    type cleanup.log
    pause
    exit /b 1
)

echo Успешно выполнено. Лог: %cd%\cleanup.log