' Shiny Hunt Counter -> toggle the SHINY FOUND celebration (sparkles + shiny sprite)
CreateObject("WScript.Shell").Run "curl.exe -s http://localhost:3620/api/toggleFound", 0, False
