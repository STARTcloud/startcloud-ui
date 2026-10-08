Feature: notifications live

  Scenario: Notifications live: a row created for the person appears in the open modal and the badge moves without a reopen
    Given the host answers the agent-profile fixture
    And the stream holds the inbox-created frames
    And the browser holds "apikey" as "{\"id\":12,\"name\":\"Mark\",\"role\":\"admin\"}"
    When I open "/"
    Then the avatar badge reads 2
    And the host was sent GET to "/api/notifications/unread-count" 1 times
    When I open the account menu
    And I press the account menu's Notifications row
    Then the notifications modal lists 3 rows
    When the stream releases its frames
    Then the notifications modal lists 4 rows
    And the notifications modal's first row reads "The backup of lab-1 finished"
    And the avatar badge reads 3
    And the host was sent GET to "/api/notifications/unread-count" 1 times

  Scenario: Notifications live: read all from another tab empties the badge and reads every row of the open inbox page
    Given the host answers the agent-profile fixture
    And the stream holds the inbox-read-all frames
    And the browser holds "apikey" as "{\"id\":12,\"name\":\"Mark\",\"role\":\"admin\"}"
    When I open "/notifications"
    Then the inbox page lists 3 rows
    And the inbox page draws 2 unread rows
    And the avatar badge reads 2
    When the stream releases its frames
    Then the avatar badge is hidden
    And the inbox page draws 0 unread rows
    And the inbox page lists 3 rows

  Scenario: Notifications live: an idp host with no stream of its own opens the identity provider's stream with the session's token
    Given the host answers the inbox-idp fixture
    And the identity provider "https://auth.example.com" answers no discovery
    And the stream answers the ready frames
    And the browser holds "catalog.access_token" as "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiI4ZjJjMWQ1Mi02ZjBlLTRjMGEtOWE1NC0zYzFmNmYyYTllMTEiLCJuYW1lIjoiTWFyayBHaWxiZXJ0IiwiZW1haWwiOiJtYXJrQG00a3IubmV0Iiwic2NvcGUiOiJvcGVuaWQgcHJvZmlsZSBlbWFpbCBub3RpZmljYXRpb25zOnJlYWQiLCJleHAiOjQxMDI0NDQ4MDB9."
    And the browser holds "catalog.token_type" as "Bearer"
    And the browser holds "catalog.expires_at" as "4102444800000"
    When I open "/"
    Then the stream was requested on the origin "https://auth.example.com"
    And the stream was requested at "/api/events"
    And the stream was requested with "topics" as "notifications,session"
    And the stream request carried "authorization" as "Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiI4ZjJjMWQ1Mi02ZjBlLTRjMGEtOWE1NC0zYzFmNmYyYTllMTEiLCJuYW1lIjoiTWFyayBHaWxiZXJ0IiwiZW1haWwiOiJtYXJrQG00a3IubmV0Iiwic2NvcGUiOiJvcGVuaWQgcHJvZmlsZSBlbWFpbCBub3RpZmljYXRpb25zOnJlYWQiLCJleHAiOjQxMDI0NDQ4MDB9."

  Scenario: Notifications live: the Rebuild row ends on the person's catalog-rebuild row and asks nothing on a clock
    Given the host answers the agent-profile fixture
    And the host answers the inbox-rebuild fixture
    And the stream holds the rebuild-success frames
    And the browser holds "apikey" as "{\"id\":12,\"name\":\"Mark\",\"role\":\"admin\"}"
    When I open "/"
    And I open the account menu
    And I press the account menu's Rebuild row
    Then the host was sent POST to "/api/admin/rebuild" 1 times
    And the account menu's Rebuild row runs
    And I see "Rebuild running…"
    When the stream releases its frames
    Then I see "Rebuild finished."
    And the page raised 1 success notice
    And the account menu's Rebuild row is idle
    And the host was not sent GET to "/api/admin/rebuild/status"

  Scenario: Notifications live: a catalog-rebuild row whose title ends in another word ends the Rebuild row with that word
    Given the host answers the agent-profile fixture
    And the host answers the inbox-rebuild fixture
    And the stream holds the rebuild-failure frames
    And the browser holds "apikey" as "{\"id\":12,\"name\":\"Mark\",\"role\":\"admin\"}"
    When I open "/"
    And I open the account menu
    And I press the account menu's Rebuild row
    Then the account menu's Rebuild row runs
    When the stream releases its frames
    Then I see "Rebuild failed: failure"
    And the page raised 1 danger notice
    And the account menu's Rebuild row is idle
