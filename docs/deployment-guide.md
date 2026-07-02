# Deployment Guide

This guide deploys the Contoso policy baseline to an Enterprise-Scale Landing
Zone. All artifacts target **management group** scope.

## Prerequisites

- Azure CLI `>= 2.60` (`az version`) or Azure PowerShell `Az` module.
- Rights at the intermediate root management group (`contoso`):
  - `Resource Policy Contributor` (create definitions/assignments), and
  - `User Access Administrator` or `Owner` (grant managed-identity roles for
    `DeployIfNotExists` / `Modify` remediation).
- The management group hierarchy already exists, or deploy it with
  [`management-groups/hierarchy.bicep`](../management-groups/hierarchy.bicep).

## 1. (Optional) Deploy the management group tree

```bash
az deployment tenant create \
  --name contoso-mg-hierarchy \
  --location eastus \
  --template-file management-groups/hierarchy.bicep
```

> Management groups are tenant-scoped, so the hierarchy deploys with
> `az deployment tenant create` and requires rights at the Tenant Root Group.

## 2. Deploy definitions, initiatives, and assignments

### PowerShell

```powershell
./scripts/deploy.ps1 `
  -RootManagementGroupId contoso `
  -Location eastus `
  -WhatIf   # remove to apply
```

### Bash

```bash
./scripts/deploy.sh --mg contoso --location eastus --what-if   # remove to apply
```

The orchestrator:

1. Creates every custom policy **definition** under `policy/definitions/**`.
2. Creates the five WAF **initiatives** under `policy/initiatives/**`.
3. Creates **assignments** under `policy/assignments/**` at the mapped MG scopes.
4. Creates managed identities and grants the least-privilege roles for
   `DeployIfNotExists` / `Modify` assignments.

## 3. Phased enforcement (Audit → Deny)

Every enforcing policy exposes an `effect` parameter. Assignments default to the
**safe** effect. To promote:

```bash
az policy assignment update \
  --name contoso-sec \
  --params '{ "denyPublicIpEffect": { "value": "Deny" } }'
```

Recommended cadence per assignment: `Audit` for 2–4 weeks → remediate → `Deny`.

## 4. Remediate existing resources

For `DeployIfNotExists` / `Modify` policies, create remediation tasks:

```bash
az policy remediation create \
  --name remediate-diagnostics \
  --management-group contoso-platform-management \
  --policy-assignment contoso-gov \
  --definition-reference-id deployDiagnosticSettingsToLaw
```

## 5. Validate

```bash
# Preview all definitions, initiatives, and assignments without applying
./scripts/deploy.sh --mg contoso --location eastus --what-if
# (PowerShell equivalent)
# ./scripts/deploy.ps1 -RootManagementGroupId contoso -Location eastus -WhatIf

# Trigger an on-demand compliance scan
az policy state trigger-scan --management-group contoso
```

## Rollback

```bash
az policy assignment delete   --name <assignment> --scope <mg-scope>
az policy set-definition delete --name <initiative> --management-group contoso
az policy definition delete     --name <definition> --management-group contoso
```

Deleting an assignment immediately stops enforcement; it does not delete
resources created by remediation.
