Feature: favorites

  Scenario: Favorites: an idp host that lists favorites reads them once from the identity provider on the session it made and draws them in the account menu
    Given the host answers the favorites-idp fixture
    And the identity provider "https://auth.example.com" answers no discovery
    And the browser holds "catalog.access_token" as "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiI4ZjJjMWQ1Mi02ZjBlLTRjMGEtOWE1NC0zYzFmNmYyYTllMTEiLCJuYW1lIjoiTWFyayBHaWxiZXJ0IiwiZW1haWwiOiJtYXJrQG00a3IubmV0Iiwic2NvcGUiOiJvcGVuaWQgcHJvZmlsZSBlbWFpbCBub3RpZmljYXRpb25zOnJlYWQiLCJleHAiOjQxMDI0NDQ4MDB9."
    And the browser holds "catalog.token_type" as "Bearer"
    And the browser holds "catalog.expires_at" as "4102444800000"
    When I open "/"
    Then the host was sent GET to "/api/user/favorites" on the origin "https://auth.example.com"
    And the host was sent GET to "/api/user/favorites" 1 times
    When I open the account menu
    Then the account menu offers the favorite "Conductor" at "https://conductor.example.com"
    And the account menu offers the favorite "Boxes" at "https://boxvault.example.com"

  Scenario: Favorites: an idp host that lists no favorites is never asked for them
    Given the host answers the inbox-idp fixture
    And the identity provider "https://auth.example.com" answers no discovery
    And the browser holds "catalog.access_token" as "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiI4ZjJjMWQ1Mi02ZjBlLTRjMGEtOWE1NC0zYzFmNmYyYTllMTEiLCJuYW1lIjoiTWFyayBHaWxiZXJ0IiwiZW1haWwiOiJtYXJrQG00a3IubmV0Iiwic2NvcGUiOiJvcGVuaWQgcHJvZmlsZSBlbWFpbCBub3RpZmljYXRpb25zOnJlYWQiLCJleHAiOjQxMDI0NDQ4MDB9."
    And the browser holds "catalog.token_type" as "Bearer"
    And the browser holds "catalog.expires_at" as "4102444800000"
    When I open "/"
    Then the host was sent GET to "/api/notifications/unread-count" 1 times
    And the host was not sent GET to "/api/user/favorites"
