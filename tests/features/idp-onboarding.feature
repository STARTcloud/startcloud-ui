Feature: identity provider onboarding and device code

  Background:
    Given the host answers the identity fixture
    And the host answers the idp-onboarding fixture

  Scenario: onboarding: a step draws Cancel, which posts /auth-cancel, drops the cached profile, follows `next` and draws nobody as signed in
    Given the issuer answers the cancel with next "/"
    When I open "/complete-onboarding/name"
    Then the host was sent GET to "/api/auth/onboarding"
    When I click "Cancel"
    Then the path is "/login?returnTo=%2F"
    And the browser no longer holds "account"

  Scenario: onboarding: the cancel keeps the remembered return path, which the sign-in page it lands on carries
    Given the issuer answers the cancel with next "/"
    And the browser holds "intended_url" as "/activate?user_code=ABCD-EFGH"
    When I open "/complete-onboarding/name"
    Then the host was sent GET to "/api/auth/onboarding"
    When I click "Cancel"
    Then the path is "/login?returnTo=%2Factivate%3Fuser_code%3DABCD-EFGH"
    And the browser no longer holds "account"

  Scenario: onboarding: the cancel's `next` is followed as a top-level navigation when it is a client's redirect URI
    Given the issuer answers the cancel with next "https://client.example/cb?error=access_denied&state=abc"
    And the browser answers "https://client.example/**" with an empty page
    When I open "/complete-onboarding/name"
    Then the host was sent GET to "/api/auth/onboarding"
    When I click "Cancel"
    Then the path is "/cb?error=access_denied&state=abc"

  Scenario: onboarding: the two-factor choice draws Cancel, and the app enrollment draws it beside Choose a different method
    When I open "/complete-onboarding/choose-2fa-method"
    Then I see "Cancel"
    When I open "/qrcode"
    Then I see "Choose a different method"
    And I see "Cancel"

  Scenario: onboarding: the two-factor choice offers no Passkey while `passkey` is no sub flag of `tfa`
    Given the host answers the idp-onboarding/no-passkey fixture
    When I open "/complete-onboarding/choose-2fa-method"
    Then the page offers 2 options

  Scenario: onboarding: the two-factor choice offers Passkey beside the app and the phone while `passkey` is a sub flag of `tfa`, and Continue waits for its name
    When I open "/complete-onboarding/choose-2fa-method"
    Then the page offers 3 options
    And the button "Continue" is enabled
    When I choose the option "Passkey"
    Then the button "Continue" is disabled
    When I name the passkey "Laptop"
    Then the button "Continue" is enabled

  Scenario: onboarding: a named passkey is registered, /complete-onboarding/passkey is posted and `next` is followed
    Given the browser's passkey prompt answers a credential
    And the issuer answers POST "/webauthn/register/options" with 200 from "webauthn-options.json"
    And the issuer answers POST "/webauthn/register" with 200 from "webauthn-registered.json"
    And the issuer answers POST "/complete-onboarding/passkey" with 200 from "passkey-next.json"
    When I open "/complete-onboarding/choose-2fa-method"
    And I choose the option "Passkey"
    And I name the passkey "Laptop"
    And I click "Continue"
    Then the path is "/complete-onboarding/backup-codes"

  Scenario: onboarding: a `409` `no_passkey` draws its own message and keeps the choice
    Given the browser's passkey prompt answers a credential
    And the issuer answers POST "/webauthn/register/options" with 200 from "webauthn-options.json"
    And the issuer answers POST "/webauthn/register" with 200 from "webauthn-registered.json"
    And the issuer answers POST "/complete-onboarding/passkey" with 409 from "no-passkey-409.json"
    When I open "/complete-onboarding/choose-2fa-method"
    And I choose the option "Passkey"
    And I name the passkey "Laptop"
    And I click "Continue"
    Then I see "No passkey was saved. Try again or choose another method."
    And the page offers 3 options

  Scenario: onboarding: a step draws the waiting device login's time left while the remembered return path is /activate with a user_code
    Given the browser holds "intended_url" as "/activate?user_code=ABCD-EFGH"
    When I open "/complete-onboarding/name"
    Then the host was sent GET to "/api/auth/device"
    And I see "Web 01 SSH is waiting for you to approve this code."
    And I see "Expires in"

  Scenario: onboarding: a step reads no device code while no return path is remembered
    When I open "/complete-onboarding/name"
    Then the host was sent GET to "/api/auth/onboarding"
    And I do not see "Expires in"

  Scenario: onboarding: the phone step's heading follows `phone.purpose`
    Given the host answers the idp-onboarding/phone-tfa fixture
    When I open "/complete-onboarding/phone-setup"
    Then I see "Add a phone for two-factor sign-in"

  Scenario: device code: /activate reads GET /api/auth/device on load for a prefilled code and draws the client and the time left
    When I open "/activate?user_code=ABCD-EFGH"
    Then the host was sent GET to "/api/auth/device"
    And I see "Web 01 SSH is waiting for you to approve this code."
    And I see "Expires in"
    And the button "Continue" is enabled

  Scenario: device code: /activate reads a typed code when the field loses focus
    When I open "/activate"
    And I fill "Device code" with "ABCD-EFGH"
    And I press "Tab"
    Then the host was sent GET to "/api/auth/device"
    And I see "Web 01 SSH is waiting for you to approve this code."

  Scenario: device code: a `404` draws that the code has expired and disables Continue
    When I open "/activate?user_code=GONE-CODE"
    Then I see "This code has expired. Start the device login again."
    And the button "Continue" is disabled

  Scenario: device code: a code with no time left draws that it has expired and disables Continue
    When I open "/activate?user_code=DONE-CODE"
    Then I see "This code has expired. Start the device login again."
    And the button "Continue" is disabled

  Scenario: device code: a typed code that differs from the one read clears the expired state
    When I open "/activate?user_code=GONE-CODE"
    Then the button "Continue" is disabled
    When I fill "Device code" with "ABCD"
    Then the button "Continue" is enabled
    And I do not see "This code has expired. Start the device login again."
