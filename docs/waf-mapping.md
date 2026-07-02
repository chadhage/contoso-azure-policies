# WAF Pillar → Policy Mapping Matrix

Each custom policy in this repo is tagged (via `metadata.category` and
`metadata.wafPillar`) to a Well-Architected Framework pillar and rolled up into
a per-pillar initiative (policy set).

## Reliability

| Policy | Effect(s) | Scope guidance |
| --- | --- | --- |
| `require-storage-account-zrs` — Storage must use zone/geo-redundant SKU | Audit, Deny | Platform, Landing Zones |
| `require-vm-availability-zone` — VMs must be zone-aligned | Audit, Deny | Landing Zones |
| `require-sql-geo-redundant-backup` — SQL DB geo-redundant backup | Audit, Deny | Landing Zones |
| `deploy-vm-backup` — Ensure VMs are backed up (DINE) | AuditIfNotExists, DeployIfNotExists | Landing Zones |

## Security

| Policy | Effect(s) | Scope guidance |
| --- | --- | --- |
| `deny-public-ip-on-nic` — No public IP on NICs | Audit, Deny | Corp, Connectivity |
| `enforce-storage-https-only` — Secure transfer required | Audit, Deny, Modify | All |
| `enforce-storage-min-tls` — Minimum TLS 1.2 | Audit, Deny, Modify | All |
| `deny-storage-public-network-access` — Disable public blob access | Audit, Deny | Corp, Platform |
| `deploy-defender-for-cloud` — Enable Defender plans (instantiated per plan in the initiative: VMs, Storage, SQL, Key Vault, Containers, App Service, ARM) | AuditIfNotExists, DeployIfNotExists | `contoso` |

## Cost Optimization

| Policy | Effect(s) | Scope guidance |
| --- | --- | --- |
| `allowed-vm-skus` — Restrict VM sizes | Deny | All (parameterized per LZ) |
| `deny-expensive-vm-series` — Block GPU/HPC/large-memory unless approved | Audit, Deny | Sandbox, Corp |
| `require-budget-tag` — CostCenter tag required | Audit, Deny | All |
| `require-sandbox-auto-shutdown` — Auto-shutdown in sandbox | AuditIfNotExists | Sandbox |

> **Layering note:** `allowed-vm-skus` (an allow-list) already excludes the
> N/H/M families in landing zones where it is set to `Deny`, so
> `deny-expensive-vm-series` is intentionally redundant there. Its role is to
> block those families in scopes where the allow-list is relaxed or absent
> (for example Sandbox, where teams may need a broader SKU range but still must
> not spin up GPU/HPC/large-memory VMs).

## Governance / Operational Excellence

| Policy | Effect(s) | Scope guidance |
| --- | --- | --- |
| `allowed-locations` — Restrict deployment regions (resources) | Audit, Deny | `contoso` |
| `allowed-locations-rg` — Restrict resource group regions | Audit, Deny | `contoso` |
| `require-tag` — Required tags (a single generic policy instantiated once per tag: Environment, Owner, DataClassification, Workload) | Audit, Deny | `contoso` |
| `inherit-tag-from-rg` — Inherit missing tags from RG | Modify | `contoso` |
| `deploy-diagnostic-settings-to-law` — Send Key Vault diagnostics to Log Analytics (clone per resource type for broader coverage) | AuditIfNotExists, DeployIfNotExists | `contoso-platform-management` |
| `deny-resource-creation` — Block new resources | Deny | `contoso-decommissioned` |

## Performance Efficiency

| Policy | Effect(s) | Scope guidance |
| --- | --- | --- |
| `require-premium-disk-for-prod` — Premium SSD for prod VMs | Audit, Deny | Landing Zones (prod) |
| `require-accelerated-networking` — Accelerated networking on supported NICs | Audit | Landing Zones |
| `require-appservice-min-sku` — App Service Plan minimum tier for prod | Audit, Deny | Online |

## Effect selection guidance

| Effect | Use when |
| --- | --- |
| `Audit` / `AuditIfNotExists` | Observing impact before enforcement |
| `Deny` | Preventing non-compliant creation once impact is understood |
| `Modify` | Auto-correcting a property (tags, TLS) at create/update |
| `DeployIfNotExists` | Deploying a required companion resource (backup, diagnostics) |
