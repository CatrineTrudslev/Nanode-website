"use strict";

const crypto = require("node:crypto");
const express = require("express");
const { google } = require("googleapis");

const app = express();
const port = process.env.PORT || 8080;
const spreadsheetId = process.env.SPREADSHEET_ID;
const eventSpreadsheetId = process.env.EVENT_SPREADSHEET_ID;

if (!spreadsheetId) {
  throw new Error("SPREADSHEET_ID environment variable is required.");
}
const sheetName = process.env.SHEET_NAME || "Members";
const eventSheetName = process.env.EVENT_SHEET_NAME || "Registrations";
const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS ||
    "https://nanode.dk,https://www.nanode.dk,https://catrinetrudslev.github.io,http://localhost:8000,http://127.0.0.1:8000")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean)
);

app.disable("x-powered-by");
app.use(express.json({ limit: "10kb" }));

app.use((request, response, next) => {
  const origin = request.get("origin");

  if (origin && allowedOrigins.has(origin)) {
    response.set("Access-Control-Allow-Origin", origin);
    response.set("Vary", "Origin");
    response.set("Access-Control-Allow-Headers", "Content-Type");
    response.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  }

  if (request.method === "OPTIONS") {
    return allowedOrigins.has(origin)
      ? response.sendStatus(204)
      : response.sendStatus(403);
  }

  next();
});

function cleanText(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function validateSignup(body) {
  const firstName = cleanText(body.firstName, 60);
  const lastName = cleanText(body.lastName, 60);
  const email = cleanText(body.email, 254).toLowerCase();
  const memberType = cleanText(body.memberType, 20);
  const graduationYear = cleanText(body.graduationYear, 4);
  const currentYear = new Date().getUTCFullYear();

  if (cleanText(body.website, 200)) {
    return { spam: true };
  }

  if (!firstName) {
    return { error: "Please enter your first name." };
  }

  if (!lastName) {
    return { error: "Please enter your last name." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  if (email.endsWith("@alumni.ku.dk")) {
    return { error: "Please use a personal email address instead of your KU alumni email." };
  }

  if (!["Student", "Alumni"].includes(memberType)) {
    return { error: "Please choose a valid member type." };
  }

  const graduationYearNumber = Number(graduationYear);

  if (
    memberType === "Student" &&
    (!/^\d{4}$/.test(graduationYear) ||
      graduationYearNumber < currentYear ||
      graduationYearNumber > currentYear + 15)
  ) {
    return { error: "Please enter a valid expected graduation year." };
  }

  if (
    memberType === "Alumni" &&
    (!/^\d{4}$/.test(graduationYear) ||
      graduationYearNumber < 2000 ||
      graduationYearNumber > currentYear)
  ) {
    return { error: "Please enter a valid graduation year." };
  }

  return {
    name: `${firstName} ${lastName}`,
    email,
    memberType,
    graduationYear
  };
}

function validateEventSignup(body) {
  const email = cleanText(body.email, 254).toLowerCase();
  const eventTitle = cleanText(body.eventTitle, 160);
  const eventDate = cleanText(body.eventDate, 80);
  const eventLocation = cleanText(body.eventLocation, 160);

  if (cleanText(body.website, 200)) {
    return { spam: true };
  }

  if (!eventTitle) {
    return { error: "Event information is missing. Please refresh the page and try again." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  return {
    email,
    eventTitle,
    eventDate,
    eventLocation
  };
}

async function sheetsClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });

  return google.sheets({ version: "v4", auth });
}

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.post("/api/signup", async (request, response) => {
  const origin = request.get("origin");

  if (origin && !allowedOrigins.has(origin)) {
    return response.status(403).json({ error: "Origin is not allowed." });
  }

  const signup = validateSignup(request.body || {});

  if (signup.spam) {
    return response.status(202).json({ message: "Application received." });
  }

  if (signup.error) {
    return response.status(400).json({ error: signup.error });
  }

  try {
    const sheets = await sheetsClient();
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!C2:D`
    });

    const duplicate = (existing.data.values || []).some(
      row => String(row[1] || "").trim().toLowerCase() === signup.email
    );

    if (duplicate) {
      return response.status(409).json({
        error: "An application with this email address already exists."
      });
    }

    const isStudent = signup.memberType === "Student";
    const row = [
      crypto.randomUUID(),
      new Date().toISOString(),
      signup.name,
      signup.email,
      signup.memberType,
      signup.graduationYear,
      isStudent ? "Active" : "Pending",
      isStudent ? "Not required" : "Pending",
      ""
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:I`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] }
    });

    return response.status(201).json({
      message: isStudent
        ? "Welcome to naNODE. Your student membership has been registered."
        : "Thank you. Your alumni application has been registered and awaits payment."
    });
  } catch (error) {
    console.error("Could not register member:", error);
    return response.status(500).json({
      error: "We could not register your application. Please try again later."
    });
  }
});

app.post("/api/event-signup", async (request, response) => {
  const origin = request.get("origin");

  if (origin && !allowedOrigins.has(origin)) {
    return response.status(403).json({ error: "Origin is not allowed." });
  }

  if (!eventSpreadsheetId) {
    return response.status(503).json({
      error: "Event registration is being connected. Please try again soon."
    });
  }

  const signup = validateEventSignup(request.body || {});

  if (signup.spam) {
    return response.status(202).json({ message: "Registration received." });
  }

  if (signup.error) {
    return response.status(400).json({ error: signup.error });
  }

  try {
    const sheets = await sheetsClient();
    const members = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!C2:E`
    });

    const member = (members.data.values || []).find(row => {
      const email = String(row[1] || "").trim().toLowerCase();
      return email === signup.email;
    });

    if (!member) {
      return response.status(403).json({
        error: "You can only sign up for this event if you are a member of naNODE. Please become a member first, or use the email address connected to your membership."
      });
    }

    const memberName = String(member[0] || "").trim();
    const memberType = String(member[2] || "").trim();

    const registrations = await sheets.spreadsheets.values.get({
      spreadsheetId: eventSpreadsheetId,
      range: `${eventSheetName}!C2:E`
    });

    const duplicate = (registrations.data.values || []).some(row => {
      const eventTitle = String(row[0] || "").trim().toLowerCase();
      const email = String(row[2] || "").trim().toLowerCase();
      return eventTitle === signup.eventTitle.toLowerCase() && email === signup.email;
    });

    if (duplicate) {
      return response.status(409).json({
        error: "This email address is already signed up for this event."
      });
    }

    const row = [
      crypto.randomUUID(),
      new Date().toISOString(),
      signup.eventTitle,
      memberName,
      signup.email,
      memberType
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: eventSpreadsheetId,
      range: `${eventSheetName}!A:F`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] }
    });

    return response.status(201).json({
      message: "You are signed up for the event."
    });
  } catch (error) {
    console.error("Could not register event signup:", error);
    return response.status(500).json({
      error: "We could not register your event signup. Please try again later."
    });
  }
});

app.use((_request, response) => {
  response.status(404).json({ error: "Not found." });
});

app.listen(port, () => {
  console.log(`naNODE membership backend listening on port ${port}`);
});
