Feature: keyboard shortcuts

  Scenario: Keyboard shortcuts: / outside an input expands the navbar search and puts the focus in it
    Given the host answers the hosts fixture
    And the host answers the hosts-devices fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/devices"
    Then the devices table lists 8 rows
    And the navbar search is folded
    When I press "/"
    Then the navbar search box holds the focus
    And the navbar search box reads ""

  Scenario: Keyboard shortcuts: ? opens the Keyboard Shortcuts modal with its categories and Escape closes it
    Given the host answers the hosts fixture
    And the host answers the hosts-devices fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/devices"
    Then the devices table lists 8 rows
    When I press "?"
    Then the shortcuts modal is open
    And the shortcuts modal draws the categories "jump, application, navigation, actions, search"
    And the shortcuts modal lists the shortcut "search"
    And the shortcuts modal lists the shortcut "nextHost"
    And the shortcuts modal's filter holds the focus
    When I press "Escape"
    Then no shortcuts modal is open

  Scenario: Keyboard shortcuts: the sidebar foot's keyboard button and the user menu's row open the modal
    Given the host answers the hosts fixture
    And the host answers the hosts-devices fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/devices"
    Then the devices table lists 8 rows
    When I press the sidebar foot's keyboard button
    Then the shortcuts modal is open
    When I press "Escape"
    Then no shortcuts modal is open
    When I open the account menu
    And I press the account menu's keyboard shortcuts row
    Then the shortcuts modal is open

  Scenario: Keyboard shortcuts: g then h goes home
    Given the host answers the hosts fixture
    And the host answers the hosts-devices fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/devices"
    Then the devices table lists 8 rows
    When I press "g"
    And I press "h"
    Then the path is "/"

  Scenario: Keyboard shortcuts: = collapses the sidebar to the rail and expands it again
    Given the host answers the hosts fixture
    And the host answers the hosts-devices fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/devices"
    Then the devices table lists 8 rows
    And the sidebar is expanded
    When I press "="
    Then the sidebar is the rail
    When I press "="
    Then the sidebar is expanded

  Scenario: Keyboard shortcuts: a letter typed in an input fires nothing
    Given the host answers the hosts fixture
    And the host answers the hosts-devices fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/devices"
    Then the devices table lists 8 rows
    When I press "/"
    Then the navbar search box holds the focus
    When I press "g"
    And I press "h"
    And I press "?"
    Then the path is "/hosts/3/devices"
    And no shortcuts modal is open
    And the navbar search box reads "gh?"

  Scenario: Keyboard shortcuts: Shift+Z then Shift+Z logs out
    Given the host answers the hosts fixture
    And the host answers the hosts-devices fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/devices"
    Then the devices table lists 8 rows
    When I press "Shift+Z"
    And I press "Shift+Z"
    Then the path begins with "/login"
