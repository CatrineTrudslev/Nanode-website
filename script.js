async function loadFrontpage() {
  try {
    const response = await fetch("content/frontpage/frontpage_current.json");
    const data = await response.json();

    document.getElementById("hero-headline").textContent = data.headline;

    const textContainer = document.getElementById("hero-text");
    textContainer.innerHTML = "";

    data.paragraphs.forEach(paragraph => {
      const p = document.createElement("p");
      p.textContent = paragraph;
      textContainer.appendChild(p);
    });

    const button = document.getElementById("membership-button");
    button.textContent = data.button_text;
    button.href = data.button_link;
  } catch (error) {
    console.error("Could not load frontpage content:", error);
  }
}

async function loadNextEvent() {
  try {
    const response = await fetch("content/events/events_current.json");
    const data = await response.json();

    if (!data.upcoming || data.upcoming.length === 0) {
      document.getElementById("next-event").style.display = "none";
      return;
    }

    const event = data.upcoming[0];

    document.getElementById("event-title").textContent = event.title;
    document.getElementById("event-date").textContent = event.date;
    document.getElementById("event-location").textContent = event.location;
    document.getElementById("event-description").textContent =
      event.short_description || event.description || "";

  } catch (error) {
    console.error("Could not load event content:", error);
  }
}

loadFrontpage();
loadNextEvent();
