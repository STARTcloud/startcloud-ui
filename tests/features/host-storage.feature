Feature: host storage

  Scenario: Storage: the page behind `zfs`, a host whose row lists it not draws the not-available stub and is asked for no storage read
    Given the host answers the hosts fixture
    And the host answers the hosts-storage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/storage"
    Then the storage page draws the not-available stub
    And the host was not sent GET to "/api/agents/1/monitoring/storage/pools"
    And the host was not sent GET to "/api/agents/1/monitoring/storage/disks"
    And the host was not sent GET to "/api/agents/1/storage/pools"

  Scenario: Storage: a host the list of servers does not hold draws what the host page draws for it, never the token stub
    Given the host answers the hosts fixture
    And the host answers the hosts-storage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/99/storage"
    Then the storage route draws the host that did not answer
    And the host was sent GET to "/api/agents/99/stats"
    And the host was not sent GET to "/api/agents/99/storage/pools"

  Scenario: Storage: the monitoring surfaces behind their reads' tokens, a host that lists `zfs` and no `monitoring` draws the frame and the ZFS management alone
    Given the host answers the hosts fixture
    And the host answers the hosts-storage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/4/storage"
    Then the storage page draws its frame
    And I see "Bare"
    And the storage page draws no monitoring section
    And the ZFS management draws 2 pools
    And the host was not sent GET to "/api/agents/4/monitoring/storage/pools"
    And the host was not sent GET to "/api/agents/4/monitoring/storage/disks"
    And the host was not sent GET to "/api/agents/4/monitoring/storage/disk-io"
    And the host was sent GET to "/api/agents/4/storage/pools" 1 times

  Scenario: Storage: the storage summary, hyperweaver-ui's card, the first section of the page with its three counts, the disks drawn once by their identity
    Given the host answers the hosts fixture
    And the host answers the hosts-storage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/storage"
    Then the storage summary is the first section of the storage page
    And the storage summary counts 2 pools, 3 datasets and 9 disks
    And the page draws no key of hyperweaver-ui in place of its text

  Scenario: Storage: the pools table, the newest row of each pool from the one read the Overview shares, the health in its tone and the usage from the human sizes
    Given the host answers the hosts fixture
    And the host answers the hosts-storage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/storage"
    Then the "pools" table of the storage page lists 2 rows
    And the "pools" table of the storage page draws the "health" column
    And the "pools" table of the storage page draws the "usage" column
    And the "pools" table of the storage page draws "rpool" in its "pool" column
    And the "pools" table of the storage page draws "36.5%" in its "usage" column
    And the host was sent GET to "/api/agents/3/monitoring/storage/pools" 1 times

  Scenario: Storage: the datasets, the disks, the disk I/O and the pool I/O tables, each the newest row of its entity, the temperature drawn while a disk carries one
    Given the host answers the hosts fixture
    And the host answers the hosts-storage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/storage"
    Then the "datasets" table of the storage page lists 3 rows
    And the "datasets" table of the storage page draws "tank/zones/web-1/boot" in its "name" column
    And the "disks" table of the storage page lists 9 rows
    And the "disks" table of the storage page draws the "temperature" column
    And the "disks" table of the storage page draws "63°C" in its "temperature" column
    And the "disks" table of the storage page draws "FAULTED" in its "health" column
    And the "disk-io" table of the storage page lists 6 rows
    And the "disk-io" table of the storage page draws "4.00 MB/s" in its "write" column
    And the "pool-io" table of the storage page lists 2 rows
    And the "pool-io" table of the storage page draws "raidz2" in its "type" column
    And the host was sent GET to "/api/agents/3/monitoring/storage/disks" 1 times
    And the host was sent GET to "/api/agents/3/monitoring/storage/disk-io" 1 times
    And the host was sent GET to "/api/agents/3/monitoring/storage/pool-io" 1 times

  Scenario: Storage: the disk I/O opens on the busiest device and a header sorts it, the heading's button dropping the sort
    Given the host answers the hosts fixture
    And the host answers the hosts-storage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/storage"
    Then the first row of the "disk-io" table of the storage page reads "c0t5000C500B2C3D4E6d0"
    When I sort the "disk-io" table of the storage page by "device"
    Then the first row of the "disk-io" table of the storage page reads "c0t5000C500A1B2C3D4d0"
    When I reset the sort of the "disk-io" table of the storage page
    Then the first row of the "disk-io" table of the storage page reads "c0t5000C500B2C3D4E6d0"

  Scenario: Storage: the one search of the page narrows its five tables at once
    Given the host answers the hosts fixture
    And the host answers the hosts-storage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/storage"
    Then the "disks" table of the storage page lists 9 rows
    When I press "Control+f"
    And I search the storage page for "tank"
    Then the "pools" table of the storage page lists 1 rows
    And the "datasets" table of the storage page lists 2 rows
    And the "disks" table of the storage page lists 4 rows
    And the "disk-io" table of the storage page lists 4 rows
    And the "pool-io" table of the storage page lists 1 rows

  Scenario: Storage: a filter group of one table narrows that table alone and a table it leaves no row of says so
    Given the host answers the hosts fixture
    And the host answers the hosts-storage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/storage"
    Then the "disks" table of the storage page lists 9 rows
    When I press "Control+f"
    And I open the filter panel
    And I toggle the filter pill "NVMe"
    Then the "disks" table of the storage page lists 1 rows
    And the "pools" table of the storage page lists 2 rows
    When I toggle the filter pill "FAULTED"
    Then the "disks" table of the storage page says "filtered"

  Scenario: Storage: a read that failed says so in its table and the other tables draw
    Given the host answers the hosts fixture
    And the host answers the hosts-storage fixture
    And the host answers the hosts-storage-failed fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/storage"
    Then the "disks" table of the storage page says "failed"
    And the "pools" table of the storage page lists 2 rows
    And the "datasets" table of the storage page lists 3 rows

  Scenario: Storage: the ARC statistics over the newest sample of the one series, no L2ARC while the sample carries none
    Given the host answers the hosts fixture
    And the host answers the hosts-storage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/storage"
    Then the storage page draws the "arc" section
    And I see "98.34%"
    And the storage page draws no "l2arc" section
    And the host was sent GET to "/api/agents/3/monitoring/storage/arc" 1 times

  Scenario: Storage: the charts, the three that draw every device together, one a device, one a pool and the three of the ARC, all from the series the host's context holds
    Given the host answers the hosts fixture
    And the host answers the hosts-storage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/storage"
    Then the host page draws the "storage-read" chart
    And the host page draws the "storage-write" chart
    And the host page draws the "storage-total" chart
    And the host page draws the "device:c0t5000C500B2C3D4E6d0" chart
    And the host page draws the "pool:tank" chart
    And the host page draws the "arc-memory" chart
    And the host page draws the "arc-efficiency" chart
    And the host page draws the "arc-compression" chart
    And the storage page draws 6 device charts
    And the storage page draws 2 pool charts
    And the "storage-read" chart says nothing of one sample
    And the host was sent GET to "/api/agents/3/monitoring/storage/disk-io" 1 times

  Scenario: Storage: the order of the device charts, the busiest first until a person picks another, and nothing is read for it
    Given the host answers the hosts fixture
    And the host answers the hosts-storage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/storage"
    Then the first device chart is "c0t5000C500B2C3D4E6d0"
    When I order the device charts by "name"
    Then the first device chart is "c0t5000C500A1B2C3D4d0"
    When I order the device charts by "read"
    Then the first device chart is "c0t5000C500B2C3D4E6d0"
    And the host was sent GET to "/api/agents/3/monitoring/storage/disk-io" 1 times

  Scenario: Storage: the window and the resolution in the page's heading, a change of either reads the three series again once
    Given the host answers the hosts fixture
    And the host answers the hosts-storage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    And the browser records its requests
    When I open "/hosts/3/storage"
    Then the host page draws the "storage-total" chart
    And the host was asked "/api/agents/3/monitoring/storage/disk-io" with "limit" as "38"
    And the host was asked "/api/agents/3/monitoring/storage/disk-io" with "per_device" as "true"
    When I pick the storage chart resolution "low"
    Then the host was asked "/api/agents/3/monitoring/storage/disk-io" with "limit" as "5"
    And the host was sent GET to "/api/agents/3/monitoring/storage/disk-io" 2 times
    And the host was sent GET to "/api/agents/3/monitoring/storage/pool-io" 2 times
    And the host was sent GET to "/api/agents/3/monitoring/storage/arc" 2 times
    When I pick the storage chart window "1hour"
    Then the host was sent GET to "/api/agents/3/monitoring/storage/disk-io" 3 times

  Scenario: Storage: the expand button opens a chart in the expanded dialog
    Given the host answers the hosts fixture
    And the host answers the hosts-storage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/storage"
    Then the host page draws the "pool:rpool" chart
    When I expand the "pool:rpool" chart
    Then the expanded chart draws

  Scenario: Storage: every section folds and the fold is kept over a reload
    Given the host answers the hosts fixture
    And the host answers the hosts-storage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/storage"
    Then the "pools" table of the storage page lists 2 rows
    And the "summary" section of the storage page is open
    When I fold the "summary" section of the storage page
    And I fold the "pools" section of the storage page
    And I fold the "datasets" section of the storage page
    And I fold the "disks" section of the storage page
    And I fold the "disk-io" section of the storage page
    And I fold the "pool-io" section of the storage page
    And I fold the "arc" section of the storage page
    And I fold the "charts" section of the storage page
    Then the "summary" section of the storage page is folded
    And the "pools" section of the storage page is folded
    And the "datasets" section of the storage page is folded
    And the "disks" section of the storage page is folded
    And the "disk-io" section of the storage page is folded
    And the "pool-io" section of the storage page is folded
    And the "arc" section of the storage page is folded
    And the "charts" section of the storage page is folded
    When I load the page again
    Then the "pools" section of the storage page is folded
    And the "charts" section of the storage page is folded
    And the "summary" section of the storage page is folded
    When I fold the "pools" section of the storage page
    Then the "pools" table of the storage page lists 2 rows

  Scenario: Storage: the ZFS pools, one card a pool with its health, its capacity and its topology read once each, a scrub in progress sweeping its bar
    Given the host answers the hosts fixture
    And the host answers the hosts-storage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/storage"
    Then the ZFS management draws 2 pools
    And the pool "rpool" draws 2 drives
    And the pool "tank" draws 4 drives
    And the pool "tank" draws a scan in progress
    And the pool "rpool" draws no scan
    And I see "DEGRADED"
    And the host was sent GET to "/api/agents/3/storage/pools" 1 times
    And the host was sent GET to "/api/agents/3/storage/pools/rpool/status" 1 times
    And the host was sent GET to "/api/agents/3/storage/pools/tank/status" 1 times

  Scenario: Storage: Scrub is one request and one notice, a queued task
    Given the host answers the hosts fixture
    And the host answers the hosts-storage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/storage"
    Then the ZFS management draws 2 pools
    When I press the action "pool-scrub" of the pool "rpool"
    Then the host was sent POST to "/api/agents/3/storage/pools/rpool/scrub" 1 times
    And the host was not sent POST to "/api/agents/3/storage/pools/tank/scrub"

  Scenario: Storage: the pool status dialog, the vdev tree as the one table over the parsed status
    Given the host answers the hosts fixture
    And the host answers the hosts-storage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/storage"
    Then the ZFS management draws 2 pools
    When I press the action "pool-status" of the pool "tank"
    Then the storage dialog "zfs-pool-status" lists 5 rows
    And the host was sent GET to "/api/agents/3/storage/pools/tank/status" 2 times

  Scenario: Storage: the pool properties dialog reads every property, the changed keys alone sent as a queued task
    Given the host answers the hosts fixture
    And the host answers the hosts-storage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/storage"
    Then the ZFS management draws 2 pools
    When I press the action "pool-properties" of the pool "rpool"
    Then the storage dialog "zfs-pool-properties" draws
    And the host was sent GET to "/api/agents/3/storage/pools/rpool" 1 times
    When I submit the storage dialog "zfs-pool-properties"
    Then the storage dialog "zfs-pool-properties" says why it cannot be sent
    And the host was not sent PUT to "/api/agents/3/storage/pools/rpool/properties"

  Scenario: Storage: the disks as chassis bays tinted by their pool, and Rescan asks for a collection and reads the inventory again
    Given the host answers the hosts fixture
    And the host answers the hosts-storage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/storage"
    Then the chassis draws 9 bays
    And the bay "c0t5000C500B2C3D4E8d0" reads faulty
    And the bay "c1t1d0" reads free
    And the host was sent GET to "/api/agents/3/monitoring/storage/disks" 1 times
    When I press the storage action "rescan"
    Then the host was sent POST to "/api/agents/3/monitoring/collect" 1 times
    And the host was sent GET to "/api/agents/3/monitoring/storage/disks" 2 times

  Scenario: Storage: a pool member's bay opens the disk dialog with its state from the topology, and Offline is one request
    Given the host answers the hosts fixture
    And the host answers the hosts-storage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/storage"
    Then the pool "tank" draws 4 drives
    When I press the bay "c0t5000C500B2C3D4E8d0"
    Then the storage dialog "zfs-disk-action" draws
    And I see "taken offline by the administrator"

  Scenario: Storage: the ZFS datasets tab, the pool's hierarchy as a tree read as two sweeps, the snapshots folded under their dataset
    Given the host answers the hosts fixture
    And the host answers the hosts-storage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/storage"
    Then the ZFS management draws 2 pools
    When I open the ZFS management tab "datasets"
    Then the dataset tree draws 7 rows
    And the dataset tree draws no row "tank/zones/web-1/boot@before-upgrade"
    And the host was sent GET to "/api/agents/3/storage/datasets" 2 times
    When I press the storage action "toggle-snapshots"
    Then the dataset tree draws the row "tank/zones/web-1/boot@before-upgrade"
    And the dataset tree draws 9 rows

  Scenario: Storage: the create dataset dialog sends the pool and the name as one name, a queued task, and closes
    Given the host answers the hosts fixture
    And the host answers the hosts-storage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/storage"
    And I open the ZFS management tab "datasets"
    Then the dataset tree draws 7 rows
    When I press the storage action "dataset-create"
    And I pick "tank" in the storage dialog select "zfs-create-pool"
    And I fill the storage dialog field "zfs-create-name" with "scratch"
    And I submit the storage dialog "zfs-create-dataset"
    Then the host was sent POST to "/api/agents/3/storage/datasets" carrying "tank/scratch" at "/name"
    And the host was sent POST to "/api/agents/3/storage/datasets" carrying "filesystem" at "/type"
    And the storage dialog "zfs-create-dataset" is gone

  Scenario: Storage: the rollback dialog of a snapshot sends one request with the flags a person set
    Given the host answers the hosts fixture
    And the host answers the hosts-storage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/storage"
    And I open the ZFS management tab "datasets"
    Then the dataset tree draws 7 rows
    When I press the storage action "toggle-snapshots"
    And I press the action "snapshot-rollback" of the dataset row "tank/zones/web-1/boot@before-upgrade"
    And I tick the storage dialog field "zfs-rollback-force"
    And I submit the storage dialog "zfs-rollback-snapshot"
    Then the host was sent POST to "/api/agents/3/storage/snapshot/rollback" carrying "true" at "/force"
    And the host was sent POST to "/api/agents/3/storage/snapshot/rollback" carrying nothing at "/recursive"
    And the storage dialog "zfs-rollback-snapshot" is gone

  Scenario: Storage: Refresh reads again every answer and the series the page draws and the ZFS management's own reads
    Given the host answers the hosts fixture
    And the host answers the hosts-storage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/storage"
    Then the "pools" table of the storage page lists 2 rows
    And the ZFS management draws 2 pools
    And the host was sent GET to "/api/agents/3/monitoring/storage/pools" 1 times
    And the host was sent GET to "/api/agents/3/monitoring/storage/disks" 1 times
    And the host was sent GET to "/api/agents/3/monitoring/storage/disk-io" 1 times
    And the host was sent GET to "/api/agents/3/storage/pools" 1 times
    When I click "Refresh"
    Then the host was sent GET to "/api/agents/3/monitoring/storage/pools" 2 times
    And the host was sent GET to "/api/agents/3/monitoring/storage/disks" 2 times
    And the host was sent GET to "/api/agents/3/monitoring/storage/disk-io" 2 times
    And the host was sent GET to "/api/agents/3/storage/pools" 2 times

  Scenario: Storage: the Controls menu draws the host actions on the storage route
    Given the host answers the hosts fixture
    And the host answers the hosts-storage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/storage"
    Then the storage page draws its frame
    And I see "Host actions"

  Scenario: Storage: on the zoneweaver-agent role every read is sent at the agent's own /api path
    Given the host answers the zones fixture
    And the host answers the zones-storage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/storage"
    Then the "pools" table of the storage page lists 2 rows
    And the "disks" table of the storage page lists 9 rows
    And the "disk-io" table of the storage page lists 6 rows
    And the ZFS management draws 2 pools
    And the host was sent GET to "/api/monitoring/storage/pools"
    And the host was sent GET to "/api/monitoring/storage/disks"
    And the host was sent GET to "/api/monitoring/storage/disk-io"
    And the host was sent GET to "/api/storage/pools"
    And the host was not sent GET to "/api/agents/self/monitoring/storage/pools"
    And the host was not sent GET to "/api/agents/self/storage/pools"
