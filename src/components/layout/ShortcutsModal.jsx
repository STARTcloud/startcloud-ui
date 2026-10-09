import PropTypes from 'prop-types';
import { Fragment, useId, useRef, useState } from 'react';
import { Form, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import { filterRows, groupRows, partsOf } from '../../lib/shortcuts';

export const shortcutRowShape = PropTypes.shape({
  key: PropTypes.string.isRequired,
  category: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
  keys: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.string)).isRequired,
  run: PropTypes.func.isRequired,
  when: PropTypes.func,
});

const Combo = ({ combo }) => {
  const { t } = useTranslation();
  return (
    <kbd>
      {partsOf(combo)
        .map(part => (part.name ? t(`navbar.shortcuts.keys.${part.name}`) : part.text))
        .join('+')}
    </kbd>
  );
};

Combo.propTypes = {
  combo: PropTypes.string.isRequired,
};

const Keys = ({ keys }) => {
  const { t } = useTranslation();
  return (
    <span className="shortcut-keys">
      {keys.map((sequence, index) => (
        <Fragment key={sequence.join(' ')}>
          {index > 0 ? (
            <span className="text-body-secondary">{t('navbar.shortcuts.or')}</span>
          ) : null}
          <span className="shortcut-sequence">
            {sequence.map(combo => (
              <Combo key={combo} combo={combo} />
            ))}
          </span>
        </Fragment>
      ))}
    </span>
  );
};

Keys.propTypes = {
  keys: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.string)).isRequired,
};

const Category = ({ group }) => {
  const { t } = useTranslation();
  return (
    <section className="shortcut-category" data-category={group.category}>
      <h6 className="text-uppercase text-body-secondary small fw-semibold">
        {t(`navbar.shortcuts.category.${group.category}`)}
      </h6>
      <ul className="list-unstyled mb-0">
        {group.rows.map(row => (
          <li key={row.key} className="shortcut-row" data-shortcut={row.key}>
            <span>{t(row.labelKey)}</span>
            <Keys keys={row.keys} />
          </li>
        ))}
      </ul>
    </section>
  );
};

Category.propTypes = {
  group: PropTypes.shape({
    category: PropTypes.string.isRequired,
    rows: PropTypes.arrayOf(shortcutRowShape).isRequired,
  }).isRequired,
};

/**
 * The Keyboard Shortcuts modal: the title, a filter over the description
 * and the key combination, which takes the focus as the modal opens, and
 * the rows by category, Jump to, Application, Navigation, Actions and
 * Search, each row its description and its keys as `<kbd>`, alternatives
 * joined by "or" and a chord as two keys; Escape and the close button
 * close it, the filter emptied once it has closed.
 */
const ShortcutsModal = ({ show, rows, onHide }) => {
  const { t } = useTranslation();
  const titleId = useId();
  const inputRef = useRef(null);
  const [filter, setFilter] = useState('');
  const groups = groupRows(filterRows(rows, filter, row => t(row.labelKey)));

  return (
    <Modal
      show={show}
      onHide={onHide}
      dialogClassName="chrome-modal list-modal shortcuts-modal"
      aria-labelledby={titleId}
      onEntered={() => inputRef.current?.focus()}
      onExited={() => setFilter('')}
      scrollable
    >
      <Modal.Header closeButton>
        <Modal.Title as="h5" id={titleId}>
          {t('navbar.shortcuts.title')}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Control
          ref={inputRef}
          type="search"
          className="mb-3"
          value={filter}
          placeholder={t('navbar.shortcuts.filter')}
          aria-label={t('navbar.shortcuts.filter')}
          onChange={event => setFilter(event.target.value)}
        />
        {groups.length === 0 ? (
          <p className="text-body-secondary mb-0">{t('navbar.shortcuts.noMatches')}</p>
        ) : (
          <div className="shortcut-categories">
            {groups.map(group => (
              <Category key={group.category} group={group} />
            ))}
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
};

ShortcutsModal.propTypes = {
  show: PropTypes.bool.isRequired,
  rows: PropTypes.arrayOf(shortcutRowShape).isRequired,
  onHide: PropTypes.func.isRequired,
};

export default ShortcutsModal;
