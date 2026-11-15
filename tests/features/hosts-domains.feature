Feature: hosts-domains

  Scenario: Organization default domain: the console of a host that lists hosts draws Default domain for new machines from GET /api/organization/{name} and Update sends base_domain on the one PUT with the name, the email and the description
    Given the host answers the hosts fixture
    And the host answers the hosts-domains fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    And the browser holds "activeOrganization" as "0b7c1d52-6f0e-4c0a-9a54-3c1f6f2a9e11"
    When I open "/org-console"
    Then the host was sent GET to "/api/organization/acme"
    And the page field "organization/base_domain" reads "org.example.com"
    When I type "machines.example.com" into the page field "organization/base_domain"
    And I press "Enter"
    Then the host was sent PUT to "/api/organization/acme" carrying "base_domain" as "machines.example.com"
    And the host was sent PUT to "/api/organization/acme" carrying "organization" as "acme"
    And the host was sent PUT to "/api/organization/acme" carrying "email" as "team@acme.example"
    And the host was sent PUT to "/api/organization/acme" carrying "description" as "The Acme team"
    And the host was sent PUT to "/api/organization/acme" 1 times
    And the page raised 1 success notice

  Scenario: Organization default domain: a blank field sends base_domain as null, clearing it
    Given the host answers the hosts fixture
    And the host answers the hosts-domains fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    And the browser holds "activeOrganization" as "0b7c1d52-6f0e-4c0a-9a54-3c1f6f2a9e11"
    When I open "/org-console"
    Then the page field "organization/base_domain" reads "org.example.com"
    When I type "" into the page field "organization/base_domain"
    And I press "Enter"
    Then the host was sent PUT to "/api/organization/acme" carrying "base_domain" as "null"

  Scenario: Organization default domain: a value outside the host's domainName rule is refused on the client and nothing is sent
    Given the host answers the hosts fixture
    And the host answers the hosts-domains fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    And the browser holds "activeOrganization" as "0b7c1d52-6f0e-4c0a-9a54-3c1f6f2a9e11"
    When I open "/org-console"
    Then the page field "organization/base_domain" reads "org.example.com"
    When I type "not a domain" into the page field "organization/base_domain"
    And I press "Enter"
    Then the page field "organization/base_domain" is marked invalid
    And the host was not sent PUT to "/api/organization/acme"

  Scenario: Organization default domain: the console of a host that lists no hosts draws no Default domain field and sends no base_domain
    Given the host answers the org-console fixture
    And the browser holds "user" as "{\"id\":42,\"username\":\"mark\",\"access_token\":\"t\",\"organizations\":[{\"uuid\":\"0d6b7e2a-1111-4c0a-9a1e-000000000001\",\"name\":\"acme\",\"display_name\":\"Acme\",\"roles\":[\"ADMIN\"],\"primary\":true,\"personal\":false,\"logo_url\":null,\"email_hash\":\"\"}]}"
    When I open "/org-console"
    Then the page field "organization/organization" reads "acme"
    And the page draws no field "organization/base_domain"

  Scenario: Person's default domain: the Hosts card on the hyperweaver-server role draws the account's default domain beside the browser's, read from GET /api/user/preferences, and Save writes the browser key and PATCH /api/user/preferences carrying default_domain
    Given the host answers the hosts fixture
    And the host answers the hosts-domains fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/profile/preferences"
    Then the page draws the panel "hosts-preferences"
    And the host was sent GET to "/api/user/preferences"
    And the page field "hosts-preferences/default_domain" reads "lab.example.com"
    And the page field "hosts-preferences-default_domain" reads ""
    When I type "pref.example.com" into the page field "hosts-preferences-default_domain"
    And I type "home.example.com" into the page field "hosts-preferences/default_domain"
    And I press the page's "save-hosts-preferences" action
    Then the browser kept "hosts_prefs" as "{\"defaultDomain\":\"pref.example.com\"}"
    And the host was sent PATCH to "/api/user/preferences" carrying "default_domain" as "home.example.com"
    And the host was sent PATCH to "/api/user/preferences" 1 times
    And the page field "hosts-preferences/default_domain" reads "home.example.com"

  Scenario: Person's default domain: a blank account field sends default_domain as null, clearing it
    Given the host answers the hosts fixture
    And the host answers the hosts-domains fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/profile/preferences"
    Then the page field "hosts-preferences/default_domain" reads "lab.example.com"
    When I type "" into the page field "hosts-preferences/default_domain"
    And I press the page's "save-hosts-preferences" action
    Then the host was sent PATCH to "/api/user/preferences" carrying "default_domain" as "null"

  Scenario: Person's default domain: a value outside the host's domainName rule is refused on the client and nothing is sent
    Given the host answers the hosts fixture
    And the host answers the hosts-domains fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/profile/preferences"
    Then the page field "hosts-preferences/default_domain" reads "lab.example.com"
    When I type "not a domain" into the page field "hosts-preferences/default_domain"
    And I press the page's "save-hosts-preferences" action
    Then the page field "hosts-preferences/default_domain" is marked invalid
    And the host was not sent PATCH to "/api/user/preferences"

  Scenario: Person's default domain: the create wizard's chain lists the user and organization rows of settings.domain_choices between the browser preference and the agent row
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-create fixture
    And the host answers the hosts-domains fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    And the browser holds "hosts_prefs" as "{\"defaultDomain\":\"pref.example.com\"}"
    When I open "/hosts/1?create=machine"
    And I type "zeus-01" into the field "machine-create-name-input"
    Then the field "machine-setting-domain" reads "pref.example.com"
    When I open the wizard fold "name-parts"
    And I press the open dialog's "pick-domain" action
    Then the domain list reads "pref.example.com,lab.example.com,org.example.com,startcloud.com"
    And the domain list reads the sources "preference,user,organization,agent"
    When I pick the domain of the source "organization"
    Then the field "machine-setting-domain" reads "org.example.com"
