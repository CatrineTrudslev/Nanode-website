const signupForm = document.getElementById("signup-form");
const graduationYearField = document.getElementById("graduation-year-field");
const graduationYearInput = document.getElementById("graduation-year");
const formStatus = document.getElementById("form-status");

function selectedMemberType() {
  return signupForm.querySelector('input[name="memberType"]:checked')?.value || "";
}

function updateMemberFields() {
  const isStudent = selectedMemberType() === "Student";
  graduationYearField.hidden = !isStudent;
  graduationYearInput.required = isStudent;

  if (!isStudent) {
    graduationYearInput.value = "";
    document.getElementById("graduation-year-error").textContent = "";
  }
}

function clearErrors() {
  signupForm.querySelectorAll(".field-error").forEach(error => {
    error.textContent = "";
  });
  formStatus.textContent = "";
  formStatus.className = "form-status";
}

function validateForm() {
  clearErrors();
  let valid = true;
  const name = signupForm.elements.name.value.trim();
  const email = signupForm.elements.email.value.trim();
  const memberType = selectedMemberType();
  const graduationYear = graduationYearInput.value;
  const currentYear = new Date().getFullYear();

  if (name.length < 2) {
    document.getElementById("name-error").textContent = "Please enter your full name.";
    valid = false;
  }

  if (!signupForm.elements.email.validity.valid) {
    document.getElementById("email-error").textContent = "Please enter a valid email address.";
    valid = false;
  }

  if (!memberType) {
    document.getElementById("member-type-error").textContent = "Please choose a member type.";
    valid = false;
  }

  if (memberType === "Student") {
    const year = Number(graduationYear);
    if (!graduationYear || year < currentYear || year > currentYear + 15) {
      document.getElementById("graduation-year-error").textContent =
        "Please enter a valid expected graduation year.";
      valid = false;
    }
  }

  return valid ? { name, email, memberType, graduationYear } : null;
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
  } catch (error) {
    formStatus.textContent = error.message;
    formStatus.className = "form-status form-status-error";
  } finally {
    button.disabled = false;
    button.textContent = "Submit membership application";
  }
});
