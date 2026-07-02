# Contoso Ltd. — Mock Organization Context

Contoso Ltd. is a fictional global manufacturer used to make this policy
baseline concrete. All identifiers below are examples — replace them with your
real values at assignment time.

## Profile

| Attribute | Value |
| --- | --- |
| Organization | Contoso Ltd. |
| Entra ID tenant | `contoso.onmicrosoft.com` |
| Intermediate root MG | `contoso` |
| Cloud operating model | Enterprise-scale / platform + application landing zones |
| Primary region | `eastus` |
| Secondary (DR) region | `westus3` |
| EU data-residency region | `westeurope` |

## Allowed regions

Contoso restricts deployments to regions where it has data-residency approval
and paired-region DR coverage:

- `eastus`
- `westus3`
- `westeurope`
- `global` (for global resources such as CDN, Traffic Manager, DNS)

## Subscription topology

| Subscription | Landing zone | Management group |
| --- | --- | --- |
| `sub-connectivity-prod` | Hub networking | `contoso-platform-connectivity` |
| `sub-management-prod` | Logging & monitoring | `contoso-platform-management` |
| `sub-identity-prod` | Identity services | `contoso-platform-identity` |
| `sub-corp-erp-prod` | Internal ERP | `contoso-landingzones-corp` |
| `sub-online-shop-prod` | E-commerce | `contoso-landingzones-online` |
| `sub-team-sandbox` | Experimentation | `contoso-sandbox` |

## Mandatory resource tags

Every resource (and resource group) should carry these tags. The governance
initiative audits tag presence (promote to `Deny` per landing zone) and can
inherit values from the parent resource group.

| Tag | Example | Enforcement |
| --- | --- | --- |
| `CostCenter` | `CC-1042` | Presence audited on landing zones and `Deny` in sandbox (via the cost baseline); inherited from the resource group via `Modify` |
| `Environment` | `Production` / `NonProduction` / `Sandbox` | Presence audited (promote to `Deny`). Allowed-values are a naming convention, not yet policy-enforced |
| `Owner` | `platform-team@contoso.com` | Required |
| `DataClassification` | `Public` / `Internal` / `Confidential` / `HighlyConfidential` | Required |
| `Workload` | `erp` / `shop` / `hub` | Required |

## Naming convention (informative)

`<resourceType>-<workload>-<environment>-<region>-<instance>`

Example: `vm-erp-prod-eastus-001`, `st erp prod eastus 001` → `sterpprodeus001`.

## Cost guardrails

| Landing zone | Allowed VM SKUs (families) | Max SKU tier |
| --- | --- | --- |
| Corp / Online (prod) | `Standard_D`, `Standard_E`, `Standard_F` | up to 32 vCPU |
| Sandbox | `Standard_B`, `Standard_D2s_v5` | burstable / small only |

Sandbox subscriptions also require an auto-shutdown schedule and a budget alert.
