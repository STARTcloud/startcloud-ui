Feature: consoles

  Scenario: Console section: the inactive display draws one start button a console the host's row lists, VNC, SSH and RDP on a VirtualBox host and no zlogin, with every door to them
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-consoles fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    Then the machine page draws the "machine-console" panel
    And the console panel draws the "inactive" display
    And the console panel offers "console-start-vnc"
    And the console panel offers "console-start-ssh"
    And the console panel offers "console-start-rdp"
    And the console panel offers "console-start-guest-rdp"
    And the console panel offers "console-directory"
    And the console panel offers "console-ftp"
    And the console panel offers no "console-start-zlogin"
    And the hardware card offers "console-vnc"
    And the hardware card offers "console-ssh"
    And the hardware card offers "console-rdp"
    And the hardware card offers no "console-zlogin"
    And the host was sent GET to "/api/agents/1/machines/dev-1/vnc/info" 1 times
    And the host was not sent GET to "/api/agents/1/zlogin/sessions"
    And the host was not sent GET to "/api/agents/1/ws-ticket"
    And the page draws no key of hyperweaver-ui in place of its text
    When I click "Machine controls"
    Then the Controls menu offers "console-vnc"
    And the Controls menu offers "console-ssh"
    And the Controls menu offers "console-rdp"
    And the Controls menu offers no "console-zlogin"
    When I press "Escape"
    And I right-click the tree node "dev-2"
    Then the tree menu offers "console-vnc"
    And the tree menu offers "console-rdp"
    And the tree menu offers no "console-zlogin"

  Scenario: Console section: Start VNC on a VirtualBox host reads the remote display facts, the direct websockify model, and draws the viewer with one ticket bound to the machine
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-consoles fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    And the browser records its requests
    When I open "/hosts/1/machines/dev-1"
    And I press the console panel's "console-start-vnc" action
    Then the host was sent GET to "/api/agents/1/machines/dev-1/vnc" 1 times
    And the host was not sent POST to "/api/agents/1/machines/dev-1/vnc/start"
    And the console panel draws the "vnc" display
    And the console panel draws the "vnc" viewer
    And the host was sent GET to "/api/agents/1/ws-ticket" 1 times
    And the host was asked "/api/agents/1/ws-ticket" with "machine" as "dev-1"
    And the console panel offers "console-expand"
    And the console panel offers "console-start-ssh"
    And the console panel offers "console-start-rdp"
    When I open the console panel's "vnc-actions" menu
    Then the console panel draws the "keyboard" submenu
    And the console panel draws the "display" submenu
    And the console panel draws the "actions" submenu
    And the console panel offers "vnc-kill"

  Scenario: Console section: a VirtualBox machine that is off is refused the VNC console by the remote display facts and the viewer never draws
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-consoles fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-2"
    Then the console panel draws the "inactive" display
    And the console panel's "console-start-vnc" action is held
    And the console panel's "console-start-ssh" action is held
    And the host was not sent GET to "/api/agents/1/ws-ticket"

  Scenario: Console section: Start SSH sends one request and the shell draws with its ticket, Stop SSH sends the stop and the inactive display returns
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-consoles fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    And the browser records its requests
    When I open "/hosts/1/machines/dev-1"
    And I press the console panel's "console-start-ssh" action
    Then the host was sent POST to "/api/agents/1/machines/dev-1/ssh/start" 1 times
    And the console panel draws the "ssh" display
    And the console panel draws the "ssh" viewer
    And I see "vagrant@dev-1"
    And I see "192.168.1.50"
    And the console panel offers "console-next-address"
    And the host was sent GET to "/api/agents/1/ws-ticket" 1 times
    And the host was asked "/api/agents/1/ws-ticket" with "machine" as "dev-1"
    When I press the console panel's "console-stop" action
    Then the host was sent DELETE to "/api/agents/1/ssh/sessions/c1000000-0000-4000-8000-000000000001/stop" 1 times
    And the console panel draws the "inactive" display

  Scenario: Console section: Start VRDP reads the remote display facts and the RDP console draws its header with the connection details and the launchers
    Given the host answers the agent fixture
    And the host answers the agent-machines fixture
    And the host answers the agent-consoles fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/dev-1"
    Then the console panel draws the "inactive" display
    And the console panel offers "console-start-rdp"
    And the console panel offers "console-start-guest-rdp"
    And the console panel offers no "console-start-vnc"
    And the host was not sent GET to "/api/machines/dev-1/vnc/info"
    When I press the console panel's "console-start-rdp" action
    Then the host was sent GET to "/api/machines/dev-1/vnc" 1 times
    And the console panel draws the "rdp" display
    And I see "dev-1"
    And the console panel offers "rdp-details"
    And the console panel offers "rdp-settings"
    And the console panel offers "console-native-rdp"
    And the console panel offers "console-directory"
    And the console panel offers "console-ftp"
    And the console panel offers "console-stop"
    And the console panel offers "console-start-ssh"
    When I press the console panel's "console-stop" action
    Then the console panel draws the "inactive" display

  Scenario: Console section: a zone draws the VNC and zlogin start buttons alone, Start zlogin stops what the agent held, starts the session and draws the terminal with its ticket
    Given the host answers the zones fixture
    And the host answers the zones-machines fixture
    And the host answers the zones-consoles fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/web-1"
    Then the console panel draws the "inactive" display
    And the console panel offers "console-start-vnc"
    And the console panel offers "console-start-zlogin"
    And the console panel offers no "console-start-ssh"
    And the console panel offers no "console-start-rdp"
    And the host was sent GET to "/api/machines/web-1/vnc/info" 1 times
    And the host was sent GET to "/api/zlogin/sessions" 1 times
    When I press the console panel's "console-start-zlogin" action
    Then the host was sent GET to "/api/zlogin/sessions" 2 times
    And the host was sent POST to "/api/machines/web-1/zlogin/start" 1 times
    And the host was sent GET to "/api/ws-ticket" 1 times
    And the console panel draws the "zlogin" display
    And the console panel offers "console-expand"
    And the console panel offers "console-start-vnc"
    When I open the console panel's "zlogin-actions" menu
    Then the console panel offers "zlogin-capture"
    And the console panel offers "zlogin-kill"
    And the console panel offers "zlogin-toggle-read-only"

  Scenario: Console section: Start VNC on a zone starts the session, reads it once and draws the viewer with its ticket, the session model
    Given the host answers the zones fixture
    And the host answers the zones-machines fixture
    And the host answers the zones-consoles fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/web-1"
    And I press the console panel's "console-start-vnc" action
    Then the host was sent POST to "/api/machines/web-1/vnc/start" 1 times
    And the host was sent GET to "/api/machines/web-1/vnc/info" 2 times
    And the page raised 1 danger notice
    And the console panel draws the "inactive" display

  Scenario: Console section: the sessions the agent already holds are read as the page draws, the VNC viewer draws on the held session with its ticket, the held zlogin session opens its socket with another and zlogin is one press away
    Given the host answers the zones fixture
    And the host answers the zones-machines fixture
    And the host answers the zones-consoles fixture
    And the host answers the zones-consoles-live fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/web-1"
    Then the console panel draws the "vnc" display
    And the console panel draws the "vnc" viewer
    And I see "6080"
    And the host was sent GET to "/api/ws-ticket" 2 times
    And the console panel offers "console-switch-zlogin"
    And the host was not sent POST to "/api/machines/web-1/vnc/start"
    When I press the console panel's "console-switch-zlogin" action
    Then the console panel draws the "zlogin" display
    And the console panel offers "console-switch-vnc"
    When I click "Refresh"
    Then the host was sent GET to "/api/machines/web-1/vnc/info" 2 times
    And the host was sent GET to "/api/zlogin/sessions" 2 times

  Scenario: Console dialogs: the console query of the machine route opens the VNC dialog on a running machine and is dropped from the route
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-consoles fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1?console=vnc"
    Then the "vnc-console" dialog is open
    And the path is "/hosts/1/machines/dev-1"
    And the console dialog draws the "vnc" viewer
    And the console dialog offers "console-full-screen"
    And the console dialog offers "console-close"
    And the console dialog offers no "console-switch-zlogin"
    And the host was sent GET to "/api/agents/1/machines/dev-1/vnc" 1 times
    When I press the console dialog's "console-close" action
    Then no dialog is open
    And the console panel draws the "vnc" display

  Scenario: Console dialogs: the zlogin door on a zone starts the session and opens the zlogin dialog with the VNC switch beside it
    Given the host answers the zones fixture
    And the host answers the zones-machines fixture
    And the host answers the zones-consoles fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/web-1?console=zlogin"
    Then the "zlogin-console" dialog is open
    And the path is "/hosts/self/machines/web-1"
    And the host was sent POST to "/api/machines/web-1/zlogin/start" 1 times
    And the console dialog offers "console-switch-vnc"
    And the console dialog offers "console-full-screen"
    When I press the console dialog's "console-close" action
    Then no dialog is open
    And the console panel draws the "zlogin" display

  Scenario: Console doors: a row of the machines list and the tree's menu open the console on the machine's page
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-consoles fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines"
    And I open the More menu of the row of "dev-1"
    Then the row of "dev-1" offers "console-vnc"
    And the row of "dev-1" offers "console-ssh"
    And the row of "dev-1" offers "console-rdp"
    And the row of "dev-1" offers no "console-zlogin"
    When I press "console-ssh" on the row of "dev-1"
    Then the path is "/hosts/1/machines/dev-1"
    And the host was sent POST to "/api/agents/1/machines/dev-1/ssh/start" 1 times
    And the console panel draws the "ssh" display
    When I right-click the tree node "dev-1"
    And I press the tree menu's "console-vnc" row
    Then the "vnc-console" dialog is open

  Scenario: Console section: a host whose row lists no console token draws the placard, no door and asks nothing
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1?console=vnc"
    Then the machine page draws the "machine-console" panel
    And the console panel says no console is available
    And the hardware card offers no "console-vnc"
    And the host was not sent GET to "/api/agents/1/machines/dev-1/vnc/info"
    And the host was not sent GET to "/api/agents/1/machines/dev-1/vnc"
    And the host was not sent GET to "/api/agents/1/ws-ticket"
    And no dialog is open
    When I click "Machine controls"
    Then the Controls menu offers no "console-vnc"
    And the Controls menu offers no "console-rdp"
    When I press "Escape"
    And I right-click the tree node "dev-2"
    Then the tree menu offers no "console-vnc"

  Scenario: Console pages: the full-window VNC console draws the viewer with its control bar and asks one ticket bound to the machine
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-consoles fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    And the browser records its requests
    When I open "/hosts/1/machines/dev-1/console/vnc"
    Then the console page draws the "vnc" viewer
    And the console page offers the VNC control bar
    And the host was sent GET to "/api/agents/1/ws-ticket" 1 times
    And the host was asked "/api/agents/1/ws-ticket" with "machine" as "dev-1"

  Scenario: Console pages: the full-window RDP console draws its strip and the session host, and a host whose row lists no rdp draws the not-available placard
    Given the host answers the agent fixture
    And the host answers the agent-machines fixture
    And the host answers the agent-consoles fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/dev-1/console/rdp?target=guest"
    Then the console page draws the "rdp" viewer
    And the console page offers "rdp-details"
    And the console page offers "console-ctrl-alt-del"
    When I open "/hosts/self/machines/dev-1/console/vnc"
    Then the console page says no console is available

  Scenario: Console section: the placeholder draws the chosen pack's mark and falls back to brand.logo_url when that mark fails to load
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-consoles fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    And the browser holds "theme" as "shi"
    And the build answers 404 at "/brand/shi/mark.svg"
    When I open "/hosts/1/machines/dev-2"
    Then the console panel draws the "inactive" display
    And the document carries "data-brand" as "shi"
    And the console placeholder mark is "/brand/hyperweaver/mark.svg"
