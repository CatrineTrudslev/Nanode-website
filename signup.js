const signupForm = document.getElementById("signup-form");
const graduationYearField = document.getElementById("graduation-year-field");
const graduationYearInput = document.getElementById("graduation-year");
const graduationYearLabel = document.getElementById("graduation-year-label");
const graduationYearHint = document.getElementById("graduation-year-hint");
const formStatus = document.getElementById("form-status");
const paymentPanel = document.getElementById("payment-panel");

function selectedMemberType() {
  return signupForm.querySelector('input[name="memberType"]:checked')?.value || "";
}

function updateMemberFields() {
  const memberType = selectedMemberType();
  const isStudent = memberType === "Student";
  const currentYear = new Date().getFullYear();

  graduationYearField.hidden = !memberType;
  graduationYearInput.required = Boolean(memberType);

  if (!memberType) {
    graduationYearInput.value = "";
    graduationYearHint.textContent = "";
  } else if (isStudent) {
    graduationYearLabel.textContent = "Expected graduation year";
    graduationYearHint.textContent =
      "This helps us know when a student membership should change to alumni membership.";
    graduationYearInput.min = String(currentYear);
    graduationYearInput.max = String(currentYear + 15);
  } else {
    graduationYearLabel.textContent = "Graduation year";
    graduationYearHint.textContent =
      "Please enter the year you graduated from the Nanoscience programme.";
    graduationYearInput.min = "2000";
    graduationYearInput.max = String(currentYear);
  }

  document.getElementById("graduation-year-error").textContent = "";
}

function clearErrors() {
  signupForm.querySelectorAll(".field-error").forEach(error => {
    error.textContent = "";
  });
  formStatus.textContent = "";
  formStatus.className = "form-status";
  paymentPanel.hidden = true;
}

function validateForm() {
  clearErrors();
  let valid = true;
  const firstName = signupForm.elements.firstName.value.trim();
  const lastName = signupForm.elements.lastName.value.trim();
  const email = signupForm.elements.email.value.trim().toLowerCase();
  const memberType = selectedMemberType();
  const graduationYear = graduationYearInput.value;
  const currentYear = new Date().getFullYear();

  if (firstName.length < 1) {
    document.getElementById("first-name-error").textContent = "Please enter your first name.";
    valid = false;
  }

  if (lastName.length < 1) {
    document.getElementById("last-name-error").textContent = "Please enter your last name.";
    valid = false;
  }

  if (!signupForm.elements.email.validity.valid) {
    document.getElementById("email-error").textContent = "Please enter a valid email address.";
    valid = false;
  } else if (email.endsWith("@alumni.ku.dk")) {
    document.getElementById("email-error").textContent =
      "Please use a personal email address instead of your KU alumni email.";
    valid = false;
  }

  if (!memberType) {
    document.getElementById("member-type-error").textContent = "Please choose a member type.";
    valid = false;
  }

  if (memberType) {
    const year = Number(graduationYear);
    const invalidStudentYear =
      memberType === "Student" &&
      (!graduationYear || year < currentYear || year > currentYear + 15);
    const invalidAlumniYear =
      memberType === "Alumni" &&
      (!graduationYear || year < 2000 || year > currentYear);

    if (invalidStudentYear || invalidAlumniYear) {
      document.getElementById("graduation-year-error").textContent =
        memberType === "Student"
          ? "Please enter a valid expected graduation year."
          : "Please enter a valid graduation year.";
      valid = false;
    }
  }

  const name = `${firstName} ${lastName}`;

  return valid
    ? { firstName, lastName, name, email, memberType, graduationYear }
    : null;
}

signupForm.querySelectorAll('input[name="memberType"]').forEach(input => {
  input.addEventListener("change", updateMemberFields);
});

signupForm.addEventListener("submit", async event => {
  event.preventDefault();
  const data = validateForm();

  if (!data) {
    return;
  }

  const apiUrl = window.NANODE_CONFIG?.apiUrl?.replace(/\/$/, "");

  if (!apiUrl) {
    formStatus.textContent =
      "Online registration is being connected. Please try again soon.";
    formStatus.className = "form-status form-status-error";
    return;
  }

  const button = signupForm.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = "Submitting...";
  formStatus.textContent = "Sending your application...";

  try {
    const response = await fetch(`${apiUrl}/api/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        website: signupForm.elements.website.value
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Could not submit your application.");
    }

    signupForm.reset();
    updateMemberFields();
    formStatus.textContent = result.message;
    formStatus.className = "form-status form-status-success";
    paymentPanel.hidden = data.memberType !== "Alumni";
  } catch (error) {
    formStatus.textContent = error.message;
    formStatus.className = "form-status form-status-error";
  } finally {
    button.disabled = false;
    button.textContent = "Submit membership application";
  }
});
