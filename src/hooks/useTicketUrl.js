import { useEffect, useState } from 'react';

import { log } from '../lib/logger';
import { client } from '../lib/runtime';
import { userDisplayName } from '../utils/identity';
import { ticketUrl } from '../utils/ticketUrl';

const firstValue = (...values) => values.find(value => !!value) || '';

const knobValue = (config, key) => config?.[key]?.value || '';

const ticketOf = ({ backend, status, ticketConfig }) => {
  if (backend) {
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
  if (!status.ticket) {
    return null;
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
 * The support-ticket link of the account menu: a backend host's
 * `ticket_system` knobs from `/api/config/ticket`, an identity-provider
 * host's `status.ticket`, resolved with the active organization's customer
 * code and the signed-in identity; empty when there is no ticket system or
 * no user.
 *
 * @param {Object} options - The ticket inputs
 * @param {boolean} options.backend - Whether the session is the app's own backend
 * @param {Object} options.status - The payload from `probeStatus`
 * @param {Object|null} options.user - The session's user
 * @param {Object|null} options.claims - The session's claims
 * @param {string} options.activeOrgCode - The active organization's customer code
 * @returns {string} The ticket URL
 */
export const useTicketUrl = ({ backend, status, user, claims, activeOrgCode }) => {
  const [ticketConfig, setTicketConfig] = useState(null);

  useEffect(() => {
    if (!backend) {
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
  }, [backend]);

  return helpUrlOf({
    ticket: ticketOf({ backend, status, ticketConfig }),
    user,
    claims,
    activeOrgCode,
  });
};
