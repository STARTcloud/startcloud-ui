Feature: validation contract

  Background:
    Given the host answers the validation fixture
    And the browser holds the validation fixture's account

  Scenario: every form draws FieldError and FormErrorSummary, validates on blur and on submit, never on keystroke, never in a card
    Given the host refuses the next PUT to "/api/config/app"
    When I open "/admin/config/app"
    Then I see "Application"
    When I fill "HTTPS port" with "70000"
    Then I do not see "Enter HTTPS port of at most 65535."
    When I press "Tab"
    Then I see "Enter HTTPS port of at most 65535."
    When I fill "HTTPS port" with "443"
    Then I do not see "Enter HTTPS port of at most 65535."
    When I click "Update Configuration"
    Then the error summary lists "Enter HTTPS port of at most 65535."
    And the error summary lists "Enter a directory that boxvault can write to for log_directory."
    And the control "HTTPS port" is described by the error "Enter HTTPS port of at most 65535."
    And the host was sent PUT to "/api/config/app"
    And I do not see "The request did not pass validation."

  Scenario: aria-invalid only after blur or submit, aria-describedby and aria-errormessage wired, the summary role="alert" and focused
    When I open "/admin/config/app"
    Then the control "HTTPS port" has no "aria-invalid"
    When I fill "HTTPS port" with "70000"
    Then the control "HTTPS port" has no "aria-invalid"
    When I press "Tab"
    Then the control "HTTPS port" carries "aria-invalid" as "true"
    And the control "HTTPS port" is described by the error "Enter HTTPS port of at most 65535."
    When I click "Update Configuration"
    Then the error summary is focused
    And the error summary lists "Enter HTTPS port of at most 65535."
    And the host was not sent PUT to "/api/config/app"
