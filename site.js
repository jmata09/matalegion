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
      status.innerHTML = 'That didn\'t go through. Please email <a href="mailto:TheMatalegionGroup@Matalegion.com">TheMatalegionGroup@Matalegion.com</a> or call +1 702.818.7003.';
      button.disabled = false;
      button.innerHTML = label;
    }
  });
});
