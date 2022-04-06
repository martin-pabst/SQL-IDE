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


# Embedded-Version
Die Editor-Kästen der Embedded-Version können [auf einfache Art und Weise in beliebige Webseiten eingebaut](https://www.learn-sql.de/doku.php?id=embed:start) werden. Damit sie den dazu nötigen HTML-Code nicht selbst schreiben müssen, [finden sie hier einen Wrapper-Generator von Christoph Gräßl](https://www.embed.learn-sql.de/createwrapper.html). Damit die Last auf meinem Server beherrschbar bleibt, möchte ich Sie bitten, die Dateien der Embedded-Version möglichst selbst zu hosten. Sie brauchen dazu lediglich einen Webserver, der Dateien ausliefern kann. Server-Side-Logik (z.B. PHP oder ähnliches) ist **nicht erforderlich**.

Die Embedded-Version bietet
  * Eine SQL-Datenbanksystem im Browser
  * Anzeige des Datenbankschemas als Baum
  * Eingabe von SQL-Anweisungen im komfortablen Editor mit Syntax-Highlighting, Code-Vervollständigung und Fehleranzeige während der Eingabe
  * Speicherung der Datenbank in der IndexedDB des Browsers. 
  * Download einer Template-Datenbank beim Start 
  * Speichern von Datenbank-Dumps als SQLite-Binärdump
  * Laden von SQLite-Binärdumps, MySQL-Dumps und gezippten MySQL-Dumps
  * Write-History mit Rollback-Funktion

# Vollständige Entwicklungsumgebung
Die vollständige Entwicklungsumgebung ist für den Einsatz im Informatikunterricht optimiert. Sie bietet alle Möglichkeiten der Embedded-Version. Darüber hinaus verwaltet sie beliebig viele Datenbanken und speichert diese und alle SQL-Quelltexte der Schüler/innen und Lehrkräfte automatisch auf dem Server. Lehrkräfte können auf die Datenbanken und SQL-Quelltexte der Schüler/innen online zugreifen und so bei auftretenden Problemen einfach und schnell helfen. [Zum Hosting der Entwicklungsumgebung siehe hier.](https://www.learnj.de/doku.php?id=ide:testlogins:start)

