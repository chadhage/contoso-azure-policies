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
  const tabs = document.querySelectorAll("#deploy .code-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      document.querySelectorAll("#deploy .code-pane").forEach((p) =>
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

/* ---------- Deployment wizard ---------- */
const WIZARD_REPO = "https://github.com/chadhage/contoso-azure-policies.git";

// Built-in role definition GUIDs used for DeployIfNotExists / Modify remediation.
const ROLE = {
  contributor: "b24988ac-6180-42a0-ab88-20f7382dd24c",
  backupContributor: "5e467623-bb1f-42f4-a55d-6e525e11384b",
  securityAdmin: "fb1c8493-542b-48eb-b624-b4c8fea62acd",
  storageAccountContributor: "17d1049b-9a84-46fb-8f53-869881c3d3ab",
  logAnalyticsContributor: "92aaf0da-9dab-42b6-94a3-d43ce8d16293",
  monitoringContributor: "749f88d5-cbae-40b8-bcfc-e573ddc772fa",
};

// Ordered so dependencies (definitions) exist before assignments; matches pillar order.
const WIZARD_INITIATIVES = [
  {
    key: "governance",
    setName: "contoso-governance-baseline",
    assignName: "waf-governance",
    display: "WAF Governance Baseline",
    identity: () => true, // always: the initiative includes a Modify tag-inheritance policy
    roles: (cfg, e) => {
      const r = [ROLE.contributor];
      if (e.diagnosticsEffect === "DeployIfNotExists") {
        r.push(ROLE.logAnalyticsContributor, ROLE.monitoringContributor);
      }
      return r;
    },
    params: (cfg, e) => {
      const p = {
        allowedLocationsEffect: { value: e.allowedLocationsEffect },
        requiredTagsEffect: { value: e.requiredTagsEffect },
        diagnosticsEffect: { value: e.diagnosticsEffect },
      };
      if (cfg.regions.length) p.allowedLocations = { value: cfg.regions };
      if (cfg.law) p.logAnalyticsWorkspaceId = { value: cfg.law };
      return p;
    },
  },
  {
    key: "security",
    setName: "contoso-security-baseline",
    assignName: "waf-security",
    display: "WAF Security Baseline",
    identity: (cfg, e) =>
      e.defenderEffect === "DeployIfNotExists" ||
      e.storageHttpsEffect === "Modify" ||
      e.storageTlsEffect === "Modify",
    roles: () => [ROLE.securityAdmin, ROLE.storageAccountContributor],
    params: (cfg, e) => ({
      denyPublicIpEffect: { value: e.denyPublicIpEffect },
      storageHttpsEffect: { value: e.storageHttpsEffect },
      storageTlsEffect: { value: e.storageTlsEffect },
      storagePublicAccessEffect: { value: e.storagePublicAccessEffect },
      defenderEffect: { value: e.defenderEffect },
    }),
  },
  {
    key: "reliability",
    setName: "contoso-reliability-baseline",
    assignName: "waf-reliability",
    display: "WAF Reliability Baseline",
    identity: (cfg, e) => e.vmBackupEffect === "DeployIfNotExists",
    roles: () => [ROLE.backupContributor],
    params: (cfg, e) => {
      const p = {
        storageZrsEffect: { value: e.storageZrsEffect },
        vmZoneEffect: { value: e.vmZoneEffect },
        sqlBackupEffect: { value: e.sqlBackupEffect },
        vmBackupEffect: { value: e.vmBackupEffect },
        vmBackupVaultLocation: { value: cfg.location },
      };
      if (cfg.backup) p.vmBackupPolicyId = { value: cfg.backup };
      return p;
    },
  },
  {
    key: "cost",
    setName: "contoso-cost-baseline",
    assignName: "waf-cost",
    display: "WAF Cost Baseline",
    identity: () => false,
    roles: () => [],
    params: (cfg, e) => {
      const p = {
        allowedVmSkusEffect: { value: e.allowedVmSkusEffect },
        expensiveVmEffect: { value: e.expensiveVmEffect },
        costCenterTagEffect: { value: e.costCenterTagEffect },
        autoShutdownEffect: { value: e.autoShutdownEffect },
      };
      if (cfg.skus.length) p.allowedVmSkus = { value: cfg.skus };
      return p;
    },
  },
  {
    key: "performance",
    setName: "contoso-performance-baseline",
    assignName: "waf-performance",
    display: "WAF Performance Baseline",
    identity: () => false,
    roles: () => [],
    params: (cfg, e) => ({
      premiumDiskEffect: { value: e.premiumDiskEffect },
      acceleratedNetworkingEffect: { value: e.acceleratedNetworkingEffect },
      appServiceSkuEffect: { value: e.appServiceSkuEffect },
    }),
  },
];

function wizardEffects(cfg) {
  const enforce = cfg.mode === "enforce";
  const hasLaw = !!cfg.law;
  const hasBackup = !!cfg.backup;
  return {
    // Reliability
    storageZrsEffect: enforce ? "Deny" : "Audit",
    vmZoneEffect: "Audit",
    sqlBackupEffect: enforce ? "Deny" : "Audit",
    vmBackupEffect: hasBackup ? "DeployIfNotExists" : "AuditIfNotExists",
    // Security
    denyPublicIpEffect: enforce ? "Deny" : "Audit",
    storageHttpsEffect: enforce ? "Modify" : "Audit",
    storageTlsEffect: enforce ? "Modify" : "Audit",
    storagePublicAccessEffect: enforce ? "Deny" : "Audit",
    defenderEffect: enforce ? "DeployIfNotExists" : "AuditIfNotExists",
    // Cost
    allowedVmSkusEffect: enforce ? "Deny" : "Audit",
    expensiveVmEffect: enforce ? "Deny" : "Audit",
    costCenterTagEffect: enforce ? "Deny" : "Audit",
    autoShutdownEffect: "AuditIfNotExists",
    // Governance
    allowedLocationsEffect: enforce ? "Deny" : "Audit",
    requiredTagsEffect: enforce ? "Deny" : "Audit",
    diagnosticsEffect: hasLaw && enforce ? "DeployIfNotExists" : "AuditIfNotExists",
    // Performance
    premiumDiskEffect: enforce ? "Deny" : "Audit",
    acceleratedNetworkingEffect: "Audit",
    appServiceSkuEffect: enforce ? "Deny" : "Audit",
  };
}

function selectedInitiatives(cfg) {
  return WIZARD_INITIATIVES.filter((i) => cfg.pillars.includes(i.key));
}

function genPwsh(cfg) {
  const e = wizardEffects(cfg);
  const tenant = cfg.tenant || "<your-tenant-id>";
  const sub = cfg.sub || "<your-subscription-id>";
  const items = selectedInitiatives(cfg);
  const lines = [];
  lines.push("#Requires -Version 7");
  lines.push("# Contoso Azure Policy — generated deployment script (PowerShell)");
  lines.push(`# Generated ${new Date().toISOString()} · enforcement: ${cfg.mode}`);
  lines.push("$ErrorActionPreference = 'Stop'");
  lines.push("");
  lines.push("# --- Your inputs ---");
  lines.push(`$TenantId        = '${tenant}'`);
  lines.push(`$SubscriptionId  = '${sub}'`);
  lines.push(`$ManagementGroup = '${cfg.mg}'`);
  lines.push(`$Location        = '${cfg.location}'`);
  lines.push('$mgScope = "/providers/Microsoft.Management/managementGroups/$ManagementGroup"');
  lines.push("");
  lines.push("# 1) Sign in with device code");
  lines.push("Write-Host 'Sign in with the device code shown below...' -ForegroundColor Cyan");
  lines.push("az login --use-device-code --tenant $TenantId --only-show-errors | Out-Null");
  lines.push("az account set --subscription $SubscriptionId");
  lines.push("");
  lines.push("# 2) Pull the baseline definitions + initiatives");
  lines.push("if (-not (Test-Path contoso-azure-policies)) {");
  lines.push(`  git clone ${WIZARD_REPO}`);
  lines.push("}");
  lines.push("Push-Location contoso-azure-policies");
  lines.push("./scripts/deploy.ps1 -RootManagementGroupId $ManagementGroup -Location $Location -SkipAssignments");
  lines.push("Pop-Location");
  lines.push("");
  lines.push("# 3) Assign the selected initiatives with your parameters");
  items.forEach((it) => {
    const json = JSON.stringify(it.params(cfg, e));
    const needsId = it.identity(cfg, e);
    const suffix = it.key.charAt(0).toUpperCase() + it.key.slice(1);
    lines.push("");
    lines.push(`# --- ${it.display} ---`);
    lines.push(`$params${suffix} = '${json}'`);
    lines.push("az policy assignment create `");
    lines.push(`  --name '${it.assignName}' `);
    lines.push(`  --display-name '${it.display}' `);
    lines.push("  --scope $mgScope `");
    lines.push(`  --policy-set-definition "$mgScope/providers/Microsoft.Authorization/policySetDefinitions/${it.setName}" `);
    lines.push(`  --params $params${suffix} `);
    if (needsId) lines.push("  --mi-system-assigned --location $Location `");
    lines.push("  --only-show-errors | Out-Null");
    if (needsId) {
      const roles = it.roles(cfg, e);
      lines.push(`$principal${suffix} = az policy assignment show --name '${it.assignName}' --scope $mgScope --query 'identity.principalId' -o tsv`);
      lines.push(`foreach ($role in @(${roles.map((r) => `'${r}'`).join(", ")})) {`);
      lines.push(`  az role assignment create --assignee-object-id $principal${suffix} --assignee-principal-type ServicePrincipal --role $role --scope $mgScope --only-show-errors | Out-Null`);
      lines.push("}");
    }
  });
  lines.push("");
  lines.push("Write-Host 'Done. Review compliance in the Azure Policy blade.' -ForegroundColor Green");
  return lines.join("\n");
}

function genBash(cfg) {
  const e = wizardEffects(cfg);
  const tenant = cfg.tenant || "<your-tenant-id>";
  const sub = cfg.sub || "<your-subscription-id>";
  const items = selectedInitiatives(cfg);
  const lines = [];
  lines.push("#!/usr/bin/env bash");
  lines.push("# Contoso Azure Policy — generated deployment script (Bash)");
  lines.push(`# Generated ${new Date().toISOString()} · enforcement: ${cfg.mode}`);
  lines.push("set -euo pipefail");
  lines.push("");
  lines.push("# --- Your inputs ---");
  lines.push(`TENANT_ID="${tenant}"`);
  lines.push(`SUBSCRIPTION_ID="${sub}"`);
  lines.push(`MANAGEMENT_GROUP="${cfg.mg}"`);
  lines.push(`LOCATION="${cfg.location}"`);
  lines.push('MG_SCOPE="/providers/Microsoft.Management/managementGroups/${MANAGEMENT_GROUP}"');
  lines.push("");
  lines.push("# 1) Sign in with device code");
  lines.push('echo "Sign in with the device code shown below..."');
  lines.push('az login --use-device-code --tenant "$TENANT_ID" --only-show-errors >/dev/null');
  lines.push('az account set --subscription "$SUBSCRIPTION_ID"');
  lines.push("");
  lines.push("# 2) Pull the baseline definitions + initiatives");
  lines.push("if [ ! -d contoso-azure-policies ]; then");
  lines.push(`  git clone ${WIZARD_REPO}`);
  lines.push("fi");
  lines.push("(cd contoso-azure-policies && ./scripts/deploy.sh --mg \"$MANAGEMENT_GROUP\" --location \"$LOCATION\" --skip-assignments)");
  lines.push("");
  lines.push("# 3) Assign the selected initiatives with your parameters");
  items.forEach((it) => {
    const json = JSON.stringify(it.params(cfg, e));
    const needsId = it.identity(cfg, e);
    const varName = it.key.toUpperCase();
    lines.push("");
    lines.push(`# --- ${it.display} ---`);
    lines.push("az policy assignment create \\");
    lines.push(`  --name "${it.assignName}" \\`);
    lines.push(`  --display-name "${it.display}" \\`);
    lines.push('  --scope "$MG_SCOPE" \\');
    lines.push(`  --policy-set-definition "$MG_SCOPE/providers/Microsoft.Authorization/policySetDefinitions/${it.setName}" \\`);
    lines.push(`  --params '${json}' \\`);
    if (needsId) lines.push('  --mi-system-assigned --location "$LOCATION" \\');
    lines.push("  --only-show-errors >/dev/null");
    if (needsId) {
      const roles = it.roles(cfg, e);
      lines.push(`PID_${varName}=$(az policy assignment show --name "${it.assignName}" --scope "$MG_SCOPE" --query 'identity.principalId' -o tsv)`);
      lines.push(`for role in ${roles.join(" ")}; do`);
      lines.push(`  az role assignment create --assignee-object-id "$PID_${varName}" --assignee-principal-type ServicePrincipal --role "$role" --scope "$MG_SCOPE" --only-show-errors >/dev/null`);
      lines.push("done");
    }
  });
  lines.push("");
  lines.push('echo "Done. Review compliance in the Azure Policy blade."');
  return lines.join("\n");
}

function initWizard() {
  const form = document.getElementById("wizardForm");
  if (!form) return;
  const scriptEl = document.getElementById("wizardScript");
  const tabs = document.querySelectorAll("#wizard .code-tab");
  const ui = { shell: "pwsh" };
  const val = (id) => document.getElementById(id).value;
  const splitList = (s) =>
    s.split(",").map((x) => x.trim()).filter((x) => x.length > 0);

  function collect() {
    return {
      tenant: val("wz-tenant").trim(),
      sub: val("wz-sub").trim(),
      mg: val("wz-mg").trim() || "contoso",
      location: val("wz-location").trim() || "eastus",
      regions: splitList(val("wz-regions")),
      skus: splitList(val("wz-skus")),
      law: val("wz-law").trim(),
      backup: val("wz-backup").trim(),
      mode: val("wz-mode"),
      pillars: Array.from(
        document.querySelectorAll("#wz-pillars input:checked")
      ).map((c) => c.value),
    };
  }

  function render() {
    const cfg = collect();
    scriptEl.textContent = ui.shell === "pwsh" ? genPwsh(cfg) : genBash(cfg);
  }

  form.addEventListener("input", render);
  form.addEventListener("change", render);
  tabs.forEach((t) =>
    t.addEventListener("click", () => {
      tabs.forEach((x) => x.classList.remove("active"));
      t.classList.add("active");
      ui.shell = t.dataset.shell;
      render();
    })
  );

  document.getElementById("wzCopy").addEventListener("click", async (ev) => {
    try {
      await navigator.clipboard.writeText(scriptEl.textContent);
      ev.target.textContent = "Copied!";
      setTimeout(() => (ev.target.textContent = "Copy"), 1600);
    } catch {
      ev.target.textContent = "Press Ctrl+C";
    }
  });

  document.getElementById("wzDownload").addEventListener("click", () => {
    const ext = ui.shell === "pwsh" ? "ps1" : "sh";
    const blob = new Blob([scriptEl.textContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deploy-contoso-policy.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  });

  render();
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
  initWizard();
  document.getElementById("year").textContent = new Date().getFullYear();
});
