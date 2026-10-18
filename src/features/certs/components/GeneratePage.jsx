import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCertificate, FaFileSignature, FaKey, FaStamp } from 'react-icons/fa6';

import TabStrip from '../../../components/common/TabStrip';
import { useFolds } from '../../../hooks/useFolds';
import { pageContextShape } from '../../../utils/itemShape';
import { foldOf } from '../utils/folds';

import CertificateTab from './generate/CertificateTab';
import KeyTab from './generate/KeyTab';
import RequestTab from './generate/RequestTab';
import SignTab from './generate/SignTab';

const TABS = [
  { key: 'key', labelKey: 'certs.generate.tabKey', icon: FaKey, Body: KeyTab },
  {
    key: 'request',
    labelKey: 'certs.generate.tabRequest',
    icon: FaFileSignature,
    Body: RequestTab,
  },
  {
    key: 'certificate',
    labelKey: 'certs.generate.tabCertificate',
    icon: FaCertificate,
    Body: CertificateTab,
  },
  { key: 'sign', labelKey: 'certs.generate.tabSign', icon: FaStamp, Body: SignTab },
];

/**
 * The Generate page at `/certs/generate`: the tab strip of Key, Request,
 * Certificate and Sign request, each tab one card that makes its thing
 * through the engine and keeps it in the vault, every tab kept mounted
 * so a draft survives a change of tab, the folds under
 * `table_prefs_certs_generate`.
 */
const GeneratePage = ({ context }) => {
  const { t } = useTranslation();
  const folds = useFolds(`${context.prefsPrefix}_certs_generate`);
  const [active, setActive] = useState(TABS[0].key);

  useEffect(() => {
    document.title = `${t('certs.sidebar.generate')} · ${context.appName}`;
  }, [context.appName, t]);

  return (
    <div className="list row" data-page="certs-generate">
      <TabStrip
        className="mb-3"
        tabs={TABS.map(entry => ({ key: entry.key, label: t(entry.labelKey), icon: entry.icon }))}
        active={active}
        onSelect={setActive}
      />
      {TABS.map(({ key, Body }) => (
        <div key={key} hidden={key !== active}>
          <Body fold={foldOf(folds, key)} />
        </div>
      ))}
    </div>
  );
};

GeneratePage.propTypes = {
  context: pageContextShape.isRequired,
};

export default GeneratePage;
