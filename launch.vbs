Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\hdcooper\side-projects\projects\court-tracker"
WshShell.Run """node_modules\electron\dist\electron.exe"" .", 0, False
