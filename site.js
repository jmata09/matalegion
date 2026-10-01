// Contact form: "What can we help with?" picks the questions shown below it, then the
// form submits in place (falls back to a normal POST if JS fails).
const BOOKINGS = "https://bookings.cloud.microsoft/book/TheMatalegionGroup@Matalegion.com/s/";
const SERVICE_UI = {
  turnaround: { submit: "Send My Details", book: "Book a free turnaround consultation", url: "gFvrMYiozkOG3k69TdE5zg2" },
  staffing: { submit: "Send Staffing Request", book: "Book a 30-minute hiring call", url: "xu-5Bt-VHUyu8nMOEUzr5w2" },
  renovation: { submit: "Send My Details", book: "Book a free project consultation", url: "bdcuvxhtrk-cTGIhXJM-1A2" },
  portfolio: { submit: "Send My Details", book: "Book a free portfolio consultation", url: "XUAdwphkc0aUXIA79fdKxA2" },
  candidate: { submit: "Join the Talent Network" },
  other: { submit: "Send My Details", book: "Book a free consultation", url: "qN74lV3f00qkEt6dNzEtkw2" },
};

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form");
  if (!form) return;
  const status = form.querySelector(".form-status");
  const button = form.querySelector("button[type=submit]");
  const book = form.querySelector("[data-book]");
  const radios = [...form.querySelectorAll("input[name=service]")];
  form.elements.t.value = String(Date.now());

  // Show only the chosen service's questions; hidden ones are disabled so they aren't sent.
  const choose = (service) => {
    const radio = radios.find((r) => r.value === service);
    if (radio) radio.checked = true;
    form.querySelectorAll(".svc").forEach((block) => {
      block.hidden = block.disabled = block.dataset.svc !== service;
    });
    form.querySelectorAll("[data-hide-for]").forEach((el) => {
      el.hidden = el.dataset.hideFor === service;
      el.querySelectorAll("input").forEach((input) => (input.disabled = el.hidden));
    });
    const ui = SERVICE_UI[service] || SERVICE_UI.other;
    // On a role page (/jobs/<slug>) a job seeker is applying, not just joining the network.
    const submit = service === "candidate" && form.elements.job?.value ? "Submit Application" : ui.submit;
    button.innerHTML = `${submit} <span class="arrow" aria-hidden="true">→</span>`;
    if (book) book.parentElement.hidden = !ui.book;
    if (book && ui.book) {
      book.textContent = ui.book;
      book.href = `${BOOKINGS}${ui.url}?ismsaljsauthenabled`;
    }
  };
  radios.forEach((r) => r.addEventListener("change", () => choose(r.value)));
  const fromUrl = new URLSearchParams(location.search).get("service");
  choose(SERVICE_UI[fromUrl] ? fromUrl : form.dataset.default || "");

  // Buttons like "I'm Hiring" / "Find a Role" jump to the form with that service picked.
  document.querySelectorAll("[data-service]").forEach((link) =>
    link.addEventListener("click", () => choose(link.dataset.service)),
  );

  if (!window.fetch) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.className = "form-status";
    status.textContent = "";
    const fail = (msg, el) => {
      status.className = "form-status error";
      status.textContent = msg;
      if (el) el.focus();
    };
    if (!radios.some((r) => r.checked)) return fail("Please choose what we can help with.", radios[0]);
    // :disabled (not .disabled) so fields inside the hidden services' sections are skipped.
    form.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
    const missing = [...form.querySelectorAll("[required]")].find((el) => !el.matches(":disabled") && el.type !== "radio" && !el.value.trim());
    if (missing) {
      missing.setAttribute("aria-invalid", "true");
      const label = form.querySelector(`label[for="${missing.id}"]`)?.textContent.replace(/\s*\*$/, "") || "the required fields";
      return fail(`Please fill in: ${label}.`, missing);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.elements.email.value.trim())) {
      form.elements.email.setAttribute("aria-invalid", "true");
      return fail("Please enter a valid email address.", form.elements.email);
    }
    const resume = form.elements.resume;
    const file = resume && !resume.matches(":disabled") && resume.files[0];
    if (file && (!/\.(pdf|docx?)$/i.test(file.name) || file.size > 10 * 1024 * 1024)) {
      return fail("Your resume needs to be a PDF or Word file under 10 MB.", resume);
    }
    const label = button.innerHTML;
    button.disabled = true;
    button.textContent = "Sending…";
    try {
      const res = await fetch(form.action, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        window.location.href = "/thanks";
        return;
      }
      if (data.error === "bad_resume" || data.error === "too_large") {
        button.disabled = false;
        button.innerHTML = label;
        return fail("Your resume needs to be a PDF or Word file under 10 MB.", form.elements.resume);
      }
      throw new Error(data.error || "send_failed");
    } catch (err) {
      status.className = "form-status error";
      status.innerHTML = 'That didn\'t go through. Please email <a href="mailto:info.desk@matalegion.com">info.desk@matalegion.com</a> or call +1 702.818.7003.';
      button.disabled = false;
      button.innerHTML = label;
    }
  });
});

// "Stay in the Know" sign-up (footer) and the unsubscribe page: submit in place.
document.addEventListener("DOMContentLoaded", () => {
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  document.querySelectorAll("form.signup, form.signup-page").forEach((form) => {
    if (form.elements.t) form.elements.t.value = String(Date.now());
    if (!window.fetch) return;
    const status = form.querySelector(".signup-status, .form-status");
    const button = form.querySelector("button[type=submit]");
    const label = button.textContent;
    const done = form.classList.contains("signup")
      ? "Almost done: check your inbox and click the link to confirm."
      : "Check your inbox: we've sent you a one-click unsubscribe link.";
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = form.elements.email.value.trim();
      status.className = status.className.replace(/\s*(ok|error)\b/g, "");
      if (!EMAIL.test(email)) {
        status.className += " error";
        status.textContent = "Please enter a valid email address.";
        form.elements.email.focus();
        return;
      }
      button.disabled = true;
      button.textContent = "Sending…";
      try {
        const res = await fetch(form.action, { method: "POST", headers: { Accept: "application/json" }, body: new FormData(form) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.error || "failed");
        status.className += " ok";
        status.textContent = done;
        form.reset();
      } catch {
        status.className += " error";
        status.textContent = "That didn't work. Please try again in a moment.";
      } finally {
        button.disabled = false;
        button.textContent = label;
      }
    });
  });

  // /check-inbox?for=unsubscribe shows the unsubscribe wording.
  const which = new URLSearchParams(location.search).get("for");
  if (which) document.querySelectorAll("[data-for]").forEach((el) => { el.hidden = el.dataset.for !== which; });
});
