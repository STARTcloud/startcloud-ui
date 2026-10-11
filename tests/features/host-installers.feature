Feature: host installer files and provisioners

  Scenario: Installer files: the section behind `artifacts` and `provisioner-registry` together, the storage locations card and the artifacts table from the one read each, beside the artifacts section of `artifacts` alone, on the Installer files page
    Given the host answers the hosts fixture
    And the host answers the hosts-installers fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/provisioning/installers"
    Then the section page "installers" draws
    And the host column draws no "recipes" row
    And the artifact section draws
    And the catalog card "installer-locations" lists 3 locations
    And the "installers" table of the section page lists 4 rows
    And the "installers" table of the section page draws the "status" column
    And the row "Domino_14.5_Linux_English.tar" of the "installers" table of the section page offers "move"
    And the host was sent GET to "/api/agents/3/artifacts/storage/paths"
    And the host was sent GET to "/api/agents/3/artifacts"
    And the host was sent GET to "/api/agents/3/secrets"

  Scenario: Installer files: the page's one search narrows the artifacts and a filter pill narrows them again
    Given the host answers the hosts fixture
    And the host answers the hosts-installers fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/provisioning/installers"
    Then the "installers" table of the section page lists 4 rows
    When I press "/"
    And I search the section page for "domino"
    Then the "installers" table of the section page lists 2 rows
    When I search the section page for ""
    And I open the filter panel
    And I toggle the filter pill "Missing"
    Then the "installers" table of the section page lists 1 rows

  Scenario: Installer files: Register path sends the path, the location and the move switch, and reads the artifacts again
    Given the host answers the hosts fixture
    And the host answers the hosts-installers fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/provisioning/installers"
    And I press the section page's "artifact-register" action
    Then the catalog dialog "artifact-register" draws
    When I pick "loc-iso" in the catalog dialog select "artifact-register-location"
    And I type "/rpool/drop/omnios.iso" into the field "artifact-register-path"
    And I check the field "artifact-register-move"
    And I submit the catalog dialog "artifact-register"
    Then the host was sent POST to "/api/agents/3/artifacts/register" carrying "path" as "/rpool/drop/omnios.iso"
    And the host was sent POST to "/api/agents/3/artifacts/register" carrying "move" as "true"
    And the catalog dialog "artifact-register" is gone
    And the host was sent GET to "/api/agents/3/artifacts" 3 times

  Scenario: Installer files: a target of the installer family needs a role, the dialog says so and sends nothing
    Given the host answers the hosts fixture
    And the host answers the hosts-installers fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/provisioning/installers"
    And I press the section page's "artifact-download" action
    And I pick "loc-installers" in the catalog dialog select "artifact-download-location"
    And I type "https://example.com/Domino.tar" into the field "artifact-download-url"
    And I submit the catalog dialog "artifact-download"
    Then the catalog dialog "artifact-download" says why it cannot be sent
    And the host was not sent POST to "/api/agents/3/artifacts/download"
    When I type "domino_install" into the field "artifact-download-role"
    And I pick "mirror-credentials" in the catalog dialog select "artifact-download-resource"
    And I submit the catalog dialog "artifact-download"
    Then the host was sent POST to "/api/agents/3/artifacts/download" carrying "role" as "domino_install"
    And the host was sent POST to "/api/agents/3/artifacts/download" carrying "resource_name" as "mirror-credentials"

  Scenario: Installer files: the HCL portal download keeps the portal's own body
    Given the host answers the hosts fixture
    And the host answers the hosts-installers fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/provisioning/installers"
    And I press the section page's "artifact-hcl" action
    And I type "domino_install" into the field "artifact-hcl-role"
    And I pick "fixpack" in the catalog dialog select "artifact-hcl-kind"
    And I type "Domino_14.5_FP1_Linux.tar" into the field "artifact-hcl-filename"
    And I pick "hcl-portal" in the catalog dialog select "artifact-hcl-key"
    And I submit the catalog dialog "artifact-hcl"
    Then the host was sent POST to "/api/agents/3/artifacts/hcl-download" carrying "key_name" as "hcl-portal"
    And the host was sent POST to "/api/agents/3/artifacts/hcl-download" carrying "kind" as "fixpack"

  Scenario: Installer files: Scan all sends the re-hash switch, and a location's scan names the location
    Given the host answers the hosts fixture
    And the host answers the hosts-installers fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/provisioning/installers"
    And I check the section switch "artifact-scan-verify"
    And I press the section page's "artifact-scan" action
    Then the host was sent POST to "/api/agents/3/artifacts/scan" carrying "verify_checksums" as "true"
    When I press the action "location-scan" of the catalog location "loc-installers"
    Then the host was sent POST to "/api/agents/3/artifacts/scan" carrying "storage_path_id" as "loc-installers"

  Scenario: Installer files: a location is added with its type and path, toggled with `enabled` alone, and a built-in one offers no edit and no delete
    Given the host answers the hosts fixture
    And the host answers the hosts-installers fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/provisioning/installers"
    Then the catalog location "loc-iso" offers no "location-delete"
    And the catalog location "loc-installers" offers "location-delete"
    When I press the section page's "location-add" action
    And I type "Images" into the field "location-name"
    And I pick "image" in the catalog dialog select "location-type"
    And I type "/rpool/images" into the field "location-path"
    And I submit the catalog dialog "artifact-location"
    Then the host was sent POST to "/api/agents/3/artifacts/storage/paths" carrying "type" as "image"
    And the host was sent POST to "/api/agents/3/artifacts/storage/paths" carrying "path" as "/rpool/images"
    When I press the action "location-toggle" of the catalog location "loc-iso"
    Then the host was sent PUT to "/api/agents/3/artifacts/storage/paths/loc-iso" carrying "enabled" as "false"

  Scenario: Installer files: a location's delete sends the three switches as a queued task
    Given the host answers the hosts fixture
    And the host answers the hosts-installers fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/provisioning/installers"
    And I press the action "location-delete" of the catalog location "loc-installers"
    And I check the field "location-delete-recursive"
    And I submit the catalog dialog "artifact-location-delete"
    Then the host was sent DELETE to "/api/agents/3/artifacts/storage/paths/loc-installers" carrying "recursive" as "true"
    And the host was sent DELETE to "/api/agents/3/artifacts/storage/paths/loc-installers" carrying "remove_db_records" as "true"

  Scenario: Installer files: picked rows are deleted together, the files with them when the switch says so
    Given the host answers the hosts fixture
    And the host answers the hosts-installers fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/provisioning/installers"
    Then the section page offers no "artifact-delete"
    When I tick the catalog row "Win11_24H2_English_x64.iso" of the "installers" table
    And I tick the catalog row "Domino_14.5_FP1_Linux.tar" of the "installers" table
    And I press the section page's "artifact-delete" action
    And I check the field "artifact-delete-files-too"
    And I submit the catalog dialog "artifact-delete"
    Then the host was sent DELETE to "/api/agents/3/artifacts/files" carrying "delete_files" as "true"
    And the host was sent DELETE to "/api/agents/3/artifacts/files" carrying "artifact_ids" as "12,14"

  Scenario: Installer files: Move offers the locations of the artifact's own type alone and sends the destination as a queued task
    Given the host answers the hosts fixture
    And the host answers the hosts-installers fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/provisioning/installers"
    And I press "move" on the row "debian-13.1.0-amd64-netinst.iso" of the "installers" table of the section page
    Then the catalog dialog select "artifact-transfer-dest" offers 1 options
    When I pick "loc-old" in the catalog dialog select "artifact-transfer-dest"
    And I submit the catalog dialog "artifact-move"
    Then the host was sent POST to "/api/agents/3/artifacts/11/move" carrying "destination_storage_location_id" as "loc-old"
    And the row "Domino_14.5_FP1_Linux.tar" of the "installers" table of the section page holds "move"

  Scenario: Provisioners: the families of every catalog source as cards, read once a source, the installed ones alone when the page opens, the Update glyph on a family behind the catalog and the glyph greyed on one at its newest, Add flipping the panel to the missing families and the Installed pill off greying them
    Given the host answers the hosts fixture
    And the host answers the hosts-installers fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/provisioning/provisioners"
    Then the section page "provisioners" draws
    And the host row "provisioners" is the active one
    And the "provisioner-catalog" listing of the section page draws 2 cards
    And the section page notes "update-available"
    And the section page notes "held-current"
    And the provisioner catalog draws a "gold" pill
    And the provisioner catalog notes Installed on "hcl-domino" "2.0.0"
    When I press the section page's "catalog-add" action
    Then the section page heading reads "Add"
    And the "provisioner-catalog" listing of the section page draws 1 cards
    And the "provisioner-catalog" listing of the section page draws the card "windows" plain
    And the provisioner catalog offers Install on "windows" "0.2.0"
    When I press the section page's "catalog-add" action
    Then the "provisioner-catalog" listing of the section page draws 2 cards
    When I switch the "provisioner-catalog" listing of the section page to "table"
    Then the "provisioner-catalog" listing of the section page draws the table
    When I switch the "provisioner-catalog" listing of the section page to "cards"
    And I press "/"
    And I open the filter panel
    And I toggle the filter pill "Installed"
    Then the "provisioner-catalog" listing of the section page draws 3 cards
    And the "provisioner-catalog" listing of the section page greys the card "windows"
    And the host was sent GET to "/api/agents/3/provisioning/provisioners" 1 times
    And the host was sent GET to "/api/agents/3/provisioning/catalog" 2 times
    And the host was sent GET to "/api/agents/3/provisioning/catalog/health" 2 times
    And the host was sent GET to "/api/agents/3/provisioning/catalog/sources" 1 times

  Scenario: Provisioners: the Update glyph on a family behind the catalog installs the catalog's newest, a queued task
    Given the host answers the hosts fixture
    And the host answers the hosts-installers fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/provisioning/provisioners"
    And I press "catalog-update" on the card "startcloud" of the provisioner catalog
    Then the host was sent POST to "/api/agents/3/provisioning/catalog/install" carrying "name" as "startcloud"
    And the host was sent POST to "/api/agents/3/provisioning/catalog/install" carrying "version" as "0.1.28"
    And the host was sent POST to "/api/agents/3/provisioning/catalog/install" carrying "source_name" as "startcloud"
    And the page raised 1 success notice

  Scenario: Provisioners: cards by default with tier pills, a version line's Install on a version the host lacks and its Install greyed on one it holds, and Install queues one
    Given the host answers the hosts fixture
    And the host answers the hosts-installers fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/provisioning/provisioners"
    Then the provisioner catalog draws 2 cards
    And the provisioner catalog draws a "gold" pill
    And the provisioner catalog draws a "silver" pill
    And the provisioner catalog offers Install on "startcloud" "0.1.28"
    And the provisioner catalog notes Installed on "startcloud" "0.1.27"
    And the provisioner catalog notes Installed on "hcl-domino" "2.0.0"
    When I open the "versions-fold" fold of the card "startcloud"
    And I press Install on "startcloud" "0.1.28" in the provisioner catalog
    Then the host was sent POST to "/api/agents/3/provisioning/catalog/install" carrying "name" as "startcloud"
    And the host was sent POST to "/api/agents/3/provisioning/catalog/install" carrying "version" as "0.1.28"
    And the page raised 1 success notice

  Scenario: Provisioners: the chevron of a held family opens Update to, Update from source and the deletes, Update from source queuing a re-import and each delete waiting behind the typed confirmation
    Given the host answers the hosts fixture
    And the host answers the hosts-installers fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/provisioning/provisioners"
    And I open the menu of the card "startcloud" of the provisioner catalog
    Then the open menu offers "held-update"
    And the open menu offers "refresh-source"
    And the open menu offers "delete-version"
    And the open menu offers "delete-family"
    When I press the menu entry "refresh-source"
    Then the host was sent POST to "/api/agents/3/provisioning/provisioners/startcloud/refresh-from-source"
    When I open the menu of the card "hcl-domino" of the provisioner catalog
    Then the open menu offers no "held-update"
    And the open menu offers no "refresh-source"
    When I press the menu entry "delete-version"
    And I confirm the open dialog
    Then the host was sent DELETE to "/api/agents/3/provisioning/provisioners/hcl-domino/versions/2.0.0"
    When I open the menu of the card "hcl-domino" of the provisioner catalog
    And I press the menu entry "delete-family"
    And I confirm the open dialog
    Then the host was sent DELETE to "/api/agents/3/provisioning/provisioners/hcl-domino"
    And the host was sent GET to "/api/agents/3/provisioning/provisioners" 4 times

  Scenario: Provisioners: Import opens the import dialog and queues the import
    Given the host answers the hosts fixture
    And the host answers the hosts-installers fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/provisioning/provisioners"
    And I press the section page's "provisioner-import" action
    Then the catalog dialog "provisioner-import" draws
    When I pick "git" in the catalog dialog select "import-source-type"
    And I type "https://github.com/acme/acme-provisioner" into the field "import-url"
    And I submit the catalog dialog "provisioner-import"
    Then the host was sent POST to "/api/agents/3/provisioning/provisioners/import" carrying "url" as "https://github.com/acme/acme-provisioner"
    And the host was sent POST to "/api/agents/3/provisioning/provisioners/import" carrying "source_type" as "git"
    And the catalog dialog "provisioner-import" is gone

  Scenario: Provisioners: a card draws its health strip and its two folds folded, and a version row's click moves the providers and the quality to that version
    Given the host answers the hosts fixture
    And the host answers the hosts-installers fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/provisioning/provisioners"
    Then the card "startcloud" health reads "artifacts" as "true"
    And the card "startcloud" health reads "sidecars" as "true"
    And the card "hcl-domino" health reads "artifacts" as "false"
    And the card "startcloud" strip lists the providers "virtualbox,bhyve"
    And the card "startcloud" folds are folded
    When I open the "versions-fold" fold of the card "startcloud"
    And I select the version "0.1.27" of the card "startcloud"
    Then the card "startcloud" strip lists the providers "virtualbox"
    When I open the "quality-fold" fold of the card "startcloud"
    Then the card "startcloud" quality is measured as "silver" with "10/15"
    When I select the version "0.1.28" of the card "startcloud"
    Then the card "startcloud" quality is measured as "gold" with "13/15"
    When I open the details of the version "0.1.28" of the card "startcloud"
    Then the card "startcloud" version "0.1.28" links the box of "virtualbox" to "https://boxvault.example.com/STARTcloud/debian13/13.1.0/virtualbox"

  Scenario: Provisioners: the table is the toggle with the Deploy and Status columns, and Sources opens the one modal listing every catalog source
    Given the host answers the hosts fixture
    And the host answers the hosts-installers fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/provisioning/provisioners"
    And I switch the provisioner catalog to the table
    Then the provisioner catalog draws the table
    And the "provisioner-catalog" table of the section page draws the "deploy" column
    And the "provisioner-catalog" table of the section page draws the "status" column
    And the section page notes "update-available"
    When I press the section page's "catalog-sources" action
    Then the catalog dialog "catalog-sources" draws
    And the open dialog lists 2 rows
    And the catalog dialog "catalog-source" is gone
    When I press the open dialog's "catalog-source-add" action
    Then the catalog dialog "catalog-source" draws
