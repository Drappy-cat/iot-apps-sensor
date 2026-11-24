@echo off
setlocal
echo ============================================================================
echo   IoT Sensor NPK (YOLOv11s AI Vision) - Build Android APK (Tanpa Android Studio)
echo ============================================================================

cd /d "%~dp0"

set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
set "ANDROID_SDK_ROOT=%LOCALAPPDATA%\Android\Sdk"
set "GRADLE_OPTS=-Djava.net.preferIPv4Stack=true"
set "PATH=%JAVA_HOME%\bin;%PATH%"

if not exist "%JAVA_HOME%\bin\java.exe" (
    echo [ERROR] Java JBR tidak ditemukan di %JAVA_HOME%.
    pause
    exit /b 1
)

echo [1/4] Build aplikasi Web produksi (Vite)...
call npm.cmd run build
if errorlevel 1 (
    echo [ERROR] Build Web Vite gagal!
    pause
    exit /b 1
)

echo [2/4] Sinkronisasi aset & model ONNX ke Capacitor Android...
call .\node_modules\.bin\cap.cmd sync android
if errorlevel 1 (
    echo [ERROR] Capacitor sync android gagal!
    pause
    exit /b 1
)

echo [3/4] Kompilasi APK menggunakan Gradle (assembleDebug)...
cd /d "%~dp0android"
call gradlew.bat assembleDebug --no-daemon
if errorlevel 1 (
    echo [ERROR] Kompilasi Gradle APK gagal!
    cd /d "%~dp0"
    pause
    exit /b 1
)

cd /d "%~dp0"
echo [4/4] Menyalin file APK ke folder utama...
copy /Y "android\app\build\outputs\apk\debug\app-debug.apk" "IoT-Sensor-NPK-v4.2.0.apk" >nul
copy /Y "android\app\build\outputs\apk\debug\app-debug.apk" "IoT-Sensor-NPK-v4.1.0.apk" >nul

echo.
echo [SUKSES] File APK siap diinstall ke HP:
echo   %cd%\IoT-Sensor-NPK-v4.2.0.apk
echo ============================================================================
endlocal
