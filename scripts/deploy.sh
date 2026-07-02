#!/usr/bin/env bash
# =====================================================================================
# Deploys the Contoso WAF policy baseline (definitions, initiatives, assignments)
# to an Enterprise-Scale Landing Zone management group hierarchy.
#
# Usage:
#   ./scripts/deploy.sh --mg contoso --location eastus [--what-if] [--skip-assignments]
#
# Requires: Azure CLI (az) and jq.
# =====================================================================================
set -euo pipefail

MG_ID=""
LOCATION="eastus"
WHAT_IF="false"
SKIP_ASSIGNMENTS="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mg) MG_ID="$2"; shift 2 ;;
    --location) LOCATION="$2"; shift 2 ;;
    --what-if) WHAT_IF="true"; shift ;;
    --skip-assignments) SKIP_ASSIGNMENTS="true"; shift ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$MG_ID" ]]; then
  echo "ERROR: --mg <managementGroupId> is required." >&2
  exit 1
fi

command -v az >/dev/null 2>&1 || { echo "ERROR: az CLI not found." >&2; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "ERROR: jq not found." >&2; exit 1; }

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MG_SCOPE="/providers/Microsoft.Management/managementGroups/${MG_ID}"

run() {
  if [[ "$WHAT_IF" == "true" ]]; then
    echo "  [what-if] $*"
  else
    "$@"
  fi
}

echo "==> Deploying Contoso policy baseline to management group '${MG_ID}'"

# ------------------------------------------------------------------------------
# 1. Policy definitions
# ------------------------------------------------------------------------------
echo ""
echo "[1/3] Creating policy definitions..."
while IFS= read -r -d '' file; do
  name=$(jq -r '.name' "$file")
  echo "  - ${name}"
  run az policy definition create \
    --name "$name" \
    --display-name "$(jq -r '.properties.displayName' "$file")" \
    --description "$(jq -r '.properties.description' "$file")" \
    --mode "$(jq -r '.properties.mode' "$file")" \
    --rules "$(jq -c '.properties.policyRule' "$file")" \
    --params "$(jq -c '.properties.parameters' "$file")" \
    --management-group "$MG_ID" \
    --only-show-errors >/dev/null
done < <(find "${REPO_ROOT}/policy/definitions" -name '*.json' -print0)

# ------------------------------------------------------------------------------
# 2. Initiatives (policy set definitions)
# ------------------------------------------------------------------------------
echo ""
echo "[2/3] Creating initiatives (policy sets)..."
while IFS= read -r -d '' file; do
  content=$(sed "s#{{MANAGEMENT_GROUP_SCOPE}}#${MG_SCOPE}#g" "$file")
  name=$(echo "$content" | jq -r '.name')
  echo "  - ${name}"
  run az policy set-definition create \
    --name "$name" \
    --display-name "$(echo "$content" | jq -r '.properties.displayName')" \
    --description "$(echo "$content" | jq -r '.properties.description')" \
    --definitions "$(echo "$content" | jq -c '.properties.policyDefinitions')" \
    --params "$(echo "$content" | jq -c '.properties.parameters')" \
    --management-group "$MG_ID" \
    --only-show-errors >/dev/null
done < <(find "${REPO_ROOT}/policy/initiatives" -name '*.json' -print0)

# ------------------------------------------------------------------------------
# 3. Assignments
# ------------------------------------------------------------------------------
echo ""
echo "[3/3] Creating assignments..."
if [[ "$SKIP_ASSIGNMENTS" == "true" ]]; then
  echo "  Skipped (--skip-assignments)."
  echo ""
  echo "==> Definitions and initiatives deployed to '${MG_ID}'. Assign initiatives yourself or re-run without --skip-assignments."
  exit 0
fi
MANIFEST="${REPO_ROOT}/policy/assignments/assignment-manifest.json"
count=$(jq '.assignments | length' "$MANIFEST")
for (( i=0; i<count; i++ )); do
  a=$(jq -c ".assignments[$i]" "$MANIFEST")
  name=$(echo "$a" | jq -r '.name')
  mg=$(echo "$a" | jq -r '.managementGroup')
  scope="/providers/Microsoft.Management/managementGroups/${mg}"
  identity=$(echo "$a" | jq -r '.identity')
  echo "  - ${name} -> ${mg}"

  set -- policy assignment create \
    --name "$name" \
    --display-name "$(echo "$a" | jq -r '.displayName')" \
    --scope "$scope" \
    --params "$(echo "$a" | jq -c '.parameters')" \
    --only-show-errors

  if echo "$a" | jq -e '.initiative' >/dev/null; then
    set -- "$@" --policy-set-definition "${MG_SCOPE}/providers/Microsoft.Authorization/policySetDefinitions/$(echo "$a" | jq -r '.initiative')"
  elif echo "$a" | jq -e '.policyDefinition' >/dev/null; then
    set -- "$@" --policy "${MG_SCOPE}/providers/Microsoft.Authorization/policyDefinitions/$(echo "$a" | jq -r '.policyDefinition')"
  fi

  if [[ "$identity" == "SystemAssigned" ]]; then
    set -- "$@" --mi-system-assigned --location "$(echo "$a" | jq -r '.location')"
  fi

  run az "$@" >/dev/null

  # Grant least-privilege roles for DeployIfNotExists / Modify remediation
  if [[ "$identity" == "SystemAssigned" ]] && echo "$a" | jq -e '.roleDefinitionIds' >/dev/null && [[ "$WHAT_IF" != "true" ]]; then
    principalId=$(az policy assignment show --name "$name" --scope "$scope" --query 'identity.principalId' -o tsv)
    while IFS= read -r roleId; do
      roleName="${roleId##*/}"
      az role assignment create \
        --assignee-object-id "$principalId" \
        --assignee-principal-type ServicePrincipal \
        --role "$roleName" \
        --scope "$scope" \
        --only-show-errors >/dev/null
    done < <(echo "$a" | jq -r '.roleDefinitionIds[]')
  fi
done

echo ""
echo "==> Done. Review compliance with: az policy state summarize --management-group ${MG_ID}"
