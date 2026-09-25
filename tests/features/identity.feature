Feature: identity contract

  Background:
    Given the host answers the identity fixture

  Scenario: the interstitials: the consent page reads GET /api/auth/consent and the NativeForm post carries the `_csrf` field to /oauth2/authorize
    Given the browser holds the cookie "XSRF-TOKEN" as "consent-csrf-token"
    When I open "/oauth2/consent?client_id=conductor&scope=openid%20organizations&state=abc"
    Then the host was sent GET to "/api/auth/consent"
    And the page title is "Authorization Request"
    And I see "Conductor is requesting access to your account."
    And I see "This application will be able to:"
    And I see "Authenticate your identity"
    And I see "See your organization memberships and roles"
    And I see "Already allowed:"
    And I see "Manage permissions"
    And I see "Access your email address"
    And I see "This application also requests specific access:"
    And I see "Access an ID Vault"
    And I see "Locations: https://vault.example"
    And I see "You are logged in as mark@m4kr.net."
    And the form posting to "/oauth2/authorize" carries "_csrf" as "consent-csrf-token"
    And the form posting to "/oauth2/authorize" carries "client_id" as "conductor"
    And the form posting to "/oauth2/authorize" carries "state" as "…"

  Scenario: the interstitials: the device activation page posts the NativeForm's `_csrf` field to /oauth2/device_verification
    Given the browser holds the cookie "XSRF-TOKEN" as "device-csrf-token"
    When I open "/activate?user_code=ABCD-EFGH"
    Then I see "Connect a device"
    And I see "Enter the code shown on your device to continue."
    And the field "Device code" holds "ABCD-EFGH"
    And the form posting to "/oauth2/device_verification" carries "_csrf" as "device-csrf-token"
    And I see "Continue"

  Scenario: the interstitials: the device activation page paints `?error=invalid_user_code` on the field
    When I open "/activate?error=invalid_user_code"
    Then I see "That code did not match; enter the code shown on your device."

  Scenario: the interstitials: the activated page
    When I open "/activated"
    Then I see "Device connected"
    And I see "You can close this window and return to your device."

  Scenario: the interstitials: the CIBA page reads GET /api/auth/ciba with the token from the URL, then replaces the location
    When I open "/ciba/approve?token=ciba-token"
    Then the host was sent GET to "/api/auth/ciba"
    And the path is "/ciba/approve"
    And I see "Sign-in request"
    And I see "Conductor is asking to sign you in on another device."
    And I see "Make sure this matches the code on your other device: WDJB-MJHT"
    And I see "Approve"
    And I see "Deny"

  Scenario: the interstitials: the logout confirmation reads GET /api/auth/logout/confirm
    When I open "/connect/logout/confirm"
    Then the host was sent GET to "/api/auth/logout/confirm"
    And I see "Sign out?"
    And I see "You are about to sign out of Conductor and of every app that uses this sign-in."
    And I see "This will end your session. You'll need to sign in again to access protected resources."
    And I see "Yes, sign me out"
    And I see "Cancel"

  Scenario: the interstitials: the front-channel logout page reads GET /api/auth/logout/frontchannel and draws one sandboxed frame per relying party
    Given the browser leaves "https://app.example/**" unanswered
    When I open "/connect/logout/frontchannel"
    Then the host was sent GET to "/api/auth/logout/frontchannel"
    And I see "Signing out"
    And I see "We are letting your connected applications know you signed out."
    And the page holds 1 sandboxed frame
    And I see "Continue"
    And I see "Stay on this page"

  Scenario: the interstitials: the account linking page reads GET /api/auth/link
    When I open "/link-account-consent"
    Then the host was sent GET to "/api/auth/link"
    And I see "Link Your Account"
    And I see "An account with email mark@m4kr.net already exists."
    And I see "Confirm your existing password"
    And I see "Link GitHub Account"
    And I see "Cancel"

  Scenario: the interstitials: the authorization-code page draws the code from the URL with a copy button
    When I open "/oauth2/code?code=SplxlOBeZQQYbYS6WxSbIA"
    Then I see "Authorization Code"
    And I see "Copy this code and paste it into the application that requested access."
    And I see "SplxlOBeZQQYbYS6WxSbIA"
    And I see "Copy code"

  Scenario: the interstitials: the desktop hand-off page draws the swb:// button from the URL
    When I open "/continue?token=desktop-token&email=mark@m4kr.net"
    Then I see "Continue in the Setup Guide"
    And the link "Open Setup Guide" opens "swb://auth/login?email=mark%40m4kr.net&token=desktop-token"
    And I see "Paste the token into the Setup Guide when it asks for it."

  Scenario: admin, health and errors: `/error` stamps the three attributes and the page draws them
    Given the served page carries "data-error-status" as "500"
    And the served page carries "data-error-reference" as "0123456789abcdef"
    And the served page carries "data-error-path" as "/api/admin/stats"
    When I open "/error"
    Then the document carries "data-error-status" as "500"
    And the document carries "data-error-reference" as "0123456789abcdef"
    And the document carries "data-error-path" as "/api/admin/stats"
    And I see "Something went wrong"
    And I see "Something went wrong on our end. The details are recorded."
    And I see "Reference"
    And I see "0123456789abcdef"
    And I see "/api/admin/stats"
    And I see "Go home"
    And I see "Copy error details"
    And the link "Report this issue" points at a URL carrying "type=Backend"
    And the link "Report this issue" points at a URL carrying "context=0123456789abcdef"

  Scenario: admin, health and errors: after a `303` the page reads status, reference and path from the URL
    When I open "/error?status=403&reference=fedcba9876543210&path=/admin/users"
    Then I see "You don't have access to this page"
    And I see "Your account does not have permission to view it."
    And I see "fedcba9876543210"
    And I see "/admin/users"

  Scenario: admin, health and errors: the reference matches `^[0-9a-f]{16}$`, else the page draws the generic 500
    When I open "/error?status=403&reference=not-a-reference&path=/admin/users"
    Then I see "Something went wrong"
    And I do not see "Reference"
    And I do not see "not-a-reference"
    And I do not see "/admin/users"

  Scenario: admin, health and errors: a path the router does not know draws the ErrorPage with `404` client-side
    When I open "/no-such-page"
    Then I see "Page not found"
    And the page title is "Page not found"
    And I see "There is no page at this address. Check the link or go home."
    And I see "/no-such-page"
