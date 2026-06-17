// Refreshes the <!-- LATEST --> block in README.md with the most recently
// pushed, non-fork repositories. Zero dependencies — uses Node 20+ global fetch.
import { readFile, writeFile } from "node:fs/promises";

const OWNER = (process.env.GITHUB_REPOSITORY || "muzuvajoshua/muzuvajoshua").split("/")[0];
const README = "README.md";
const START = "<!-- LATEST:START -->";
const END = "<!-- LATEST:END -->";
const COUNT = 4;

const headers = { "Accept": "application/vnd.github+json", "User-Agent": OWNER };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

const res = await fetch(
  `https://api.github.com/users/${OWNER}/repos?sort=pushed&per_page=100`,
  { headers }
);
if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);

const repos = (await res.json())
  .filter((r) => !r.fork && r.name.toLowerCase() !== OWNER.toLowerCase())
  .slice(0, COUNT);

const fmt = (d) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" });

const clip = (s, n = 96) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

const rows = repos
  .map((r) => {
    const lang = r.language ? ` · \`${r.language}\`` : "";
    const desc = (r.description || "").trim();
    const tail = desc ? ` — ${clip(desc)}` : "";
    return `- **[${r.name}](${r.html_url})**${lang}${tail}  \n  <sub>updated ${fmt(r.pushed_at)}</sub>`;
  })
  .join("\n");

const block = `${START}\n### Latest\n\n${rows}\n${END}`;

const readme = await readFile(README, "utf8");
const next = readme.replace(
  new RegExp(`${START}[\\s\\S]*?${END}`),
  () => block
);

if (next !== readme) {
  await writeFile(README, next);
  console.log("README updated.");
} else {
  console.log("No changes.");
}
