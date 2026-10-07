import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import ChartDialog from '../../../../components/common/ChartDialog';
import { chartOf } from '../../charts/registry';
import { chartPills, entitySpec, visibleSeries } from '../../utils/chartSpecs';
import { formatBandwidth, formatSpeed } from '../../utils/networking';

import { hopPoints } from './pathModel';
import { nodeName, percentText, sayWord } from './PathRail';

const CHART = 'interface';

const BYTES = 'B';

const FACT_LABELS = {
  mac: 'hostTools.vnicNode.macLabel',
  mtu: 'hostTools.vnicNode.mtuLabel',
  vlan: 'hostTools.vnicNode.vlanLabel',
  over: 'hostTools.vnicNode.overLabel',
  speed: 'hostTools.vnicNode.speedLabel',
  state: 'hostTools.vnicNode.stateLabel',
  ip: 'hostTools.vnicNode.ipLabel',
  status: 'hostTools.physicalNicNode.statusLabel',
  members: 'hostTools.aggregateNode.membersLabel',
};

const factLabel = key => FACT_LABELS[key] || `hostTools.networkPath.facts.${key}`;

const toggled = (visibility, key) => ({ ...visibility, [key]: visibility[key] === false });

const packetText = packets =>
  ['rx', 'tx']
    .filter(lane => packets?.[lane] > 0)
    .map(lane => `${lane === 'rx' ? '↓' : '↑'}${Math.round(packets[lane])} ${BYTES}`)
    .join(' ');

const wordsText = (t, words) =>
  words
    .filter(word => !word.rate)
    .map(word => sayWord(t, word))
    .join(' · ');

const factsOf = (t, node) => [
  { key: 'detail', value: wordsText(t, node.meta) },
  {
    key: 'status',
    value: node.lines
      .map(entry => wordsText(t, entry.words))
      .filter(Boolean)
      .join(' · '),
  },
  { key: 'speed', value: formatSpeed(node.speedMbps) },
  ...node.facts,
  { key: 'packets', value: packetText(node.packets) },
];

const RateLine = ({ node }) => {
  const { t } = useTranslation();
  if (!node.rate) {
    return null;
  }
  return (
    <div className="hw-topo-card-sub" data-note="hop-rate">
      <span className="hw-path-rx">↓{formatBandwidth(node.rate.rx)}</span>{' '}
      <span className="hw-path-tx">↑{formatBandwidth(node.rate.tx)}</span>
      {node.speedMbps > 0 ? (
        <span className="hw-path-of">
          {' '}
          {t('hostTools.networkPath.ofSpeed', {
            speed: formatSpeed(node.speedMbps),
            percent: percentText(node.util || 0),
          })}
        </span>
      ) : null}
    </div>
  );
};

RateLine.propTypes = {
  node: PropTypes.object.isRequired,
};

/**
 * The expanded chart dialog of one hop of the network path: the hop's
 * received, sent and both in megabits a second over the series the page
 * already holds, its vNICs' series summed per instant, the pills and
 * Export the dialog has, and under the chart the hop's rate against its
 * speed, its facts and the door to the host's Bandwidth page. No request
 * is made for it.
 */
const PathDialog = ({ id, node, sources, host, onHide }) => {
  const { t } = useTranslation();
  const entry = chartOf(CHART);
  const [visibility, setVisibility] = useState(entry.groups);
  const spec = useMemo(
    () => entitySpec(entry, { points: hopPoints(node.series, sources), t }),
    [entry, node.series, sources, t]
  );
  const pills = useMemo(() => chartPills(CHART, spec.series, t), [spec.series, t]);
  const series = useMemo(() => visibleSeries(spec.series, visibility), [spec.series, visibility]);
  const name = nodeName(t, node);
  const title = t('hostTools.networkPath.hopTitle', {
    name,
    kind: t(`hostTools.networkPath.kind.${node.kind}`),
  });
  const facts = factsOf(t, node).filter(item => item.value);
  return (
    <ChartDialog
      title={t('hosts.charts.dialogTitle', { title, host })}
      chartTitle={title}
      series={series}
      axes={spec.axes}
      emptyText={t(entry.texts.emptyKey)}
      pills={pills}
      visibility={visibility}
      onToggle={key => setVisibility(current => toggled(current, key))}
      onHide={onHide}
    >
      <div data-panel="hop-facts" data-hop={node.id}>
        <RateLine node={node} />
        <dl className="hw-path-facts">
          {facts.map(item => (
            <div key={item.key} className="hw-path-fact" data-fact={item.key}>
              <dt>{t(factLabel(item.key))}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
        <Link
          className="btn btn-sm btn-outline-primary"
          to={`/hosts/${id}/network/bandwidth`}
          data-link="bandwidth"
        >
          {t('hostTools.networkPath.openBandwidth')}
        </Link>
      </div>
    </ChartDialog>
  );
};

PathDialog.propTypes = {
  id: PropTypes.string.isRequired,
  node: PropTypes.object.isRequired,
  sources: PropTypes.objectOf(PropTypes.array).isRequired,
  host: PropTypes.string.isRequired,
  onHide: PropTypes.func.isRequired,
};

export default PathDialog;
