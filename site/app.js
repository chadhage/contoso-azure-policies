/* ============================================================================
 * Contoso Azure Policy — minisite behavior
 * Data mirrors the policy definitions and initiatives in this repository.
 * ==========================================================================*/

const PILLARS = [
  { id: "reliability", name: "Reliability",  icon: "♻️", color: "var(--rel)",
    blurb: "Survive datacenter and region failures and meet SLAs." },
  { id: "security",    name: "Security",     icon: "🔒", color: "var(--sec)",
    blurb: "Protect data and workloads with encryption and private networking." },
  { id: "cost",        name: "Cost",         icon: "💰", color: "var(--cost)",
    blurb: "Prevent waste with SKU limits, tags, and shutdown schedules." },
  { id: "governance",  name: "Governance",   icon: "🏛️", color: "var(--gov)",
    blurb: "Consistency via allowed regions, required tags, and diagnostics forwarding." },
  { id: "performance", name: "Performance",  icon: "⚡", color: "var(--perf)",
    blurb: "Right resources and scale for latency and throughput targets." },
];

const POLICIES = [
  // Reliability
  { pillar: "reliability", name: "Storage should use zone/geo-redundant replication", effects: ["Audit", "Deny"] },
  { pillar: "reliability", name: "VMs should be deployed to an availability zone", effects: ["Audit", "Deny"] },
  { pillar: "reliability", name: "SQL databases should use geo-redundant backup", effects: ["Audit", "Deny"] },
  { pillar: "reliability", name: "VMs should be protected by Azure Backup", effects: ["AuditIfNotExists", "DeployIfNotExists"] },
  // Security
  { pillar: "security", name: "Network interfaces should not have a public IP", effects: ["Audit", "Deny"] },
  { pillar: "security", name: "Storage should require secure transfer (HTTPS only)", effects: ["Audit", "Deny", "Modify"] },
  { pillar: "security", name: "Storage should enforce minimum TLS 1.2", effects: ["Audit", "Deny", "Modify"] },
  { pillar: "security", name: "Storage should disable public network access", effects: ["Audit", "Deny"] },
  { pillar: "security", name: "Microsoft Defender for Cloud plans should be enabled", effects: ["AuditIfNotExists", "DeployIfNotExists"] },
  // Cost
  { pillar: "cost", name: "Restrict to allowed virtual machine SKUs", effects: ["Audit", "Deny"] },
  { pillar: "cost", name: "Deny expensive GPU, HPC & memory-optimized VM series", effects: ["Audit", "Deny"] },
  { pillar: "cost", name: "Resources must carry a CostCenter tag", effects: ["Audit", "Deny"] },
  { pillar: "cost", name: "Sandbox VMs should have an auto-shutdown schedule", effects: ["AuditIfNotExists"] },
  // Governance
  { pillar: "governance", name: "Restrict allowed deployment locations", effects: ["Audit", "Deny"] },
  { pillar: "governance", name: "Restrict resource group locations", effects: ["Audit", "Deny"] },
  { pillar: "governance", name: "Require a specified tag on resources", effects: ["Audit", "Deny"] },
  { pillar: "governance", name: "Inherit a tag from the resource group if missing", effects: ["Modify"] },
  { pillar: "governance", name: "Deploy diagnostic settings to Log Analytics", effects: ["AuditIfNotExists", "DeployIfNotExists"] },
  { pillar: "governance", name: "Deny resource creation (decommissioned scope)", effects: ["Audit", "Deny"] },
  // Performance
  { pillar: "performance", name: "Production VMs should use Premium SSD or better", effects: ["Audit", "Deny"] },
  { pillar: "performance", name: "NICs should have accelerated networking enabled", effects: ["Audit"] },
  { pillar: "performance", name: "Production App Service plans should meet a minimum SKU", effects: ["Audit", "Deny"] },
];

const MG_TREE = [
  { id: "contoso", depth: 0, desc: "Intermediate root · org-wide guardrails" },
  { id: "contoso-platform", depth: 1, desc: "Shared platform services" },
  { id: "contoso-platform-identity", depth: 2, desc: "Identity services" },
  { id: "contoso-platform-management", depth: 2, desc: "Logging & monitoring" },
  { id: "contoso-platform-connectivity", depth: 2, desc: "Hub network & firewall" },
  { id: "contoso-landingzones", depth: 1, desc: "Application landing zones" },
  { id: "contoso-landingzones-corp", depth: 2, desc: "Private, internal workloads" },
  { id: "contoso-landingzones-online", depth: 2, desc: "Internet-facing workloads" },
  { id: "contoso-sandbox", depth: 1, desc: "Experimentation · cost controls" },
  { id: "contoso-decommissioned", depth: 1, desc: "Retired · deny creation" },
];

const pillarById = Object.fromEntries(PILLARS.map((p) => [p.id, p]));

