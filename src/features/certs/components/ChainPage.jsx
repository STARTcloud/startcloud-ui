import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDownload, FaLink, FaXmark } from 'react-icons/fa6';

import MethodList, { MethodRow } from '../../../components/common/MethodList';
import SectionCard from '../../../components/common/SectionCard';
import { useNotify } from '../../../contexts/NoticeContext';
import { useFolds } from '../../../hooks/useFolds';
import { pageContextShape } from '../../../utils/itemShape';
import { useEngine } from '../hooks/useEngine';
import { foldOf } from '../utils/folds';
import { fileStemOf } from '../utils/formats';
import { CERT_COMPONENT_KINDS, newId } from '../utils/records';

import ChainView from './ChainView';
import InputZone from './InputZone';

const IGNORED_KEY = 'certs-chain-ignored';

const labelOf = component => component.facts?.subject_dn || component.kind;

const Loaded = ({ certs, onRemove }) => {
  const { t } = useTranslation();
  return (
    <MethodList empty={t('certs.chain.none')} className="mb-0">
      {certs.map(cert => {
        const remove = (
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            data-action="remove"
            aria-label={t('certs.chain.remove')}
            title={t('certs.chain.remove')}
            onClick={() => onRemove(cert.id)}
          >
            <FaXmark aria-hidden="true" />
          </button>
        );
        return (
          <MethodRow
            key={cert.id}
            label={labelOf(cert)}
            badges={<span className="badge bg-secondary">{t(`certs.component.${cert.kind}`)}</span>}
            actions={remove}
          />
        );
      })}
    </MethodList>
  );
};

Loaded.propTypes = {
  certs: PropTypes.array.isRequired,
  onRemove: PropTypes.func.isRequired,
};

/**
 * The Chain page at `/certs/chain`, the Convert page's three cards: one
 * line saying what the page does, then the Input card taking
 * certificates one file or paste at a time, a duplicate and a key each
 * ignored with one notice line; the Components card counting the
 * certificates loaded in its heading and listing them with a remove
 * control each; and the Chain card, Build and Download fullchain as its
 * button row, Build drawing under them the chain the engine orders, the
 * leaf first, with a badge a hop, valid, self-signed, missing issuer or
 * invalid, and Download fullchain handing the browser the ordered PEM
 * named by the first file loaded.
 */
const ChainPage = ({ context }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const engine = useEngine();
  const folds = useFolds(`${context.prefsPrefix}_certs_chain`);
  const [certs, setCerts] = useState([]);
  const [chain, setChain] = useState(null);

  useEffect(() => {
    document.title = `${t('certs.sidebar.chain')} · ${context.appName}`;
  }, [context.appName, t]);

  const detected = (answer, { name }) => {
    const components = answer?.components || [];
    const held = new Set(certs.map(cert => cert.der_b64));
    const added = components
      .filter(component => CERT_COMPONENT_KINDS.includes(component.kind))
      .filter(component => !held.has(component.der_b64))
      .map(component => ({ ...component, id: newId(), source: name }));
    const ignored = components.length - added.length;
    if (ignored > 0) {
      notify('info', t('certs.chain.ignored', { count: ignored }), { key: IGNORED_KEY });
    }
    if (added.length > 0) {
      setCerts(current => [...current, ...added]);
      setChain(null);
    }
  };

  const remove = id => {
    setCerts(current => current.filter(cert => cert.id !== id));
    setChain(null);
  };

  const build = () =>
    engine.run(held => held.build_chain(certs.map(cert => cert.der_b64))).then(setChain);

  const download = () =>
    engine.run(held => {
      const answer = held.convert({
        components: certs.map(cert => ({ kind: cert.kind, der_b64: cert.der_b64 })),
        to: 'fullchain',
        password: '',
        legacy: false,
        friendly_name: '',
      });
      engine.save(answer, fileStemOf(certs[0].source), 'fullchain');
    });

  const held = engine.busy || certs.length === 0;

  return (
    <div className="list row" data-page="certs-chain">
      <p className="text-body-secondary">{t('certs.chain.about')}</p>
      <div>
        <SectionCard
          title={t('certs.chain.input')}
          id="certs-chain-input"
          {...foldOf(folds, 'input')}
        >
          <InputZone onDetected={detected} />
        </SectionCard>
        <SectionCard
          title={t('certs.chain.loaded')}
          badge={<span className="badge text-bg-secondary rounded-pill">{certs.length}</span>}
          id="certs-chain-components"
          {...foldOf(folds, 'components')}
        >
          <Loaded certs={certs} onRemove={remove} />
        </SectionCard>
        <SectionCard
          title={t('certs.sidebar.chain')}
          id="certs-chain-chain"
          {...foldOf(folds, 'chain')}
        >
          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary"
              data-action="build-chain"
              disabled={held}
              onClick={build}
            >
              <FaLink className="me-1" aria-hidden="true" />
              {t('certs.chain.build')}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              data-action="download-fullchain"
              disabled={held}
              onClick={download}
            >
              <FaDownload className="me-1" aria-hidden="true" />
              {t('certs.convert.fullchain')}
            </button>
          </div>
          {chain ? (
            <div className="mt-3" data-list="chain">
              <ChainView chain={chain} labels={certs.map(labelOf)} />
            </div>
          ) : null}
        </SectionCard>
      </div>
    </div>
  );
};

ChainPage.propTypes = {
  context: pageContextShape.isRequired,
};

export default ChainPage;
