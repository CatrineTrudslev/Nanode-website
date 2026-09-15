async function getJSON(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Could not load ${path}`);
  }

  return response.json();
}


/* FRONT PAGE */

async function loadFrontpage() {
  const headline = document.getElementById("hero-headline");

  if (!headline) {
    return;
  }

  try {
    const data = await getJSON(
      "content/frontpage/frontpage_current.json"
    );

    headline.textContent = data.headline;

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


/* NEXT EVENT ON FRONT PAGE */

async function loadNextEvent() {
  const eventSection = document.getElementById("next-event");

  if (!eventSection) {
    return;
  }

  try {
    const data = await getJSON(
      "content/events/events_current.json"
    );

    if (!data.upcoming || data.upcoming.length === 0) {
      eventSection.style.display = "none";
      return;
    }

    const event = data.upcoming[0];

    document.getElementById("event-title").textContent =
      event.title;

    document.getElementById("event-date").textContent =
      event.date;

    document.getElementById("event-location").textContent =
      event.location;

    document.getElementById("event-description").textContent =
      event.short_description || event.description || "";

  } catch (error) {
    console.error("Could not load next event:", error);
  }
}


/* EVENT CARDS */

function createEventCard(event, isPast = false) {
  const article = document.createElement("article");
  article.className = isPast
    ? "event-card past-event"
    : "event-card";

  const title = document.createElement("h2");
  title.textContent = event.title;
  article.appendChild(title);

  const details = document.createElement("p");
  details.className = "event-card-info";
  details.textContent = `${event.date} · ${event.location}`;
  article.appendChild(details);

  if (event.description) {
    const description = document.createElement("p");
    description.textContent = event.description;
    article.appendChild(description);
  }

  const links = document.createElement("div");
  links.className = "event-links";

  if (event.facebook_link) {
    const facebook = document.createElement("a");
    facebook.href = event.facebook_link;
    facebook.target = "_blank";
    facebook.rel = "noopener noreferrer";
    facebook.textContent = "View Facebook event →";
    links.appendChild(facebook);
  }

  if (event.registration_link) {
    const registration = document.createElement("a");
    registration.href = event.registration_link;
    registration.target = "_blank";
    registration.rel = "noopener noreferrer";
    registration.textContent = "Register →";
    links.appendChild(registration);
  }

  if (links.children.length > 0) {
    article.appendChild(links);
  }

  return article;
}


/* FULL EVENTS PAGE */

async function loadEventsPage() {
  const upcomingContainer =
    document.getElementById("upcoming-events");

  if (!upcomingContainer) {
    return;
  }

  try {
    const data = await getJSON(
      "content/events/events_current.json"
    );

    upcomingContainer.innerHTML = "";

    if (data.upcoming && data.upcoming.length > 0) {
      data.upcoming.forEach(event => {
        upcomingContainer.appendChild(
          createEventCard(event)
        );
      });
    } else {
      upcomingContainer.innerHTML =
        "<p>No upcoming events have been announced yet.</p>";
    }

    const pastContainer =
      document.getElementById("past-events");

    pastContainer.innerHTML = "";

    if (data.past && data.past.length > 0) {
      data.past.forEach(event => {
        pastContainer.appendChild(
          createEventCard(event, true)
        );
      });
    } else {
      pastContainer.innerHTML =
        "<p>No past events have been added yet.</p>";
    }

  } catch (error) {
    console.error("Could not load events page:", error);
  }
}

/* MEMBERSHIP PAGE */

async function loadMembershipPage() {
  const title = document.getElementById("membership-title");

  if (!title) {
    return;
  }

  try {
    const data = await getJSON(
      "content/membership/membership_current.json"
    );

    title.textContent = data.title;

    document.getElementById("membership-intro").textContent =
      data.intro;

    document.getElementById("membership-why").textContent =
      data.why_join;

    document.getElementById("membership-who").textContent =
      data.who_can_join;

    document.getElementById("membership-fee").textContent =
      data.membership_fee;

    document.getElementById("membership-signup-text").textContent =
      data.signup_text;

    document.getElementById("membership-signup-link").href =
      data.signup_link || "signup.html";

  } catch (error) {
    console.error("Could not load membership page:", error);
  }
}

loadFrontpage();
loadNextEvent();
loadEventsPage();
loadMembershipPage();


/* CONTACT PAGE */

async function loadContactPage() {
  const emailLink = document.getElementById("contact-email");

  if (!emailLink) {
    return;
  }

  try {
    const data = await getJSON(
      "content/contact/contact_current.json"
    );

    const contactText = document.getElementById("contact-text");

    if (data.text && contactText) {
      contactText.textContent = data.text;
    }

    if (data.email) {
      emailLink.textContent = data.email;
      emailLink.href = `mailto:${data.email}`;
    } else {
      emailLink.textContent = "Email address coming soon";
      emailLink.removeAttribute("href");
    }

    const linkedInLink = document.getElementById("contact-linkedin");
    const linkedInComingSoon = document.getElementById("contact-linkedin-coming-soon");

    if (data.linkedin && linkedInLink) {
      linkedInLink.href = data.linkedin;
      linkedInLink.hidden = false;
      if (linkedInComingSoon) {
        linkedInComingSoon.hidden = true;
      }
    }

    const facebookLink = document.getElementById("contact-facebook");

    if (data.facebook && facebookLink) {
      facebookLink.href = data.facebook;
      facebookLink.hidden = false;
    }
  } catch (error) {
    console.error("Could not load contact details:", error);
    emailLink.textContent = "Contact details coming soon";
    emailLink.removeAttribute("href");
  }
}

loadContactPage();


/* BOARD */

async function loadBoardMembers() {
  const boardContainer = document.getElementById("board-members");

  if (!boardContainer) {
    return;
  }

  try {
    const data = await getJSON(
      "content/board/board_current.json"
    );

    boardContainer.innerHTML = "";

    data.members.forEach(member => {
      const card = document.createElement("article");
      card.className = "board-card";

      const avatar = document.createElement("div");
      avatar.className = "board-avatar";
      avatar.setAttribute("aria-hidden", "true");
      avatar.textContent = member.name
        .split(" ")
        .map(namePart => namePart[0])
        .slice(0, 2)
        .join("");
      card.appendChild(avatar);

      const content = document.createElement("div");
      content.className = "board-card-content";

      const name = document.createElement("h3");
      name.textContent = member.name;
      content.appendChild(name);

      const role = document.createElement("p");
      role.className = "board-role";
      role.textContent = member.role;
      content.appendChild(role);

      const description = document.createElement("p");
      description.className = "board-description";
      description.textContent =
        member.description || "Member of the naNODE board";
      content.appendChild(description);

      if (member.linkedin) {
        const linkedIn = document.createElement("a");
        linkedIn.className = "text-link";
        linkedIn.href = member.linkedin;
        linkedIn.target = "_blank";
        linkedIn.rel = "noopener noreferrer";
        linkedIn.textContent = "LinkedIn →";
        content.appendChild(linkedIn);
      }

      card.appendChild(content);
      boardContainer.appendChild(card);
    });
  } catch (error) {
    console.error("Could not load board members:", error);
    boardContainer.innerHTML =
      "<p>Board member information is currently unavailable.</p>";
  }
}

loadBoardMembers();
