# SQL-IDE
SQL-Version der [Online-IDE für Java](https://github.com/martin-pabst/Online-IDE).

Die SQL-IDE 

Die SQL-IDE kann auf zwei Arten betrieben werden:
  * [Embedded-Version](#embedded-version) innerhalb einer anderen Website [(siehe z.B. hier)](https://learn-sql.de)
  * [Vollständige Entwicklungsumgebung](#vollständige-entwicklungsumgebung) auf [www.sql-ide.de](https://www.sql-ide.de)

# Vorhaben
Schaffung einer im Browser lauffähigen SQL-IDE zusammen mit einer Datenbank, die es Schülerinnen und Schülern ermöglicht, die Sprache SQL zu erlernen ohne eine Datenbank installieren zu müssen. Ziel ist eine Datenbank, die den Schülerinnen und Schülern sowohl lesende als auch schreibende Zugriffe ermöglicht, gleichzeitig den Server aber möglichst wenig belastet.

# Strategie
Als Datenbank wird [sql.js](https://sql.js.org) verwendet und im Browser ausgeführt. Schreibende Zugriffe werden im Client ausgeführt und - bei Fehlerfreiheit - zum Server geschickt, der sie nur speichert, aber nicht ausführt. Mehrere Clients, die dieselbe Datenbank im Speicher haben, tauschen ihre schreibenden Datenbankzugriffe per WebSocket-Protokoll via Server aus und halten ihre Datenbanken dadurch immer auf dem gleichen Stand.

