# ZAS UPIServices — Schemas & WSDL

Offizielle eCH-XSD-Schemas und WSDL-Dateien der ZAS-UPIServices, benötigt für PROJ-23 (ZAS Lebensnachweis).

## Quelle

Heruntergeladen am 2026-04-22 von https://www.zas.admin.ch/de/schnittstelle-upiservices

## Inhalt

### `schemas/schema-UPI_20230523/`

XML-Schemas für UPIServices V2 (archivedatum 2026-01-29):

| Ordner | Zweck |
|--------|-------|
| `eCH-0084/2/` | UPI — Meldung (Schreibzugriff) |
| `eCH-0085/2/` | UPI — Abfrage (Lesezugriff) |
| **`eCH-0086/2/`** | **UPI — Vergleich (für PROJ-23 Lebensnachweis)** |
| `eCH-0006` – `eCH-0058`, `eCH-0135` | Unterstützende eCH-Standards (Person, Adresse, Datum, Nachricht, etc.) |

### `wsdl/wsdl_20230523/`

WSDL-Definitionen der SOAP-Services:

| Datei | Zweck |
|-------|-------|
| `UPI-declaration-2-0.wsdl` | Meldungen (eCH-0084) |
| `UPI-query-2-0.wsdl` | Abfragen (eCH-0085) |
| **`UPI-compare-2-0.wsdl`** | **Vergleichsanfragen (eCH-0086) — PROJ-23** |

## Referenzdokumente (nicht im Repo)

- UPI-Interface-Spezifikation V2.04D (PDF, 439 kB, 2025-11-13): https://www.zas.admin.ch/dam/de/sd-web/MLAKpx2UhDBM/sp%C3%A9cification%20interface%20pi%20v2.04de.pdf
- UPI-Handbuch V3.2D (PDF, 1.26 MB, 2025-11-13, obligatorisch): https://www.zas.admin.ch/dam/de/sd-web/Ivf0gI31cqvU/upi%20-%20handbook%20v3.2de.pdf

## Pflege

Bei Aktualisierungen auf der ZAS-Seite (erkennbar am Datum) müssen XSD und WSDL neu heruntergeladen werden. Letzter Stand der Dateien: 2023-05-23 (Dateiname-Suffix `_20230523`), letzter Upload durch ZAS: 2026-01-29.
