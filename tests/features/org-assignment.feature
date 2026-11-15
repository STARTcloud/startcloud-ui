Feature: organization assignment, the organization switcher's multi-select variant

  Scenario: Organization assignment: the dialog is the organization switcher, every organization the person can reach a row, the assigned ones selected, no uuid input
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-tools fixture
    And the host answers the hosts-settings fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    And I press the machine page's "org-access" action
    Then the "org-assignment" dialog is open
    And the assignment switcher lists 2 organization rows
    And the organization row "0b7c1d52-6f0e-4c0a-9a54-3c1f6f2a9e11" reads "Acme"
    And the organization row "5e0e6a0c-2b55-4f0b-8d1c-91a7c3f4b622" reads "Prominic"
    And the organization row "0b7c1d52-6f0e-4c0a-9a54-3c1f6f2a9e11" is selected
    And the organization row "5e0e6a0c-2b55-4f0b-8d1c-91a7c3f4b622" is not selected
    And the assignment switcher draws no uuid input

  Scenario: Organization assignment: an assigned uuid outside the person's reach keeps its own row, named by the uuid, and Save sends it with the rest
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-tools fixture
    And the host answers the hosts-settings fixture
    And the host answers the org-assignment fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    And I press the machine page's "org-access" action
    Then the "org-assignment" dialog is open
    And the assignment switcher lists 3 organization rows
    And the organization row "7c3e9a10-4d2b-4f6e-b1a8-2e5d7c9f0a33" reads "7c3e9a10-4d2b-4f6e-b1a8-2e5d7c9f0a33"
    And the organization row "7c3e9a10-4d2b-4f6e-b1a8-2e5d7c9f0a33" is selected
    When I toggle the organization row "7c3e9a10-4d2b-4f6e-b1a8-2e5d7c9f0a33"
    Then the organization row "7c3e9a10-4d2b-4f6e-b1a8-2e5d7c9f0a33" is not selected
    And the assignment switcher lists 3 organization rows
    When I toggle the organization row "7c3e9a10-4d2b-4f6e-b1a8-2e5d7c9f0a33"
    And I send the open dialog
    Then the host was sent PUT to "/api/servers/1/machines/dev-1/orgs" carrying "0b7c1d52-6f0e-4c0a-9a54-3c1f6f2a9e11" at "/orgs/0"
    And the host was sent PUT to "/api/servers/1/machines/dev-1/orgs" carrying "7c3e9a10-4d2b-4f6e-b1a8-2e5d7c9f0a33" at "/orgs/1"
    And the host was sent PUT to "/api/servers/1/machines/dev-1/orgs" carrying nothing at "/orgs/2"
    And the host was sent PUT to "/api/servers/1/machines/dev-1/orgs" 1 times
    And no dialog is open

  Scenario: Organization assignment: a 403 on the read draws the forbidden line, holds every row and Save, and sends nothing
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-tools fixture
    And the host answers the hosts-settings fixture
    And the host answers the org-assignment/forbidden fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    And I press the machine page's "org-access" action
    Then the "org-assignment" dialog is open
    And the open dialog notes "forbidden"
    And the assignment switcher lists 2 organization rows
    And the organization row "0b7c1d52-6f0e-4c0a-9a54-3c1f6f2a9e11" is held
    And the assignment's Save is held
    And the host was not sent PUT to "/api/servers/1/machines/dev-1/orgs"

  Scenario: Organization assignment: an untouched dialog closes at once on a backdrop click, a changed selection asks first, Keep editing keeps the selection and Discard closes it without a request
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-tools fixture
    And the host answers the hosts-settings fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    And I press the machine page's "org-access" action
    Then the "org-assignment" dialog is open
    And the organization row "0b7c1d52-6f0e-4c0a-9a54-3c1f6f2a9e11" is selected
    When I click the backdrop of the open dialog
    Then no dialog is open
    When I press the machine page's "org-access" action
    Then the "org-assignment" dialog is open
    And the organization row "5e0e6a0c-2b55-4f0b-8d1c-91a7c3f4b622" is not selected
    When I toggle the organization row "5e0e6a0c-2b55-4f0b-8d1c-91a7c3f4b622"
    And I click the backdrop of the open dialog
    Then the "discard-changes" dialog is open
    When I press the open dialog's "keep-editing" action
    Then the "discard-changes" dialog is closed
    And the "org-assignment" dialog is open
    And the organization row "5e0e6a0c-2b55-4f0b-8d1c-91a7c3f4b622" is selected
    When I click the backdrop of the open dialog
    And I press the open dialog's "discard" action
    Then no dialog is open
    And the host was not sent PUT to "/api/servers/1/machines/dev-1/orgs"

  Scenario: Organization assignment: the registry's row action opens the same switcher over the agent's organizations, an empty list noting the agent is open, and Save sends the picked uuid
    Given the host answers the hosts fixture
    And the host answers the hosts-config fixture
    And the host answers the hosts-settings fixture
    And the host answers the org-assignment fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"super-admin\",\"access_token\":\"t\"}"
    When I open "/"
    Then I see "Desk"
    When I press "assign-orgs" on the hosts page
    Then the "org-assignment" dialog is open
    And the host was sent GET to "/api/servers/1/orgs" 1 times
    And the host was sent GET to "/api/organizations" 1 times
    And the open dialog notes "open-agent"
    And the assignment switcher lists 2 organization rows
    And the organization row "0b7c1d52-6f0e-4c0a-9a54-3c1f6f2a9e11" is not selected
    When I toggle the organization row "0b7c1d52-6f0e-4c0a-9a54-3c1f6f2a9e11"
    Then the open dialog notes no "open-agent"
    When I send the open dialog
    Then the host was sent PUT to "/api/servers/1/orgs" carrying "0b7c1d52-6f0e-4c0a-9a54-3c1f6f2a9e11" at "/orgs/0"
    And the host was sent PUT to "/api/servers/1/orgs" 1 times
    And the page raised 1 success notice
    And no dialog is open
