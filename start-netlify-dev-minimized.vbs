Set WshShell = CreateObject("WScript.Shell")

' Change to the bidiq-mvp directory and run netlify dev minimized
WshShell.Run "cmd /c cd /d ""C:\Users\RyanElder\bidiq-mvp"" && netlify dev", 7, False

' Window style 7 = minimized but visible in taskbar
' False = don't wait for it to finish
