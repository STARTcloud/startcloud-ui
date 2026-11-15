Feature: terms documents of the identity contract

  Background:
    Given the host answers the identity fixture
    And the browser holds "language" as "en"

  Scenario: terms: every anchor of the answer's key is a blank that mirrors its input, a composite its join, and anchor-looking text of another key stays text
    Given the host answers the idp-terms fixture
    When I open "/oauth2/accept-terms"
    Then the host was sent GET to "/api/auth/terms"
    And the terms blank "full_name" reads "Ada Lovelace"
    And I see "Not a blank: @@field:0000000000000000:first_name@@"
    And the terms page holds 2 elements matching "output[data-field='full_name'][for='terms/fields/first_name terms/fields/last_name']"
    And the terms page holds 1 element matching "output[data-field='plan'][data-blank='empty'][for='terms/fields/plan'] > .visually-hidden"
    And the terms blank "plan" reads "Licence tier"
    When I type "Grace" into the page field "terms/fields/first_name"
    Then the terms blank "full_name" reads "Grace Lovelace"

  Scenario: terms: the sanitizer keeps tables with align and the link's nofollow, drops the old blank span, and a blockquote marked as a callout takes its kind
    Given the host answers the idp-terms fixture
    When I open "/oauth2/accept-terms"
    Then the terms blank "full_name" reads "Ada Lovelace"
    And the terms page holds 1 element matching ".prose table td[align='right']"
    And the terms page holds 1 element matching ".prose a[rel='nofollow noopener noreferrer'][target='_blank']"
    And the terms page holds 0 elements matching "[data-tos-field]"
    And the terms page holds 0 elements matching "span.tos-blank"
    And the terms page holds 1 element matching ".prose blockquote.callout[data-callout='warning']"
    And I see "Read every clause."
    And I do not see "[!WARNING]"
    And I see "old blank"

  Scenario: terms: without the changes members the "What changed" toggle is absent
    Given the host answers the idp-terms fixture
    When I open "/oauth2/accept-terms"
    Then the terms blank "full_name" reads "Ada Lovelace"
    And the terms page holds 0 elements matching "button[aria-pressed]"

  Scenario: terms: the three changes members draw in the same three places under the "What changed" toggle, each once, and the toggle returns the content
    Given the host answers the idp-terms/changed fixture
    When I open "/oauth2/accept-terms"
    Then the terms page holds 1 element matching "button[aria-pressed='true']"
    And I see "Changed top for"
    And I see "Changed middle, tier"
    And I see "Changed bottom."
    And I do not see "Current top for"
    And I do not see "Current middle, tier"
    And I do not see "Current bottom."
    And the terms page holds 3 elements matching "form.auth-form > .prose"
    When I press the terms element "button[aria-pressed]"
    Then I see "Current top for"
    And I see "Current middle, tier"
    And I see "Current bottom."
    And I do not see "Changed top for"
    And I do not see "Changed bottom."
    And the terms page holds 3 elements matching "form.auth-form > .prose"

  Scenario: terms: a removed entry draws struck through with no input, a removed composite draws its parts from their removed entries, and a changed entry is marked as changed
    Given the host answers the idp-terms/changed fixture
    When I open "/oauth2/accept-terms"
    Then the terms page holds 1 element matching "[data-field='city'][data-blank='removed'] del"
    And the terms blank "city" reads "City"
    And the terms page holds 1 element matching "[data-field='address'][data-blank='removed'] del"
    And the terms blank "address" reads "Address line 1, City"
    And the terms page holds 0 elements matching "[id='terms/fields/city']"
    And the terms page holds 0 elements matching "[id='terms/fields/address_line_1']"
    And the terms page holds 0 elements matching "[id='terms/fields/address']"
    And the terms page holds 1 element matching "output[data-field='plan'][data-changed='true']"
    And the terms page holds 1 element matching "label[for='terms/fields/plan'] .auth-badge"
    When I choose the terms option "Silver"
    Then the terms page holds 1 element matching "output[data-field='plan'][data-changed='true'] ins"
    And the terms blank "plan" reads "Silver"

  Scenario: terms: the versions dialog draws a version's anchors as blanks with no input
    Given the host answers the idp-terms/changed fixture
    When I open "/oauth2/accept-terms"
    And I press the terms element ".auth-head-actions > button:not(.auth-region-btn)"
    And I press the terms element ".modal .list-group-item:nth-child(2)"
    Then the host was sent GET to "/api/auth/terms/versions/1.0"
    And I see "Version 1.0 for Ada Lovelace, tier"
    And the terms page holds 1 element matching ".modal span[data-field='plan'][data-blank='empty'] > .visually-hidden"
    And the terms page holds 0 elements matching ".modal output"
    And the terms page holds 0 elements matching ".modal input"

  Scenario: terms: the post carries every input by name, a tick box as a boolean and a choice as its option
    Given the host answers the idp-terms fixture
    And the terms post to "/oauth2/accept-terms" answers next "/"
    When I open "/oauth2/accept-terms"
    Then the terms blank "over_18" reads "☐"
    When I tick the terms field "terms/fields/over_18"
    Then the terms blank "over_18" reads "☑"
    When I choose the terms option "Gold"
    Then the terms blank "plan" reads "Gold"
    When I type "Ada Lovelace" into the page field "terms/fields/signature"
    Then the terms blank "signature" reads "Ada Lovelace"
    When I submit the terms form
    Then the terms post to "/oauth2/accept-terms" carried the field "over_18" as the boolean "true"
    And the terms post to "/oauth2/accept-terms" carried the field "plan" as the string "Gold"
    And the terms post to "/oauth2/accept-terms" carried the field "first_name" as the string "Ada"
    And the terms post to "/oauth2/accept-terms" carried the field "last_name" as the string "Lovelace"
    And the terms post to "/oauth2/accept-terms" carried the field "signature" as the string "Ada Lovelace"

  Scenario: terms: the post carries a date as yyyy-MM-dd and a read-only phone by name, and a 422 is drawn at each field its pointer names by its rule
    Given the host answers the idp-terms/refused fixture
    And the terms post to "/oauth2/accept-terms" answers 422 from "idp-terms/refused/accept-422.json"
    When I open "/oauth2/accept-terms"
    Then the terms page holds 1 element matching "[id='terms/fields/phone_number']:disabled"
    When I tick the terms field "terms/fields/over_18"
    And I type "2026-12-01" into the page field "terms/fields/start_date"
    And I type "Wrong Name" into the page field "terms/fields/signature"
    Then the terms blank "start_date" reads "December 1, 2026"
    And the terms blank "phone_number" reads "+15555550100"
    When I submit the terms form
    Then the terms post to "/oauth2/accept-terms" carried the field "start_date" as the string "2026-12-01"
    And the terms post to "/oauth2/accept-terms" carried the field "over_18" as the boolean "true"
    And the terms post to "/oauth2/accept-terms" carried the field "phone_number" as the string "+15555550100"
    And the terms post to "/oauth2/accept-terms" carried the field "first_name" as the string "Ada"
    And the terms field "terms/fields/over_18" is marked wrong
    And the terms field "terms/fields/signature" names the error "Enter your full name in"
    And the terms field "terms/fields/phone_number" is marked wrong
    And the terms field "terms/fields/start_date" is marked wrong
    And the error summary is focused

  Scenario: terms: a `403` `tos_session_expired` on the post is drawn through the problem alert and the form stays
    Given the host answers the idp-terms fixture
    And the terms post to "/oauth2/accept-terms" answers 403 from "idp-terms/expired-403.json"
    When I open "/oauth2/accept-terms"
    And I tick the terms field "terms/fields/over_18"
    And I choose the terms option "Gold"
    And I type "Ada Lovelace" into the page field "terms/fields/signature"
    And I submit the terms form
    Then the terms post to "/oauth2/accept-terms" carried the field "plan" as the string "Gold"
    And the terms page holds 1 element matching ".auth-alert-danger"
    And I see "Your terms session has ended. Sign in again to continue."
    And the terms page holds 1 element matching "form.auth-form"

  Scenario: terms: an address input carries the id its rule names, so the error summary's link lands on it, and a plain country blank mirrors its input while the composite names the country in English
    Given the host answers the idp-terms/address fixture
    When I open "/oauth2/accept-terms"
    Then the terms blank "country" reads "US"
    And the terms blank "address" reads "1 Main St, United States"
    And the terms page holds 1 element matching "input[id='terms/fields/city']"
    And the terms page holds 1 element matching "select[id='terms/fields/country']"
    And the terms page holds 1 element matching "input[id='terms/fields/address_line_2']"
    When I submit the terms form
    Then the error summary is focused
    And the terms page holds 1 element matching ".form-error-summary a[href='#terms/fields/city']"
    When I press the terms element ".form-error-summary a[href='#terms/fields/city']"
    Then the terms page holds 1 element matching "input[id='terms/fields/city']:focus"

  Scenario: terms: the error summary's link of a choice field lands on the group's first radio
    Given the host answers the idp-terms fixture
    When I open "/oauth2/accept-terms"
    And I submit the terms form
    Then the error summary is focused
    When I press the terms element ".form-error-summary a[href='#terms/fields/plan']"
    Then the terms page holds 1 element matching "input[type='radio'][id='terms/fields/plan'][value='Gold']:focus"

  Scenario: terms: an anchor with no fields entry draws an error in the blank's place and keeps the agree button disabled
    Given the host answers the idp-terms/broken fixture
    When I open "/oauth2/accept-terms"
    Then the terms blank "first_name" reads "Ada"
    And the terms page holds 1 element matching "[data-field='planet'][data-blank='error']"
    And the terms page holds 1 element matching ".auth-alert-danger"
    And the terms form's submit is held

  Scenario: terms: a `fields_version` above 1 draws an error in every blank's place and keeps the agree button disabled
    Given the host answers the idp-terms/version-two fixture
    When I open "/oauth2/accept-terms"
    Then the terms page holds 1 element matching "[data-field='first_name'][data-blank='error']"
    And the terms page holds 1 element matching ".auth-alert-danger"
    And the terms form's submit is held

  Scenario: terms: a `kind` outside the list draws an error in the blank's place, no input, and keeps the agree button disabled
    Given the host answers the idp-terms/unknown-kind fixture
    When I open "/oauth2/accept-terms"
    Then the terms blank "first_name" reads "Ada"
    And the terms page holds 1 element matching "[data-field='level'][data-blank='error']"
    And the terms page holds 0 elements matching "[id='terms/fields/level']"
    And the terms page holds 1 element matching ".auth-alert-danger"
    And the terms form's submit is held

  Scenario: terms: the policy page draws anchors as blanks with no input and the copy's language as a badge
    Given the host answers the idp-terms fixture
    When I open "/public/policies/privacy"
    Then the host was sent GET to "/api/policies/privacy"
    And the terms page holds 1 element matching "span[data-field='plan'][data-blank='empty'] > .visually-hidden"
    And the terms blank "plan" reads "Licence tier"
    And the terms page holds 0 elements matching "output"
    And the terms page holds 0 elements matching ".prose input"
    And the terms page holds 1 element matching "[data-badge='locale']"

  Scenario: admin, terms: each copy shows its language and History names the copy by its language
    Given the host answers the identity-admin fixture
    And the host answers the idp-terms/admin fixture
    When I open "/admin/terms"
    Then the terms page holds 2 elements matching "[data-copy] [data-badge='locale']"
    And I see "Default language"
    When I press the "term-copy-history" action of the terms copy 9
    Then the host was sent GET to "/api/admin/terms/hcl-mla/history"
    And I see "es-editor@example.com"

  Scenario: admin, terms: the editor's preview is the server's answer drawn through the document component, the language fixed on Edit
    Given the host answers the identity-admin fixture
    And the host answers the idp-terms/admin fixture
    When I open "/admin/terms"
    And I press the "term-copy-edit" action of the terms copy 7
    Then the "term-copy" dialog is open
    And the host was sent POST to "/api/admin/terms/preview"
    And the terms page holds 1 element matching "[data-pane='term-preview'] span[data-field='plan'][data-blank='empty']"
    And the terms page holds 1 element matching "[id='term-copy/locale']:disabled"
    And the terms page holds 1 element matching "[data-note='term-declared-field']"

  Scenario: admin, terms: a `422` `token` on save is drawn on the Content field by its reason, two token errors at once included
    Given the host answers the identity-admin fixture
    And the host answers the idp-terms/admin fixture
    And the host answers the idp-terms/admin-gone fixture
    And the host refuses the next PATCH to "/api/admin/terms/hcl-mla"
    When I open "/admin/terms"
    And I press the "term-copy-edit" action of the terms copy 7
    And I send the open dialog
    Then the host was sent PATCH to "/api/admin/terms/hcl-mla"
    And the terms field "term-copy/content" names the error "{{frist_name}} is not one of them."
    And the terms field "term-copy/content" names the error "a kind of checkbox, date, choice or signature."
    And the "term-copy" dialog is open

  Scenario: admin, terms: a `422` `token` on publish closes the version dialog and is drawn on the Content field of the form beneath
    Given the host answers the identity-admin fixture
    And the host answers the idp-terms/admin fixture
    And the host answers the idp-terms/admin-gone fixture
    And the host refuses the next POST to "/api/admin/terms/hcl-mla/publish"
    When I open "/admin/terms"
    And I press the "term-copy-edit" action of the terms copy 7
    And I press the open dialog's "term-copy-publish" action
    Then the "term-publish" dialog is open
    When I type "2.0" into the field "term-publish/version"
    And I send the open dialog
    Then the "term-publish" dialog is closed
    And the terms field "term-copy/content" names the error "before repeating it."
    And the "term-copy" dialog is open

  Scenario: admin, terms: a `404` on the save of a copy says the copy was removed by someone else and reloads the list
    Given the host answers the identity-admin fixture
    And the host answers the idp-terms/admin fixture
    And the host answers the idp-terms/admin-gone fixture
    When I open "/admin/terms"
    And I press the "term-copy-edit" action of the terms copy 7
    And I send the open dialog
    Then I see "This copy was removed by someone else."
    And no dialog is open
    And the host was sent GET to "/api/admin/terms" at least 2 times

  Scenario: admin, terms: a `404` on the publish of a copy says the copy was removed by someone else and reloads the list
    Given the host answers the identity-admin fixture
    And the host answers the idp-terms/admin fixture
    And the host answers the idp-terms/admin-gone fixture
    When I open "/admin/terms"
    And I press the "term-copy-edit" action of the terms copy 7
    And I press the open dialog's "term-copy-publish" action
    Then the "term-publish" dialog is open
    When I type "2.0" into the field "term-publish/version"
    And I send the open dialog
    Then the host was sent POST to "/api/admin/terms/hcl-mla/publish" carrying "version" as "2.0"
    And I see "This copy was removed by someone else."
    And no dialog is open
    And the host was sent GET to "/api/admin/terms" at least 2 times

  Scenario: admin, terms: a `404` on the delete of a copy says the copy was removed by someone else and reloads the list
    Given the host answers the identity-admin fixture
    And the host answers the idp-terms/admin fixture
    And the host answers the idp-terms/admin-gone fixture
    When I open "/admin/terms"
    And I press the "term-copy-delete" action of the terms copy 9
    And I confirm the open dialog
    Then the host was sent DELETE to "/api/admin/terms/hcl-mla"
    And I see "This copy was removed by someone else."
    And the host was sent GET to "/api/admin/terms" at least 2 times

  Scenario: admin, terms: a `409` `default_copy` on the save of the default-language copy draws its own sentence and keeps the dialog
    Given the host answers the identity-admin fixture
    And the host answers the idp-terms/admin fixture
    And the host answers the idp-terms/admin-default-copy fixture
    When I open "/admin/terms"
    And I press the "term-copy-edit" action of the terms copy 7
    And I send the open dialog
    Then the host was sent PATCH to "/api/admin/terms/hcl-mla"
    And I see "The default-language copy stays while language copies depend on it."
    And the "term-copy" dialog is open

  Scenario: admin, terms: a `409` `default_copy` on the delete of the default-language copy draws its own sentence
    Given the host answers the identity-admin fixture
    And the host answers the idp-terms/admin fixture
    And the host answers the idp-terms/admin-default-copy fixture
    When I open "/admin/terms"
    And I press the "term-copy-delete" action of the terms copy 7
    And I confirm the open dialog
    Then the host was sent DELETE to "/api/admin/terms/hcl-mla"
    And I see "The default-language copy stays while language copies depend on it."

  Scenario: admin, terms: `default_copy` and `not_found` in a bulk answer draw in the result line by their own labels
    Given the host answers the identity-admin fixture
    And the host answers the idp-terms/admin fixture
    And the host answers the idp-terms/admin-default-copy fixture
    When I open "/admin/terms"
    And I press the terms element ".list-group > .list-group-item > div > input.form-check-input"
    And I press the page's "term-bulk-delete" action
    And I confirm the open dialog
    Then the host was sent POST to "/api/admin/terms/bulk" carrying "action" as "delete"
    And the terms page holds 1 element matching "[data-note='term-bulk-result']"
    And I see "Default-language copy still needed (1)"
    And I see "Removed by someone else (1)"

  Scenario: admin, terms: the `dependentRequired` refusal of a language copy with no default-language copy is drawn on the language picker
    Given the host answers the identity-admin fixture
    And the host answers the idp-terms/admin fixture
    And the host answers the idp-terms/admin-default-copy fixture
    When I open "/admin/terms"
    And I press the page's "term-copy-add" action
    Then the "term-copy" dialog is open
    And the terms page holds 0 elements matching "[id='term-copy/locale']:disabled"
    When I choose "es" in the field "term-copy/locale"
    And I type "1.0" into the field "term-copy/version"
    And I type "Hola" into the field "term-copy/content"
    And I send the open dialog
    Then the host was sent POST to "/api/admin/terms" carrying "locale" as "es"
    And the terms field "term-copy/locale" names the error "Create the default-language copy first"
    And the "term-copy" dialog is open

  Scenario: admin, terms: the `dependentRequired` refusal of a language copy moved to regions with no default-language copy is drawn on the regions field
    Given the host answers the identity-admin fixture
    And the host answers the idp-terms/admin fixture
    And the host answers the idp-terms/admin-default-copy fixture
    When I open "/admin/terms"
    And I press the "term-copy-edit" action of the terms copy 9
    And I send the open dialog
    Then the host was sent PATCH to "/api/admin/terms/hcl-mla"
    And the terms field "term-copy/regions" names the error "Create the default-language copy first"
    And the "term-copy" dialog is open

  Scenario: admin, terms: the `409` `unique` of a simultaneous create is drawn on the field its pointer names
    Given the host answers the identity-admin fixture
    And the host answers the idp-terms/admin fixture
    And the host answers the idp-terms/admin-unique fixture
    When I open "/admin/terms"
    And I press the page's "term-create" action
    And I type "privacy" into the field "term-doc/name"
    And I type "Privacy" into the field "term-doc/friendly_name"
    And I send the open dialog
    Then the host was sent POST to "/api/admin/terms" carrying "name" as "privacy"
    And the terms field "term-doc/name" is marked wrong
    And the "term-document" dialog is open

  Scenario: admin, terms: the `409` `unique` of a simultaneous publish is drawn on the version field
    Given the host answers the identity-admin fixture
    And the host answers the idp-terms/admin fixture
    And the host answers the idp-terms/admin-unique fixture
    When I open "/admin/terms"
    And I press the "term-copy-edit" action of the terms copy 7
    And I press the open dialog's "term-copy-publish" action
    And I type "2.0" into the field "term-publish/version"
    And I send the open dialog
    Then the host was sent POST to "/api/admin/terms/hcl-mla/publish" carrying "version" as "2.0"
    And the terms field "term-publish/version" is marked wrong
    And the "term-publish" dialog is open
