# Contoso Azure Policy — Enterprise-Scale Landing Zone Baseline

Azure Policy best-practice repository for **Contoso Ltd.**, a mock enterprise
organization. Policies are organized around the five
**Azure Well-Architected Framework (WAF)** pillars and are designed to be
deployed across an **Enterprise-Scale Landing Zone (ESLZ)** management group
hierarchy aligned with the Microsoft Cloud Adoption Framework (CAF).

**🌐 Live site:** https://chadhage.github.io/contoso-azure-policies/

> This repo is opinionated, self-contained, and portal/CLI/CI deployable. It
> ships policy **definitions**, WAF-aligned **initiatives** (policy sets),
> management-group **assignments**, and deployment automation.

---

## WAF pillar coverage

| Pillar | Goal | Example controls in this repo |
| --- | --- | --- |
| ♻️ **Reliability** | Survive failures, meet SLAs | Require zone-redundancy, backup, geo-replication, availability zones |
| 🔒 **Security** | Protect data & workloads | Deny public IPs, enforce TLS, HTTPS-only, private endpoints, encryption, Defender |
| 💰 **Cost Optimization** | Avoid waste, control spend | Allowed SKUs, deny expensive VM sizes, require budgets/tags, auto-shutdown |
| 🏛️ **Governance / Operational Excellence** | Consistency & control | Allowed regions, required tags, naming, resource locks, diagnostic settings |
| ⚡ **Performance Efficiency** | Right resources, right scale | Premium storage where needed, accelerated networking, autoscale, SKU floors |

> Governance maps to the CAF/WAF **Operational Excellence** pillar plus
> organizational governance guardrails.

---

## Repository layout

```text
.
├── docs/                          # Architecture & operating model
│   ├── architecture.md            # ESLZ management group hierarchy
│   ├── contoso-organization.md    # Mock org context (subscriptions, regions, tags)
│   ├── waf-mapping.md             # WAF pillar → policy mapping matrix
│   ├── deployment-guide.md        # How to deploy (CLI / Bicep / CI)
│   └── compliance-reporting.md    # Monitoring & remediation
├── management-groups/
│   └── hierarchy.bicep            # Contoso ESLZ MG tree
├── policy/
│   ├── definitions/               # Custom policy definitions by pillar
│   │   ├── reliability/
│   │   ├── security/
│   │   ├── cost/
│   │   ├── governance/
│   │   └── performance/
│   ├── initiatives/               # WAF-aligned policy set definitions
│   └── assignments/               # Assignments mapped to management groups
├── scripts/
│   ├── deploy.ps1                 # PowerShell deployment orchestrator
│   └── deploy.sh                  # Bash deployment orchestrator
└── .github/workflows/
    ├── policy-validation.yml      # Lint + what-if on PR
    └── policy-deploy.yml          # Deploy on merge to main
```

---

## Quick start

```powershell
# 1. Authenticate and target the Contoso tenant root management group
az login
az account set --subscription "<platform-management-subscription-id>"

# 2. (Optional) Deploy the management group hierarchy (tenant-scoped)
az deployment tenant create `
  --name contoso-mg-hierarchy `
  --location eastus `
  --template-file management-groups/hierarchy.bicep

# 3. Deploy all policy definitions, initiatives, and assignments
./scripts/deploy.ps1 -RootManagementGroupId contoso -Location eastus
```

See [docs/deployment-guide.md](docs/deployment-guide.md) for the full workflow,
including `what-if`, phased enforcement (`Audit` → `Deny`), and CI/CD.

---

## Design principles

1. **Start in Audit, graduate to Deny.** Every enforcing policy ships with an
   `effect` parameter defaulted safely so you can observe impact before blocking.
2. **Assign at the highest sensible scope.** Guardrails land on management groups,
   not individual subscriptions, so new subscriptions inherit compliance.
3. **Least privilege for remediation.** `DeployIfNotExists` / `Modify` policies
   declare the minimal `roleDefinitionIds` needed for their managed identity.
4. **Parameterized, not hardcoded.** Allowed regions, SKUs, and tags are
   parameters set at assignment time per landing zone.
5. **Exemptions are explicit and time-boxed.** Use policy exemptions, never
   silent scope carve-outs.

---

## References

- [Cloud Adoption Framework — Enterprise-scale landing zones](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/enterprise-scale/)
- [Azure Well-Architected Framework](https://learn.microsoft.com/azure/well-architected/)
- [Azure Policy definition structure](https://learn.microsoft.com/azure/governance/policy/concepts/definition-structure)
- [Azure Landing Zones policy reference](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/enterprise-scale/dine-guidance)
