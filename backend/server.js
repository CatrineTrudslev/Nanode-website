"use strict";

const crypto = require("node:crypto");
const express = require("express");
const { google } = require("googleapis");

const app = express();
const port = process.env.PORT || 8080;
const spreadsheetId = process.env.SPREADSHEET_ID;
const signupLimit = 3;
const signupWindowMs = 60 * 60 * 1000;
const signupAttempts = new Map();

if (!spreadsheetId) {
  throw new Error("SPREADSHEET_ID environment variable is required.");
}
const sheetName = process.env.SHEET_NAME || "Members";
const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS ||
    "https://catrinetrudslev.github.io,http://localhost:8000,http://127.0.0.1:8000")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean)
);

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "10kb" }));

function limitSignupAttempts(request, response, next) {
  const now = Date.now();
  const key = request.ip;
  const previous = signupAttempts.get(key);

  if (!previous || now >= previous.resetAt) {
    signupAttempts.set(key, { count: 1, resetAt: now + signupWindowMs });
    response.set("RateLimit-Limit", String(signupLimit));
    response.set("RateLimit-Remaining", String(signupLimit - 1));
    return next();
  }

  const remaining = Math.max(0, signupLimit - previous.count);
  const retryAfterSeconds = Math.max(1, Math.ceil((previous.resetAt - now) / 1000));

  response.set("RateLimit-Limit", String(signupLimit));
  response.set("RateLimit-Remaining", String(remaining));
  response.set("RateLimit-Reset", String(Math.ceil(previous.resetAt / 1000)));

  if (previous.count >= signupLimit) {
    response.set("Retry-After", String(retryAfterSeconds));
    return response.status(429).json({
      error: "Too many signup attempts. Please try again in one hour."
    });
  }

  previous.count += 1;
  response.set("RateLimit-Remaining", String(signupLimit - previous.count));
  next();
}

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
  const name = cleanText(body.name, 120);
  const email = cleanText(body.email, 254).toLowerCase();
  const memberType = cleanText(body.memberType, 20);
  const graduationYear = cleanText(body.graduationYear, 4);
  const currentYear = new Date().getUTCFullYear();

  if (cleanText(body.website, 200)) {
    return { spam: true };
  }

  if (name.length < 2) {
    return { error: "Please enter your full name." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  if (!["Student", "Alumni"].includes(memberType)) {
    return { error: "Please choose a valid member type." };
  }

  if (
    memberType === "Student" &&
    (!/^\d{4}$/.test(graduationYear) ||
      Number(graduationYear) < currentYear ||
      Number(graduationYear) > currentYear + 15)
  ) {
    return { error: "Please enter a valid expected graduation year." };
  }

  return {
    name,
    email,
    memberType,
    graduationYear: memberType === "Student" ? graduationYear : ""
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

app.post("/api/signup", limitSignupAttempts, async (request, response) => {
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

app.use((_request, response) => {
  response.status(404).json({ error: "Not found." });
});

app.listen(port, () => {
  console.log(`naNODE membership backend listening on port ${port}`);
});