/* ---------- Render pillars ---------- */
function renderPillars() {
  const grid = document.getElementById("pillarGrid");
  grid.innerHTML = PILLARS.map((p) => {
    const count = POLICIES.filter((x) => x.pillar === p.id).length;
    return `
      <article class="pillar-card" style="--pc:${p.color}">
        <span class="pillar-ico">${p.icon}</span>
        <h3>${p.name}</h3>
        <p>${p.blurb}</p>
        <span class="pillar-count">${count} ${count === 1 ? "policy" : "policies"}</span>
      </article>`;
  }).join("");
}

/* ---------- Render management group tree ---------- */
function renderTree() {
  const tree = document.getElementById("mgTree");
  tree.innerHTML = MG_TREE.map((n) => `
    <div class="mg-node" data-depth="${n.depth}">
      <span class="dot"></span>
      <span class="mg-id">${n.id}</span>
      <span class="mg-desc">${n.desc}</span>
    </div>`).join("");
}

/* ---------- Render catalog ---------- */
const state = { pillar: "all", query: "" };

function effectClass(e) {
  if (e === "Deny") return "effect deny";
  if (e === "DeployIfNotExists" || e === "Modify") return "effect deploy";
  return "effect";
}

function renderCatalog() {
  const grid = document.getElementById("catalogGrid");
  const empty = document.getElementById("emptyState");
  const q = state.query.trim().toLowerCase();
  const items = POLICIES.filter((p) => {
    const okPillar = state.pillar === "all" || p.pillar === state.pillar;
    const okQuery = !q || p.name.toLowerCase().includes(q) || p.pillar.includes(q);
    return okPillar && okQuery;
  });

  empty.hidden = items.length > 0;
  grid.innerHTML = items.map((p) => {
    const pil = pillarById[p.pillar];
    return `
      <article class="policy-card" style="--pc:${pil.color}">
        <div class="policy-top">
          <span class="pill" style="--pc:${pil.color}">${pil.icon} ${pil.name}</span>
        </div>
        <h4>${p.name}</h4>
        <div class="policy-meta">
          ${p.effects.map((e) => `<span class="${effectClass(e)}">${e}</span>`).join("")}
        </div>
      </article>`;
  }).join("");
}

function renderFilters() {
  const wrap = document.getElementById("pillarFilters");
  const chips = [{ id: "all", name: "All", color: "var(--brand)" }, ...PILLARS];
  wrap.innerHTML = chips.map((c) => `
    <button class="filter-chip ${c.id === "all" ? "active" : ""}" data-pillar="${c.id}" style="--chip:${c.color}">
      ${c.icon ? c.icon + " " : ""}${c.name}
    </button>`).join("");

  wrap.querySelectorAll(".filter-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      wrap.querySelectorAll(".filter-chip").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.pillar = btn.dataset.pillar;
      renderCatalog();
    });
  });
}

/* ---------- Search ---------- */
function wireSearch() {
  document.getElementById("searchBox").addEventListener("input", (e) => {
    state.query = e.target.value;
    renderCatalog();
  });
}

/* ---------- Code tabs + copy ---------- */
function wireCode() {
  const tabs = document.querySelectorAll(".code-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      document.querySelectorAll(".code-pane").forEach((p) =>
        p.classList.toggle("active", p.dataset.pane === tab.dataset.tab));
    });
  });

  document.getElementById("copyBtn").addEventListener("click", async (e) => {
    const active = document.querySelector(".code-pane.active code");
    try {
      await navigator.clipboard.writeText(active.textContent);
      e.target.textContent = "Copied!";
      setTimeout(() => (e.target.textContent = "Copy"), 1600);
    } catch {
      e.target.textContent = "Press Ctrl+C";
    }
  });
}

/* ---------- Animated stats ---------- */
function animateStats() {
  const nums = document.querySelectorAll("#heroStats dt");
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = +el.dataset.count;
      let cur = 0;
      const step = Math.max(1, Math.round(target / 28));
      const tick = () => {
        cur = Math.min(target, cur + step);
        el.textContent = cur;
        if (cur < target) requestAnimationFrame(tick);
      };
      tick();
      io.unobserve(el);
    });
  }, { threshold: 0.6 });
  nums.forEach((n) => io.observe(n));
}

/* ---------- Theme ---------- */
function wireTheme() {
  const root = document.documentElement;
  const saved = localStorage.getItem("contoso-theme");
  if (saved) root.setAttribute("data-theme", saved);
  document.getElementById("themeToggle").addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    if (next === "dark") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", "light");
    localStorage.setItem("contoso-theme", next);
  });
}

/* ---------- Init ---------- */
document.addEventListener("DOMContentLoaded", () => {
  renderPillars();
  renderTree();
  renderFilters();
  renderCatalog();
  wireSearch();
  wireCode();
  wireTheme();
  animateStats();
  document.getElementById("year").textContent = new Date().getFullYear();
});
