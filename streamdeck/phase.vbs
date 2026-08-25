' Shiny Hunt Counter -> log a phase (found a wrong-color shiny / chain break)
' Bumps the phase counter and resets the per-phase count; total keeps counting.
CreateObject("WScript.Shell").Run "curl.exe -s http://localhost:3620/api/phase", 0, False
