const eventSignupForm = document.getElementById("event-signup-form");
const eventTitleElement = document.getElementById("event-signup-title");
const eventDateElement = document.getElementById("event-signup-date");
const eventLocationElement = document.getElementById("event-signup-location");
const eventEmailError = document.getElementById("event-email-error");
const eventFormStatus = document.getElementById("event-form-status");

let currentEvent = null;

function setEventStatus(message, className = "") {
  eventFormStatus.textContent = message;
  eventFormStatus.className = className
    ? `form-status ${className}`
    : "form-status";
}

function validateEventSignup() {
  eventEmailError.textContent = "";
  setEventStatus("");

  if (!currentEvent) {
    setEventStatus(
      "Event information could not be loaded. Please refresh the page and try again.",
      "form-status-error"
    );
    return null;
  }

  const email = eventSignupForm.elements.email.value.trim().toLowerCase();

  if (!eventSignupForm.elements.email.validity.valid) {
    eventEmailError.textContent = "Please enter a valid email address.";
    return null;
  }

  return {
    email,
    eventTitle: currentEvent.title,
    eventDate: currentEvent.date,
    eventLocation: currentEvent.location
  };
}

async function loadSignupEvent() {
  try {
    const response = await fetch("content/events/events_current.json", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Could not load event information.");
    }

    const data = await response.json();
    currentEvent = data.upcoming?.[0] || null;

    if (!currentEvent) {
      throw new Error("No upcoming event is available for signup.");
    }

    eventTitleElement.textContent = currentEvent.title;
    eventDateElement.textContent = currentEvent.date || "To be announced";
    eventLocationElement.textContent =
      currentEvent.location || "To be announced";
  } catch (error) {
    currentEvent = null;
    eventTitleElement.textContent = "Event signup is unavailable";
    eventDateElement.textContent = "";
    eventLocationElement.textContent = "";
    setEventStatus(error.message, "form-status-error");
  }
}

eventSignupForm.addEventListener("submit", async event => {
  event.preventDefault();

  const data = validateEventSignup();

  if (!data) {
    return;
  }

  const apiUrl = window.NANODE_CONFIG?.apiUrl?.replace(/\/$/, "");

  if (!apiUrl) {
    setEventStatus(
      "Online event signup is being connected. Please try again soon.",
      "form-status-error"
    );
    return;
  }

  const button = eventSignupForm.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = "Signing up...";
  setEventStatus("Checking your membership and registering you...");

  try {
    const response = await fetch(`${apiUrl}/api/event-signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        website: eventSignupForm.elements.website.value
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Could not complete event signup.");
    }

    eventSignupForm.reset();
    setEventStatus(result.message, "form-status-success");
  } catch (error) {
    setEventStatus(error.message, "form-status-error");
  } finally {
    button.disabled = false;
    button.textContent = "Sign up for event";
  }
});

loadSignupEvent();
