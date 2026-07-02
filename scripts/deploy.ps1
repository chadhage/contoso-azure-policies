<#
.SYNOPSIS
    Deploys the Contoso WAF policy baseline (definitions, initiatives, assignments)
    to an Enterprise-Scale Landing Zone management group hierarchy.

.DESCRIPTION
    Idempotently creates:
      1. All custom policy definitions under policy/definitions/**
      2. All WAF initiatives (policy sets) under policy/initiatives/**
      3. All assignments described in policy/assignments/assignment-manifest.json

    The {{MANAGEMENT_GROUP_SCOPE}} token in initiatives is replaced with the
    intermediate root management group scope at deploy time.

.PARAMETER RootManagementGroupId
    The intermediate root management group id where definitions/initiatives live
    (e.g. "contoso").

.PARAMETER Location
    Region used for managed identities on DeployIfNotExists/Modify assignments.

.PARAMETER WhatIf
    Preview actions without creating anything.

.PARAMETER SkipAssignments
    Create only the policy definitions and initiatives, skipping the
    manifest-driven assignments. Useful when you assign initiatives yourself
    (for example from the site's deployment wizard).

.EXAMPLE
    ./scripts/deploy.ps1 -RootManagementGroupId contoso -Location eastus -WhatIf
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [Parameter(Mandatory = $true)]
    [string]$RootManagementGroupId,

    [Parameter(Mandatory = $false)]
    [string]$Location = 'eastus',

    [Parameter(Mandatory = $false)]
    [switch]$SkipAssignments
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$mgScope = "/providers/Microsoft.Management/managementGroups/$RootManagementGroupId"

function Assert-AzCli {
    if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
        throw "Azure CLI (az) is required but was not found on PATH."
    }
}

Assert-AzCli
Write-Host "==> Deploying Contoso policy baseline to management group '$RootManagementGroupId'" -ForegroundColor Cyan

# ------------------------------------------------------------------------------
# 1. Policy definitions
# ------------------------------------------------------------------------------
Write-Host "`n[1/3] Creating policy definitions..." -ForegroundColor Yellow
$definitionFiles = Get-ChildItem -Path (Join-Path $repoRoot 'policy/definitions') -Recurse -Filter '*.json'
foreach ($file in $definitionFiles) {
    $def = Get-Content $file.FullName -Raw | ConvertFrom-Json
    $name = $def.name
    Write-Host "  - $name" -ForegroundColor Gray
    if ($PSCmdlet.ShouldProcess($name, 'Create policy definition')) {
        az policy definition create `
            --name $name `
            --display-name $def.properties.displayName `
            --description $def.properties.description `
            --mode $def.properties.mode `
            --metadata "version=$($def.properties.metadata.version)" "category=$($def.properties.metadata.category)" "wafPillar=$($def.properties.metadata.wafPillar)" `
            --rules (($def.properties.policyRule | ConvertTo-Json -Depth 100 -Compress)) `
            --params (($def.properties.parameters | ConvertTo-Json -Depth 100 -Compress)) `
            --management-group $RootManagementGroupId `
            --only-show-errors | Out-Null
    }
}

# ------------------------------------------------------------------------------
# 2. Initiatives (policy set definitions)
# ------------------------------------------------------------------------------
Write-Host "`n[2/3] Creating initiatives (policy sets)..." -ForegroundColor Yellow
$initiativeFiles = Get-ChildItem -Path (Join-Path $repoRoot 'policy/initiatives') -Recurse -Filter '*.json'
foreach ($file in $initiativeFiles) {
    $raw = (Get-Content $file.FullName -Raw).Replace('{{MANAGEMENT_GROUP_SCOPE}}', $mgScope)
    $set = $raw | ConvertFrom-Json
    $name = $set.name
    Write-Host "  - $name" -ForegroundColor Gray
    if ($PSCmdlet.ShouldProcess($name, 'Create policy set definition')) {
        az policy set-definition create `
            --name $name `
            --display-name $set.properties.displayName `
            --description $set.properties.description `
            --metadata "version=$($set.properties.metadata.version)" "category=$($set.properties.metadata.category)" "wafPillar=$($set.properties.metadata.wafPillar)" `
            --definitions (($set.properties.policyDefinitions | ConvertTo-Json -Depth 100 -Compress)) `
            --params (($set.properties.parameters | ConvertTo-Json -Depth 100 -Compress)) `
            --management-group $RootManagementGroupId `
            --only-show-errors | Out-Null
    }
}

# ------------------------------------------------------------------------------
# 3. Assignments
# ------------------------------------------------------------------------------
Write-Host "`n[3/3] Creating assignments..." -ForegroundColor Yellow
if ($SkipAssignments) {
    Write-Host "  Skipped (-SkipAssignments)." -ForegroundColor DarkGray
    Write-Host "`n==> Definitions and initiatives deployed to '$RootManagementGroupId'. Assign initiatives yourself or re-run without -SkipAssignments." -ForegroundColor Green
    return
}
$manifest = Get-Content (Join-Path $repoRoot 'policy/assignments/assignment-manifest.json') -Raw | ConvertFrom-Json
foreach ($a in $manifest.assignments) {
    $scope = "/providers/Microsoft.Management/managementGroups/$($a.managementGroup)"
    Write-Host "  - $($a.name) -> $($a.managementGroup)" -ForegroundColor Gray

    $azArgs = @(
        'policy', 'assignment', 'create',
        '--name', $a.name,
        '--display-name', $a.displayName,
        '--scope', $scope,
        '--params', (($a.parameters | ConvertTo-Json -Depth 100 -Compress)),
        '--only-show-errors'
    )

    if ($a.PSObject.Properties.Name -contains 'initiative') {
        $azArgs += @('--policy-set-definition', "$mgScope/providers/Microsoft.Authorization/policySetDefinitions/$($a.initiative)")
    }
    elseif ($a.PSObject.Properties.Name -contains 'policyDefinition') {
        $azArgs += @('--policy', "$mgScope/providers/Microsoft.Authorization/policyDefinitions/$($a.policyDefinition)")
    }

    if ($a.identity -eq 'SystemAssigned') {
        $azArgs += @('--mi-system-assigned', '--location', $a.location)
    }

    if ($a.PSObject.Properties.Name -contains 'nonComplianceMessages') {
        foreach ($m in $a.nonComplianceMessages) {
            $azArgs += @('--non-compliance-messages', $m.message)
        }
    }

    if ($PSCmdlet.ShouldProcess($a.name, 'Create policy assignment')) {
        az @azArgs | Out-Null

        # Grant least-privilege roles for DeployIfNotExists / Modify remediation
        if ($a.identity -eq 'SystemAssigned' -and ($a.PSObject.Properties.Name -contains 'roleDefinitionIds')) {
            # The system-assigned identity can take a moment to propagate; retry reading it.
            $principalId = $null
            for ($attempt = 1; $attempt -le 6 -and -not $principalId; $attempt++) {
                $principalId = az policy assignment show --name $a.name --scope $scope --query 'identity.principalId' -o tsv
                if (-not $principalId) { Start-Sleep -Seconds 5 }
            }
            if (-not $principalId) {
                Write-Warning "Could not resolve managed identity for $($a.name); skipping role assignments."
                continue
            }
            foreach ($roleId in $a.roleDefinitionIds) {
                $roleName = $roleId.Split('/')[-1]
                az role assignment create `
                    --assignee-object-id $principalId `
                    --assignee-principal-type ServicePrincipal `
                    --role $roleName `
                    --scope $scope `
                    --only-show-errors | Out-Null
            }
        }
    }
}

Write-Host "`n==> Done. Review compliance with: az policy state summarize --management-group $RootManagementGroupId" -ForegroundColor Green
