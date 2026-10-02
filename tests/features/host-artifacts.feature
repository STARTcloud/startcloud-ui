Feature: host artifacts

  Scenario: Manage page: the ISO and artifacts section behind artifacts, the storage locations and the artifacts are read once and drawn over the one table
    Given the host answers the hosts fixture
    And the host answers the hosts-artifacts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    And the browser records its requests
    When I open "/hosts/1/manage"
    Then the manage page draws the "artifacts" section
    And the artifact section shows the "storage-paths" tab
    And the "storage-paths" table of the manage page lists 3 rows
    And the "storage-paths" table of the manage page draws the "name" column
    And the "storage-paths" table of the manage page draws the "status" column
    And the row "Old ISOs" of the "storage-paths" table of the manage page offers "toggle"
    And the host was sent GET to "/api/agents/1/artifacts/storage/paths" 1 times
    And the host was sent GET to "/api/agents/1/artifacts" 1 times
    And the host was asked "/api/agents/1/artifacts" with "limit" as "25"
    And the host was asked "/api/agents/1/artifacts" with "sort_by" as "filename"
    When I pick the tab "artifacts" of the manage page
    Then the artifact section shows the "artifacts" tab
    And the "artifacts" table of the manage page lists 3 rows
    And the "artifacts" table of the manage page draws the "filename" column
    And the row "debian-13" of the "artifacts" table of the manage page offers "details"
    And the artifact section lists no transfer

  Scenario: Manage page: the ISO and artifacts section behind artifacts, a host whose row lists no artifacts draws no section and is asked for nothing
    Given the host answers the hosts fixture
    And the host answers the hosts-files fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/manage"
    Then the manage page draws its frame
    And the manage page draws no "artifacts" section
    And the host was not sent GET to "/api/agents/1/artifacts/storage/paths"
    And the host was not sent GET to "/api/agents/1/artifacts"

  Scenario: Manage page: a write one request and one notice, a storage location is made with its name, path, type and enabled and the locations are read again
    Given the host answers the hosts fixture
    And the host answers the hosts-artifacts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/manage"
    And I press the manage page's "storage-path-create" action
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
    And no dialog is open
    And the host was sent GET to "/api/agents/1/artifacts/storage/paths" 2 times

  Scenario: Manage page: a write one request and one notice, Enable on a disabled location sends enabled alone and Delete waits behind the typed confirmation
    Given the host answers the hosts fixture
    And the host answers the hosts-artifacts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/manage"
    And I press "toggle" on the row "Old ISOs" of the "storage-paths" table of the manage page
    Then the host was sent PUT to "/api/agents/1/artifacts/storage/paths/7c1e5d3a-0000-4000-8000-000100000003" carrying "true" at "/enabled"
    And the host was sent PUT to "/api/agents/1/artifacts/storage/paths/7c1e5d3a-0000-4000-8000-000100000003" carrying nothing at "/name"
    And the page raised 1 success notice
    And the host was sent GET to "/api/agents/1/artifacts/storage/paths" 2 times
    When I press "delete" on the row "Old ISOs" of the "storage-paths" table of the manage page
    Then the host was not sent DELETE to "/api/agents/1/artifacts/storage/paths/7c1e5d3a-0000-4000-8000-000100000003"
    When I confirm the open dialog
    Then the host was sent DELETE to "/api/agents/1/artifacts/storage/paths/7c1e5d3a-0000-4000-8000-000100000003" carrying "true" at "/remove_db_records"
    And the host was sent DELETE to "/api/agents/1/artifacts/storage/paths/7c1e5d3a-0000-4000-8000-000100000003" carrying "false" at "/force"
    And the page raised 2 success notices
    And the host was sent GET to "/api/agents/1/artifacts/storage/paths" 3 times

  Scenario: Manage page: a write one request and one notice, Download from URL suggests the file name from the URL, queues the task and lists the transfer
    Given the host answers the hosts fixture
    And the host answers the hosts-artifacts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/manage"
    And I pick the tab "artifacts" of the manage page
    And I press the manage page's "download-url" action
    Then the "artifact-download" dialog is open
    When I press the open dialog's "submit" action
    Then the open dialog notes "problem"
    And the host was not sent POST to "/api/agents/1/artifacts/download"
    When I type "https://mirror.example.com/pub/rocky-9.4.iso" into the field "download-url"
    Then the field "download-filename" reads "rocky-9.4.iso"
    When I choose "7c1e5d3a-0000-4000-8000-000100000001" in the field "download-storage-location"
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

  Scenario: Manage page: a write one request and one notice, Scan storage sends hyperweaver-ui's body and Delete on an artifact waits behind the typed confirmation
    Given the host answers the hosts fixture
    And the host answers the hosts-artifacts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/manage"
    And I pick the tab "artifacts" of the manage page
    And I press the manage page's "scan" action
    Then the host was sent POST to "/api/agents/1/artifacts/scan" carrying "false" at "/verify_checksums"
    And the host was sent POST to "/api/agents/1/artifacts/scan" carrying "false" at "/remove_orphaned"
    And the page raised 1 success notice
    When I press "delete" on the row "windows-11" of the "artifacts" table of the manage page
    Then the host was not sent DELETE to "/api/agents/1/artifacts/files"
    When I confirm the open dialog
    Then the host was sent DELETE to "/api/agents/1/artifacts/files" carrying "9a2b4c6d-0000-4000-8000-000100000003" at "/artifact_ids/0"
    And the host was sent DELETE to "/api/agents/1/artifacts/files" carrying "true" at "/delete_files"
    And the host was sent DELETE to "/api/agents/1/artifacts/files" 1 times
    And the page raised 2 success notices
    And the host was sent GET to "/api/agents/1/artifacts" 2 times

  Scenario: Manage page: the ISO and artifacts section behind artifacts, View details reads the artifact once and draws its checksum
    Given the host answers the hosts fixture
    And the host answers the hosts-artifacts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/manage"
    And I pick the tab "artifacts" of the manage page
    And I press "details" on the row "debian-13" of the "artifacts" table of the manage page
    Then the "artifact-details" dialog is open
    And the host was sent GET to "/api/agents/1/artifacts/9a2b4c6d-0000-4000-8000-000100000001" 1 times
    And I see "/rpool/iso/debian-13.0.0-amd64-netinst.iso"
    And the open dialog notes "iso-info"
