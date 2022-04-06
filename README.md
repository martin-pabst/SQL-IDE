# SQL-IDE
SQL-Version der [Online-IDE für Java](https://github.com/martin-pabst/Online-IDE).

Die SQL-IDE besteht aus einer Datenbank auf [SQLite](https://www.sqlite.org/index.html)-Basis und einer integrierten Entwicklungsumgebung auf Basis des [Monaco-Editor](https://microsoft.github.io/monaco-editor) von Visual Studio Code. Die von den Nutzer/innen eingegebenen SQL-Anweisungen werden nicht direkt an SQLite weitergegeben, sondern zunächst durch einen eigenen Compiler überprüft und teilweise umgeschrieben. Dadurch wird folgendes erreicht:
  * SQLite ist nur schwach typisiert und entspricht insofern nicht dem [SQL-Standard](https://en.wikipedia.org/wiki/SQL:2016). Die strenge Typsierung wird durch den vorgeschalteten Compiler forciert, so dass die Nutzererfahrung besser dem SQL-Standard entspricht.
  * Der vorgeschaltete Compiler gibt deutlich verständlichere Fehlermeldungen aus als SQLite. Diese werden dem Nutzer direkt während der Codeeingabe durch Unterringeln der Fehlerstelle gemeldet.
  * Der Compiler versteht einen recht großen Teil der [MySQL](https://www.mysql.com/de/)-Syntax, so dass viele als MySQL-Dump vorliegende Datenbanken importiert werden können.
  * Die symbol tables des Compilers und das Schema der Datenbank werden genutzt, um im Editor kontextsensitive Hilfe anzubieten. 

Die SQL-IDE kann auf zwei Arten betrieben werden:
  * [Embedded-Version](#embedded-version) innerhalb einer anderen Website [(siehe z.B. hier)](https://learn-sql.de)
  * [Vollständige Entwicklungsumgebung](#vollständige-entwicklungsumgebung) auf [www.sql-ide.de](https://www.sql-ide.de)


