' Shiny Hunt Counter -> -1 (undo a miscount)
CreateObject("WScript.Shell").Run "curl.exe -s http://localhost:3620/api/decrement", 0, False
