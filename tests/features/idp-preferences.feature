Feature: identity contract, what the browser knows of a person saved to their account

  Background:
    Given the host answers the identity fixture
    And the host answers the idp-preferences fixture

  Scenario: browser facts: the first signed-in load reads GET /api/user/preferences and sends one PATCH filling every empty member with the browser's facts, the country from GET /api/public/geo/country and the device's mode and motion
    When I open "/user/profile"
    Then I see "Mark Gilbert"
    And the host was sent GET to "/api/user/preferences"
    And the host was sent GET to "/api/public/geo/country"
    And the host was sent PATCH to "/api/user/preferences" carrying "timezone" as some value
    And the host was sent PATCH to "/api/user/preferences" carrying "locale" as some value
    And the host was sent PATCH to "/api/user/preferences" carrying "hour_cycle" as some value
    And the host was sent PATCH to "/api/user/preferences" carrying "language" as "en"
    And the host was sent PATCH to "/api/user/preferences" carrying "region" as "US"
    And the host was sent PATCH to "/api/user/preferences" carrying "device_mode" as "light"
    And the host was sent PATCH to "/api/user/preferences" carrying "device_motion" as "auto"
    And the host was sent PATCH to "/api/user/preferences" 1 times
    And the host was sent GET to "/api/user/preferences" 1 times

  Scenario: browser facts: a member the account holds is never overwritten, the country is not asked while region is held, and a device fact that differs is sent alone
    Given the host answers the idp-preferences/filled fixture
    When I open "/user/profile"
    Then I see "Mark Gilbert"
    And the host was sent PATCH to "/api/user/preferences" carrying "device_mode" as "light"
    And the host was sent PATCH to "/api/user/preferences" carrying no "timezone"
    And the host was sent PATCH to "/api/user/preferences" carrying no "language"
    And the host was sent PATCH to "/api/user/preferences" carrying no "locale"
    And the host was sent PATCH to "/api/user/preferences" carrying no "hour_cycle"
    And the host was sent PATCH to "/api/user/preferences" carrying no "region"
    And the host was sent PATCH to "/api/user/preferences" carrying no "device_motion"
    And the host was sent PATCH to "/api/user/preferences" 1 times
    And the host was not sent GET to "/api/public/geo/country"

  Scenario: browser facts: nothing is sent while the account holds every member and the device facts match
    Given the host answers the idp-preferences/same fixture
    When I open "/user/profile"
    Then I see "Mark Gilbert"
    And the host was sent GET to "/api/user/preferences"
    When I open "/user/profile/preferences"
    Then the profile page draws the editable preferences
    And the host was not sent PATCH to "/api/user/preferences"

  Scenario: browser facts: a guest-only account is asked nothing and sent nothing
    Given the host answers the idp-preferences/guest fixture
    When I open "/user/profile"
    Then I see "Tom Baker"
    And the host was not sent GET to "/api/user/preferences"
    And the host was not sent PATCH to "/api/user/preferences"

  Scenario: the preferences page draws the mode, the motion and the clock as tiles, the approval channels as tick tiles greyed where the host cannot deliver, no device fact, and Save sends the changed clock and channels through one PATCH /api/user/preferences
    Given the host answers the idp-preferences/same fixture
    When I open "/user/profile/preferences"
    Then the profile page draws the editable preferences
    And the profile tiles "profile-preferences-mode" offer "auto, light, dark"
    And the profile tiles "profile-preferences-mode" read "dark"
    And the profile tiles "profile-preferences-motion" offer "auto, reduce"
    And the profile tiles "profile-preferences-motion" read "auto"
    And the page field "profile-preferences/locale" reads "en-GB"
    And the profile tiles "profile-preferences/hour_cycle" read "h23"
    And the profile tiles "profile-preferences/ciba_channels" offer "in_app, push, email, sms"
    And the profile tiles "profile-preferences/ciba_channels" read "in_app"
    And the profile tiles "profile-preferences/ciba_channels" grey "push"
    And the profile tiles "profile-preferences/ciba_channels" offer "sms" freely
    And the page draws no panel "device-facts"
    And the profile page draws no field "profile-preferences-device_mode"
    When I pick "h12" in the profile tiles "profile-preferences/hour_cycle"
    And I pick "email" in the profile tiles "profile-preferences/ciba_channels"
    And I press the page's "save-preferences" action
    Then the host was sent PATCH to "/api/user/preferences" carrying "hour_cycle" as "h12"
    And the host was sent PATCH to "/api/user/preferences" carrying "in_app,email" at "/ciba_channels"
    And the host was sent PATCH to "/api/user/preferences" carrying no "locale"
    And the host was sent PATCH to "/api/user/preferences" carrying no "timezone"
    And the host was sent PATCH to "/api/user/preferences" 1 times
    And the page raised 1 success notice

  Scenario: the preferences page's Save sends nothing while nothing differs and still draws the saved notice
    Given the host answers the idp-preferences/same fixture
    When I open "/user/profile/preferences"
    Then the profile page draws the editable preferences
    When I press the page's "save-preferences" action
    Then the page raised 1 success notice
    And the host was not sent PATCH to "/api/user/preferences"

  Scenario: the sessions list draws each row's browser and system from the row, never from the user agent, and writes its times in the account's time zone, locale and clock
    Given the host answers the idp-preferences/same fixture
    When I open "/user/profile/sessions"
    Then the host was sent GET to "/api/user/sessions"
    And I see "Firefox · Windows"
    And I see "Safari · macOS"
    And I do not see "Mozilla/5.0"
    And the sessions list writes the time "6 Sept 2026, 07:02"
