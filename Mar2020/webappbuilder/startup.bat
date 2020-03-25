::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
:: If you want to start nodejs manually with additional parameters, run           ::
:: node_x86.exe/node_x64.exe from server directory instead of launching this      ::
:: script file.                                          					  	  ::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
@ECHO OFF
SETLOCAL EnableDelayedExpansion
TITLE Web AppBuilder for ArcGIS
SET serverPath=server
SET serverjsFile=server.js
SET port=3344
SET wabVirtualPath=webappbuilder
SET portTaken=0
IF DEFINED USERDNSDOMAIN (SET FQDN=%COMPUTERNAME%.%USERDNSDOMAIN%) ELSE (SET FQDN=%COMPUTERNAME%)
IF DEFINED PROGRAMFILES(X86) (SET nodeFile=node_x64.exe) ELSE (SET nodeFile=node_x86.exe)

IF NOT EXIST %serverPath% ECHO "%serverPath%" directory does not exist! & GOTO ERROR
CD %serverPath%
IF NOT EXIST %nodeFile% ECHO "%nodeFile%" file does not exist in "%serverPath%" directory! & GOTO ERROR
IF NOT EXIST %serverjsFile% ECHO "%serverjsFile%" file does not exist in "%serverPath%" directory! & GOTO ERROR

REM check if %port% available (only STATE==LISTENING or STATE==ESTABLISHED is considered)
SET regex=:%port%[^^^^0-9]
CALL :IsPortTaken %regex%
IF %portTaken% NEQ 0 (
	ECHO Can not launch nodejs because port %port% is used by another process!
	GOTO ERROR
	) ELSE (
	REM launch nodejs
	START "Web AppBuilder for ArcGIS" /B %nodeFile% %serverjsFile%
	ping 127.0.0.1 /n 5 >nul
	CALL :IsPortTaken %port%
	IF !portTaken! EQU 0 GOTO ERROR
	)

REM open the url in browser
REM START http://%FQDN%:%port%/%wabVirtualPath%
START https://ip-c613c6cc:3344/webappbuilder/
EXIT 0


:IsPortTaken
SETLOCAL
SET /A count=0
FOR /F "TOKENS=4 USEBACKQ" %%g in (`netstat -aon ^| findstr /r ":%1"`) DO (
	SET state=%%g
	SET established=!state:ESTABLISHED=!
	SET listening=!state:LISTENING=!
	IF NOT !state!==!established! SET /A count+=1
	IF NOT !state!==!listening! SET /A count+=1
	)
ENDLOCAL & SET portTaken=%count%
GOTO :EOF


:ERROR
PAUSE
EXIT 1