Feature: identity contract, email templates

  Background:
    Given the host answers the identity fixture
    And the host answers the idp-email-templates fixture

  Scenario: admin, email templates: every kind the host answers draws its own label
    When I open "/admin/email-templates"
    Then the host was sent GET to "/api/admin/email-templates"
    And the host was sent GET to "/api/admin/email-templates/arguments"
    And I see "Account suspended"
    And I see "Organization membership suspended"
    And I see "SMTP test message"

  Scenario: admin, email templates: the card and the chips draw `{{name}}` tokens, a chip inserts its token at the caret, and the preview replaces a token the kind offers and leaves every other text as typed
    When I open "/admin/email-templates"
    Then I see "{{expiry_minutes}}"
    And I see "{{organization_name}}"
    When I press the page's "email-template-copy-edit" action
    Then the "email-template-copy" dialog is open
    And the field "email-template-copy/body" reads "<p>Hello {{name}}, {{nmae}} {0}</p>"
    And the email template preview draws "<p>Hello name, {{nmae}} {0}</p>"
    When I type "" into the field "email-template-copy/body"
    And I press the open dialog's "email-template-token" action
    Then the field "email-template-copy/body" reads "{{name}}"
    And the email template preview draws "name"

  Scenario: admin, email templates: a `422` `token` on save is drawn on the Subject and Body fields naming each token, every entry of one pointer included
    Given the host refuses the next PATCH to "/api/admin/email-templates/magic_login"
    When I open "/admin/email-templates"
    And I press the page's "email-template-copy-edit" action
    And I send the open dialog
    Then the host was sent PATCH to "/api/admin/email-templates/magic_login"
    And the email template field "email-template-copy/subject" names the error "{{nmae}} is not one of them."
    And the email template field "email-template-copy/body" names the error "{{frist}} is not one of them."
    And the email template field "email-template-copy/body" names the error "{{lnik}} is not one of them."
    And the error summary lists "{{nmae}} is not one of them."
    And the "email-template-copy" dialog is open

  Scenario: admin, email templates: a `422` `token` on publish closes the version dialog and is drawn on the Body field of the form beneath
    Given the host refuses the next POST to "/api/admin/email-templates/magic_login/publish"
    When I open "/admin/email-templates"
    And I press the page's "email-template-copy-edit" action
    And I press the open dialog's "email-template-copy-publish" action
    Then the "email-template-publish" dialog is open
    When I type "2.0" into the field "email-template-publish/version"
    And I send the open dialog
    Then the "email-template-publish" dialog is closed
    And the email template field "email-template-copy/body" names the error "{{lnik}} is not one of them."

  Scenario: admin, email templates: the `409` `unique` of a simultaneous publish is drawn on the field its pointer names
    When I open "/admin/email-templates"
    And I press the page's "email-template-copy-edit" action
    And I press the open dialog's "email-template-copy-publish" action
    And I type "1.0" into the field "email-template-publish/version"
    And I send the open dialog
    Then the host was sent POST to "/api/admin/email-templates/magic_login/publish" carrying "version" as "1.0"
    And the email template field "email-template-publish/version" is marked wrong
    And the "email-template-publish" dialog is open

  Scenario: admin, email templates: a `404` on the save of a copy says the copy was removed by someone else and reloads the list
    When I open "/admin/email-templates"
    And I press the page's "email-template-copy-edit" action
    And I send the open dialog
    Then I see "This copy was removed by someone else."
    And no dialog is open
    And the host was sent GET to "/api/admin/email-templates" at least 2 times

  Scenario: admin, email templates: a `404` on the delete of a copy says the copy was removed by someone else and reloads the list
    When I open "/admin/email-templates"
    And I press the page's "email-template-copy-delete" action
    And I confirm the open dialog
    Then the host was sent DELETE to "/api/admin/email-templates/magic_login"
    And I see "This copy was removed by someone else."
    And the host was sent GET to "/api/admin/email-templates" at least 2 times

  Scenario: admin, email templates: a `404` on the publish of a copy says the copy was removed by someone else and reloads the list
    Given the host answers the idp-email-templates/gone fixture
    When I open "/admin/email-templates"
    And I press the page's "email-template-copy-edit" action
    And I press the open dialog's "email-template-copy-publish" action
    Then the "email-template-publish" dialog is open
    When I type "2.0" into the field "email-template-publish/version"
    And I send the open dialog
    Then the host was sent POST to "/api/admin/email-templates/magic_login/publish" carrying "version" as "2.0"
    And I see "This copy was removed by someone else."
    And no dialog is open
    And the host was sent GET to "/api/admin/email-templates" at least 2 times

  Scenario: admin, email templates: `not_found` in a bulk answer draws in the result line by its own label
    When I open "/admin/email-templates"
    And I pick the email template card of "magic_login"
    And I press the page's "email-template-bulk-delete" action
    And I confirm the open dialog
    Then the host was sent POST to "/api/admin/email-templates/bulk" carrying "action" as "delete"
    And the email template bulk result reads "no longer exists (1)"
