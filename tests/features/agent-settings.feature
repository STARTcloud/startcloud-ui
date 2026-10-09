Feature: agent-settings

  Scenario: Agent pages: the rows are offered to a host whose row names a hypervisor, a row that names none draws no Agent group and the not-available stub on their routes, asked for nothing
    Given the host answers the hosts fixture
    And the host answers the hosts-agent-settings fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"super-admin\",\"access_token\":\"t\"}"
    When I open "/hosts/4/agent/api-keys"
    Then the agent page draws the not-available stub
    And the host column draws no "agent" group
    And the host was not sent GET to "/api/agents/4/api-keys"
    When I open "/hosts/4/agent/update"
    Then the agent page draws the not-available stub
    And the host was not sent GET to "/api/agents/4/app/updates/check"

  Scenario: Agent pages: a host the list of servers does not hold draws what the host page draws for it
    Given the host answers the hosts fixture
    And the host answers the hosts-agent-settings fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"super-admin\",\"access_token\":\"t\"}"
    When I open "/hosts/99/agent/api-keys"
    Then the agent route draws the host that did not answer
    And the host was sent GET to "/api/agents/99/stats"
    And the host was not sent GET to "/api/agents/99/api-keys"

  Scenario: Agent pages: the agent's own pages are for a super-admin alone, hyperweaver-ui's gate, and ask nothing for the admin the hosts fixture answers
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/agent/api-keys"
    Then the section page says a super-admin is required
    And the host was not sent GET to "/api/agents/1/api-keys"
    When I open "/hosts/1/agent/update"
    Then the section page says a super-admin is required
    And the host was not sent GET to "/api/agents/1/app/updates/check"

  Scenario: Agent pages: the Agent group's rows, Secrets behind secrets, the API keys page reading the keys alone, no configuration read of the agent, every read once
    Given the host answers the hosts fixture
    And the host answers the hosts-agent-settings fixture
    And the host answers the hosts-api-keys fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"super-admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/agent/api-keys"
    Then the section page "api-keys" draws
    And the host row "api-keys" is the active one
    And the host column draws the "agent" group
    And the host column draws the "secrets" row to "/hosts/1/agent/secrets"
    And the host column draws the "api-keys" row to "/hosts/1/agent/api-keys"
    And the host column draws the "database" row to "/hosts/1/agent/database"
    And the host column draws the "update" row to "/hosts/1/agent/update"
    And the agent page draws the "api-keys" panel
    And the host was sent GET to "/api/agents/1/api-keys" 1 times
    And the host was not sent GET to "/api/agents/1/app/updates/check"
    And the host was not sent GET to "/api/agents/1/settings"
    And the host was not sent GET to "/api/agents/1/secrets"
    And the page draws no key under "agentSettings"
    When I follow the host row "update"
    Then the section page "update" draws
    And the agent page offers "settings-update"
    And the host was sent GET to "/api/agents/1/app/updates/check" 1 times
    And the host was sent GET to "/api/agents/1/api-keys" 1 times

  Scenario: Agent pages: Update is one request and one notice behind the typed confirmation
    Given the host answers the hosts fixture
    And the host answers the hosts-agent-settings fixture
    And the host answers the hosts-api-keys fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"super-admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/agent/update"
    Then the agent page links to "https://github.com/Makr91/hyperweaver-agent/releases/tag/v1.3.0"
    And the agent page links to "https://github.com/Makr91/hyperweaver-agent/blob/main/CHANGELOG.md"
    When I press the agent page's "settings-update" action
    And I confirm the open dialog with "update"
    Then the host was sent POST to "/api/agents/1/app/updates/apply" 1 times
    And I see "Update to 1.3.0 queued"

  Scenario: Agent pages: the Update page draws the release notes as rendered markdown beside the versions, the assets under a fold folded until opened and kept over a reload
    Given the host answers the hosts fixture
    And the host answers the hosts-agent-settings fixture
    And the host answers the hosts-api-keys fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"super-admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/agent/update"
    Then the agent page heading is in the "warning" tone
    And the agent page offers "settings-update"
    And the agent page draws the release notes with 2 headings and 3 items
    And I see "Hosts.yml Editor"
    And I do not see "###"
    And the agent page draws the "update-assets" panel
    And the "update-assets" section of the agent page is folded
    And the agent page lists no asset
    When I fold the "update-assets" section of the agent page
    Then the "update-assets" section of the agent page is open
    And the agent page lists the asset "hyperweaver-agent-1.3.0-linux-amd64.deb"
    And the agent page lists the asset "checksums.txt"
    And the agent page links to "https://github.com/Makr91/hyperweaver-agent/releases/download/v1.3.0/hyperweaver-agent-1.3.0-linux-amd64.deb"
    And I see "36.9 MB"
    And I see "486 Bytes"
    When I load the page again
    Then the "update-assets" section of the agent page is open
    And the agent page lists the asset "checksums.txt"

  Scenario: Agent pages: a check without notes and assets draws the versions and the links alone, no notes heading and no Assets fold
    Given the host answers the hosts fixture
    And the host answers the hosts-agent-settings fixture
    And the host answers the hosts-api-keys fixture
    And the host answers the hosts-agent-update-plain fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"super-admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/agent/update"
    Then the agent page offers "settings-update"
    And the agent page links to "https://github.com/Makr91/hyperweaver-agent/releases/tag/v1.3.0"
    And the agent page draws no release notes
    And the section page draws no "update-assets" panel

  Scenario: Agent pages: an agent that is up to date draws the heading in the success tone with Refresh alone and the installed version's notes
    Given the host answers the hosts fixture
    And the host answers the hosts-agent-settings fixture
    And the host answers the hosts-api-keys fixture
    And the host answers the hosts-agent-update-current fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"super-admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/agent/update"
    Then the section page "update" draws
    And the agent page heading is in the "success" tone
    And the agent page offers no "settings-update"
    And I see "1.3.0"
    And the agent page draws the release notes with 1 headings and 2 items
    And the agent page draws the "update-assets" panel
    And the host was sent GET to "/api/agents/1/app/updates/check" 1 times

  Scenario: Agent pages: the Secrets page reads the document as it opens, saves one category as one PUT and reads again, and Reload reads again
    Given the host answers the hosts fixture
    And the host answers the hosts-agent-settings fixture
    And the host answers the hosts-api-keys fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"super-admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/agent/secrets"
    Then the section page "secrets" draws
    And the agent page draws the "secrets" panel
    And the host was sent GET to "/api/agents/1/secrets" 1 times
    And the host was not sent GET to "/api/agents/1/api-keys"
    And the first secret entry is named "github"
    When I press the agent page's "secret-save" action
    Then the host was sent PUT to "/api/agents/1/secrets" 1 times
    And the page raised 1 success notice
    And the host was sent GET to "/api/agents/1/secrets" 2 times
    When I press the agent page's "secrets-reload" action
    Then the host was sent GET to "/api/agents/1/secrets" 3 times

  Scenario: Agent pages: Refresh reads the list of servers, the host's stats and every read of the page again
    Given the host answers the hosts fixture
    And the host answers the hosts-agent-settings fixture
    And the host answers the hosts-api-keys fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"super-admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/agent/api-keys"
    Then the host was sent GET to "/api/agents/1/api-keys" 1 times
    When I click "Refresh"
    Then the host was sent GET to "/api/servers" 2 times
    And the host was sent GET to "/api/agents/1/stats" 2 times
    And the host was sent GET to "/api/agents/1/api-keys" 2 times
    When I open "/hosts/1/agent/update"
    Then the host was sent GET to "/api/agents/1/app/updates/check" 1 times
    When I click "Refresh"
    Then the host was sent GET to "/api/agents/1/app/updates/check" 2 times
