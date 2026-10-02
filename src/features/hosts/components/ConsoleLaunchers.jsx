import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaDisplay, FaFileArrowDown, FaFolderOpen } from 'react-icons/fa6';

import { hostHasFeature } from '../utils/capabilities';

import { launchDirectoryOrFtp, launchRdp } from './consoleActions';

/**
 * The launchers of a console header on a host that lists
 * `host-launchers`, hyperweaver-ui's three: the native RDP client, the
 * machine's working directory, enabled on an agent role alone because
 * the agent host is the desktop, and the sftp handler at the machine;
 * the labels are the drawing console's own keys under `prefix`.
 */
const ConsoleLaunchers = ({ prefix, server = null, launchers, loading }) => {
  const { t } = useTranslation();
  if (!hostHasFeature(server, 'host-launchers')) {
    return null;
  }
  const directoryLabel = launchers.isDirect
    ? t(`${prefix}.openWorkingDirectory`)
    : t(`${prefix}.directModeOnly`);
  return (
    <>
      <button
        type="button"
        className="btn btn-sm btn-info"
        onClick={() => launchRdp(launchers)}
        disabled={loading}
        title={t(`${prefix}.openNativeVrdp`)}
        aria-label={t(`${prefix}.openNativeVrdp`)}
        data-action="console-native-rdp"
      >
        <FaDisplay aria-hidden="true" />
      </button>
      <button
        type="button"
        className="btn btn-sm btn-secondary"
        onClick={() => launchDirectoryOrFtp({ ...launchers, kind: 'directory' })}
        disabled={!launchers.isDirect}
        title={directoryLabel}
        aria-label={directoryLabel}
        data-action="console-directory"
      >
        <FaFolderOpen aria-hidden="true" />
      </button>
      <button
        type="button"
        className="btn btn-sm btn-secondary"
        onClick={() => launchDirectoryOrFtp({ ...launchers, kind: 'ftp' })}
        title={t(`${prefix}.openSftpClient`)}
        aria-label={t(`${prefix}.openSftpClient`)}
        data-action="console-ftp"
      >
        <FaFileArrowDown aria-hidden="true" />
      </button>
    </>
  );
};

ConsoleLaunchers.propTypes = {
  prefix: PropTypes.string.isRequired,
  server: PropTypes.object,
  launchers: PropTypes.shape({
    status: PropTypes.object.isRequired,
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    isDirect: PropTypes.bool.isRequired,
    setLoading: PropTypes.func.isRequired,
    setError: PropTypes.func.isRequired,
  }).isRequired,
  loading: PropTypes.bool.isRequired,
};

export default ConsoleLaunchers;
