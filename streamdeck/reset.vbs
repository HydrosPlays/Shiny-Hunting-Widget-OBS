' Shiny Hunt Counter -> reset to 0 (also clears phases + celebration)
CreateObject("WScript.Shell").Run "curl.exe -s http://localhost:3620/api/reset", 0, False
