Feature: host artifacts

  Scenario: Installer files: the downloads collection drawn over the host's cache through the one listing, every artifact one file row, the files and the storage locations read once each
    Given the host answers the hosts fixture
    And the host answers the hosts-artifacts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    And the browser records its requests
    When I open "/hosts/1/provisioning/installers"
    Then the section page "installers" draws
    And the host row "installers" is the active one
    And the installer files listing draws
    And the installer files listing lists 3 files
    And the installer files listing draws the "name" column
    And the installer files listing draws the "status" column
    And the installer files listing draws the "location" column
    And the file "debian-13" offers "details"
    And the file "debian-13" offers "move"
    And the installer files listing lists no transfer
    And the host was sent GET to "/api/agents/1/artifacts/storage/paths" 1 times
    And the host was sent GET to "/api/agents/1/artifacts" 1 times
    And the host was asked "/api/agents/1/artifacts" with "limit" as "200"
    And the host was asked "/api/agents/1/artifacts" with "offset" as "0"

  Scenario: Installer files: a host whose row lists no artifacts draws no Installer files row, the not-available stub on the route, and is asked for nothing
    Given the host answers the hosts fixture
    And the host answers the hosts-files fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/provisioning/installers"
    Then the section page draws the not-available stub
    And the host column draws no "installers" row
    And the host column draws the "templates" row to "/hosts/1/provisioning/templates"
    And the host was not sent GET to "/api/agents/1/artifacts/storage/paths"
    And the host was not sent GET to "/api/agents/1/artifacts"

  Scenario: Installer files: a write one request and one notice, a storage location is made through the Locations modal with its name, path, type and enabled and the locations are read again
    Given the host answers the hosts fixture
    And the host answers the hosts-artifacts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/provisioning/installers"
    And I press the section page's "artifact-locations" action
    Then the "storage-locations" dialog is open
    And the open dialog lists 3 rows
    When I press the open dialog's "storage-path-create" action
    Then the "storage-path-create" dialog is open
    When I send the open dialog
    Then the open dialog notes "problem"
    And the host was not sent POST to "/api/agents/1/artifacts/storage/paths"
    When I type "New ISOs" into the field "storage-path-name"
    And I type "/tank/iso" into the field "storage-path-path"
    And I send the open dialog
    Then the host was sent POST to "/api/agents/1/artifacts/storage/paths" carrying "New ISOs" at "/name"
    And the host was sent POST to "/api/agents/1/artifacts/storage/paths" carrying "/tank/iso" at "/path"
    And the host was sent POST to "/api/agents/1/artifacts/storage/paths" carrying "iso" at "/type"
    And the host was sent POST to "/api/agents/1/artifacts/storage/paths" carrying "true" at "/enabled"
    And the host was sent POST to "/api/agents/1/artifacts/storage/paths" 1 times
    And the page raised 1 success notice
    And the "storage-path-create" dialog is closed
    And the "storage-locations" dialog is open
    And the host was sent GET to "/api/agents/1/artifacts/storage/paths" 2 times

  Scenario: Installer files: a write one request and one notice, Enable on a disabled location sends enabled alone and Delete waits behind the typed confirmation
    Given the host answers the hosts fixture
    And the host answers the hosts-artifacts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/provisioning/installers"
    And I press the section page's "artifact-locations" action
    And I press the action "toggle" of the catalog location "7c1e5d3a-0000-4000-8000-000100000003"
    Then the host was sent PUT to "/api/agents/1/artifacts/storage/paths/7c1e5d3a-0000-4000-8000-000100000003" carrying "true" at "/enabled"
    And the host was sent PUT to "/api/agents/1/artifacts/storage/paths/7c1e5d3a-0000-4000-8000-000100000003" carrying nothing at "/name"
    And the page raised 1 success notice
    And the host was sent GET to "/api/agents/1/artifacts/storage/paths" 2 times
    When I press the action "delete" of the catalog location "7c1e5d3a-0000-4000-8000-000100000003"
    Then the host was not sent DELETE to "/api/agents/1/artifacts/storage/paths/7c1e5d3a-0000-4000-8000-000100000003"
    When I confirm the open dialog
    Then the host was sent DELETE to "/api/agents/1/artifacts/storage/paths/7c1e5d3a-0000-4000-8000-000100000003" carrying "true" at "/remove_db_records"
    And the host was sent DELETE to "/api/agents/1/artifacts/storage/paths/7c1e5d3a-0000-4000-8000-000100000003" carrying "false" at "/force"
    And the page raised 2 success notices
    And the host was sent GET to "/api/agents/1/artifacts/storage/paths" 3 times

  Scenario: Installer files: a write one request and one notice, Download URL suggests the file name from the URL, queues the task and lists the transfer
    Given the host answers the hosts fixture
    And the host answers the hosts-artifacts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/provisioning/installers"
    And I press the section page's "artifact-download" action
    Then the "artifact-download" dialog is open
    When I press the open dialog's "submit" action
    Then the open dialog notes "problem"
    And the host was not sent POST to "/api/agents/1/artifacts/download"
    When I type "https://mirror.example.com/pub/rocky-9.4.iso" into the field "artifact-download-url"
    Then the field "artifact-download-filename" reads "rocky-9.4.iso"
    When I choose "7c1e5d3a-0000-4000-8000-000100000001" in the field "artifact-download-location"
    And I press the open dialog's "submit" action
    Then the host was sent POST to "/api/agents/1/artifacts/download" carrying "https://mirror.example.com/pub/rocky-9.4.iso" at "/url"
    And the host was sent POST to "/api/agents/1/artifacts/download" carrying "rocky-9.4.iso" at "/filename"
    And the host was sent POST to "/api/agents/1/artifacts/download" carrying "7c1e5d3a-0000-4000-8000-000100000001" at "/storage_path_id"
    And the host was sent POST to "/api/agents/1/artifacts/download" carrying "false" at "/overwrite_existing"
    And the host was sent POST to "/api/agents/1/artifacts/download" carrying nothing at "/checksum"
    And the host was sent POST to "/api/agents/1/artifacts/download" 1 times
    And the page raised 1 success notice
    And no dialog is open
    And the artifact transfers list 1 rows
    And I see "rocky-9.4.iso"

  Scenario: Installer files: a write one request and one notice, Scan all's own press sends no re-hash and a row's Delete waits behind the delete dialog
    Given the host answers the hosts fixture
    And the host answers the hosts-artifacts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/provisioning/installers"
    Then the installer files listing lists 3 files
    When I press the section page's "artifact-scan" action
    Then the host was sent POST to "/api/agents/1/artifacts/scan" carrying "false" at "/verify_checksums"
    And the page raised 1 success notice
    When I press "delete" on the file "windows-11"
    Then the "artifact-delete" dialog is open
    And the host was not sent DELETE to "/api/agents/1/artifacts/files"
    When I check the field "artifact-delete-files-too"
    And I press the open dialog's "submit" action
    Then the host was sent DELETE to "/api/agents/1/artifacts/files" carrying "9a2b4c6d-0000-4000-8000-000100000003" at "/artifact_ids/0"
    And the host was sent DELETE to "/api/agents/1/artifacts/files" carrying "true" at "/delete_files"
    And the host was sent DELETE to "/api/agents/1/artifacts/files" 1 times
    And the page raised 2 success notices
    And the installer files listing lists 3 files
    And the host was sent GET to "/api/agents/1/artifacts" 3 times

  Scenario: Installer files: a row's Details reads the artifact once and draws its path and the ISO note
    Given the host answers the hosts fixture
    And the host answers the hosts-artifacts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/provisioning/installers"
    And I press "details" on the file "debian-13"
    Then the "artifact-details" dialog is open
    And the host was sent GET to "/api/agents/1/artifacts/9a2b4c6d-0000-4000-8000-000100000001" 1 times
    And I see "/rpool/iso/debian-13.0.0-amd64-netinst.iso"
    And the open dialog notes "iso-info"
