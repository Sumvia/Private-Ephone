@echo off
echo Syncing web assets to Android project...

copy /Y "..\index.html" "app\src\main\assets\index.html"
copy /Y "..\style.css" "app\src\main\assets\style.css"
copy /Y "..\date.js" "app\src\main\assets\date.js"
copy /Y "..\forum.js" "app\src\main\assets\forum.js"
copy /Y "..\game-hall.js" "app\src\main\assets\game-hall.js"
copy /Y "..\kk-checkin.js" "app\src\main\assets\kk-checkin.js"
copy /Y "..\lovers-space.js" "app\src\main\assets\lovers-space.js"
copy /Y "..\studio.js" "app\src\main\assets\studio.js"
copy /Y "..\taobao.js" "app\src\main\assets\taobao.js"
copy /Y "..\tukey-accounting.js" "app\src\main\assets\tukey-accounting.js"
copy /Y "..\weibo.js" "app\src\main\assets\weibo.js"
copy /Y "..\manifest.json" "app\src\main\assets\manifest.json"

echo.
echo Sync completed!
pause
