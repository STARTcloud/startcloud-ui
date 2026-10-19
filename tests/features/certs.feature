Feature: certs

  Scenario: Sidebar: a host that lists no certs draws no Certificates rows
    Given the host answers the certs fixture
    And the host answers the certs-nocerts fixture
    And the browser holds "user" as "{\"id\":2,\"username\":\"admin\",\"access_token\":\"t\"}"
    When I open "/"
    Then the chrome draws no sidebar row "Vault"
    And the chrome draws no sidebar row "Convert"
    And the chrome draws no sidebar row "Shared"

  Scenario: Sidebar: a host that lists certs and tools without certs-store draws the Vault and the Tools group's Certificates row with the six tools under it, and no Shared or Sync row
    Given the host answers the certs fixture
    And the host answers the certs-nostore fixture
    And the browser holds "user" as "{\"id\":2,\"username\":\"admin\",\"access_token\":\"t\"}"
    When I open "/certs/convert"
    Then the chrome draws the sidebar row "Vault"
    And the chrome draws the sidebar row "Convert"
    And the chrome draws the sidebar row "Generate"
    And the sidebar row "Convert" links to "/certs/convert"
    And the chrome draws no sidebar row "Shared"
    And the chrome draws no sidebar row "Sync"

  Scenario: Sidebar: a host that lists certs without tools draws the Vault and no tool row, and the tool routes are stubs
    Given the host answers the certs fixture
    And the host answers the certs-notools fixture
    And the browser holds "user" as "{\"id\":2,\"username\":\"admin\",\"access_token\":\"t\"}"
    When I open "/certs"
    Then the chrome draws the sidebar row "Vault"
    And the chrome draws the sidebar row "Shared"
    And the chrome draws no sidebar row "Convert"
    And the chrome draws no sidebar row "Generate"
    When I open "/certs/convert"
    Then the chrome draws no sidebar row "Convert"
    And the chrome draws the sidebar row "Vault"

  Scenario: Sidebar: a host that lists certs-store draws Shared and Sync for a signed-in person, and the Vault row folds the four kinds, each linking to the vault narrowed to it
    Given the host answers the certs fixture
    And the browser holds "user" as "{\"id\":2,\"username\":\"admin\",\"access_token\":\"t\"}"
    When I open "/certs?kind=authority"
    Then the chrome draws the sidebar row "Shared"
    And the chrome draws the sidebar row "Sync"
    And the sidebar row "Shared" links to "/certs/shared"
    And the sidebar row "Sync" links to "/certs/sync"
    And the chrome draws the sidebar row "Certificates"
    And the chrome draws the sidebar row "Authorities"
    And the chrome draws the sidebar row "Requests"
    And the chrome draws the sidebar row "Keys"
    And the sidebar row "Authorities" links to "/certs?kind=authority"
    And the sidebar row "Keys" links to "/certs?kind=key"

  Scenario: Visitor: a person who never signed in is sent from the vault to sign in with the page as the return path, no banner drawn and the list of servers never asked for
    Given the host answers the certs fixture
    When I open "/certs"
    Then the path is "/login?returnTo=%2Fcerts"
    And I do not see "You were signed out."
    And the host was not sent GET to "/api/servers"

  Scenario: Convert: a certificate and its key from two files meet in the components, the PKCS#12 saves under the first file's stem, and Save to vault keeps both as records
    Given the host answers the certs fixture
    And the browser holds "user" as "{\"id\":2,\"username\":\"admin\",\"access_token\":\"t\"}"
    And the browser records its downloads
    When I open "/certs/convert"
    And I drop "leaf.pem" into the input zone
    Then I see "www.fixture.test"
    When I drop "leaf.key" into the input zone
    Then the components list 2 rows
    And the component "Certificate" is ticked
    And the component "Private key" is ticked
    When I choose "pkcs12" in the control "certs-convert/to"
    And I press the certs page's "convert" action
    Then the download is named "leaf.pkcs12.pfx"
    When I press the certs page's "save-vault" action
    Then I see "2 records imported"
    When I open "/certs"
    Then the vault lists 2 rows
    And I see "www.fixture.test"
    And I see "www.fixture.test key"

  Scenario: Convert: a certificate and a key dropped together in one drop are read in the order dropped, both ticked, and the PKCS#12 saves under the first file's stem
    Given the host answers the certs fixture
    And the browser holds "user" as "{\"id\":2,\"username\":\"admin\",\"access_token\":\"t\"}"
    And the browser records its downloads
    When I open "/certs/convert"
    And I drop "int.pem" and "leaf.key" into the input zone
    Then the components list 2 rows
    And the component "Fixture Intermediate CA" is ticked
    And the component "Private key" is ticked
    When I choose "pkcs12" in the control "certs-convert/to"
    And I press the certs page's "convert" action
    Then the download is named "int.pkcs12.pfx"

  Scenario: Decode: a certificate and its key dropped together in one drop are both listed, the last read picked
    Given the host answers the certs fixture
    And the browser holds "user" as "{\"id\":2,\"username\":\"admin\",\"access_token\":\"t\"}"
    When I open "/certs/decode"
    And I drop "leaf.pem" and "leaf.key" into the input zone
    Then the decode select lists 2 components
    And the decode select offers "Certificate"
    And the decode select offers "Private key"
    And the decoded heading reads "Private key"

  Scenario: Decode: an encrypted key draws the locked line, Enter in the password reads it again unlocked, and the engine's WASM is served as application/wasm
    Given the host answers the certs fixture
    And the browser holds "user" as "{\"id\":2,\"username\":\"admin\",\"access_token\":\"t\"}"
    And the browser records the engine's answers
    When I open "/certs/decode"
    And I drop "leaf.enc.key" into the input zone
    Then the decoded heading reads "Locked, needs a password"
    And the engine was served as "application/wasm"
    When I fill the control "certs-input/password" with "secret"
    And I press "Enter"
    Then the decoded heading reads "Private key"
    And I do not see "Locked, needs a password"

  Scenario: Decode: a legacy PKCS#12 draws one locked bundle row until Unlock opens it with the password
    Given the host answers the certs fixture
    And the browser holds "user" as "{\"id\":2,\"username\":\"admin\",\"access_token\":\"t\"}"
    When I open "/certs/decode"
    And I drop "legacy.pfx" into the input zone
    Then the decoded heading reads "Locked, needs a password"
    When I fill the control "certs-input/password" with "secret"
    And I press the certs page's "read" action
    Then the decoded heading reads "Certificate"
    And the decoded heading reads "www.fixture.test"
    And I do not see "Locked, needs a password"

  Scenario: Decode: every download is named by the file it came from
    Given the host answers the certs fixture
    And the browser holds "user" as "{\"id\":2,\"username\":\"admin\",\"access_token\":\"t\"}"
    And the browser records its downloads
    When I open "/certs/decode"
    And I drop "leaf.pem" into the input zone
    Then the decoded heading reads "www.fixture.test"
    When I press the certs page's "download-pem" action
    Then the download is named "leaf.pem"
    When I drop "root.pem" into the input zone
    Then the decoded heading reads "Fixture Root CA"
    When I press the certs page's "download-pem" action
    Then the download is named "root.pem"

  Scenario: Decode: pasted text downloads as pasted.pem
    Given the host answers the certs fixture
    And the browser holds "user" as "{\"id\":2,\"username\":\"admin\",\"access_token\":\"t\"}"
    And the browser records its downloads
    When I open "/certs/decode"
    And I paste the fixture "leaf.pem" into the input zone
    And I press the certs page's "read" action
    Then I see "www.fixture.test"
    When I press the certs page's "download-pem" action
    Then the download is named "pasted.pem"

  Scenario: Match: the certificate's key is the one the key file carries
    Given the host answers the certs fixture
    And the browser holds "user" as "{\"id\":2,\"username\":\"admin\",\"access_token\":\"t\"}"
    When I open "/certs/match"
    And I drop "leaf.pem" into the "match-subject" zone
    Then I see "leaf.pem"
    When I drop "leaf.key" into the "match-key" zone
    Then I see "The key matches"

  Scenario: Compare: two different certificates list the fields that differ
    Given the host answers the certs fixture
    And the browser holds "user" as "{\"id\":2,\"username\":\"admin\",\"access_token\":\"t\"}"
    When I open "/certs/compare"
    And I drop "leaf.pem" into the "compare-left" zone
    Then I see "www.fixture.test"
    When I drop "root.pem" into the "compare-right" zone
    Then I see "fields differ"
    And the differences list "Subject"
    And the differences list "Serial"

  Scenario: Chain: the certificates loaded one file at a time build leaf first, a key dropped in ignored with one line
    Given the host answers the certs fixture
    And the browser holds "user" as "{\"id\":2,\"username\":\"admin\",\"access_token\":\"t\"}"
    When I open "/certs/chain"
    And I drop "root.pem" into the input zone
    Then I see "Fixture Root CA"
    When I drop "int.pem" into the input zone
    Then I see "Fixture Intermediate CA"
    When I drop "leaf.pem" into the input zone
    Then I see "www.fixture.test"
    When I drop "leaf.key" into the input zone
    Then the page raised 1 info notice
    And I see "1 component ignored"
    When I press the certs page's "build-chain" action
    Then the chain's first row names "www.fixture.test"
    And the chain's first row is marked "Valid"

  Scenario: Generate: a key, a request and a self-signed certificate each download under the feature's one file name rule, and no form drawn carries a duplicate id
    Given the host answers the certs fixture
    And the browser holds "user" as "{\"id\":2,\"username\":\"admin\",\"access_token\":\"t\"}"
    And the browser records its downloads
    When I open "/certs/generate"
    Then the page carries no duplicate id
    When I choose "p256" in the control "certs-key/alg"
    And I press the certs page's "generate-key" action
    And I press the certs page's "download" action
    Then the download is named "p256_key.key"
    And the page carries no duplicate id
    When I pick the generate tab "request"
    And I fill the control "certs-request/CN" with "req"
    And I choose "p256" in the control "certs-request/alg"
    And I press the certs page's "make-request" action
    And I press the certs page's "download" action
    Then the download is named "req.csr"
    And the page carries no duplicate id
    When I pick the generate tab "certificate"
    And I fill the control "certs-certificate/CN" with "leaf"
    And I choose "p256" in the control "certs-certificate/alg"
    And I press the certs page's "self-sign" action
    And I press the certs page's "download" action
    Then the download is named "leaf.crt"
    And the page carries no duplicate id

  Scenario: Generate: a request signed with an authority of the vault is issued by it, downloads under its common name and lands in the vault linked to it, its page naming the authority as its issuer
    Given the host answers the certs fixture
    And the browser holds "user" as "{\"id\":2,\"username\":\"admin\",\"access_token\":\"t\"}"
    And the browser records its downloads
    When I open "/certs/generate"
    And I pick the generate tab "certificate"
    And I fill the control "certs-certificate/CN" with "Fixture Vault CA"
    And I check the control "certs-certificate/is_ca"
    And I choose "p256" in the control "certs-certificate/alg"
    And I press the certs page's "self-sign" action
    And I press the certs page's "save-vault" action
    Then I see "Saved to the vault."
    When I pick the generate tab "request"
    And I fill the control "certs-request/CN" with "www.vault.test"
    And I choose "p256" in the control "certs-request/alg"
    And I press the certs page's "make-request" action
    And I press the certs page's "save-vault" action
    And I pick the generate tab "sign"
    And I choose "www.vault.test" in the control "certs-sign/request_id"
    And I choose "Fixture Vault CA" in the control "certs-sign/authority_id"
    And I press the certs page's "sign" action
    Then the outcome made reads "Fixture Vault CA"
    When I press the certs page's "download" action
    Then the download is named "www.vault.test.crt"
    When I press the certs page's "save-vault" action
    Then the certs page's "save-vault" action is held
    When I open "/certs"
    Then the vault lists 5 rows
    And I see "Fixture Vault CA"
    And I see "www.vault.test"
    And the vault row "www.vault.test" is issued by "Fixture Vault CA"
    When I follow the vault row "www.vault.test" issued by "Fixture Vault CA"
    Then the record's related rows link "Fixture Vault CA"
    And the record's chain names "Fixture Vault CA"

  Scenario: Generate: a template saved under a taken name is refused in the summary, which takes the focus
    Given the host answers the certs fixture
    And the browser holds "user" as "{\"id\":2,\"username\":\"admin\",\"access_token\":\"t\"}"
    When I open "/certs/generate"
    And I pick the generate tab "request"
    And I fill the control "certs-request-template/name" with "web"
    And I press the certs page's "save-template" action
    Then I see "Saved to the vault."
    When I fill the control "certs-request-template/name" with "web"
    And I press the certs page's "save-template" action
    Then the error summary is focused
    And the error summary lists "web is already taken in Templates"

  Scenario: Vault: a record renamed on its page, a #id arrival landing on its row, and a row's Delete behind the typed confirmation leaving the focus on the heading
    Given the host answers the certs fixture
    And the browser holds "user" as "{\"id\":2,\"username\":\"admin\",\"access_token\":\"t\"}"
    When I open "/certs"
    And I click "Add New"
    And I drop "vault.certs.json" into the vault
    Then I see "2 records imported"
    And the vault lists 2 rows
    When I open "/certs/rec-cert-1"
    And I fill the control "certs-details/name" with "Renamed leaf"
    And I press the certs page's "save" action
    Then I see "Saved to the vault."
    When I open "/certs#rec-cert-1"
    Then the vault row "Renamed leaf" holds the focus
    When I press "delete" on the vault row "Renamed leaf"
    And I confirm the open dialog
    Then I see "Renamed leaf was removed."
    And the vault heading holds the focus
    And the vault lists 1 rows

  Scenario: Vault: the bulk Delete of the picked rows behind the typed confirmation, the focus on the heading after
    Given the host answers the certs fixture
    And the browser holds "user" as "{\"id\":2,\"username\":\"admin\",\"access_token\":\"t\"}"
    When I open "/certs"
    And I click "Add New"
    And I drop "vault.certs.json" into the vault
    Then the vault lists 2 rows
    When I tick the vault row "Local leaf"
    And I tick the vault row "Local key"
    Then I see "2 selected"
    When I press the certs page's "delete" action
    And I confirm the open dialog
    Then I see "2 records removed"
    And the vault heading holds the focus
    And I do not see "Local leaf"

  Scenario: Vault: the record page's Delete of a pulled row sends no DELETE and lands on the vault with the heading focused, and the vault row's Delete does the same from the vault narrowed to Authorities
    Given the host answers the certs fixture
    And the browser holds "user" as "{\"id\":2,\"username\":\"admin\",\"access_token\":\"t\"}"
    When I open "/certs/shared"
    And I pull the shared row "Fixture Root CA"
    Then I see "Fixture Root CA was pulled into the vault."
    When I pull the shared row "www.fixture.test"
    Then I see "www.fixture.test was pulled into the vault."
    When I open "/certs/rec-leaf"
    And I press the certs page's "delete" action
    And I confirm the open dialog
    Then the path is "/certs"
    And the vault heading holds the focus
    And the vault lists 1 rows
    And the host was not sent DELETE to "/api/certs/row-leaf"
    When I open "/certs?kind=authority"
    Then the vault lists 1 rows
    When I press "delete" on the vault row "Fixture Root CA"
    And I confirm the open dialog
    Then I see "Fixture Root CA was removed."
    And the vault heading holds the focus
    And the vault lists 0 rows
    And the host was not sent DELETE to "/api/certs/row-root"

  Scenario: Vault: the Visibility and Status pickers over the picked synced rows the person manages, one PUT a row a pick
    Given the host answers the certs fixture
    And the host answers the certs-access-public fixture
    And the browser holds "user" as "{\"id\":2,\"username\":\"admin\",\"access_token\":\"t\"}"
    When I open "/certs/shared"
    And I pull the shared row "Fixture Root CA"
    Then I see "Fixture Root CA was pulled into the vault."
    When I pull the shared row "www.fixture.test"
    Then I see "www.fixture.test was pulled into the vault."
    When I open "/certs"
    Then the vault lists 2 rows
    When I tick the vault row "Fixture Root CA"
    And I tick the vault row "www.fixture.test"
    And I pick "public" in the "Visibility" menu
    Then the host was sent PUT to "/api/certs/row-root" carrying "is_public" as "true"
    And the host was sent PUT to "/api/certs/row-leaf" carrying "is_public" as "true"
    And the host was sent PUT to "/api/certs/row-root" 1 times
    And the host was sent PUT to "/api/certs/row-leaf" 1 times
    And the host answers the certs-access-unpublished fixture
    When I tick the vault row "Fixture Root CA"
    And I tick the vault row "www.fixture.test"
    And I pick "unpublish" in the "Status" menu
    Then the host was sent PUT to "/api/certs/row-root" carrying "published" as "false"
    And the host was sent PUT to "/api/certs/row-leaf" carrying "published" as "false"
    And the host was sent PUT to "/api/certs/row-root" 2 times
    And the host was sent PUT to "/api/certs/row-leaf" 2 times
    And the page raised 0 danger notices

  Scenario: Record: Publish, Guests and Public from the header are three PUTs of the synced record, each answer's words drawn on the header
    Given the host answers the certs fixture
    And the host answers the certs-own-published fixture
    And the browser holds "user" as "{\"id\":2,\"username\":\"admin\",\"access_token\":\"t\"}"
    When I open "/certs/shared"
    And I pull the shared row "Dana leaf"
    Then I see "Dana leaf was pulled into the vault."
    When I open "/certs/rec-own"
    And I pick "publish" in the "Status: Pending" menu
    Then the host was sent PUT to "/api/certs/row-own" carrying "published" as "true"
    And the "Status: Published" menu is drawn
    And the host answers the certs-own-guests fixture
    When I pick "guests" in the "Visibility: Private" menu
    Then the host was sent PUT to "/api/certs/row-own" carrying "guest_access" as "true"
    And the host answers the certs-own-public fixture
    When I pick "public" in the "Visibility: Guests" menu
    Then the host was sent PUT to "/api/certs/row-own" carrying "is_public" as "true"
    And the host was sent PUT to "/api/certs/row-own" 3 times
    And the "Visibility: Public" menu is drawn
    And the page raised 0 danger notices

  Scenario: Record: a manager's Unpublish then Publish of another person's row, both answered 200, the status drawn from each answer
    Given the host answers the certs fixture
    And the host answers the certs-leaf-unpublished fixture
    And the browser holds "user" as "{\"id\":2,\"username\":\"admin\",\"access_token\":\"t\"}"
    When I open "/certs/shared"
    And I pull the shared row "www.fixture.test"
    Then I see "www.fixture.test was pulled into the vault."
    When I open "/certs/rec-leaf"
    Then I see "Published"
    When I pick "unpublish" in the "Status: Published" menu
    Then the host was sent PUT to "/api/certs/row-leaf" carrying "published" as "false"
    And the host answers the certs-leaf-published fixture
    When I pick "publish" in the "Status: Pending" menu
    Then the host was sent PUT to "/api/certs/row-leaf" carrying "published" as "true"
    And the host was sent PUT to "/api/certs/row-leaf" 2 times
    And the "Status: Published" menu is drawn
    And the page raised 0 danger notices

  Scenario: Record: Remove from the organization sends the one DELETE and keeps the pulled copy in the vault
    Given the host answers the certs fixture
    And the browser holds "user" as "{\"id\":2,\"username\":\"admin\",\"access_token\":\"t\"}"
    When I open "/certs/shared"
    And I pull the shared row "Fixture Root CA"
    Then I see "Fixture Root CA was pulled into the vault."
    When I open "/certs/rec-root"
    And I press the certs page's "remove-from" action
    And I confirm the open dialog
    Then the host was sent DELETE to "/api/certs/row-root" 1 times
    And I see "Removed from acme."
    When I open "/certs"
    Then the vault lists 1 rows
    And I see "Fixture Root CA"

  Scenario: Mirror: a member renaming a pulled copy of another person's row sends no PUT, while a manager renaming their own sends one
    Given the host answers the certs fixture
    And the host answers the certs-user fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"user\",\"access_token\":\"t\"}"
    When I open "/certs/shared"
    And I pull the shared row "www.fixture.test"
    Then I see "www.fixture.test was pulled into the vault."
    When I open "/certs/rec-leaf"
    And I fill the control "certs-details/name" with "Renamed"
    And I press the certs page's "save" action
    Then I see "Saved to the vault."
    And the host was not sent PUT to "/api/certs/row-leaf"

  Scenario: Mirror: a manager renaming a record they shared sends one PUT answered with the new name
    Given the host answers the certs fixture
    And the host answers the certs-own-renamed fixture
    And the browser holds "user" as "{\"id\":2,\"username\":\"admin\",\"access_token\":\"t\"}"
    When I open "/certs/shared"
    And I pull the shared row "Dana leaf"
    Then I see "Dana leaf was pulled into the vault."
    When I open "/certs/rec-own"
    And I fill the control "certs-details/name" with "Dana renamed"
    And I press the certs page's "save" action
    Then I see "Saved to the vault."
    And the host was sent PUT to "/api/certs/row-own" carrying "name" as "Dana renamed"
    And the host was sent PUT to "/api/certs/row-own" 1 times
    And the page raised 0 danger notices

  Scenario: Sync: ticking one kind and saving sends every unsent record of that kind as one POST each
    Given the host answers the certs fixture
    And the browser holds "user" as "{\"id\":2,\"username\":\"admin\",\"access_token\":\"t\"}"
    When I open "/certs"
    And I click "Add New"
    And I drop "vault.certs.json" into the vault
    Then the vault lists 2 rows
    When I open "/certs/sync"
    And I check the control "certs-sync/certificate"
    And I press the certs page's "save" action
    Then the host was sent POST to "/api/certs" carrying "kind" as "certificate"
    And the host was sent POST to "/api/certs" carrying "organization" as "acme"
    And the host was sent POST to "/api/certs" 1 times
    And I see "Sync settings saved."

  Scenario: Shared: an admin of the organization reads every row, with the Published and Visibility columns
    Given the host answers the certs fixture
    And the browser holds "user" as "{\"id\":2,\"username\":\"admin\",\"access_token\":\"t\"}"
    When I open "/certs/shared"
    Then the shared table lists 5 rows
    And the shared table draws the "published" column
    And the shared table draws the "visibility" column
    And I see "Dana leaf"
    And I see "Sam draft"
    And I see "Prominic Root CA"

  Scenario: Shared: a member reads the published rows and their own unpublished one, without the two columns
    Given the host answers the certs fixture
    And the host answers the certs-user fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"user\",\"access_token\":\"t\"}"
    When I open "/certs/shared"
    Then the shared table lists 3 rows
    And the shared table draws no "published" column
    And the shared table draws no "visibility" column
    And I see "Sam draft"
    And I do not see "Dana leaf"

  Scenario: Shared: a guest reads the published rows marked for guests or public alone, without the two columns
    Given the host answers the certs fixture
    And the host answers the certs-tbaker fixture
    And the browser holds "user" as "{\"id\":8,\"username\":\"tbaker\",\"access_token\":\"t\"}"
    When I open "/certs/shared"
    Then the shared table lists 1 rows
    And the shared table draws no "published" column
    And I see "Fixture Root CA"
    And I do not see "www.fixture.test"

  Scenario: Shared: an owner of another organization reads that organization's rows alone, with the two columns
    Given the host answers the certs fixture
    And the host answers the certs-asilva fixture
    And the browser holds "user" as "{\"id\":9,\"username\":\"asilva\",\"access_token\":\"t\"}"
    When I open "/certs/shared"
    Then the shared table lists 2 rows
    And the shared table draws the "published" column
    And the shared table draws the "visibility" column
    And I see "Prominic Root CA"
    And I see "Ravi draft"
    And I do not see "Sam draft"
    And I do not see "Dana leaf"

  Scenario: Shared: Pull again replaces the pulled copy with the row as the store holds it
    Given the host answers the certs fixture
    And the host answers the certs-user fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"user\",\"access_token\":\"t\"}"
    When I open "/certs/shared"
    Then the shared row "www.fixture.test" offers "Pull to vault"
    When I pull the shared row "www.fixture.test"
    Then I see "www.fixture.test was pulled into the vault."
    And the shared row "www.fixture.test" offers "Pull again"
    When I open "/certs/rec-leaf"
    And I fill the control "certs-details/name" with "Renamed"
    And I press the certs page's "save" action
    Then I see "Saved to the vault."
    When I open "/certs/shared"
    And I pull the shared row "www.fixture.test"
    Then I see "www.fixture.test was pulled into the vault."
    When I open "/certs"
    Then the vault lists 1 rows
    And I see "www.fixture.test"
    And I do not see "Renamed"
