Feature: theme logo

  Background:
    Given the host answers the theme-logo fixture

  Scenario: Theme logo: a chosen pack whose manifest row carries a logo paints the chrome's mark, the favicon and the About mark
    When I open "/about"
    Then I see "Mark Gilbert"
    And the document carries "data-brand" as "shi"
    And the chrome's mark is "/brand/shi/mark.svg"
    And the favicon is "/brand/shi/mark.svg"
    And the About mark is "/brand/shi/mark.svg"

  Scenario: Theme logo: a chosen pack without a logo keeps brand.logo_url
    Given the host answers the theme-logo-plain fixture
    And the build answers no theme manifest
    When I open "/about"
    Then I see "Mark Gilbert"
    And the document carries "data-brand" as "lcars"
    And the chrome's mark is "/brand/startcloud/mark.svg"
    And the favicon is "/brand/startcloud/mark.svg"
    And the About mark is "/brand/startcloud/mark.svg"

  Scenario: Theme logo: a chosen pack whose logo fails to load falls back to brand.logo_url on the mark and the favicon
    Given the build answers 404 at "/brand/shi/mark.svg"
    When I open "/about"
    Then I see "Mark Gilbert"
    And the document carries "data-brand" as "shi"
    And the chrome's mark is "/brand/startcloud/mark.svg"
    And the favicon is "/brand/startcloud/mark.svg"
    And the About mark is "/brand/startcloud/mark.svg"
    And the chrome's mark is drawn whole

  Scenario: Theme logo: clearing the theme returns the mark and the favicon to brand.logo_url
    When I open "/user/profile/preferences"
    Then the chrome's mark is "/brand/shi/mark.svg"
    When I pick "" in the profile select "profile-preferences-theme"
    Then the host was sent PATCH to "/api/user/preferences" carrying null at "/theme"
    And the document carries "data-brand" as "startcloud"
    And the chrome's mark is "/brand/startcloud/mark.svg"
    And the favicon is "/brand/startcloud/mark.svg"
