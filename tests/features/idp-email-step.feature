Feature: the email step's one send route

  Background:
    Given the host answers the identity fixture
    And the host answers the idp-email-step fixture

  Scenario: the email step posts the send route once as it is drawn, draws the code entry under the address and Resend counting down, and no notice that a code was sent again
    Given the issuer answers POST "/complete-onboarding/email-verification/resend" from the idp-email-step fixture with "200 resend-30.json"
    When I open "/complete-onboarding/email-verification"
    Then the host was sent GET to "/api/auth/onboarding"
    And the code entry "email-code" draws 6 boxes
    And I see "mark@m4kr.net"
    And the resend button is disabled
    And the page draws 0 success notices
    And the issuer was sent POST to "/complete-onboarding/email-verification/resend" 1 times

  Scenario: Resend counts down from the answer's own `resend_after_seconds`, zero leaving it live at once
    Given the issuer answers POST "/complete-onboarding/email-verification/resend" from the idp-email-step fixture with "200 resend-0.json"
    When I open "/complete-onboarding/email-verification"
    Then the code entry "email-code" draws 6 boxes
    And the resend button is enabled

  Scenario: a press of Resend posts the send route again and draws the notice that a code was sent again
    Given the issuer answers POST "/complete-onboarding/email-verification/resend" from the idp-email-step fixture with "200 resend-0.json, 200 resend-30.json"
    When I open "/complete-onboarding/email-verification"
    Then the code entry "email-code" draws 6 boxes
    When I press the resend button
    Then the issuer was sent POST to "/complete-onboarding/email-verification/resend" 2 times
    And the page draws 1 success notices
    And the resend button is disabled

  Scenario: a `503` `send_failed` as the page is drawn draws its own message, withdraws the code entry and leaves Resend live, a press that answers `200` drawing the entry
    Given the issuer answers POST "/complete-onboarding/email-verification/resend" from the idp-email-step fixture with "503 send-failed.json, 200 resend-30.json"
    When I open "/complete-onboarding/email-verification"
    Then the host was sent GET to "/api/auth/onboarding"
    And the page draws 1 danger alerts
    And the page draws no code entry "email-code"
    And the resend button is enabled
    When I press the resend button
    Then the code entry "email-code" draws 6 boxes
    And the page draws 0 danger alerts
    And the page draws 1 success notices
    And the resend button is disabled

  Scenario: a send that fails after a mailed code withdraws the code entry until a send answers `200`
    Given the issuer answers POST "/complete-onboarding/email-verification/resend" from the idp-email-step fixture with "200 resend-0.json, 503 send-failed.json, 200 resend-0.json"
    When I open "/complete-onboarding/email-verification"
    Then the code entry "email-code" draws 6 boxes
    When I press the resend button
    Then the page draws 1 danger alerts
    And the page draws no code entry "email-code"
    And the page draws 0 success notices
    And the resend button is enabled
    When I press the resend button
    Then the code entry "email-code" draws 6 boxes
    And the page draws 1 success notices

  Scenario: a `401` `session_expired` from the send route sends the visitor to sign in
    Given the host answers the identity-signed-out fixture
    And the issuer answers POST "/complete-onboarding/email-verification/resend" from the idp-email-step fixture with "401 session-expired.json"
    When I open "/complete-onboarding/email-verification"
    Then the path is "/login?error=session_expired"
