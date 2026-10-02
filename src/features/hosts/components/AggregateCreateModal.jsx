import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AGGREGATE_FORM, aggregateProblem, nextIndexedName } from '../utils/networkingManagement';

import AggregateCreateForm from './AggregateCreateForm';
import ToolFormDialog from './ToolFormDialog';

/**
 * The create dialog of an aggregate, hyperweaver-ui's: the fields of
 * `AggregateCreateForm`, the name the next free `aggr<n>`. The form's
 * problem draws over the fields and holds the send, a running CDP
 * service among the problems until its box is ticked; the body is
 * `aggregateBody`, the CDP disable sent first where the box is ticked.
 */
const AggregateCreateModal = ({ aggregates, links, cdpRunning, busy, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(() => ({
    ...AGGREGATE_FORM,
    name: nextIndexedName(aggregates, 'aggr'),
  }));
  const [newLink, setNewLink] = useState('');
  const [tried, setTried] = useState(false);
  const problem = aggregateProblem(form, cdpRunning);
  const change = (field, value) => setForm(current => ({ ...current, [field]: value }));

  const addLink = () => {
    const link = newLink.trim();
    if (link && !form.links.includes(link)) {
      change('links', [...form.links, link]);
      setNewLink('');
    }
  };

  const submit = () => {
    setTried(true);
    if (!problem) {
      onSubmit(form);
    }
  };

  return (
    <ToolFormDialog
      dialog="aggregate-create"
      title={t('host.aggregateCreateModal.title')}
      submitKey="host.aggregateCreateModal.title"
      problemKey={tried ? problem : ''}
      busy={busy}
      onClose={onClose}
      onSubmit={submit}
    >
      <AggregateCreateForm
        form={form}
        busy={busy}
        newLink={newLink}
        setNewLink={setNewLink}
        links={links}
        onChange={change}
        onAddLink={addLink}
        onRemoveLink={link =>
          change(
            'links',
            form.links.filter(held => held !== link)
          )
        }
        cdpRunning={cdpRunning}
      />
    </ToolFormDialog>
  );
};

AggregateCreateModal.propTypes = {
  aggregates: PropTypes.array.isRequired,
  links: PropTypes.array.isRequired,
  cdpRunning: PropTypes.bool.isRequired,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default AggregateCreateModal;
