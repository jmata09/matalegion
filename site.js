// Contact form: submit in place, fall back to a normal POST if JS fails.
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form");
  if (!form || !window.fetch) return;
  const status = form.querySelector(".form-status");
  const button = form.querySelector("button[type=submit]");
  const label = button.innerHTML;
  form.elements.t.value = String(Date.now());

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.className = "form-status";
    status.textContent = "";
    const missing = [...form.querySelectorAll("[required]")].find((el) => !el.value.trim());
    if (missing) {
      status.className = "form-status error";
      status.textContent = "Please fill in the required fields.";
      missing.focus();
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.elements.email.value.trim())) {
      status.className = "form-status error";
      status.textContent = "Please enter a valid email address.";
      form.elements.email.focus();
      return;
    }
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
