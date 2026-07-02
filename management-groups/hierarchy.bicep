// =====================================================================================
// Contoso Enterprise-Scale Landing Zone — Management Group hierarchy
// Management groups are tenant-scoped resources, so this template deploys at
// tenant scope. The intermediate root's parent is the Tenant Root Group.
//
//   az deployment tenant create \
//     --name contoso-mg-hierarchy \
//     --location eastus \
//     --template-file management-groups/hierarchy.bicep
// =====================================================================================
targetScope = 'tenant'

@description('Display name prefix for Contoso management groups.')
param orgDisplayName string = 'Contoso'

@description('The intermediate root management group id.')
param intermediateRootId string = 'contoso'

// ------------------------------------------------------------------------------------
// Intermediate root (parent = Tenant Root Group)
// ------------------------------------------------------------------------------------
resource intermediateRoot 'Microsoft.Management/managementGroups@2023-04-01' = {
  name: intermediateRootId
  properties: {
    displayName: '${orgDisplayName} (Intermediate Root)'
  }
}

// ------------------------------------------------------------------------------------
// Tier 1 — Platform, Landing Zones, Sandbox, Decommissioned
// ------------------------------------------------------------------------------------
resource platform 'Microsoft.Management/managementGroups@2023-04-01' = {
  name: '${intermediateRootId}-platform'
  properties: {
    displayName: '${orgDisplayName} Platform'
    details: {
      parent: {
        id: intermediateRoot.id
      }
    }
  }
}

resource landingZones 'Microsoft.Management/managementGroups@2023-04-01' = {
  name: '${intermediateRootId}-landingzones'
  properties: {
    displayName: '${orgDisplayName} Landing Zones'
    details: {
      parent: {
        id: intermediateRoot.id
      }
    }
  }
}

resource sandbox 'Microsoft.Management/managementGroups@2023-04-01' = {
  name: '${intermediateRootId}-sandbox'
  properties: {
    displayName: '${orgDisplayName} Sandbox'
    details: {
      parent: {
        id: intermediateRoot.id
      }
    }
  }
}

resource decommissioned 'Microsoft.Management/managementGroups@2023-04-01' = {
  name: '${intermediateRootId}-decommissioned'
  properties: {
    displayName: '${orgDisplayName} Decommissioned'
    details: {
      parent: {
        id: intermediateRoot.id
      }
    }
  }
}

// ------------------------------------------------------------------------------------
// Tier 2 — Platform children
// ------------------------------------------------------------------------------------
resource platformIdentity 'Microsoft.Management/managementGroups@2023-04-01' = {
  name: '${intermediateRootId}-platform-identity'
  properties: {
    displayName: '${orgDisplayName} Platform Identity'
    details: {
      parent: {
        id: platform.id
      }
    }
  }
}

resource platformManagement 'Microsoft.Management/managementGroups@2023-04-01' = {
  name: '${intermediateRootId}-platform-management'
  properties: {
    displayName: '${orgDisplayName} Platform Management'
    details: {
      parent: {
        id: platform.id
      }
    }
  }
}

resource platformConnectivity 'Microsoft.Management/managementGroups@2023-04-01' = {
  name: '${intermediateRootId}-platform-connectivity'
  properties: {
    displayName: '${orgDisplayName} Platform Connectivity'
    details: {
      parent: {
        id: platform.id
      }
    }
  }
}

// ------------------------------------------------------------------------------------
// Tier 2 — Landing Zone children
// ------------------------------------------------------------------------------------
resource lzCorp 'Microsoft.Management/managementGroups@2023-04-01' = {
  name: '${intermediateRootId}-landingzones-corp'
  properties: {
    displayName: '${orgDisplayName} Landing Zones Corp'
    details: {
      parent: {
        id: landingZones.id
      }
    }
  }
}

resource lzOnline 'Microsoft.Management/managementGroups@2023-04-01' = {
  name: '${intermediateRootId}-landingzones-online'
  properties: {
    displayName: '${orgDisplayName} Landing Zones Online'
    details: {
      parent: {
        id: landingZones.id
      }
    }
  }
}

output intermediateRootMgId string = intermediateRoot.id
output platformMgId string = platform.id
output landingZonesMgId string = landingZones.id
