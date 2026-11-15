Feature: the second factor everywhere: sub flags of `tfa`, the code step's other methods and the emailed code

  Background:
    Given the host answers the identity fixture
    And the host answers the idp-second-factor fixture

  Scenario: sub flags: the two-factor choice of onboarding draws no SMS and no Passkey while neither is a sub flag of `tfa`
    Given the host answers the idp-second-factor/no-sms fixture
    When I open "/complete-onboarding/choose-2fa-method"
    Then the host was sent GET to "/api/auth/onboarding"
    And the page offers 1 options

  Scenario: sub flags: the phone step of onboarding draws no form while `sms` is not listed and follows the state's own `next`
    Given the host answers the idp-second-factor/no-sms fixture
    When I open "/complete-onboarding/phone-setup"
    Then the path is "/complete-onboarding/choose-2fa-method"

  Scenario: sub flags: the phone step whose state names itself as `next` while `sms` is not listed draws the sms_unavailable problem, no form and Cancel
    Given the host answers the idp-second-factor/phone-stuck fixture
    When I open "/complete-onboarding/phone-setup"
    Then I see "Text messages are not available on this site. Choose another method."
    And the path is "/complete-onboarding/phone-setup"
    And the page draws 0 forms
    And I see "Cancel"

  Scenario: sms_unavailable: the two-factor choice of onboarding draws the refusal's own message in the frame's alert
    Given the issuer answers the form post "/complete-onboarding/choose-2fa-method" with 409 from "profile-refused/sms-unavailable.json"
    When I open "/complete-onboarding/choose-2fa-method"
    And I choose the option valued "SMS"
    And I click "Continue"
    Then I see "Text messages are not available on this site. Choose another method."
    And the page offers 3 options

  Scenario: sms_unavailable: the profile's Add phone number draws the refusal's own message as its notice
    Given the host answers the idp-second-factor/profile-refused fixture
    When I open "/user/profile/security"
    And I press the control marked "tfa-add-phone"
    And I fill the field with the id "profile-tfa-phone" with "2025550123"
    And I press the control marked "tfa-phone-send"
    Then the host was sent POST to "/api/user/tfa/sms/send"
    And I see "Text messages are not available on this site."

  Scenario: the phone step: the requirement line follows `phone.purpose`
    When I open "/complete-onboarding/phone-setup"
    Then I see "STARTcloud texts your sign-in codes to this number."

  Scenario: sub flags: the profile's Two-factor section draws the phone row and Add phone number while `sms` is listed
    When I open "/user/profile/security"
    Then the host was sent GET to "/api/user/tfa/methods"
    And the page draws 1 controls marked "tfa-add-phone"
    And the Two-factor section lists 1 method rows

  Scenario: sub flags: the profile's Two-factor section draws no phone row and no Add phone number while `sms` is not listed
    Given the host answers the idp-second-factor/no-sms fixture
    When I open "/user/profile/security"
    Then the host was sent GET to "/api/user/tfa/methods"
    And the page draws 0 controls marked "tfa-add-phone"
    And the Two-factor section lists 0 method rows

  Scenario: sub flags: the profile's Passkeys section draws Add while `passkey` is listed
    When I open "/user/profile/security"
    Then the host was sent GET to "/api/user/tfa/methods"
    And the page holds 1 elements with the id "profile-passkey-name"

  Scenario: sub flags: the profile's Passkeys section draws no Add while `passkey` is not listed
    Given the host answers the idp-second-factor/no-sms fixture
    When I open "/user/profile/security"
    Then the host was sent GET to "/api/user/tfa/methods"
    And the page draws 0 controls marked "tfa-add-phone"
    And the page holds 0 elements with the id "profile-passkey-name"

  Scenario: onboarding: the passkey's name field is drawn under its card and outside the card's label
    Given the host answers the idp-onboarding fixture
    When I open "/complete-onboarding/choose-2fa-method"
    And I choose the option "Passkey"
    Then the field "onboarding-passkey-name" sits outside every option card

  Scenario: the profile: while `tfa.sms_only` is true the Two-factor section asks for an authenticator app or a passkey
    When I open "/user/profile/security"
    Then I see "Text messages are the only second step on this account. Add an authenticator app or a passkey."

  Scenario: sub flags: the code step's choice draws no phone while `sms` is not listed
    Given the host answers the idp-second-factor/no-sms fixture
    When I open "/authenticator-method"
    Then the host was sent GET to "/api/auth/tfa/methods"
    And the page offers 2 options

  Scenario: the code step: the choice draws each phone, each app and a backup code from the methods answer, each only while its member allows it
    When I open "/authenticator-method"
    Then the page offers 3 options
    And I do not see "Email me a code"

  Scenario: the code step: it always offers another method, whatever the state says of changing it
    When I open "/authenticator"
    Then the host was sent GET to "/api/auth/tfa"
    And the page links to "/authenticator-method"

  Scenario: sms_unavailable: `?error=sms_unavailable` draws its own message on the choice page and on the code page
    When I open "/authenticator-method?error=sms_unavailable"
    Then I see "Text messages are not available on this site. Choose another method."
    When I open "/authenticator?error=sms_unavailable"
    Then I see "Text messages are not available on this site. Choose another method."

  Scenario: sms_unavailable: `?error=sms_unavailable` draws its own message on the sign-in page
    Given the host answers the identity-signed-out fixture
    When I open "/login?error=sms_unavailable"
    Then I see "Text messages are not available on this site. Choose another method."

  Scenario: sms_unavailable: a refused send hands the five members to the choice, which offers those methods with no second request
    Given the host answers the idp-second-factor/sms-unavailable fixture
    When I open "/authenticator?tfa_method=SMS"
    Then the host was sent POST to "/api/auth/tfa/send"
    And the path is "/authenticator-method"
    And I see "Text messages are not available on this site. Choose another method."
    And the page offers 3 options
    And I see "Email me a code"
    And the host was sent GET to "/api/auth/tfa/methods" 0 times

  Scenario: sms_unavailable: a reload of the choice, the handed methods gone, reads GET /api/auth/tfa/methods
    Given the host answers the idp-second-factor/sms-unavailable fixture
    When I open "/authenticator?tfa_method=SMS"
    Then the path is "/authenticator-method"
    And the page offers 3 options
    And the host was sent GET to "/api/auth/tfa/methods" 0 times
    When I load the page again
    Then the host was sent GET to "/api/auth/tfa/methods" 1 times
    And the page offers 3 options
    And I do not see "Email me a code"

  Scenario: send_failed: a text that cannot be sent hands the five members to the choice, which offers those methods with no second request
    Given the host answers the idp-second-factor/send-failed fixture
    When I open "/authenticator?tfa_method=SMS"
    Then the host was sent POST to "/api/auth/tfa/send"
    And the path is "/authenticator-method"
    And the page offers 2 options
    And the host was sent GET to "/api/auth/tfa/methods" 0 times

  Scenario: sms_unavailable: a refused code at `POST /authenticator` hands the five members to the choice
    Given the issuer answers the form post "/authenticator" with 409 from "sms-unavailable/sms-unavailable.json"
    When I open "/authenticator"
    And I type the code "123456"
    And I submit the code
    Then the path is "/authenticator-method"
    And the page offers 3 options
    And the host was sent GET to "/api/auth/tfa/methods" 0 times

  Scenario: send_failed: a refused resend at `POST /resend-tfa` hands the five members to the choice
    Given the issuer answers the form post "/resend-tfa" with 503 from "send-failed/send-failed.json"
    When I open "/authenticator"
    And I press the resend button
    Then the path is "/authenticator-method"
    And the page offers 2 options
    And the host was sent GET to "/api/auth/tfa/methods" 0 times

  Scenario: send_failed: a refusal that carries no members keeps the code page, its message and the way to another method
    Given the host answers the idp-second-factor/email-failed fixture
    When I open "/authenticator?tfa_method=EMAIL"
    Then the host was sent POST to "/api/auth/tfa/email/send"
    And the path is "/authenticator?tfa_method=EMAIL"
    And the page links to "/authenticator-method"
    And the host was sent GET to "/api/auth/tfa/methods" 0 times

  Scenario: sms_unavailable: a refused choice redraws the cards from the five members it carried
    Given the issuer answers the form post "/authenticator-method" with 409 from "sms-unavailable/sms-unavailable.json"
    When I open "/authenticator-method"
    Then the page offers 3 options
    When I click "Continue"
    Then I see "Text messages are not available on this site. Choose another method."
    And I see "Email me a code"
    And the page offers 3 options
    And the host was sent GET to "/api/auth/tfa/methods" 1 times

  Scenario: the emailed code: choosing it posts /api/auth/tfa/email/send, the code page shows the masked address, counts the resend wait and verifies at /api/auth/tfa/email/verify
    Given the host answers the idp-second-factor/email fixture
    When I open "/authenticator-method"
    And I choose the option "Email me a code"
    And I click "Continue"
    Then the path is "/authenticator?tfa_method=EMAIL"
    And the host was sent POST to "/api/auth/tfa/email/send"
    And I see "a***@example.com"
    And the code entry "tfa-code" draws 6 boxes
    And the resend button is disabled
    When I type the code "123456"
    And I submit the code
    Then the host was sent POST to "/api/auth/tfa/email/verify" carrying "code" as "123456"

  Scenario: the emailed code: a `429` `email_code_send` draws its own message, keeps the code entry and counts the resend wait from `wait_seconds`
    Given the host answers the idp-second-factor/email-wait fixture
    When I open "/authenticator?tfa_method=EMAIL"
    Then I see "A code was emailed a moment ago. Wait before asking for another."
    And the code entry "tfa-code" draws 6 boxes
    And the resend button is disabled

  Scenario: the emailed code: `email_code_unavailable` draws its own message and the way to another method
    Given the host answers the idp-second-factor/email-unavailable fixture
    When I open "/authenticator?tfa_method=EMAIL"
    Then I see "An emailed code is not available for this sign-in. Choose another method."
    And the page links to "/authenticator-method"

  Scenario: the emailed code: a `409` `locked` from the send route moves to the choice
    Given the host answers the idp-second-factor/email-send-locked fixture
    When I open "/authenticator?tfa_method=EMAIL"
    Then the host was sent POST to "/api/auth/tfa/email/send"
    And the path is "/authenticator-method"
    And the host was sent GET to "/api/auth/tfa/methods"

  Scenario: the emailed code: a state the server resolved to EMAIL is sent through the email route and draws the masked address, the code entry and Resend
    Given the host answers the idp-second-factor/resolved-email fixture
    When I open "/authenticator"
    Then the host was sent GET to "/api/auth/tfa"
    And the host was sent POST to "/api/auth/tfa/email/send"
    And I see "a***@example.com"
    And the code entry "tfa-code" draws 6 boxes
    And the resend button is disabled
    And the host was sent POST to "/api/auth/tfa/send" 0 times

  Scenario: the emailed code: `EMAIL` in `locked` draws as a locked method
    Given the host answers the idp-second-factor/email-locked fixture
    When I open "/authenticator-method"
    Then the option "Email me a code" is disabled
    And the page offers 2 options

  Scenario: the countdown's colour: a guessing gate's countdown is the danger alert's colour
    Given the host answers the idp-second-factor/throttled fixture
    When I open "/authenticator"
    Then every alert countdown takes the colour of its alert

  Scenario: the countdown's colour: a waiting device login's countdown is the info notice's colour
    Given the host answers the idp-onboarding fixture
    And the browser holds "intended_url" as "/activate?user_code=ABCD-EFGH"
    When I open "/complete-onboarding/name"
    Then I see "Expires in"
    And every alert countdown takes the colour of its alert
