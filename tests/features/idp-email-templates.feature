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

  Scenario: admin, email templates: the cards are grouped by family under three headings, mail, notifications and text messages, the kinds in the server's order, and an account event kind carries its note
    When I open "/admin/email-templates"
    Then the email template family "email" is headed "Mail"
    And the email template family "email" lists "magic_login, account_suspended, org_membership_suspended, smtp_test, account_event_email_changed"
    And the email template family "notification" is headed "Notifications"
    And the email template family "notification" lists "notify_org_join_requested, notify_tfa_enabled"
    And the email template family "sms" is headed "Text messages"
    And the email template family "sms" lists "sms_ciba_approval"
    And I see "are placed inside the"

  Scenario: admin, email templates: the editor of an sms kind draws no subject field, previews the filled text with no frame, and its save carries no `subject`
    Given the host answers the idp-email-templates/families fixture
    When I open "/admin/email-templates"
    And I press the "email-template-copy-edit" action of the email template card of "sms_ciba_approval"
    Then the "email-template-copy" dialog is open
    And the open dialog draws no field "email-template-copy/subject"
    And the email template field "email-template-copy/body" is labelled "Text"
    And the email template preview reads "client_name is asking to sign you in. Review the request: approval_link"
    And the email template preview draws no frame
    When I type "Review: {{approval_link}}" into the field "email-template-copy/body"
    And I send the open dialog
    Then the host was sent PATCH to "/api/admin/email-templates/sms_ciba_approval" carrying "body" as "Review: {{approval_link}}"
    And the host was sent PATCH to "/api/admin/email-templates/sms_ciba_approval" carrying nothing at "/subject"

  Scenario: admin, email templates: the editor of a notification kind labels the title and the message, shows their limits, and previews the filled text with no frame
    Given the host answers the idp-email-templates/families fixture
    When I open "/admin/email-templates"
    And I press the "email-template-copy-edit" action of the email template card of "notify_org_join_requested"
    Then the "email-template-copy" dialog is open
    And the email template field "email-template-copy/subject" is labelled "Title"
    And the email template field "email-template-copy/body" is labelled "Message"
    And I see "Up to 255 characters."
    And I see "Up to 1000 characters."
    And the email template preview reads "person_name asks to join organization_name."
    And the email template preview draws no frame

  Scenario: admin, email templates: a plain mail kind is edited as text, its preview the filled text with no frame, and the dialog notes the account event mail
    Given the host answers the idp-email-templates/families fixture
    When I open "/admin/email-templates"
    And I press the "email-template-copy-edit" action of the email template card of "account_event_email_changed"
    Then the "email-template-copy" dialog is open
    And the open dialog notes "email-template-kind-help"
    And the field "email-template-copy/body" reads "Your address is now {{new_email}} <b>."
    And the email template preview reads "Your address is now new_email <b>."
    And the email template preview draws no frame

  Scenario: admin, email templates: the `422` `maxLength` for an sms subject is drawn as the validation problem it is, in the summary under the Subject label, the dialog staying open
    Given the host answers the idp-email-templates/families fixture
    And the host refuses the next PATCH to "/api/admin/email-templates/sms_ciba_approval"
    When I open "/admin/email-templates"
    And I press the "email-template-copy-edit" action of the email template card of "sms_ciba_approval"
    And I send the open dialog
    Then the host was sent PATCH to "/api/admin/email-templates/sms_ciba_approval"
    And the error summary lists "Subject"
    And the "email-template-copy" dialog is open
