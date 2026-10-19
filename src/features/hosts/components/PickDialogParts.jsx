import PropTypes from 'prop-types';
import { Card, Col, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import RecordRows from '../../../components/common/RecordRows';

const NEUTRAL_CLASS = 'bg-secondary bg-opacity-25';

/**
 * The filter groups of a dialog's table as pills, each group its label
 * and one counted pill a value, the active ones in the group's tone.
 */
export const FilterPills = ({ groups }) => (
  <div className="d-flex flex-wrap align-items-center gap-2">
    {groups
      .filter(group => Object.keys(group.entries).length > 0)
      .map(group => (
        <span key={group.key} className="d-inline-flex flex-wrap align-items-center gap-1">
          <span className="small text-muted">{group.label}</span>
          {Object.entries(group.entries).map(([value, count]) => (
            <button
              key={value}
              type="button"
              className={`badge rounded-pill border-0 ${
                group.activeSet.has(value) ? group.activeClass : NEUTRAL_CLASS
              }`}
              data-filter={group.key}
              data-value={value}
              aria-pressed={group.activeSet.has(value)}
              onClick={() => group.onToggle(value)}
            >
              {group.labelFor(value)}
              {typeof count === 'number' ? ` (${count})` : null}
            </button>
          ))}
        </span>
      ))}
  </div>
);

FilterPills.propTypes = {
  groups: PropTypes.array.isRequired,
};

/**
 * The cards view of a dialog's rows: one card a row, the table's columns
 * as record rows and the row's actions under them, `name` the list's
 * `data-list` and `rowProp` the prop the row reaches the actions under.
 */
export const RowCards = ({
  name,
  rows,
  columns,
  rowKey,
  rowProp = 'row',
  ctx,
  RowActions,
  actionsProps,
  emptyText,
}) => {
  const { t } = useTranslation();
  if (rows.length === 0) {
    return <p className="text-muted mb-0">{emptyText}</p>;
  }
  return (
    <Row xs={1} md={2} className="g-3" data-list={name}>
      {rows.map(row => (
        <Col key={rowKey(row)}>
          <Card className="h-100 shadow-sm">
            <Card.Body className="d-flex flex-column gap-2">
              <RecordRows
                className="mb-0"
                rows={columns.map(column => ({
                  key: column.key,
                  label: t(column.labelKey),
                  value: column.render ? column.render(row, ctx) : column.value(row, ctx),
                }))}
              />
              <div className="mt-auto">
                <RowActions {...{ [rowProp]: row }} {...actionsProps} />
              </div>
            </Card.Body>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

RowCards.propTypes = {
  name: PropTypes.string.isRequired,
  rows: PropTypes.array.isRequired,
  columns: PropTypes.array.isRequired,
  rowKey: PropTypes.func.isRequired,
  rowProp: PropTypes.string,
  ctx: PropTypes.object.isRequired,
  RowActions: PropTypes.elementType.isRequired,
  actionsProps: PropTypes.object.isRequired,
  emptyText: PropTypes.node.isRequired,
};
