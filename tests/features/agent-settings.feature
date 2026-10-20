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

  Scenario: Agent pages: the Agent group's rows, Secrets behind certs-store, the API keys page reading the keys alone, no configuration read of the agent, every read once
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
    And the host was not sent GET to "/api/agents/1/certs"
    And the page draws no key under "agentSettings"
    When I follow the host row "update"
    Then the section page "update" draws
    And the agent page offers "settings-update"
    And the host was sent GET to "/api/agents/1/app/updates/check" 1 times
    And the host was sent GET to "/api/agents/1/api-keys" 1 times

  Scenario: Agent pages: Update is one request and one notice behind a plain confirmation
    Given the host answers the hosts fixture
    And the host answers the hosts-agent-settings fixture
    And the host answers the hosts-api-keys fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"super-admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/agent/update"
    Then the agent page links to "https://github.com/Makr91/hyperweaver-agent/releases/tag/v1.3.0"
    And the agent page links to "https://github.com/Makr91/hyperweaver-agent/blob/main/CHANGELOG.md"
    When I press the agent page's "settings-update" action
    Then the open dialog asks for no typed word
    When I confirm the open plain dialog
    Then the host was sent POST to "/api/agents/1/app/updates/apply" 1 times
    And I see "Update to 1.3.0 queued"

  Scenario: Agent pages: the Update page draws the Overview card with the Assets card under it in the left column and the Changelog card in the right column
    Given the host answers the hosts fixture
    And the host answers the hosts-agent-settings fixture
    And the host answers the hosts-api-keys fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"super-admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/agent/update"
    Then the Update page draws the cards "Overview,Assets,Changelog" in order
    And the Update page draws the panels "update-overview,update-assets" in the "side" column
    And the Update page draws the panels "update-release" in the "main" column
    And the Update page draws no fold chevron

  Scenario: Agent pages: the Update page draws the release notes as rendered markdown in the Changelog card and the assets in their own card
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
    And the agent page lists the asset "hyperweaver-agent-1.3.0-linux-amd64.deb"
    And the agent page lists the asset "checksums.txt"
    And the agent page links to "https://github.com/Makr91/hyperweaver-agent/releases/download/v1.3.0/hyperweaver-agent-1.3.0-linux-amd64.deb"
    And I see "36.9 MB"
    And I see "486 Bytes"

  Scenario: Agent pages: a check without notes and assets draws the versions, the links and the one release's card alone, no notes and no Assets card
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

  Scenario: Agent pages: a check that lists releases draws the one release its latest version names alone, with its badge, who released it, its notes as markdown and its assets with size and sha256, and never the newer pre-release
    Given the host answers the hosts fixture
    And the host answers the hosts-agent-settings fixture
    And the host answers the hosts-api-keys fixture
    And the host answers the hosts-agent-update-releases fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"super-admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/agent/update"
    Then the agent page heading is in the "warning" tone
    And the agent page offers "settings-update"
    And the agent page links to "https://github.com/Makr91/hyperweaver-agent/blob/main/CHANGELOG.md"
    And the agent page draws the release "v1.3.0" alone
    And the release "v1.3.0" is marked "latest"
    And the release "v1.3.0" is not marked "prerelease"
    And the release "v1.3.0" is released by "Makr91"
    And the release "v1.3.0" links to "https://github.com/Makr91/hyperweaver-agent/releases/tag/v1.3.0"
    And the release "v1.3.0" draws the notes with 2 headings and 2 items
    And I do not see "###"
    And I do not see "utm support"
    And the assets of the release "v1.3.0" draw in their own card after the Overview card
    And the release "v1.3.0" lists the asset "hyperweaver-agent-1.3.0-linux-amd64.deb"
    And the release "v1.3.0" lists the asset "SHA256SUMS.txt"
    And the agent page links to "https://github.com/Makr91/hyperweaver-agent/releases/download/v1.3.0/SHA256SUMS.txt"
    And the release "v1.3.0" shows the checksum "e9c7a4f2b8d6e3c1a0f9b7d5e2c4a6f8b1d3e5c7a3f0c9a1b7e4d2c8f5a6b1d0"
    And I see "36.9 MB"
    And I see "486 Bytes"

  Scenario: Agent pages: a production version offered a pre-release says the host is current, offers no Update and draws no release
    Given the host answers the hosts fixture
    And the host answers the hosts-agent-settings fixture
    And the host answers the hosts-api-keys fixture
    And the host answers the hosts-agent-update-prerelease fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"super-admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/agent/update"
    Then the section page "update" draws
    And the agent page heading is in the "success" tone
    And the agent page offers no "settings-update"
    And the agent page links to "https://github.com/Makr91/hyperweaver-agent/blob/main/CHANGELOG.md"
    And the agent page draws no release
    And I do not see "utm support"

  Scenario: Agent pages: a dev version offered a pre-release draws that release with its Pre-release badge and offers Update
    Given the host answers the hosts fixture
    And the host answers the hosts-agent-settings fixture
    And the host answers the hosts-api-keys fixture
    And the host answers the hosts-agent-update-dev fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"super-admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/agent/update"
    Then the agent page heading is in the "warning" tone
    And the agent page offers "settings-update"
    And the agent page draws the release "v1.4.0-beta.1" alone
    And the release "v1.4.0-beta.1" is marked "prerelease"
    And the release "v1.4.0-beta.1" is not marked "latest"
    And the release "v1.4.0-beta.1" is released by "Makr91"
    And the release "v1.4.0-beta.1" draws the notes with 1 headings and 1 items
    And I see "utm support"
    And the release "v1.4.0-beta.1" lists the asset "hyperweaver-agent-1.4.0-beta.1-linux-amd64.deb"
    And the release "v1.4.0-beta.1" shows the checksum "3f0c9a1b7e4d2c8f5a6b1d0e9c7a4f2b8d6e3c1a0f9b7d5e2c4a6f8b1d3e5c7a"
    And I see "37.3 MB"

  Scenario: Agent pages: the Secrets page draws one heading row with Add, the Actions group with its Last synced line, the view toggle and Reload in its pane in that order, no Pick secret and no search box of its own, the navbar search narrowing its rows
    Given the host answers the hosts fixture
    And the host answers the hosts-agent-settings fixture
    And the host answers the hosts-api-keys fixture
    And the host answers the hosts-search fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"super-admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/agent/secrets"
    Then the section page "secrets" draws
    And the section page draws one heading
    And the heading pane of the section page reads "secret-add,secrets-actions,view-toggle,secrets-reload"
    And the agent page offers no "secret-pick"
    And the agent page notes "last-synced"
    And the section page draws no search box
    And the agent page offers no "refresh"
    And the "secrets" table of the section page lists 2 rows
    When I press "/"
    And I type "deploy" in the navbar search box
    Then the "secrets" table of the section page lists 1 rows
    And the navbar search count reads "1 / 2"
    And the heading of the networking page counts 1

  Scenario: Agent pages: the Secrets page lists every kind of the host's store on one table, a certificate row beside a password row, the certificate row offering Pull to vault and the password row Edit, and the Kind pill narrows to one kind
    Given the host answers the hosts fixture
    And the host answers the hosts-agent-settings fixture
    And the host answers the hosts-api-keys fixture
    And the host answers the hosts-search fixture
    And the host answers the hosts-agent-store fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"super-admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/agent/secrets"
    Then the section page "secrets" draws
    And the "secrets" table of the section page lists 2 rows
    And the secret row "leaf" is of kind "certificate"
    And the secret row "admin-pass" is of kind "password"
    And the row "leaf" of the "secrets" table of the section page offers "pull"
    And the row "admin-pass" of the "secrets" table of the section page offers "secret-edit"
    And the secrets table heads the store "host-1" with "H"
    And the secret row "leaf" marks the store "host-1" as "equal"
    And the secret row "admin-pass" marks the store "host-1" as "equal"
    When I press "/"
    And I open the filter panel
    And I toggle the filter pill of the kind of the secret row "leaf"
    Then the "secrets" table of the section page lists 1 rows
    And the secret row "leaf" is of kind "certificate"

  Scenario: Agent pages: the Secrets page reads the host store's rows as it opens and lists them with their kind, Add saves one row as one POST carrying the kind, the name and the secret and reads again, Remove sends one DELETE behind the typed confirmation, and Reload reads again
    Given the host answers the hosts fixture
    And the host answers the hosts-agent-settings fixture
    And the host answers the hosts-api-keys fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"super-admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/agent/secrets"
    Then the section page "secrets" draws
    And the section page draws one heading
    And the agent page draws the "secrets" panel
    And the host was sent GET to "/api/agents/1/certs" 1 times
    And the host was not sent GET to "/api/agents/1/api-keys"
    And the "secrets" table of the section page lists 2 rows
    And the secret row "github" is of kind "api_key"
    And the secret row "deploy" is of kind "ssh_key"
    And the row "github" of the "secrets" table of the section page offers "secret-edit"
    When I press the agent page's "secret-add" action
    Then the "secret-record" dialog is open
    When I choose "api_key" in the control "secret-record/kind"
    And I choose "hcl_portal" in the control "secret-record/profile"
    Then the control "secret-record/url" holds "https://my.hcltechsw.com"
    When I fill the control "secret-record/name" with "hcl"
    And I fill the control "secret-record/key" with "abc"
    And I send the open dialog
    Then the host was sent POST to "/api/agents/1/certs" carrying "api_key" at "/kind"
    And the host was sent POST to "/api/agents/1/certs" carrying "hcl" at "/name"
    And the host was sent POST to "/api/agents/1/certs" carrying "hcl_portal" at "/profile"
    And the host was sent POST to "/api/agents/1/certs" carrying "abc" at "/record/secret/key"
    And the host was sent POST to "/api/agents/1/certs" carrying "" at "/organization"
    And the host was sent POST to "/api/agents/1/certs" 1 times
    And the page raised 1 success notice
    And the host was sent GET to "/api/agents/1/certs" 2 times
    And the "secret-record" dialog is closed
    When I press "secret-remove" on the row "github" of the "secrets" table of the section page
    And I confirm the open dialog
    Then the host was sent DELETE to "/api/agents/1/certs/sec-github" 1 times
    And the host was sent GET to "/api/agents/1/certs" 3 times
    When I press the agent page's "secrets-reload" action
    Then the host was sent GET to "/api/agents/1/certs" 4 times

  Scenario: Agent pages: the host's mark on a Secrets row is a check while the host holds the row, a click turns the host's sync off and removes the row there as one DELETE, and a right click opens Enable sync, Disable sync and Settings
    Given the host answers the hosts fixture
    And the host answers the hosts-agent-settings fixture
    And the host answers the hosts-api-keys fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"super-admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/agent/secrets"
    Then the secret row "github" marks the store "host-1" as "equal"
    When I open the menu of the store mark "host-1" of the secret row "github"
    Then the store mark menu offers "enable,disable,settings"
    When I pick "disable" in the store mark menu
    Then the host was sent DELETE to "/api/agents/1/certs/sec-github" 1 times
    And the page raised 1 success notice
    When I press the store mark "host-1" of the secret row "deploy"
    Then the host was sent DELETE to "/api/agents/1/certs/sec-deploy" 1 times

  Scenario: Agent pages: two picked Secrets rows are removed together by Delete selected of the Actions menu behind the typed confirmation, one DELETE a row and one notice naming the count
    Given the host answers the hosts fixture
    And the host answers the hosts-agent-settings fixture
    And the host answers the hosts-api-keys fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"super-admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/agent/secrets"
    And I tick the secret row "github"
    Then I see "1 selected"
    When I pick "delete-selected" in the section page's Actions menu
    And I confirm the open delete dialog with "delete"
    Then the host was sent DELETE to "/api/agents/1/certs/sec-github" 1 times
    And I see "1 secret deleted"

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
