Feature: downloads

  Scenario: Add from link: a writing member gives the zone a URL, the fetch is sent with the URL alone, and its answer reaches the placing form prefilled from the file name the server stored
    Given the host answers the downloads-fetch fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"access_token\":\"t\"}"
    When I open "/STARTcloud/downloads"
    And I click "Add New"
    And I fill the control "download-fetch/url" with "https://downloads.example.com/domino/Domino_1451FP1_Linux.tar"
    And I press the "download-fetch" action
    Then the host was sent POST to "/api/organization/STARTcloud/download/pending/fetch" carrying only "url"
    And the host was sent POST to "/api/organization/STARTcloud/download/pending/fetch" carrying "url" as "https://downloads.example.com/domino/Domino_1451FP1_Linux.tar"
    And the control "download-place/file_name" holds "Domino_1451FP1_Linux.tar"
    And the control "download-place/product" holds "domino-1451fp1-linux"
    And the control "download-place/patch" holds "release"
