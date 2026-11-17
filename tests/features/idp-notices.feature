Feature: identity contract, sign-in notices, the email kinds, the outbound proxy setting and the admin's side of the second step

  Background:
    Given the host answers the identity fixture
    And the host answers the idp-notices fixture

  Scenario: sign-in notices: the preferences page reads `preferences.sign_in_notices` from GET /api/user and draws it as a section of the General card, When as four tiles with Site default picked, Sent to as the tick tiles Email, In-app and Push dimmed under the site's choice, and the badge "following the site's default"
    When I open "/user/profile/preferences"
    Then the host was sent GET to "/api/user"
    And the sign-in notices section draws
    And the sign-in notices section sits in the General card
    And the sign-in notices when tiles offer "off, new, all, default"
    And the sign-in notices when tiles read "default"
    And the sign-in notices channel "email" is on
    And the sign-in notices channel "in_app" is on
    And the sign-in notices channel "push" is off
    And the sign-in notices channels are dimmed
    And the sign-in notices section carries the default badge
    And I see "Following the site's default"

  Scenario: sign-in notices: a record that carries no `sign_in_notices` draws no section
    Given the host answers the idp-notices/absent fixture
    When I open "/user/profile/preferences"
    Then no sign-in notices section draws

  Scenario: sign-in notices: a choice over a following record sends `when` and `channels` whole, and never `default`
    When I open "/user/profile/preferences"
    And I pick "all" in the sign-in notices when tiles
    And I press the page's "save-preferences" action
    Then the host was sent PATCH to "/api/user/preferences" carrying "all" at "/sign_in_notices/when"
    And the host was sent PATCH to "/api/user/preferences" carrying "email,in_app" at "/sign_in_notices/channels"
    And the host was sent PATCH to "/api/user/preferences" carrying nothing at "/sign_in_notices/default"
    And the host was sent PATCH to "/api/user/preferences" 1 times

  Scenario: sign-in notices: a choice over a chosen record sends `channels` alone when only they changed, each tile moving by itself
    Given the host answers the idp-notices/chosen fixture
    When I open "/user/profile/preferences"
    Then the sign-in notices when tiles read "all"
    When I turn on the sign-in notices channel "in_app"
    And I turn off the sign-in notices channel "push"
    Then the sign-in notices channel "email" is on
    When I press the page's "save-preferences" action
    Then the host was sent PATCH to "/api/user/preferences" carrying "email,in_app" at "/sign_in_notices/channels"
    And the host was sent PATCH to "/api/user/preferences" carrying nothing at "/sign_in_notices/when"
    And the host was sent PATCH to "/api/user/preferences" carrying nothing at "/sign_in_notices/default"

  Scenario: sign-in notices: a choice over a chosen record sends `when` alone when only it changed
    Given the host answers the idp-notices/chosen fixture
    When I open "/user/profile/preferences"
    And I pick "off" in the sign-in notices when tiles
    And I press the page's "save-preferences" action
    Then the host was sent PATCH to "/api/user/preferences" carrying "off" at "/sign_in_notices/when"
    And the host was sent PATCH to "/api/user/preferences" carrying nothing at "/sign_in_notices/channels"
    And the host was sent PATCH to "/api/user/preferences" carrying nothing at "/sign_in_notices/default"

  Scenario: sign-in notices: Save on an unchanged page sends nothing, draws the saved notice and leaves the person following the site's default
    When I open "/user/profile/preferences"
    And I press the page's "save-preferences" action
    Then the page raised 1 success notice
    And the host was not sent PATCH to "/api/user/preferences"
    And the sign-in notices section carries the default badge

  Scenario: sign-in notices: a person with a choice of their own sees no default badge and returns to the site's default by picking the Site default tile, Save sending `"sign_in_notices": null`
    Given the host answers the idp-notices/chosen fixture
    When I open "/user/profile/preferences"
    Then the sign-in notices when tiles read "all"
    And the sign-in notices channel "push" is on
    And the sign-in notices channel "in_app" is off
    And the sign-in notices section carries no default badge
    When I pick "default" in the sign-in notices when tiles
    Then the sign-in notices channels are dimmed
    And the host was not sent PATCH to "/api/user/preferences"
    When I press the page's "save-preferences" action
    Then the host was sent PATCH to "/api/user/preferences" carrying null at "/sign_in_notices"
    And the host was sent PATCH to "/api/user/preferences" 1 times

  Scenario: sign-in notices: the `422` `enum` at `/sign_in_notices/when` is drawn on the When tiles and the `422` `minItems` at `/sign_in_notices/channels` on the Sent to tiles, each cleared when its value changes
    Given the host refuses the next PATCH to "/api/user/preferences"
    When I open "/user/profile/preferences"
    And I pick "all" in the sign-in notices when tiles
    And I press the page's "save-preferences" action
    Then the host was sent PATCH to "/api/user/preferences" 1 times
    And the host was sent GET to "/api/rules"
    And the sign-in notices when tiles name an error
    And the sign-in notices channels name an error
    And the preferences summary lists 2 problems
    When I follow the preferences summary to its last problem
    Then the sign-in notices channel "email" holds the focus
    When I pick "off" in the sign-in notices when tiles
    Then the sign-in notices when tiles name no error
    When I turn on the sign-in notices channel "push"
    Then the sign-in notices channels name no error

  Scenario: sign-in notices: the `422` `enum` at `/sign_in_notices/channels` is drawn on the Sent to tiles alone
    Given the host answers the idp-notices/refused-channels fixture
    When I open "/user/profile/preferences"
    And I pick "new" in the sign-in notices when tiles
    And I turn on the sign-in notices channel "push"
    And I press the page's "save-preferences" action
    Then the sign-in notices channels name an error
    And the sign-in notices when tiles name no error
    And the preferences summary lists 1 problem

  Scenario: sign-in notices: the `422` `type` at `/sign_in_notices` is listed in the form's summary, the pointer naming no single control
    Given the host answers the idp-notices/refused-type fixture
    When I open "/user/profile/preferences"
    And I pick "all" in the sign-in notices when tiles
    And I press the page's "save-preferences" action
    Then the preferences summary links to no control
    And the sign-in notices when tiles name no error
    And the sign-in notices channels name no error

  Scenario: sign-in notices: the admin user editor shows the same member in the same section and writes it through PATCH /api/admin/users/{id}/preferences
    When I open "/admin/users/43"
    Then the sign-in notices section draws
    And the sign-in notices when tiles read "default"
    And the sign-in notices channel "email" is on
    And the sign-in notices channel "push" is off
    And the sign-in notices section carries the default badge
    When I pick "all" in the sign-in notices when tiles
    And I turn on the sign-in notices channel "push"
    And I press the page's "save-preferences" action
    Then the host was sent PATCH to "/api/admin/users/43/preferences" carrying "all" at "/sign_in_notices/when"
    And the host was sent PATCH to "/api/admin/users/43/preferences" carrying "email,in_app,push" at "/sign_in_notices/channels"
    And the host was sent PATCH to "/api/admin/users/43/preferences" carrying nothing at "/sign_in_notices/default"

  Scenario: sign-in notices: the admin user editor draws a refusal on the control its pointer names
    Given the host refuses the next PATCH to "/api/admin/users/43/preferences"
    When I open "/admin/users/43"
    And I pick "all" in the sign-in notices when tiles
    And I press the page's "save-preferences" action
    Then the sign-in notices when tiles name an error
    And the sign-in notices channels name an error

  Scenario: sign-in notices: the admin user editor returns a person to the site's default with `"sign_in_notices": null`
    Given the host answers the idp-notices/chosen fixture
    When I open "/admin/users/43"
    Then the sign-in notices section carries no default badge
    When I pick "default" in the sign-in notices when tiles
    And I press the page's "save-preferences" action
    Then the host was sent PATCH to "/api/admin/users/43/preferences" carrying null at "/sign_in_notices"

  Scenario: email templates: the four sign-in notice kinds and the sign-in email code draw their own labels and their tokens
    When I open "/admin/email-templates"
    Then the host was sent GET to "/api/admin/email-templates"
    And I see "Sign-in notice"
    And I see "Device approval notice"
    And I see "Sign-in request approval notice"
    And I see "Sign-in notices changed"
    And I see "Sign-in email code"
    And I see "{{sessions_link}}"
    And I see "{{client_name}}"
    And I see "{{expiry_minutes}}"

  Scenario: the configuration editor draws `application.outbound.proxy` from its schema: `mode` as a select, the proxy's fields shown for `manual`, `no_proxy` for `system` too, the password masked and the list of strings a comma list
    Given the host answers the config fixture
    And the browser holds the config fixture's account
    And the host answers the idp-notices/config fixture
    When I open "/admin/config/application"
    Then I see "Proxy for outbound connections"
    And the setting at "/outbound/proxy/mode" offers the choices "none, system, manual"
    And the setting at "/outbound/proxy/host" is not drawn
    And the setting at "/outbound/proxy/no_proxy" is not drawn
    When I choose "system" for the setting at "/outbound/proxy/mode"
    Then the setting at "/outbound/proxy/no_proxy" is drawn
    And the setting at "/outbound/proxy/host" is not drawn
    And the setting at "/outbound/proxy/password" is not drawn
    When I choose "manual" for the setting at "/outbound/proxy/mode"
    Then the setting at "/outbound/proxy/type" offers the choices "http, socks4, socks5"
    And the setting at "/outbound/proxy/host" is drawn
    And the setting at "/outbound/proxy/port" is drawn
    And the setting at "/outbound/proxy/username" is drawn
    And the setting at "/outbound/proxy/password" masks its value
    And the setting at "/outbound/proxy/no_proxy" is a comma list
    When I choose "socks5" for the setting at "/outbound/proxy/type"
    And I type "proxy.example.net" into the setting at "/outbound/proxy/host"
    And I type "1080" into the setting at "/outbound/proxy/port"
    And I type "s3cret" into the setting at "/outbound/proxy/password"
    And I type "localhost,.example.net,10.0.0.0/8" into the setting at "/outbound/proxy/no_proxy"
    And I click "Update Configuration"
    Then the host was sent PUT to "/api/config/application" carrying "manual" at "/application/outbound/proxy/mode"
    And the host was sent PUT to "/api/config/application" carrying "socks5" at "/application/outbound/proxy/type"
    And the host was sent PUT to "/api/config/application" carrying "proxy.example.net" at "/application/outbound/proxy/host"
    And the host was sent PUT to "/api/config/application" carrying "1080" at "/application/outbound/proxy/port"
    And the host was sent PUT to "/api/config/application" carrying "s3cret" at "/application/outbound/proxy/password"
    And the host was sent PUT to "/api/config/application" carrying "localhost,.example.net,10.0.0.0/8" at "/application/outbound/proxy/no_proxy"

  Scenario: the configuration editor shows `no_proxy` while the file holds no `mode` and the schema's default is `system`, the value the select draws
    Given the host answers the config fixture
    And the browser holds the config fixture's account
    And the host answers the idp-notices/config fixture
    And the host answers the idp-notices/config-default fixture
    When I open "/admin/config/application"
    Then I see "Proxy for outbound connections"
    And the setting at "/outbound/proxy/no_proxy" is drawn
    And the setting at "/outbound/proxy/host" is not drawn
    When I choose "none" for the setting at "/outbound/proxy/mode"
    Then the setting at "/outbound/proxy/no_proxy" is not drawn
    When I choose "manual" for the setting at "/outbound/proxy/mode"
    Then the setting at "/outbound/proxy/host" is drawn
    And the setting at "/outbound/proxy/no_proxy" is drawn

  Scenario: the configuration editor draws a site's `security.sign_in_notice` from its schema as a select of `off`, `new` and `all`
    Given the host answers the config fixture
    And the browser holds the config fixture's account
    And the host answers the idp-notices/config fixture
    When I open "/admin/config/sites#startcloud"
    Then the setting at "/security/sign_in_notice" offers the choices "off, new, all"
    When I choose "all" for the setting at "/security/sign_in_notice"
    And I send the open dialog
    And I click "Update Configuration"
    Then the host was sent PUT to "/api/config/sites" carrying "all" at "/sites/sites/startcloud/security/sign_in_notice"

  Scenario: the second step: the admin user view draws the prompt to add an authenticator app or a passkey while the record's `tfa.sms_only` is true
    When I open "/admin/users/43"
    Then the user record notes "tfa-sms-only"
    And I see "Text messages are the only second step on this account. Add an authenticator app or a passkey."

  Scenario: the second step: the admin user view draws no prompt while the record's `tfa.sms_only` is false
    Given the host answers the idp-notices/two-methods fixture
    When I open "/admin/users/43"
    Then the user record notes no "tfa-sms-only"

  Scenario: the second step: removing a person's last method waits behind a warning that it turns their two-factor sign-in off and signs them out everywhere, then sends the DELETE
    When I open "/admin/users/43"
    And I press Remove on the user record method "+1******4242"
    Then the host was not sent DELETE to "/api/admin/users/43/tfa/methods/12"
    And I see "turns their two-factor sign-in off and signs them out everywhere"
    When I confirm the open plain dialog
    Then the host was sent DELETE to "/api/admin/users/43/tfa/methods/12" 1 times

  Scenario: the second step: removing a method that is not the last one sends the DELETE at once
    Given the host answers the idp-notices/two-methods fixture
    When I open "/admin/users/43"
    And I press Remove on the user record method "+1******4242"
    Then the host was sent DELETE to "/api/admin/users/43/tfa/methods/12" 1 times
