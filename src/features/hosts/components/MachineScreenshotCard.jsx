import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaRotate } from 'react-icons/fa6';

import SectionCard, { foldsShape } from '../../../components/common/SectionCard';
import { useStatus } from '../../../contexts/StatusContext';
import { log } from '../../../lib/logger';
import { fetchScreenshot } from '../api/machines';
import { useHostRow } from '../hooks/useHostRow';
import { hostHasFeature } from '../utils/capabilities';

const FOLD = 'machine-screenshot';

const NONE = { machine: '', url: '' };

/**
 * One frame of a machine's screen as an object URL, `GET
 * machines/{name}/vnc/screenshot` read as a blob because an image
 * element cannot carry the session's headers: read once as the card
 * draws while `asked` and again when `turn` moves, the page's Refresh,
 * the card's own and the stream's fresh opening, never on a clock; the
 * URL of the frame before it is released as the next one lands and the
 * last one when the card goes.
 *
 * @param {Object} options - The status, the host, the machine, whether to ask and the turn
 * @returns {string} The URL, empty until a frame answered
 */
const useScreenshot = ({ status, id, name, asked, turn }) => {
  const [held, setHeld] = useState(NONE);
  const current = useRef('');
  const machine = `${id}|${name}`;

  useEffect(() => {
    if (!asked) {
      return undefined;
    }
    let live = true;
    fetchScreenshot(status, id, name)
      .then(blob => {
        if (!live || !(blob instanceof Blob)) {
          return;
        }
        const url = URL.createObjectURL(blob);
        if (current.current) {
          URL.revokeObjectURL(current.current);
        }
        current.current = url;
        setHeld({ machine: `${id}|${name}`, url });
      })
      .catch(error => {
        log.api.error('Error fetching screenshot', { id, name, error: error.message });
      });
    return () => {
      live = false;
    };
  }, [asked, status, id, name, turn]);

  useEffect(
    () => () => {
      if (current.current) {
        URL.revokeObjectURL(current.current);
        current.current = '';
      }
    },
    []
  );

  return asked && held.machine === machine ? held.url : '';
};

/**
 * The screen of one machine, hyperweaver-ui's screenshot card, a section
 * card that folds under `machine-screenshot`: one frame of the running
 * machine's screen, read from a host whose own row lists
 * `machine-screenshot` and only while the machine runs, because the
 * agent has no frame of a machine that is off; Refresh in the card's
 * actions reads a new frame. hyperweaver-ui read a new frame every five
 * minutes; that clock is not carried over. Nothing draws until a frame
 * answered.
 */
const MachineScreenshotCard = ({ id, name, running, turn, folds }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const server = useHostRow(id);
  const [own, setOwn] = useState(0);
  const asked = running && hostHasFeature(server, 'machine-screenshot');
  const url = useScreenshot({ status, id, name, asked, turn: `${turn}-${own}` });

  if (!url) {
    return null;
  }

  const refresh = t('hosts.machines.screenshot.refresh');
  const again = (
    <button
      type="button"
      className="btn btn-sm btn-outline-secondary"
      title={refresh}
      aria-label={refresh}
      data-action="screenshot"
      onClick={() => setOwn(value => value + 1)}
    >
      <FaRotate aria-hidden="true" />
    </button>
  );

  return (
    <div className="col-12 col-lg-6" data-panel="machine-screenshot">
      <SectionCard
        title={t('hosts.machines.screenshot.title')}
        className="mb-0 h-100"
        actions={again}
        folded={folds.folded(FOLD)}
        onFold={() => folds.toggle(FOLD)}
      >
        <img
          src={url}
          alt={t('hosts.machines.screenshot.alt', { name })}
          className="img-fluid border rounded machine-screenshot"
        />
      </SectionCard>
    </div>
  );
};

MachineScreenshotCard.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  running: PropTypes.bool.isRequired,
  turn: PropTypes.number.isRequired,
  folds: foldsShape.isRequired,
};

export default MachineScreenshotCard;
