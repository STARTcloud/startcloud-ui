Feature: agent-media

  Scenario: Agent media: the Devices page of a host that names virtualbox reads the USB devices and none of the PCI reads
    Given the host answers the agent-overview fixture
    And the host answers the agent-media fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/devices"
    Then the section page "devices" draws
    And the section page draws the "devices-usb" panel
    And the "usb" table of the section page lists 3 rows
    And the "usb" table of the section page draws the "state" column
    And the host was sent GET to "/api/system/usb" 1 times
    And the host was not sent GET to "/api/host/devices"
    And the host was not sent GET to "/api/host/ppt-status"
    And the host column draws the "devices" row to "/hosts/self/devices"
    And the host column draws the "media" row to "/hosts/self/storage/media"

  Scenario: Agent media: the Media page reads the disk images and the ISOs as it draws, the Disks tab first and the ISOs tab on a pick
    Given the host answers the agent-overview fixture
    And the host answers the agent-media fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/storage/media"
    Then the section page "media" draws
    And the section page draws the "media-disks" panel
    And the "disks" table of the section page lists 3 rows
    And the "disks" table of the section page draws the "inUse" column
    And the host was sent GET to "/api/media" 1 times
    And the host was sent GET to "/api/artifacts/iso" 1 times
    When I pick the tab "isos" of the section page
    Then the section page draws the "media-isos" panel
    And the "isos" table of the section page lists 2 rows
    And the section page draws no "media-disks" panel

  Scenario: Agent media: a host whose row lists no media draws the not-available stub on the Media route and is asked for nothing
    Given the host answers the agent-overview fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/storage/media"
    Then the section page draws the not-available stub
    And the host column draws no "media" row
    And the host was not sent GET to "/api/media"
