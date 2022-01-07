# SQL-Online
SQL-Version der Online-IDE...
test


# Strategie bei schreibenden Datenbankzugriffen
  * Hole ggf. noch nicht vollzogene schreibende SQL-Statements vom Server und führe sie aus.
  * Führe die neuen Statements aus.
  * Sende die neuen Statements zum Server und erhalte dadurch ihre laufenden Nummern sowie - falls zwischendurch ein schreibender Zugriff durch einen anderen Nutzer erfolgte - die fehlenden Zwischenstatements.
  * Falls fehlende Zwischenstatements vom Server geliefert wurden: schreibe die komplette Datenbank neu:
    - Lösche die Datenbank
    - Führe die Statements der Datenbankvorlage aus
    - Führe alle bisherigen Statements einschließlich der neuen Zwischenstatements aus.
    - Führe die neuen Statements aus.
 * Lies die Datenbankstruktur neu ein.