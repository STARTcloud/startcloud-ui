Feature: footer pane

  Scenario: Footer pane: the tasks table's headers carry the resize handle, a drag setting the column's width
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1"
    And I press the footer's "tasks" toggle
    Then the tasks pane lists 3 tasks
    When I drag the tasks header "operation" 60 wider
    Then the tasks header "operation" is sized

  Scenario: Footer pane: the tasks table folds the columns the pane has no room for and never scrolls sideways
    Given the host answers the hosts fixture
    And the window is 700 wide
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    And the browser holds "tasks_columns" as "[\"id\",\"operation\",\"machine_name\",\"status\",\"progress\",\"priority\",\"created_by\",\"created_at\",\"started_at\",\"completed_at\",\"error_message\"]"
    When I open "/hosts/1"
    And I press the footer's "tasks" toggle
    Then the tasks pane lists 3 tasks
    And the tasks pane folds the columns it has no room for
    And the tasks pane does not scroll sideways

  Scenario: Footer pane: the tasks table with room for its columns folds none and does not scroll sideways
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1"
    And I press the footer's "tasks" toggle
    Then the tasks pane lists 3 tasks
    And the tasks pane does not scroll sideways
