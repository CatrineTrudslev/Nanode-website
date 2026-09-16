# naNODE membership backend

This service receives membership applications and appends them to the private
Google Sheet named `Members`.

## Configuration

Set these Cloud Run environment variables during deployment:

- `SPREADSHEET_ID`: ID of the private membership spreadsheet
- `SHEET_NAME`: Sheet tab name; defaults to `Members`
- `ALLOWED_ORIGINS`: Comma-separated website origins allowed to submit forms

## Required setup

1. Enable the Cloud Run Admin, Cloud Build and Google Sheets APIs.
2. Deploy the service from this directory.
3. Share the Google Sheet with the Cloud Run runtime service account as Editor.
4. Add the resulting Cloud Run URL to `signup-config.js`.

Do not commit spreadsheet identifiers, API keys or service-account key files to
this public repository.
