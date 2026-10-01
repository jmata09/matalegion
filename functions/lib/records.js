// Keeps a copy of every form submission in OneDrive (Microsoft Graph, app-only), one sheet per type:
//
//   Website Submissions/Job Applications.csv   applications for a listed role (Jobs page)
//   Website Submissions/Job Seekers.csv        "I'm looking for a role" (talent network)
//   Website Submissions/Hiring Requests.csv    "I'm hiring: task force or staffing"
//   Website Submissions/Consulting Leads.csv   turnaround, renovation/PIP/opening, portfolio, something else
//   Website Submissions/Resumes/               uploaded resumes, linked from Job Seekers
//
// CSV because Graph can't add rows to an Excel workbook with app-only access; the files open in Excel.
// The app needs the Graph application permission Files.ReadWrite.All (admin consent).
// Settings: RECORDS_USER  whose OneDrive (default j.mata@matalegion.com)

import { graphToken } from "./mail.js";

const FOLDER = "Website Submissions";

// Sheet per service: file name and [column, value] pairs.
const SHEETS = {
  application: {
    file: "Job Applications",
    columns: (l) => [
      ["Date", l.date], ["Role", l.job], ["Role location", l.jobPlace], ["Role link", l.jobSlug ? `https://thematalegion.com/jobs/${l.jobSlug}` : ""],
      ["Name", l.name], ["Email", l.email], ["Phone", l.phone], ["Current role", l.position], ["Based in", l.location],
      ["Open to", l.hire], ["Travel", l.move], ["LinkedIn", l.link], ["Resume", l.resumeUrl], ["Experience", l.message],
    ],
  },
  candidate: {
    file: "Job Seekers",
    columns: (l) => [
      ["Date", l.date], ["Name", l.name], ["Email", l.email], ["Phone", l.phone], ["Current role", l.position],
      ["Based in", l.location], ["Open to", l.hire], ["Travel", l.move], ["LinkedIn", l.link], ["Resume", l.resumeUrl],
      ["Experience", l.message],
    ],
  },
  staffing: {
    file: "Hiring Requests",
    columns: (l) => [
      ["Date", l.date], ["Name", l.name], ["Email", l.email], ["Phone", l.phone], ["Company", l.company],
      ["Role(s) to fill", l.position], ["Location", l.location], ["Interim / permanent", l.hire], ["Needed by", l.start],
      ["Details", l.message], ["Sent from", l.page],
    ],
  },
  consulting: {
    file: "Consulting Leads",
    columns: (l) => [
      ["Date", l.date], ["Service", l.serviceName], ["Name", l.name], ["Email", l.email], ["Phone", l.phone],
      ["Company", l.company], ["Their role", l.role], ["Location", l.location], ["Project", l.project], ["Brand", l.brand],
      ["Target date", l.target], ["Properties", l.properties], ["Message", l.message], ["Sent from", l.page],
    ],
  },
};

export async function saveSubmission(env, lead, serviceName, resume) {
  if (!(env.GRAPH_TENANT_ID && env.GRAPH_CLIENT_ID && env.GRAPH_CLIENT_SECRET)) return;
  const access = await graphToken(env);
  const drive = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(env.RECORDS_USER || "j.mata@matalegion.com")}/drive/root:`;
  const path = (p) => p.split("/").map(encodeURIComponent).join("/");
  const g = (url, opts = {}) => fetch(url, { ...opts, headers: { Authorization: `Bearer ${access}`, ...opts.headers } });

  const now = new Date();
  const day = now.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" }); // 2026-10-01
  const record = {
    ...lead,
    serviceName,
    date: now.toLocaleString("en-US", { timeZone: "America/Los_Angeles", dateStyle: "medium", timeStyle: "short" }),
    resumeUrl: "",
  };

  if (resume) {
    const clean = (t) => t.replace(/[^\p{L}\p{M}\w .'-]+/gu, "").slice(0, 60);
    const name = `${day} ${clean(lead.name)}${lead.job ? ` - ${clean(lead.job)}` : ""} - ${resume.name}`;
    const res = await g(`${drive}/${path(`${FOLDER}/Resumes/${name}`)}:/content?@microsoft.graph.conflictBehavior=rename`, {
      method: "PUT",
      headers: { "Content-Type": resume.type },
      body: Uint8Array.from(atob(resume.base64), (c) => c.charCodeAt(0)),
    });
    if (!res.ok) throw new Error(`resume_upload_${res.status}: ${(await res.text()).slice(0, 200)}`);
    record.resumeUrl = (await res.json()).webUrl || "";
  }

  const sheet = lead.job ? SHEETS.application : SHEETS[lead.service] || SHEETS.consulting;
  const pairs = sheet.columns(record);
  const header = "﻿" + pairs.map(([c]) => cell(c)).join(",") + "\r\n"; // BOM so Excel reads accents correctly
  const line = pairs.map(([, v]) => cell(v)).join(",") + "\r\n";

  // Append the row; If-Match makes two submissions at once retry instead of overwriting each other.
  const csvUrl = `${drive}/${path(`${FOLDER}/${sheet.file}.csv`)}:`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const meta = await g(csvUrl);
    let text = header;
    let etag = "";
    if (meta.ok) {
      etag = (await meta.json()).eTag;
      const body = await g(`${csvUrl}/content`);
      if (!body.ok) throw new Error(`csv_read_${body.status}`);
      text = await body.text(); // decoding drops the BOM, so put it back
      if (!text.startsWith("\uFEFF")) text = "\uFEFF" + text;
      if (!text.endsWith("\n")) text += "\r\n";
    } else if (meta.status !== 404) {
      throw new Error(`csv_meta_${meta.status}: ${(await meta.text()).slice(0, 200)}`);
    }
    const put = await g(`${csvUrl}/content`, {
      method: "PUT",
      headers: { "Content-Type": "text/csv; charset=utf-8", ...(etag ? { "If-Match": etag } : {}) },
      body: text + line,
    });
    if (put.ok) return;
    if (put.status !== 412 && put.status !== 409) throw new Error(`csv_write_${put.status}: ${(await put.text()).slice(0, 200)}`);
  }
  throw new Error("csv_write_conflict");
}

// One CSV cell. Text starting with = + - @ is prefixed with ' so Excel never runs it as a formula.
function cell(value) {
  let v = String(value ?? "").replace(/\r?\n/g, " ").trim();
  if (/^[=+\-@\t]/.test(v)) v = `'${v}`;
  return /[",]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}
