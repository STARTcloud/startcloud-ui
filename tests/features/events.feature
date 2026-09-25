Feature: events contract

  Background:
    Given the host answers the events fixture

  Scenario: The session's headers on the request; a cookie host sends the session cookie alone, no token header
    Given the stream answers the ready frames
    When I open "/about"
    Then I see "Mark Gilbert"
    And the stream was requested at "/api/events"
    And the stream request carried "accept" as "text/event-stream"
    And the stream request carried no "authorization"
    And the stream request carried no "x-access-token"

  Scenario: The session's headers on the request; `401` ends the session on the bus
    Given the stream answers 401
    When I open "/about"
    Then the host was sent GET to "/api/user"
    And I see "You were signed out."
    And I see "Your session ended. Sign in again to continue where you were."

  Scenario: The session's headers on the request; `403` stops for good
    Given the stream answers 403
    When I open "/about"
    Then the stream has been requested once
    And I see "Mark Gilbert"
    And I do not see "You were signed out."

  Scenario: The session's headers on the request; `204` stops for good
    Given the stream answers 204
    When I open "/about"
    Then the stream has been requested once
    And I see "Mark Gilbert"
    And I do not see "You were signed out."

  Scenario: The UI opens the stream through `connectEventStream` and pages read it through `useEventStream`; no page opens a stream of its own
    Given the stream answers the ready frames
    When I open "/about"
    Then I see "Mark Gilbert"
    And the stream was requested at "/api/events"
    And the stream was requested with "topics" as "session,notifications,health"

  Scenario: `useSessionKeepalive` answers `session-terminated` on the one stream with `events.endSession()`
    Given the stream answers the session-terminated frames
    When I open "/about"
    Then I see "You were signed out."
    And I see "Your session ended. Sign in again to continue where you were."
