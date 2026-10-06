# naNODE membership backend

This service receives membership applications and event registrations, then
appends them to private Google Sheets.

## Configuration

Set these Cloud Run environment variables during deployment:

- `SPREADSHEET_ID`: ID of the private membership spreadsheet
- `SHEET_NAME`: Sheet tab name; defaults to `Members`
- `EVENT_SPREADSHEET_ID`: ID of the private event registration spreadsheet
- `EVENT_SHEET_NAME`: Event registration sheet tab name; defaults to `Registrations`
- `ALLOWED_ORIGINS`: Comma-separated website origins allowed to submit forms

## Required setup

1. Enable the Cloud Run Admin, Cloud Build and Google Sheets APIs.
2. Deploy the service from this directory.
3. Share both Google Sheets with the Cloud Run runtime service account as Editor.
4. Add `EVENT_SPREADSHEET_ID` when event registration should be enabled.
5. Add the resulting Cloud Run URL to `signup-config.js`.

Do not commit spreadsheet identifiers, API keys or service-account key files to
this public repository.
