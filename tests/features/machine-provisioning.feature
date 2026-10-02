Feature: machine provisioning

  Scenario: Provisioning page: the status behind `provisioning`, a provisioned machine draws its provisioner, its status and its welcome page from one read of the status and the held detail
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-provisioning fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1/provisioning"
    Then the machine page draws the "machine-provisioning" panel
    And the provisioning page names the provisioner "startcloud"
    And the provisioning status reads "provisioned"
    And I see "https://dev-1.example.com/welcome.html"
    And the machine tab "provisioning" is the active one
    And the provisioning page draws no "machine-info" panel
    And the host was sent GET to "/api/agents/1/machines/dev-1/provision/status" 1 times
    And the host was sent GET to "/api/agents/1/machines/dev-1" 1 times
    And the page draws no key of hyperweaver-ui in place of its text

  Scenario: Provisioning page: the editor behind `machine-create` for an admin, its tabs, the registry behind `provisioner-registry` read once for the catalog and the version
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-provisioning fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1/provisioning"
    Then the machine page draws the "provisioning-editor" panel
    And the machine page offers "hosts-yml-edit"
    And the editor lists 2 step cards
    When I pick the editor tab "roles"
    Then the editor lists 2 step cards
    And the catalog lists 5 roles
    And the host was sent GET to "/api/agents/1/provisioning/provisioners" 1 times
    And the host was sent GET to "/api/agents/1/provisioning/provisioners/startcloud/versions/0.1.27" 1 times
    When I pick the editor tab "playbooks"
    Then the editor lists 2 step cards
    When I pick the editor tab "scripts"
    Then the editor lists 1 step cards
    When I pick the editor tab "hooks"
    Then the editor lists 0 step cards
    When I pick the editor tab "transport"
    Then the provisioning page draws the field "prov-transport-communicator"

  Scenario: Provisioning page: a write one request and one notice, Store sends the whole document under provisioner and the detail is read again once
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-provisioning fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1/provisioning"
    And I pick the editor tab "roles"
    And I add the catalog role "nomadweb"
    Then the editor lists 3 step cards
    When I press the machine page's "document-store" action
    Then the host was sent PUT to "/api/agents/1/machines/dev-1" carrying "startcloud" at "/provisioner/provisioner_name"
    And the host was sent PUT to "/api/agents/1/machines/dev-1" carrying "startcloud.hcl_roles.nomadweb" at "/provisioner/roles/2/name"
    And the host was sent PUT to "/api/agents/1/machines/dev-1" carrying nothing at "/provisioner/roles/2/_ui_id"
    And the host was sent PUT to "/api/agents/1/machines/dev-1" carrying "./scripts/aliases.sh" at "/provisioner/provisioning/shell/scripts/0"
    And the host was sent PUT to "/api/agents/1/machines/dev-1" 1 times
    And the page raised 1 success notice
    And the host was sent GET to "/api/agents/1/machines/dev-1" 2 times
    And the host was sent GET to "/api/agents/1/machines/dev-1/provision/status" 2 times

  Scenario: Provisioning page: a write one request and one notice, Store refuses a role name that is no name and sends nothing
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-provisioning fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1/provisioning"
    And I pick the editor tab "roles"
    And I add the custom role "bad role!"
    And I press the machine page's "document-store" action
    Then the provisioning page notes "editor-problem"
    And the host was not sent PUT to "/api/agents/1/machines/dev-1"

  Scenario: Provisioning page: the pipeline behind `provisioning`, Provision handed in run sends one request, raises one notice with View task and opens the task on it
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-provisioning fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1/provisioning?run=provision"
    Then the host was sent POST to "/api/agents/1/machines/dev-1/provision" 1 times
    And the path is "/hosts/1/machines/dev-1/provisioning"
    And the page raised 1 success notice
    And the host was sent GET to "/api/agents/1/machines/dev-1/provision/status" 2 times
    When I press the success notice's action
    Then the host was sent GET to "/api/agents/1/tasks/c3000000-0000-4000-8000-000000000001" 1 times
    When I press "Escape"
    Then the host was sent GET to "/api/agents/1/machines/dev-1/provision/status" 3 times
    And the host was sent GET to "/api/agents/1/machines/dev-1" 2 times

  Scenario: Provisioning page: the pipeline behind `provisioning`, a run of the provisioners the agent skips whole raises one warning and no task
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-provisioning fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-2/provisioning?run=run-provisioners"
    Then the host was sent POST to "/api/agents/1/machines/dev-2/run-provisioners" 1 times
    And the page raised 1 warning notice
    And the page raised 0 success notices
    And the provisioning status reads "not_started"

  Scenario: Provisioning page: the pipeline behind `provisioning`, the host-hooks refusal asks the typed confirmation and the same request goes again with confirm_host_hooks
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-provisioning fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-2/provisioning?run=provision"
    Then the host was sent POST to "/api/agents/1/machines/dev-2/provision" carrying nothing at "/confirm_host_hooks"
    And the page raised 0 danger notices
    And I see "This document runs host hooks"
    When I confirm the open dialog with "provision"
    Then the host was sent POST to "/api/agents/1/machines/dev-2/provision" carrying "true" at "/confirm_host_hooks"
    And the host was sent POST to "/api/agents/1/machines/dev-2/provision" 2 times

  Scenario: Provisioning page: Hosts.yml behind `machine-create`, the dialog reads the YAML once, saves it verbatim and closes on a clean answer
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-provisioning fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1/provisioning"
    And I press the machine page's "hosts-yml-edit" action
    Then the "hosts-yml" dialog is open
    And the host was sent GET to "/api/agents/1/machines/dev-1/hosts-yml" 1 times
    And the Hosts.yml editor reads "provisioner_name: startcloud"
    When I replace the Hosts.yml with "hosts: [{dev-1: {provisioner_name: startcloud}}]"
    And I send the open dialog
    Then the host was sent PUT to "/api/agents/1/machines/dev-1/hosts-yml" carrying "hosts: [{dev-1: {provisioner_name: startcloud}}]" at "/yaml"
    And the host was sent PUT to "/api/agents/1/machines/dev-1/hosts-yml" 1 times
    And the page raised 1 success notice
    And no dialog is open
    And the host was sent GET to "/api/agents/1/machines/dev-1" 2 times

  Scenario: Provisioning page: Hosts.yml behind `machine-create`, a refused YAML keeps the dialog open with the agent's error and its line
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-provisioning fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-2/provisioning"
    And I press the machine page's "hosts-yml-edit" action
    Then the "hosts-yml" dialog is open
    When I send the open dialog
    Then the host was sent PUT to "/api/agents/1/machines/dev-2/hosts-yml" 1 times
    And the open dialog notes "hosts-yml-problem"
    And I see "Nested mappings are not allowed"
    And the "hosts-yml" dialog is open
    And the page raised 0 success notices

  Scenario: Provisioning page: a person who may not create machines reads the status and is offered no editor and no Hosts.yml
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-provisioning fixture
    And the host answers the hosts-member fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"user\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1/provisioning"
    Then the machine page draws the "machine-provisioning" panel
    And the provisioning status reads "provisioned"
    And the provisioning page draws no "provisioning-editor" panel
    And the machine page offers no "hosts-yml-edit"
    And the host was not sent GET to "/api/agents/1/provisioning/provisioners"

  Scenario: Provisioning page: a machine without a document says so, asks for no status and offers no pipeline row
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-tools fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-2/provisioning"
    Then the machine page draws the "machine-provisioning" panel
    And the provisioning page notes "no-document"
    And the host was not sent GET to "/api/agents/1/machines/dev-2/provision/status"
    When I click "Machine controls"
    Then the Controls menu offers no "provision"
    And the Controls menu offers no "sync"

  Scenario: Controls menu: the provisioning rows by the document, Provision, Sync files, Sync back and Run provisioners draw for a machine that carries one and each opens the page with its action
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-provisioning fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    And I click "Machine controls"
    Then the Controls menu offers "provision"
    And the Controls menu offers "sync"
    And the Controls menu offers "syncback"
    And the Controls menu offers "run-provisioners"
    When I press the Controls menu's "sync" row
    Then the path is "/hosts/1/machines/dev-1/provisioning"
    And the host was sent POST to "/api/agents/1/machines/dev-1/sync" carrying nothing at "/syncback"
    And the host was sent POST to "/api/agents/1/machines/dev-1/sync" 1 times
    And the page raised 1 success notice
    When I click "Machine controls"
    And I press the Controls menu's "syncback" row
    Then the host was sent POST to "/api/agents/1/machines/dev-1/sync" carrying "true" at "/syncback"
    And the host was sent POST to "/api/agents/1/machines/dev-1/sync" 2 times
    When I click "Machine controls"
    And I press the Controls menu's "run-provisioners" row
    Then the host was sent POST to "/api/agents/1/machines/dev-1/run-provisioners" 1 times

  Scenario: Controls menu: the provisioning rows by the document, a host that lists no provisioning draws none
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-tools fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    And I click "Machine controls"
    Then the Controls menu offers "tool-take"
    And the Controls menu offers no "provision"

  Scenario: Machine page: the machines list by the host's tokens, Provision draws on a row that names its provisioner on a host that lists provisioning and opens the page with the provision
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-provisioning fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines"
    Then the row of "dev-1" offers "provision"
    And the row of "dev-2" offers no "provision"
    When I press "provision" on the row of "dev-1"
    Then the path is "/hosts/1/machines/dev-1/provisioning"
    And the host was sent POST to "/api/agents/1/machines/dev-1/provision" 1 times

  Scenario: Sidebar tree: a machine node's menu draws Provision on a host that lists provisioning and opens the page with the provision on that machine
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-provisioning fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-2"
    And I right-click the tree node "dev-1"
    Then the tree menu offers "provision"
    When I press the tree menu's "provision" row
    Then the path is "/hosts/1/machines/dev-1/provisioning"
    And the host was sent POST to "/api/agents/1/machines/dev-1/provision" 1 times
    And the host was not sent POST to "/api/agents/1/machines/dev-2/provision"

  Scenario: Sidebar tree: a machine node's menu draws no Provision on a host whose row lists no provisioning
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    And I right-click the tree node "dev-2"
    Then the tree menu offers no "provision"

  Scenario: Provisioning page: a zone's document is stored at the agent's own /api path with the playbook group's shape kept and its Hosts.yml saved with advisories keeps the dialog open
    Given the host answers the zones fixture
    And the host answers the zones-machines fixture
    And the host answers the zones-provisioning fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/web-1/provisioning"
    Then the provisioning page names the provisioner "startcloud"
    And the provisioning status reads "provisioned"
    And the host was sent GET to "/api/machines/web-1/provision/status" 1 times
    And the host was not sent GET to "/api/agents/self/machines/web-1/provision/status"
    When I pick the editor tab "playbooks"
    Then the editor lists 1 step cards
    When I press the machine page's "document-store" action
    Then the host was sent PUT to "/api/machines/web-1" carrying "ansible/playbook.yml" at "/provisioner/provisioning/ansible/playbooks/local/0/playbook"
    And the host was sent PUT to "/api/machines/web-1" carrying "startcloud.hcl_roles.leap" at "/provisioner/roles/1/name"
    And the host was sent PUT to "/api/machines/web-1" 1 times
    And the page raised 1 success notice
    When I press the machine page's "hosts-yml-edit" action
    And I send the open dialog
    Then the host was sent PUT to "/api/machines/web-1/hosts-yml" 1 times
    And the open dialog notes "hosts-yml-advisories"
    And I see "The entry names no vcpus"
    And the "hosts-yml" dialog is open

  Scenario: Provisioning page: on the hyperweaver-agent role served directly, Provision is sent at the agent's own /api path and no registry is asked of a host that lists none
    Given the host answers the agent fixture
    And the host answers the agent-machines fixture
    And the host answers the agent-provisioning fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/dev-1/provisioning?run=provision"
    Then the host was sent POST to "/api/machines/dev-1/provision" 1 times
    And the host was not sent POST to "/api/agents/self/machines/dev-1/provision"
    And the page raised 1 success notice
    And the provisioning status reads "provisioned"
    And the provisioning page draws no "provisioning-editor" panel
    And the host was not sent GET to "/api/provisioning/provisioners"
