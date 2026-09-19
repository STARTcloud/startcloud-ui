import { useEffect, useState } from 'react';

import { log } from '../lib/logger';
import { client } from '../lib/runtime';
import { userDisplayName } from '../utils/identity';
import { ticketUrl } from '../utils/ticketUrl';

const firstValue = (...values) => values.find(value => !!value) || '';

const servesTicketConfig = status => !status.ticket;

const appOf = status => (status.idp ? status.idp.client_id : status.role);

const ticketOf = ({ status, ticketConfig }) => {
  if (servesTicketConfig(status)) {
    if (!ticketConfig?.enabled) {
      return null;
    }
    return {
      base_url: ticketConfig.base_url || '',
      req_type: firstValue(ticketConfig.req_type, 'sso'),
      fallback_customer_id: ticketConfig.fallback_customer_id || '',
      context: ticketConfig.context || '',
    };
  }
  return { ...status.ticket, context: `${appOf(status)}|${status.version}` };
};

const helpUrlOf = ({ ticket, user, claims, activeOrgCode }) => {
  if (!ticket) {
    return '';
  }
  if (!user) {
    return ticketUrl({
      baseUrl: ticket.base_url,
      reqType: ticket.req_type,
      customerId: ticket.fallback_customer_id,
      context: ticket.context,
    });
  }
  return ticketUrl({
    baseUrl: ticket.base_url,
    reqType: ticket.req_type,
    customerId: firstValue(activeOrgCode, claims?.customer_id, ticket.fallback_customer_id),
    user: firstValue(claims?.name, userDisplayName(user)),
    email: firstValue(claims?.email, user?.email),
    context: ticket.context,
  });
};

/**
 * The support-ticket link: the plain `ticket_system` section from
 * `/api/config/ticket` on a host whose status answers `ticket: null`, else
 * the host's `status.ticket`; signed in it is the account menu's Help URL
 * resolved with the active organization's customer code and the identity,
 * signed out the cluster's ticket icon URL with the fallback customer id
 * alone and no user or email; empty when there is no ticket system.
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
