import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import TabStrip from '../../../components/common/TabStrip';
import { useHostRow } from '../hooks/useHostRow';
import { machinePagesFor } from '../machinePages';
import { nounKeyOf } from '../utils/machines';

/**
 * The tab row of a machine's pages, hyperweaver-ui's machine tabs, drawn
 * under the heading of every page of a machine: one tab a page the
 * host's own row and the person's role offer, from the one list of
 * `MACHINE_PAGES`, each a link to the page's route with its glyph and
 * label, the Overview named by the noun the host's hypervisors fix, the
 * tab of the current route active; the one `TabStrip` draws it, and
 * nothing draws for a machine that offers the Overview alone.
 */
const MachineTabs = ({ id, name, role = '' }) => {
  const { t } = useTranslation();
  const server = useHostRow(id);
  const noun = t(nounKeyOf(server ? [server] : []));
  const tabs = useMemo(
    () =>
      machinePagesFor({ server, id, name, role }).map(page => ({
        key: page.key,
        label: t(page.labelKey, { noun }),
        to: page.to,
        end: page.end,
        icon: page.icon,
      })),
    [server, id, name, role, noun, t]
  );
  if (tabs.length < 2) {
    return null;
  }
  return (
    <div data-tabs="machine">
      <TabStrip tabs={tabs} className="mb-3" />
    </div>
  );
};

MachineTabs.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  role: PropTypes.string,
};

export default MachineTabs;
