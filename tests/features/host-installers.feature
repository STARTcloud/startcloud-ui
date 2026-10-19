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
    And the host was not sent GET to "/api/agents/3/certs"

  Scenario: Installer files: the page draws on the agent role, the agent's own routes read once each and every row's version drawn as the text of the version object the agent answers
    Given the host answers the agent-overview fixture
    And the host answers the agent-installers fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/provisioning/installers"
    Then the section page "installers" draws
    And the artifact section draws
    And the catalog card "installer-locations" lists 3 locations
    And the "installers" table of the section page lists 5 rows
    And the "installers" table of the section page draws the "version" column
    And the row "Domino_14.5_Linux_English.tar" of the "installers" table of the section page reads "14.5.0" in its "version" column
    And the row "Domino_1450FP1_Linux.tar" of the "installers" table of the section page reads "14.5.0FP1" in its "version" column
    And the row "Domino_1450IF1_Linux.tar" of the "installers" table of the section page reads "14.5.0IF1" in its "version" column
    And the row "debian-13.1.0-amd64-netinst.iso" of the "installers" table of the section page reads "-" in its "version" column
    And the row "Domino_1450FP1_Linux.tar" of the "installers" table of the section page offers "artifact-fetch"
    And the host was sent GET to "/api/artifacts/storage/paths"
    And the host was sent GET to "/api/artifacts"
    And the host was not sent GET to "/api/certs"
    And the host was sent GET to "/api/templates/sources"

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

  Scenario: Installer files: a target of the installer family needs a role, the dialog says so and sends nothing, and the mirror credentials are a basic_auth row of the host's store picked through the secret pick dialog
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
    And the host was not sent GET to "/api/agents/3/certs"
    When I type "domino_install" into the field "artifact-download-role"
    And I press the open dialog's "secret-pick" action
    Then the catalog dialog "secret-pick" draws
    And the host was sent GET to "/api/agents/3/certs" 1 times
    And the dialog table "secret-pick" lists 1 rows
    When I press "secret-pick-row" on the row "mirror-credentials" of the dialog table "secret-pick"
    Then the catalog dialog "secret-pick" is gone
    When I submit the catalog dialog "artifact-download"
    Then the host was sent POST to "/api/agents/3/artifacts/download" carrying "role" as "domino_install"
    And the host was sent POST to "/api/agents/3/artifacts/download" carrying "resource_name" as "mirror-credentials"

  Scenario: Installer files: the HCL portal download keeps the portal's own body, its key an api_key row of the host's store picked through the secret pick dialog
    Given the host answers the hosts fixture
    And the host answers the hosts-installers fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/provisioning/installers"
    And I press the section page's "artifact-hcl" action
    And I type "domino_install" into the field "artifact-hcl-role"
    And I pick "fixpack" in the catalog dialog select "artifact-hcl-kind"
    And I type "Domino_14.5_FP1_Linux.tar" into the field "artifact-hcl-filename"
    And I press the open dialog's "secret-pick" action
    Then the catalog dialog "secret-pick" draws
    And the dialog table "secret-pick" lists 1 rows
    When I press "secret-pick-row" on the row "hcl-portal" of the dialog table "secret-pick"
    Then the catalog dialog "secret-pick" is gone
    When I submit the catalog dialog "artifact-hcl"
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

  Scenario: Installer files: From BoxVault lists the download files the host's registry offers the person, grouped by download, release and patch, and a row's Download sends the host's fetch into the kind's location under the role with the registry's sha256
    Given the host answers the hosts fixture
    And the host answers the hosts-installers fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/provisioning/installers"
    And I press the section page's "artifact-registry" action
    Then the catalog dialog "artifact-registry" draws
    And the host was sent GET to "/api/agents/3/templates/sources"
    And the host was sent GET to "/api/agents/3/artifacts/registry/boxvault/downloads"
    And the dialog table "registry-files" lists 4 rows
    And the dialog table "registry-files" draws 7 groups
    When I press "registry-download" on the row "Domino_14.5_FP1_Linux.tar" of the dialog table "registry-files"
    Then the catalog dialog "artifact-registry" says why it cannot be sent
    And the host was not sent POST to "/api/agents/3/artifacts/registry-download"
    When I type "domino_fixpack" into the field "artifact-registry-role"
    And I press "registry-download" on the row "Domino_14.5_FP1_Linux.tar" of the dialog table "registry-files"
    Then the host was sent POST to "/api/agents/3/artifacts/registry-download" carrying "source_name" as "boxvault"
    And the host was sent POST to "/api/agents/3/artifacts/registry-download" carrying "download" as "domino"
    And the host was sent POST to "/api/agents/3/artifacts/registry-download" carrying "release" as "14.5"
    And the host was sent POST to "/api/agents/3/artifacts/registry-download" carrying "patch" as "FP1"
    And the host was sent POST to "/api/agents/3/artifacts/registry-download" carrying "filename" as "Domino_14.5_FP1_Linux.tar"
    And the host was sent POST to "/api/agents/3/artifacts/registry-download" carrying "kind" as "fixpack"
    And the host was sent POST to "/api/agents/3/artifacts/registry-download" carrying "role" as "domino_fixpack"
    And the host was sent POST to "/api/agents/3/artifacts/registry-download" carrying "checksum" as "b1b2c3d4b1b2c3d4b1b2c3d4b1b2c3d4b1b2c3d4b1b2c3d4b1b2c3d4b1b2c3d4"
    And the host was sent POST to "/api/agents/3/artifacts/registry-download" carrying "checksum_algorithm" as "sha256"
    And the page raised 1 success notice
    And the catalog dialog "artifact-registry" is gone

  Scenario: Installer files: an interim fix of the registry lands as a hotfix, and a file the registry lists no sha256 for is sent with no checksum
    Given the host answers the hosts fixture
    And the host answers the hosts-installers fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/provisioning/installers"
    And I press the section page's "artifact-registry" action
    And I type "traveler_hotfix" into the field "artifact-registry-role"
    And I pick "loc-installers" in the catalog dialog select "artifact-registry-location"
    And I press "registry-download" on the row "Traveler_14.0_IF2_Linux.tar" of the dialog table "registry-files"
    Then the host was sent POST to "/api/agents/3/artifacts/registry-download" carrying "kind" as "hotfix"
    And the host was sent POST to "/api/agents/3/artifacts/registry-download" carrying "storage_path_id" as "loc-installers"
    And the host was sent POST to "/api/agents/3/artifacts/registry-download" carrying nothing at "/checksum"

  Scenario: Installer files: a missing file's glyph opens the download dialog seeded with the file, its role and the sha256 it is known by, every other source one press away and the registry marking the file it lists
    Given the host answers the hosts fixture
    And the host answers the hosts-installers fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/provisioning/installers"
    Then the row "Domino_14.5_FP1_Linux.tar" of the "installers" table of the section page offers "artifact-fetch"
    And the row "Domino_14.5_Linux_English.tar" of the "installers" table of the section page offers no "artifact-fetch"
    When I press "artifact-fetch" on the row "Domino_14.5_FP1_Linux.tar" of the "installers" table of the section page
    Then the catalog dialog "artifact-download" draws
    And the open dialog notes "missing-seed"
    And the field "artifact-download-filename" reads "Domino_14.5_FP1_Linux.tar"
    And the field "artifact-download-sha" reads "b1b2c3d4b1b2c3d4b1b2c3d4b1b2c3d4b1b2c3d4b1b2c3d4b1b2c3d4b1b2c3d4"
    And the field "artifact-download-role" reads "domino_fixpack"
    And the field "artifact-download-location" reads "loc-installers"
    When I press the open dialog's "source-hcl" action
    Then the catalog dialog "artifact-hcl" draws
    And the catalog dialog "artifact-download" is gone
    And the field "artifact-hcl-filename" reads "Domino_14.5_FP1_Linux.tar"
    And the field "artifact-hcl-kind" reads "fixpack"
    And the field "artifact-hcl-role" reads "domino_fixpack"
    When I press the open dialog's "source-registry" action
    Then the catalog dialog "artifact-registry" draws
    And the open dialog notes "missing-seed"
    And the field "artifact-registry-role" reads "domino_fixpack"
    And the row "Domino_14.5_FP1_Linux.tar" of the dialog table "registry-files" notes "seed-match"
    When I press the open dialog's "source-upload" action
    Then the catalog dialog "artifact-upload" draws
    And the field "artifact-upload-checksum" reads "b1b2c3d4b1b2c3d4b1b2c3d4b1b2c3d4b1b2c3d4b1b2c3d4b1b2c3d4b1b2c3d4"
    And the field "artifact-upload-location" reads "loc-installers"

  Scenario: Installer files: a file whose hash is unknown or mismatched carries a warning badge and keeps its row actions, never a refusal
    Given the host answers the hosts fixture
    And the host answers the hosts-installers fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/provisioning/installers"
    Then the row "Domino_14.5_Linux_English.tar" of the "installers" table of the section page carries a "warning" badge
    And the row "Win11_24H2_English_x64.iso" of the "installers" table of the section page carries a "warning" badge
    And the row "debian-13.1.0-amd64-netinst.iso" of the "installers" table of the section page carries a "success" badge
    And the row "Domino_14.5_Linux_English.tar" of the "installers" table of the section page offers "download"
    And the row "Domino_14.5_Linux_English.tar" of the "installers" table of the section page offers "move"

  Scenario: Installer files: the storage location dialogs of the artifacts section offer every kind, an installer family location made with its type
    Given the host answers the hosts fixture
    And the host answers the hosts-installers fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/provisioning/installers"
    And I press the section page's "storage-path-create" action
    Then the "storage-path-create" dialog is open
    And the catalog dialog select "storage-path-type" offers 5 options
    When I type "Fixpacks" into the field "storage-path-name"
    And I type "/rpool/fixpacks" into the field "storage-path-path"
    And I choose "fixpack" in the field "storage-path-type"
    And I send the open dialog
    Then the host was sent POST to "/api/agents/3/artifacts/storage/paths" carrying "type" as "fixpack"
    And the host was sent POST to "/api/agents/3/artifacts/storage/paths" carrying "path" as "/rpool/fixpacks"

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

  Scenario: Provisioners: the families of every enabled catalog source as cards, read once a source per load, a source that answers 401 drawing no family and named with the agent's message in one warning banner, the installed ones alone when the page opens, the Update glyph on a family behind the catalog and the glyph greyed on one at its newest, Add turning the Installed group off so every family draws with the missing greyed and their controls live, a second Add turning it back on, and the Installed pill off greying them
    Given the host answers the hosts fixture
    And the host answers the hosts-installers fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/provisioning/provisioners"
    Then the section page "provisioners" draws
    And the host row "provisioners" is the active one
    And the "provisioner-catalog" listing of the section page draws 2 cards
    And the section page heading reads "2"
    And the section page notes "update-available"
    And the section page notes "held-current"
    And the provisioner catalog draws a "gold" pill
    And the provisioner catalog holds "hcl-domino" "2.0.0"
    And the page raised 1 warning banner
    And the warning banner reads "Probe catalog"
    And the page raised 0 danger notices
    When I press the section page's "catalog-add" action
    Then the section page heading reads "3"
    And the "provisioner-catalog" listing of the section page draws 3 cards
    And the provisioner catalog draws the card "startcloud" plain
    And the provisioner catalog greys the card "windows"
    And the provisioner catalog offers Install on "windows" "0.2.0"
    When I press "catalog-install" on the card "windows" of the provisioner catalog
    Then the host was sent POST to "/api/agents/3/provisioning/catalog/install" carrying "name" as "windows"
    And the host was sent POST to "/api/agents/3/provisioning/catalog/install" carrying "version" as "0.2.0"
    When I press the section page's "catalog-add" action
    Then the "provisioner-catalog" listing of the section page draws 2 cards
    When I switch the "provisioner-catalog" listing of the section page to "table"
    Then the "provisioner-catalog" listing of the section page draws the table
    When I switch the "provisioner-catalog" listing of the section page to "cards"
    And I press "/"
    And I open the filter panel
    And I toggle the filter pill "Installed"
    Then the "provisioner-catalog" listing of the section page draws 3 cards
    And the provisioner catalog greys the card "windows"
    And the host was sent GET to "/api/agents/3/provisioning/provisioners" 2 times
    And the host was sent GET to "/api/agents/3/provisioning/catalog" 3 times
    And the host was sent GET to "/api/agents/3/provisioning/catalog/health" 3 times
    And the host was sent GET to "/api/agents/3/provisioning/catalog/sources" 1 times
    And the host was not sent GET to "/api/agents/3/config/storage"

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

  Scenario: Provisioners: cards by default with tier pills, a version line's Install on a version the host lacks and its Delete on one it holds, and Install queues one
    Given the host answers the hosts fixture
    And the host answers the hosts-installers fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/provisioning/provisioners"
    Then the provisioner catalog draws 2 cards
    And the provisioner catalog draws a "gold" pill
    And the provisioner catalog draws a "silver" pill
    And the provisioner catalog offers Install on "startcloud" "0.1.28"
    And the provisioner catalog holds "startcloud" "0.1.27"
    And the provisioner catalog holds "hcl-domino" "2.0.0"
    When I open the "versions-fold" fold of the card "startcloud"
    And I press Install on "startcloud" "0.1.28" in the provisioner catalog
    Then the host was sent POST to "/api/agents/3/provisioning/catalog/install" carrying "name" as "startcloud"
    And the host was sent POST to "/api/agents/3/provisioning/catalog/install" carrying "version" as "0.1.28"
    And the page raised 1 success notice

  Scenario: Provisioners: a held version's line draws Delete in the install button's place, the delete of that version waiting behind the typed confirmation
    Given the host answers the hosts fixture
    And the host answers the hosts-installers fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/provisioning/provisioners"
    And I open the "versions-fold" fold of the card "startcloud"
    Then the provisioner catalog holds "startcloud" "0.1.27"
    When I press Delete on "startcloud" "0.1.27" in the provisioner catalog
    And I confirm the open dialog
    Then the host was sent DELETE to "/api/agents/3/provisioning/provisioners/startcloud/versions/0.1.27"
    And the host was sent GET to "/api/agents/3/provisioning/provisioners" 2 times

  Scenario: Provisioners: the chevron of a held family opens Update to, Update from source and Delete family, no Create a machine on a host that creates none, Update from source queuing a re-import and the delete waiting behind the typed confirmation
    Given the host answers the hosts fixture
    And the host answers the hosts-installers fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/provisioning/provisioners"
    And I open the menu of the card "startcloud" of the provisioner catalog
    Then the open menu offers "held-update"
    And the open menu offers "refresh-source"
    And the open menu offers no "held-add-source"
    And the open menu offers no "held-create"
    And the open menu offers "delete-family"
    And the open menu offers no "delete-version"
    When I press the menu entry "refresh-source"
    Then the host was sent POST to "/api/agents/3/provisioning/provisioners/startcloud/refresh-from-source"
    When I open the menu of the card "hcl-domino" of the provisioner catalog
    Then the open menu offers no "held-update"
    And the open menu offers no "refresh-source"
    When I press the menu entry "delete-family"
    And I confirm the open dialog
    Then the host was sent DELETE to "/api/agents/3/provisioning/provisioners/hcl-domino"
    And the host was sent GET to "/api/agents/3/provisioning/provisioners" 3 times

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

  Scenario: Provisioners: the table is the toggle with the Deploy and Status columns, and Sources opens the one modal listing every catalog source the agent answers, enabled or not, with its controls
    Given the host answers the hosts fixture
    And the host answers the hosts-installers fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/provisioning/provisioners"
    And I switch the provisioner catalog to the table
    Then the provisioner catalog draws the table
    And the "provisioner-catalog" table of the section page draws the "deploy" column
    And the "provisioner-catalog" table of the section page draws the "status" column
    And the section page notes "update-available"
    And the host was not sent GET to "/api/agents/3/config/storage"
    When I press the section page's "catalog-sources" action
    Then the catalog dialog "catalog-sources" draws
    And the open dialog lists 4 rows
    And the catalog source "startcloud" offers no "source-default"
    And the catalog source "partner" offers "source-default"
    And the catalog source "partner" offers "source-toggle"
    And the catalog source "partner" offers "source-edit"
    And the catalog source "partner" offers "source-remove"
    And the catalog dialog "catalog-source" is gone
    When I press the open dialog's "catalog-source-add" action
    Then the catalog dialog "catalog-source" draws

  Scenario: Provisioners: a catalog source's edit opens the form under the modal's table on its id and its display name with no credential, the host reading the source as the signed-in person, and saves as one merge patch of the storage file under its id
    Given the host answers the hosts fixture
    And the host answers the hosts-installers fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/provisioning/provisioners"
    And I press the section page's "catalog-sources" action
    And I press the action "source-edit" of the catalog source "staging"
    Then the field "source-name" of the catalog dialog "catalog-source" reads "staging"
    And the field "source-display-name" of the catalog dialog "catalog-source" reads "STARTcloud staging"
    And the open dialog draws no field "source-auth"
    And the open dialog draws no field "source-token"
    When I type "Staging catalog" into the field "source-display-name"
    And I submit the catalog dialog "catalog-source"
    Then the host was sent PUT to "/api/agents/3/config/storage" carrying "Staging catalog" at "/catalog_sources/sources/staging/display_name"
    And the host was sent PUT to "/api/agents/3/config/storage" carrying nothing at "/catalog_sources/sources/staging/auth"
    And the host was sent PUT to "/api/agents/3/config/storage" carrying "https://provisioner-catalog-staging.startcloud.com/catalog.json" at "/catalog_sources/sources/staging/url"
    And the host was sent PUT to "/api/agents/3/config/storage" carrying nothing at "/catalog_sources/sources/startcloud"
    And the host was sent PUT to "/api/agents/3/config/storage" carrying nothing at "/catalog_sources/sources/staging/ca_file"
    And the host was not sent POST to "/api/agents/3/provisioning/catalog/sources"
    And the catalog dialog "catalog-source" is gone
    And the catalog dialog "catalog-sources" draws
    And the host was sent GET to "/api/agents/3/provisioning/catalog/sources" 2 times
