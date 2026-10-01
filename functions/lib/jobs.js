// Open roles for the Jobs pages, the application form and the sitemap.
// Edit data/jobs.json to add or close a role (see README).

import roles from "../../data/jobs.json";

export { roles };
export const openRoles = () => roles.filter((r) => r.status === "open");
export const findOpenRole = (slug) => openRoles().find((r) => r.slug === slug) || null;

export function place(r) {
  return [r.city, r.region, r.country && r.country !== "US" ? r.country : ""].filter(Boolean).join(", ");
}

export function pay(r) {
  if (!r.pay) return "";
  const money = (n) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: r.pay.currency || "USD", maximumFractionDigits: 0 }).format(n);
  const range = r.pay.max && r.pay.max !== r.pay.min ? `${money(r.pay.min)}–${money(r.pay.max)}` : money(r.pay.min);
  return `${range} a ${r.pay.period || "year"}`;
}
