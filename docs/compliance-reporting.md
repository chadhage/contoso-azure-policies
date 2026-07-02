# Compliance Reporting & Remediation

## Viewing compliance

**Portal:** Azure Policy → Compliance → scope `contoso`. Filter by initiative
(e.g., *Contoso Security Baseline*) to see the per-pillar posture.

**CLI:**

```bash
# Overall compliance summary at the intermediate root
az policy state summarize --management-group contoso

# Non-compliant resources for a specific assignment
az policy state list \
  --management-group contoso \
  --filter "complianceState eq 'NonCompliant' and policyAssignmentName eq 'contoso-sec'" \
  --query "[].{resource:resourceId, policy:policyDefinitionName}" -o table
```

## Remediation tasks

`DeployIfNotExists` and `Modify` policies do not change existing resources until
a remediation task runs.

```bash
az policy remediation create \
  --name fix-storage-tls \
  --management-group contoso \
  --policy-assignment contoso-sec \
  --definition-reference-id enforceStorageMinTls \
  --resource-discovery-mode ReEvaluateCompliance
```

Track progress:

```bash
az policy remediation list --management-group contoso -o table
```

## Exemptions

Use exemptions for justified, time-boxed exceptions instead of narrowing scope.

```bash
az policy exemption create \
  --name erp-legacy-tls-waiver \
  --policy-assignment contoso-sec \
  --exemption-category Waiver \
  --scope "/subscriptions/<sub-corp-erp-prod>/resourceGroups/rg-erp-legacy" \
  --expires-on 2026-12-31 \
  --description "Legacy ERP appliance pending TLS 1.2 upgrade — tracked in JIRA ERP-482"
```

## Continuous monitoring

- **Azure Workbooks:** Use the built-in *Policy Compliance* workbook for trend
  reporting per management group and pillar.
- **Alerts:** Create an Activity Log alert on `Microsoft.PolicyInsights` events,
  or query compliance state via Azure Resource Graph on a schedule.
- **Resource Graph example:**

```kusto
policyresources
| where type == "microsoft.policyinsights/policystates"
| where properties.complianceState == "NonCompliant"
| summarize NonCompliant = count() by tostring(properties.policyDefinitionName)
| order by NonCompliant desc
```

## Reporting cadence

| Audience | Cadence | Content |
| --- | --- | --- |
| Platform team | Weekly | New non-compliant resources, remediation backlog |
| Security | Bi-weekly | Security pillar drift, exemption review |
| FinOps | Monthly | Cost pillar (SKU/tag) violations |
| Leadership | Quarterly | Overall WAF posture trend per pillar |
