' Shiny Hunt Counter -> +1 (encounter / soft reset)
' Runs curl silently so no black console window flashes on your screen.
' Point a Stream Deck "System: Open" action at this file.
CreateObject("WScript.Shell").Run "curl.exe -s http://localhost:3620/api/increment", 0, False
