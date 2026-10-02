import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import { discoverBoxes, getBoxDownloadLink, listOrgBoxes } from '../api/boxvaultAPI';

const orgSlugOf = box =>
  box?.organization?.name || box?.user?.primaryOrganization?.name || box?.organization || '';

const versionNumberOf = version => version?.versionNumber ?? version?.version ?? '';

const isFederated = user => Boolean(user?.provider?.startsWith('oidc-'));

const blockedKeyOf = status => {
  if (status === 503) {
    return 'machineEdit.boxVaultPicker.unconfigured';
  }
  return status === 403 ? 'machineEdit.boxVaultPicker.federatedRequired' : '';
};

const Picker = ({ id, labelKey, value, options, disabled, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="col-6 col-md-2">
      <label className="form-label" htmlFor={id}>
        {t(labelKey)}
      </label>
      <select
        id={id}
        className="form-select"
        value={value}
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
      >
        <option value="">{t('machineEdit.cdromSourceFields.select')}</option>
        {options.map(option => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
};

Picker.propTypes = {
  id: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(PropTypes.string).isRequired,
  disabled: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

/**
 * The dialog that browses BoxVault through the server's per-user proxy
 * and picks one box file, hyperweaver-ui's BoxVault picker: the public
 * catalog read once on open, an organization's boxes added by its slug,
 * the box, its version, provider and architecture, and Use this box,
 * which mints the signed download link the wizard carries as
 * `settings.box_url`. A session that is not federated, the one without
 * an OIDC token to forward, reads the sentence saying so and asks for
 * nothing; a server without the integration answers 503 and reads its
 * own sentence.
 */
const BoxVaultPickerModal = ({ user, onClose, onPicked }) => {
  const { t } = useTranslation();
  const federated = isFederated(user);
  const [loading, setLoading] = useState(federated);
  const [minting, setMinting] = useState(false);
  const [error, setError] = useState('');
  const [blockedKey, setBlockedKey] = useState(
    federated ? '' : 'machineEdit.boxVaultPicker.federatedRequired'
  );
  const [boxes, setBoxes] = useState([]);
  const [orgSlug, setOrgSlug] = useState('');
  const [selectedKey, setSelectedKey] = useState('');
  const [versionPick, setVersionPick] = useState('');
  const [providerPick, setProviderPick] = useState('');
  const [archPick, setArchPick] = useState('');

  const failed = failure => {
    const key = blockedKeyOf(failure.status);
    if (key) {
      setBlockedKey(key);
    } else {
      setError(failure.message || t('machineEdit.boxVaultPicker.loadFailed'));
    }
  };

  useEffect(() => {
    if (!federated) {
      return undefined;
    }
    let mounted = true;
    discoverBoxes()
      .then(rows => {
        if (mounted) {
          setBoxes(
            (Array.isArray(rows) ? rows : []).map(box => ({ ...box, orgSlug: orgSlugOf(box) }))
          );
        }
      })
      .catch(failure => {
        if (mounted) {
          const key = blockedKeyOf(failure.status);
          if (key) {
            setBlockedKey(key);
          } else {
            setError(failure.message);
          }
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [federated]);

  const loadOrg = async () => {
    const slug = orgSlug.trim();
    if (!slug) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      const rows = await listOrgBoxes(slug);
      const added = (Array.isArray(rows) ? rows : []).map(box => ({ ...box, orgSlug: slug }));
      setBoxes(current => [...current.filter(box => box.orgSlug !== slug), ...added]);
    } catch (failure) {
      failed(failure);
    } finally {
      setLoading(false);
    }
  };

  const knownSlugs = useMemo(
    () => [...new Set(boxes.map(box => box.orgSlug).filter(Boolean))].sort(),
    [boxes]
  );
  const selected = useMemo(
    () => boxes.find(box => `${box.orgSlug}/${box.name}` === selectedKey) || null,
    [boxes, selectedKey]
  );
  const versions = selected?.versions || [];
  const selectedVersion =
    versions.find(version => versionNumberOf(version) === versionPick) || null;
  const providers = selectedVersion?.providers || [];
  const selectedProvider = providers.find(provider => provider.name === providerPick) || null;
  const architectures = selectedProvider?.architectures || [];

  const pickBox = key => {
    setSelectedKey(key);
    const box = boxes.find(entry => `${entry.orgSlug}/${entry.name}` === key) || null;
    const firstVersion = box?.versions?.[0] || null;
    setVersionPick(versionNumberOf(firstVersion));
    const firstProvider = firstVersion?.providers?.[0] || null;
    setProviderPick(firstProvider?.name || '');
    setArchPick(firstProvider?.architectures?.[0]?.name || '');
  };

  const submit = async event => {
    event.preventDefault();
    if (!selected || !versionPick || !providerPick || !archPick) {
      setError(t('machineEdit.boxVaultPicker.pickAllParts'));
      return;
    }
    setMinting(true);
    setError('');
    try {
      const downloadUrl = await getBoxDownloadLink({
        orgSlug: selected.orgSlug,
        boxName: selected.name,
        version: versionPick,
        provider: providerPick,
        architecture: archPick,
      });
      if (!downloadUrl) {
        setError(t('machineEdit.boxVaultPicker.loadFailed'));
        return;
      }
      onPicked({
        orgSlug: selected.orgSlug,
        boxName: selected.name,
        version: versionPick,
        provider: providerPick,
        architecture: archPick,
        downloadUrl,
      });
    } catch (failure) {
      failed(failure);
    } finally {
      setMinting(false);
    }
  };

  return (
    <Modal show onHide={onClose} dialogClassName="form-modal" scrollable>
      <form onSubmit={submit} noValidate data-dialog="boxvault-picker">
        <Modal.Header closeButton>
          <Modal.Title as="h5">{t('machineEdit.boxVaultPicker.title')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {blockedKey ? (
            <div className="alert alert-warning" role="status" data-note="boxvault-blocked">
              {t(blockedKey)}
            </div>
          ) : null}
          {error ? (
            <div className="alert alert-danger" role="alert" data-note="problem">
              {error}
            </div>
          ) : null}
          {blockedKey ? null : (
            <>
              <p className="form-text text-muted mt-0">{t('machineEdit.boxVaultPicker.help')}</p>
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label" htmlFor="boxvault-org-slug">
                    {t('machineEdit.boxVaultPicker.orgSlug')}
                  </label>
                  <div className="input-group">
                    <input
                      id="boxvault-org-slug"
                      className="form-control"
                      type="text"
                      list="boxvault-org-slugs"
                      placeholder={t('machineEdit.boxVaultPicker.orgSlugPlaceholder')}
                      value={orgSlug}
                      onChange={event => setOrgSlug(event.target.value)}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      data-action="load-org"
                      onClick={loadOrg}
                      disabled={loading || !orgSlug.trim()}
                    >
                      {t('machineEdit.boxVaultPicker.loadOrgBoxes')}
                    </button>
                  </div>
                  <datalist id="boxvault-org-slugs">
                    {knownSlugs.map(slug => (
                      <option key={slug} value={slug} />
                    ))}
                  </datalist>
                  <span className="form-text text-muted">
                    {t('machineEdit.boxVaultPicker.orgSlugHint')}
                  </span>
                </div>
              </div>
              {loading ? (
                <div className="text-center py-3">
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  />
                  {t('machineEdit.boxVaultPicker.loading')}
                </div>
              ) : (
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label" htmlFor="boxvault-box">
                      {t('machineEdit.boxVaultPicker.box')}
                    </label>
                    <select
                      id="boxvault-box"
                      className="form-select"
                      value={selectedKey}
                      onChange={event => pickBox(event.target.value)}
                    >
                      <option value="">
                        {t(
                          boxes.length > 0
                            ? 'machineEdit.boxVaultPicker.selectABox'
                            : 'machineEdit.boxVaultPicker.noBoxes'
                        )}
                      </option>
                      {boxes.map(box => {
                        const key = `${box.orgSlug}/${box.name}`;
                        return (
                          <option key={key} value={key}>
                            {key}
                            {box.isPublic === false
                              ? t('machineEdit.boxVaultPicker.privateSuffix')
                              : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <Picker
                    id="boxvault-version"
                    labelKey="machineEdit.boxVaultPicker.version"
                    value={versionPick}
                    options={versions.map(versionNumberOf)}
                    disabled={!selected}
                    onChange={next => {
                      setVersionPick(next);
                      setProviderPick('');
                      setArchPick('');
                    }}
                  />
                  <Picker
                    id="boxvault-provider"
                    labelKey="machineEdit.boxVaultPicker.provider"
                    value={providerPick}
                    options={providers.map(provider => provider.name)}
                    disabled={!selectedVersion}
                    onChange={next => {
                      setProviderPick(next);
                      setArchPick('');
                    }}
                  />
                  <Picker
                    id="boxvault-arch"
                    labelKey="machineEdit.boxVaultPicker.architecture"
                    value={archPick}
                    options={architectures.map(architecture => architecture.name)}
                    disabled={!selectedProvider}
                    onChange={setArchPick}
                  />
                </div>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={minting}>
            {t('machineEdit.boxVaultPicker.cancel')}
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            data-action="submit"
            disabled={loading || minting || Boolean(blockedKey) || !selected}
          >
            {t('machineEdit.boxVaultPicker.useThisBox')}
          </button>
        </Modal.Footer>
      </form>
    </Modal>
  );
};

BoxVaultPickerModal.propTypes = {
  user: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onPicked: PropTypes.func.isRequired,
};

export default BoxVaultPickerModal;
