import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import ToolFormDialog from './ToolFormDialog';

/**
 * One credential of Connect as: its name, or its id where it has none,
 * its kind and the default badge on the default one.
 */
export const ConnectAsLabel = ({ credential }) => {
  const { t } = useTranslation();
  return (
    <>
      {credential.name || credential.id}
      {credential.kind ? <code className="small ms-2">{credential.kind}</code> : null}
      {credential.default === true ? (
        <span className="badge text-bg-secondary ms-2">
          {t('console.inactiveConsoleDisplay.connectAsDefault')}
        </span>
      ) : null}
    </>
  );
};

ConnectAsLabel.propTypes = {
  credential: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string,
    kind: PropTypes.string,
    default: PropTypes.bool,
  }).isRequired,
};

/**
 * Connect as asked by a console door away from the card's own start
 * buttons: the credentials of the use in the order `credentialsFor`
 * answers, the default first, a press handing the credential's id to
 * `onPick` before anything starts, Cancel starting nothing.
 */
const ConnectAsDialog = ({ credentials, onPick, onClose }) => {
  const { t } = useTranslation();
  return (
    <ToolFormDialog
      dialog="connect-as"
      title={t('console.inactiveConsoleDisplay.connectAs')}
      busy={false}
      onClose={onClose}
      onSubmit={() => undefined}
    >
      <div className="list-group" data-menu="connect-as">
        {credentials.map(row => (
          <button
            key={row.id}
            type="button"
            className="list-group-item list-group-item-action"
            data-credential={row.id}
            onClick={() => onPick(String(row.id))}
          >
            <ConnectAsLabel credential={row} />
          </button>
        ))}
      </div>
    </ToolFormDialog>
  );
};

ConnectAsDialog.propTypes = {
  credentials: PropTypes.arrayOf(PropTypes.object).isRequired,
  onPick: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ConnectAsDialog;
