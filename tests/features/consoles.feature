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
    And the host was sent POST to "/api/agents/1/machines/dev-1/ssh/start" carrying nothing at "/credential_id"
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

  Scenario: Console section: the SSH door of a machine holding two SSH credentials opens Connect as, the default first, and the start carries the credential picked
    Given the host answers the agent fixture
    And the host answers the agent-machines fixture
    And the host answers the agent-consoles fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/dev-1"
    Then the console panel draws the "inactive" display
    When I press the console panel's "console-start-ssh" action
    Then the console panel's Connect as menu lists "sec-deploy,sec-domino"
    And the host was not sent POST to "/api/machines/dev-1/ssh/start"
    When I connect as "sec-domino"
    Then the host was sent POST to "/api/machines/dev-1/ssh/start" carrying "credential_id" as "sec-domino"
    And the host was sent POST to "/api/machines/dev-1/ssh/start" 1 times
    And the console panel draws the "ssh" display

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
    When I click "Zone controls"
    And I press the Controls menu's "refresh" row
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

  Scenario: Console placement: the SSH row of the Controls menu opens in the footer, the page says so, Send to this page brings the session back over the same socket and Send to footer takes it there again
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-consoles fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    And I click "Machine controls"
    And I press the Controls menu's "console-ssh" row
    Then the host was sent POST to "/api/agents/1/machines/dev-1/ssh/start" 1 times
    And the footer pane draws the "ssh" console of "dev-1"
    And the footer pane draws the "ssh" viewer
    And the console panel draws the "inactive" display
    And the console panel says the "ssh" console is in the footer
    When I press the console panel's "send-to-page" action
    Then the console panel draws the "ssh" display
    And the console panel draws the "ssh" viewer
    And I see "vagrant@dev-1"
    And the console panel says no console is in the footer
    And the footer pane draws no "ssh" console of "dev-1"
    And the host was sent POST to "/api/agents/1/machines/dev-1/ssh/start" 1 times
    And the host was sent GET to "/api/agents/1/ws-ticket" 1 times
    When I press the console panel's "send-to-footer" action
    Then the footer pane draws the "ssh" console of "dev-1"
    And the console panel says the "ssh" console is in the footer
    And the host was sent GET to "/api/agents/1/ws-ticket" 1 times
    When I press the console panel's "send-to-page" action
    And I press the console panel's "console-stop" action
    Then the host was sent DELETE to "/api/agents/1/ssh/sessions/c1000000-0000-4000-8000-000000000001/stop" 1 times
    And the console panel draws the "inactive" display

  Scenario: Console placement: the scope glyph flips the SSH row to the page, where it opens as today, and the VNC row sent to the footer draws the viewer there over the shared display
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-consoles fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    And the browser records its requests
    When I open "/hosts/1/machines/dev-1"
    And I click "Machine controls"
    And I press the Controls menu's "console-ssh" scope glyph
    Then the Controls menu's "console-ssh" row opens in the "this page"
    When I press the Controls menu's "console-ssh" row
    Then the console panel draws the "ssh" display
    And the console panel says no console is in the footer
    When I click "Machine controls"
    And I press the Controls menu's "console-vnc" scope glyph
    Then the Controls menu's "console-vnc" row opens in the "footer"
    When I press the Controls menu's "console-vnc" row
    Then the host was sent GET to "/api/agents/1/machines/dev-1/vnc" 1 times
    And the host was not sent POST to "/api/agents/1/machines/dev-1/vnc/start"
    And the footer pane draws the "vnc" console of "dev-1"
    And the footer pane draws the "vnc" viewer
    And the host was asked "/api/agents/1/ws-ticket" with "machine" as "dev-1"
    And the console panel says the "vnc" console is in the footer
    When I press the footer's "consoles" toggle
    Then the footer drop-up offers "reconnect"
    And the footer drop-up offers no "restart"
    And the footer drop-up offers no "preferences"
    When I press the footer drop-up's "send-to-page" row
    Then the console panel draws the "vnc" display
    And the console panel draws the "vnc" viewer

  Scenario: Console placement: the zlogin row of a zone's Controls menu opens in the footer through the zone terminal provider, Send to zone page brings it back and the page's zlogin flows stay as they are
    Given the host answers the zones fixture
    And the host answers the zones-machines fixture
    And the host answers the zones-consoles fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/web-1"
    Then the console panel draws the "inactive" display
    When I click "Zone controls"
    And I press the Controls menu's "console-zlogin" row
    Then the host was sent POST to "/api/machines/web-1/zlogin/start" 1 times
    And the host was sent GET to "/api/ws-ticket" 1 times
    And the footer pane draws the "zlogin" console of "web-1"
    And the console panel says the "zlogin" console is in the footer
    When I press the footer's "consoles" toggle
    Then the footer drop-up offers "send-to-page"
    And the footer drop-up offers "restart"
    And the footer drop-up offers "preferences"
    And the footer drop-up offers no "reconnect"
    When I press "Escape"
    And I press the console panel's "send-to-page" action
    Then the console panel draws the "zlogin" display
    And the console panel draws the "zlogin" viewer
    And the host was sent POST to "/api/machines/web-1/zlogin/start" 1 times
    And the host was sent GET to "/api/ws-ticket" 1 times
    When I open the console panel's "zlogin-actions" menu
    Then the console panel offers "zlogin-capture"
    And the console panel offers "zlogin-kill"

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

  Scenario: Console doors: the hardware card's SSH door of a machine holding two SSH credentials asks Connect as before it starts
    Given the host answers the agent fixture
    And the host answers the agent-machines fixture
    And the host answers the agent-consoles fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/dev-1"
    And I press the hardware card's "console-ssh" door
    Then the Connect as dialog lists "sec-deploy,sec-domino"
    And the host was not sent POST to "/api/machines/dev-1/ssh/start"
    When I connect as "sec-deploy" in the Connect as dialog
    Then the host was sent POST to "/api/machines/dev-1/ssh/start" carrying "credential_id" as "sec-deploy"
    And the console panel draws the "ssh" display

  Scenario: Console doors: the SSH door of a row of the machines list opens the machine's page, which asks Connect as before it starts
    Given the host answers the agent fixture
    And the host answers the agent-machines fixture
    And the host answers the agent-consoles fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines"
    And I open the More menu of the row of "dev-1"
    And I press "console-ssh" on the row of "dev-1"
    Then the Connect as dialog lists "sec-deploy,sec-domino"
    And the path is "/hosts/self/machines/dev-1"
    And the host was not sent POST to "/api/machines/dev-1/ssh/start"
    When I connect as "sec-domino" in the Connect as dialog
    Then the host was sent POST to "/api/machines/dev-1/ssh/start" carrying "credential_id" as "sec-domino"
    And the console panel draws the "ssh" display

  Scenario: Console doors: the SSH row of the tree's menu opens the machine's page, which asks Connect as before it starts, and Cancel starts nothing
    Given the host answers the agent fixture
    And the host answers the agent-machines fixture
    And the host answers the agent-consoles fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines"
    And I right-click the tree node "dev-1"
    And I press the tree menu's "console-ssh" row
    Then the Connect as dialog lists "sec-deploy,sec-domino"
    And the path is "/hosts/self/machines/dev-1"
    When I click "Cancel"
    Then no Connect as dialog is open
    And the host was not sent POST to "/api/machines/dev-1/ssh/start"
    And the console panel draws the "inactive" display

  Scenario: Console doors: the console query carrying a credential starts with that credential and asks nothing
    Given the host answers the agent fixture
    And the host answers the agent-machines fixture
    And the host answers the agent-consoles fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/dev-1?console=ssh&credential=sec-domino"
    Then the host was sent POST to "/api/machines/dev-1/ssh/start" carrying "credential_id" as "sec-domino"
    And the path is "/hosts/self/machines/dev-1"
    And no Connect as dialog is open
    And the console panel draws the "ssh" display

  Scenario: Console doors: the SSH row of the Controls menu on this page asks Connect as and carries the pick in the console query
    Given the host answers the agent fixture
    And the host answers the agent-machines fixture
    And the host answers the agent-consoles fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/dev-1"
    And I click "Machine controls"
    And I press the Controls menu's "console-ssh" scope glyph
    And I press the Controls menu's "console-ssh" row
    Then the Connect as dialog lists "sec-deploy,sec-domino"
    And the host was not sent POST to "/api/machines/dev-1/ssh/start"
    When I connect as "sec-domino" in the Connect as dialog
    Then the host was sent POST to "/api/machines/dev-1/ssh/start" carrying "credential_id" as "sec-domino"
    And the host was sent POST to "/api/machines/dev-1/ssh/start" 1 times
    And the path is "/hosts/self/machines/dev-1"
    And the console panel draws the "ssh" display

  Scenario: Console placement: the SSH row of the Controls menu in the footer asks Connect as, the footer's shell starts with the pick and its Restart keeps it
    Given the host answers the agent fixture
    And the host answers the agent-machines fixture
    And the host answers the agent-consoles fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/dev-1"
    And I click "Machine controls"
    And I press the Controls menu's "console-ssh" row
    Then the Connect as dialog lists "sec-deploy,sec-domino"
    And the host was not sent POST to "/api/machines/dev-1/ssh/start"
    When I connect as "sec-domino" in the Connect as dialog
    Then the host was sent POST to "/api/machines/dev-1/ssh/start" carrying "credential_id" as "sec-domino"
    And the footer pane draws the "ssh" console of "dev-1"
    And the console panel says the "ssh" console is in the footer
    When I press the footer's "consoles" toggle
    And I press the footer drop-up's "restart" row
    Then the host was sent POST to "/api/machines/dev-1/ssh/start" 2 times, each carrying "credential_id" as "sec-domino"

  Scenario: Console placement: the RDP row of the Controls menu in the footer asks Connect as for a machine holding two RDP credentials and the footer's bridge signs in with the pick
    Given the host answers the agent fixture
    And the host answers the agent-machines fixture
    And the host answers the agent-consoles fixture
    And the host answers the agent-rdp-credentials fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/dev-1"
    And I click "Machine controls"
    And I press the Controls menu's "console-rdp" row
    Then the Connect as dialog lists "sec-domino,sec-desktop"
    And the host was not sent GET to "/api/machines/dev-1/vnc"
    When I connect as "sec-desktop" in the Connect as dialog
    Then the host was sent GET to "/api/machines/dev-1/vnc" 1 times
    And the footer pane draws the "rdp" console of "dev-1"
    And the footer pane draws the RDP viewer signing in as "sec-desktop"
