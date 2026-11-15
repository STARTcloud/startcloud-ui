Feature: where a sign-in or an onboarding ends, `next` followed wherever it leads

  Background:
    Given the host answers the identity fixture
    And the host answers the idp-next fixture

  Scenario: the email step follows a `next` inside the app to the place a gate parked
    Given the issuer answers POST "/complete-onboarding/email-verification/resend" from the idp-next fixture with "200 resend-30.json"
    And the issuer answers POST "/complete-onboarding/email-verification" from the idp-next fixture with "200 next-activate.json"
    When I open "/complete-onboarding/email-verification"
    And I type "123456" into the code entry "email-code"
    And I submit the code
    Then the path is "/activate?user_code=ABCD-EFGH"

  Scenario: the email step follows a client's absolute URL as a top-level navigation
    Given the issuer answers POST "/complete-onboarding/email-verification/resend" from the idp-next fixture with "200 resend-30.json"
    And the issuer answers POST "/complete-onboarding/email-verification" from the idp-next fixture with "200 next-client.json"
    And the browser answers "https://client.example/**" with an empty page
    When I open "/complete-onboarding/email-verification"
    And I type "123456" into the code entry "email-code"
    And I submit the code
    Then the path is "/cb?code=SplxlOBeZQQYbYS6WxSbIA&state=af0ifjsldkj"

  Scenario: the emailed sign-in link follows `next` to the place a gate parked
    Given the issuer answers POST "/login/magic" from the idp-next fixture with "200 next-activate.json"
    When I open "/login/magic?email=mark%40m4kr.net&token=abc"
    Then the path is "/activate?user_code=ABCD-EFGH"

  Scenario: the emailed sign-in link follows a client's absolute URL as a top-level navigation
    Given the issuer answers POST "/login/magic" from the idp-next fixture with "200 next-client.json"
    And the browser answers "https://client.example/**" with an empty page
    When I open "/login/magic?email=mark%40m4kr.net&token=abc"
    Then the path is "/cb?code=SplxlOBeZQQYbYS6WxSbIA&state=af0ifjsldkj"

  Scenario: the verification link follows `next` into the onboarding chain
    Given the issuer answers POST "/registration/verify" from the idp-next fixture with "200 next-step.json"
    When I open "/registration/verify?email=mark%40m4kr.net&token=abc"
    Then the path is "/complete-onboarding/choose-2fa-method"

  Scenario: the verification link with nothing owed follows a client's absolute URL as a top-level navigation
    Given the issuer answers POST "/registration/verify" from the idp-next fixture with "200 next-client.json"
    And the browser answers "https://client.example/**" with an empty page
    When I open "/registration/verify?email=mark%40m4kr.net&token=abc"
    Then the path is "/cb?code=SplxlOBeZQQYbYS6WxSbIA&state=af0ifjsldkj"

  Scenario: the code step follows a client's absolute URL as a top-level navigation
    Given the issuer answers POST "/authenticator" from the idp-next fixture with "200 next-client.json"
    And the browser answers "https://client.example/**" with an empty page
    When I open "/authenticator"
    Then the host was sent GET to "/api/auth/tfa"
    When I type the code "123456"
    And I submit the code
    Then the path is "/cb?code=SplxlOBeZQQYbYS6WxSbIA&state=af0ifjsldkj"

  Scenario: the code step follows `next` inside the app to the place a gate parked
    Given the issuer answers POST "/authenticator" from the idp-next fixture with "200 next-activate.json"
    When I open "/authenticator"
    Then the host was sent GET to "/api/auth/tfa"
    When I type the code "123456"
    And I submit the code
    Then the path is "/activate?user_code=ABCD-EFGH"

  Scenario: the passkey step follows `next` to the place a gate parked
    Given the host answers the idp-next/passkey fixture
    And the browser's passkey prompt answers an assertion
    And the issuer answers POST "/webauthn/authenticate/options" from the idp-next fixture with "200 webauthn-request-options.json"
    And the issuer answers POST "/login/webauthn" from the idp-next fixture with "200 next-activate.json"
    When I open "/authenticator?tfa_method=PASSKEY"
    Then the host was sent GET to "/api/auth/tfa"
    When I press the primary auth button
    Then the path is "/activate?user_code=ABCD-EFGH"

  Scenario: a released phone step follows the state's own `next` to the place a gate parked
    Given the host answers the idp-second-factor/no-sms fixture
    And the host answers the idp-next/phone-released fixture
    When I open "/complete-onboarding/phone-setup"
    Then the host was sent GET to "/api/auth/onboarding"
    And the path is "/activate?user_code=ABCD-EFGH"

  Scenario: the terms acceptance follows a client's absolute URL as a top-level navigation
    Given the host answers the idp-terms fixture
    And the terms post to "/oauth2/accept-terms" answers next "https://client.example/cb?code=SplxlOBeZQQYbYS6WxSbIA&state=af0ifjsldkj"
    And the browser answers "https://client.example/**" with an empty page
    When I open "/oauth2/accept-terms"
    And I tick the terms field "terms/fields/over_18"
    And I choose the terms option "Gold"
    And I type "Ada Lovelace" into the page field "terms/fields/signature"
    And I submit the terms form
    Then the path is "/cb?code=SplxlOBeZQQYbYS6WxSbIA&state=af0ifjsldkj"

  Scenario: the invitation page follows `next` to the sign-in page while nobody is signed in
    Given the host answers the identity-signed-out fixture
    And the issuer answers POST "/org/invite" from the idp-next fixture with "200 next-login.json"
    When I open "/org/invite/tok123"
    Then the issuer was sent POST to "/org/invite" 1 times
    And the path is "/login"

  Scenario: the invitation page follows `next` to the organizations page with the join made
    Given the issuer answers POST "/org/invite" from the idp-next fixture with "200 next-organizations.json"
    When I open "/org/invite/tok123"
    Then the path is "/user/organizations"

  Scenario: the invitation page follows `next` to the onboarding step the join leaves owed
    Given the issuer answers POST "/org/invite" from the idp-next fixture with "200 next-step.json"
    When I open "/org/invite/tok123"
    Then the path is "/complete-onboarding/choose-2fa-method"

  Scenario: the invitation page follows `next` to the place a gate parked when the join settles the last step
    Given the issuer answers POST "/org/invite" from the idp-next fixture with "200 next-activate.json"
    When I open "/org/invite/tok123"
    Then the path is "/activate?user_code=ABCD-EFGH"

  Scenario: the invitation page follows `next` to an authorize request as a top-level navigation
    Given the browser answers "**/oauth2/authorize**" with an empty page
    And the issuer answers POST "/org/invite" from the idp-next fixture with "200 next-authorize.json"
    When I open "/org/invite/tok123"
    Then the path is "/oauth2/authorize?response_type=code&client_id=web01&state=af0ifjsldkj"

  Scenario: the invitation page follows `next` to the sign-in page with the suspended account's message
    Given the host answers the identity-signed-out fixture
    And the issuer answers POST "/org/invite" from the idp-next fixture with "200 next-suspended.json"
    When I open "/org/invite/tok123"
    Then the path is "/login?error=account_suspended"
    And I see "This account is suspended. Contact support for this site."

  Scenario: the invitation page draws `invite_invalid` with the way to ask for a new invitation
    Given the issuer answers POST "/org/invite" from the idp-next fixture with "403 invite-invalid.json"
    When I open "/org/invite/tok123"
    Then the page draws 1 danger alerts
    And the page links to "/user/organizations"

  Scenario: the invitation page draws `invite_wrong_account` with the way to ask for a new invitation
    Given the issuer answers POST "/org/invite" from the idp-next fixture with "403 invite-wrong-account.json"
    When I open "/org/invite/tok123"
    Then the page draws 1 danger alerts
    And the page links to "/user/organizations"

  Scenario: the invitation page draws `suspended` with the way to ask for a new invitation
    Given the issuer answers POST "/org/invite" from the idp-next fixture with "403 invite-suspended.json"
    When I open "/org/invite/tok123"
    Then the page draws 1 danger alerts
    And the page links to "/user/organizations"
