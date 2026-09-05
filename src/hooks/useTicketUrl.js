import { useEffect, useState } from 'react';

import { log } from '../lib/logger';
import { client } from '../lib/runtime';
import { userDisplayName } from '../utils/identity';
import { ticketUrl } from '../utils/ticketUrl';

const firstValue = (...values) => values.find(value => !!value) || '';

const knobValue = (config, key) => config?.[key]?.value || '';

const servesTicketConfig = status => !status.ticket;

const ticketOf = ({ status, ticketConfig }) => {
  if (servesTicketConfig(status)) {
    if (!knobValue(ticketConfig, 'enabled')) {
      return null;
    }
    return {
      baseUrl: knobValue(ticketConfig, 'base_url'),
      reqType: firstValue(knobValue(ticketConfig, 'req_type'), 'sso'),
      fallbackCustomerId: knobValue(ticketConfig, 'fallback_customer_id'),
      context: knobValue(ticketConfig, 'context'),
    };
  }
  return { ...status.ticket, context: `${status.idp.clientId}|${status.version}` };
};

const helpUrlOf = ({ ticket, user, claims, activeOrgCode }) => {
  if (!ticket || !user) {
    return '';
  }
  return ticketUrl({
    baseUrl: ticket.baseUrl,
    reqType: ticket.reqType,
    customerId: firstValue(activeOrgCode, claims?.customer_id, ticket.fallbackCustomerId),
    user: firstValue(claims?.name, userDisplayName(user)),
    email: firstValue(claims?.email, user?.email),
    context: ticket.context,
  });
};

/**
 * The support-ticket link of the account menu: the `ticket_system` knobs
 * from `/api/config/ticket` on a host whose status answers `ticket: null`,
 * else the host's `status.ticket`, resolved with the active organization's
 * customer code and the signed-in identity; empty when there is no ticket
 * system or no user.
 *
 * @param {Object} options - The ticket inputs
 * @param {Object} options.status - The payload from `probeStatus`
 * @param {Object|null} options.user - The session's user
 * @param {Object|null} options.claims - The session's claims
 * @param {string} options.activeOrgCode - The active organization's customer code
 * @returns {string} The ticket URL
 */
export const useTicketUrl = ({ status, user, claims, activeOrgCode }) => {
  const [ticketConfig, setTicketConfig] = useState(null);
  const fetchConfig = servesTicketConfig(status);

  useEffect(() => {
    if (!fetchConfig) {
      return undefined;
    }
    let mounted = true;
    client
      .get('/api/config/ticket', { auth: false })
      .then(data => {
        if (mounted && data?.ticket_system) {
          setTicketConfig(data.ticket_system);
        }
      })
      .catch(error => {
        log.api.error('Error fetching ticket config', { error: error.message });
      });
    return () => {
      mounted = false;
    };
  }, [fetchConfig]);

  return helpUrlOf({
    ticket: ticketOf({ status, ticketConfig }),
    user,
    claims,
    activeOrgCode,
  });
};
