import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import TabStrip from '../../../components/common/TabStrip';
import { useHostRow } from '../hooks/useHostRow';
import { hostPagesFor } from '../pages';

/**
 * The tab row of a host's pages, hyperweaver-ui's context tabs, drawn
 * under the heading of every page of a host: one tab a page the host's
 * own row offers, from the one list of `HOST_PAGES`, each a link to the
 * page's route with its glyph and label, the tab of the current route
 * active; the one `TabStrip` draws it, and nothing draws for a host that
 * offers the Overview alone.
 */
const HostTabs = ({ id }) => {
  const { t } = useTranslation();
  const server = useHostRow(id);
  const tabs = useMemo(
    () =>
      hostPagesFor(server, id).map(page => ({
        key: page.key,
        label: t(page.labelKey),
        to: page.to,
        end: page.end,
        icon: page.icon,
      })),
    [server, id, t]
  );
  if (tabs.length < 2) {
    return null;
  }
  return (
    <div data-tabs="host">
      <TabStrip tabs={tabs} className="mb-3" />
    </div>
  );
};

HostTabs.propTypes = {
  id: PropTypes.string.isRequired,
};

export default HostTabs;
