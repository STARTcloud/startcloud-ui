import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useNotify } from '../../../contexts/NoticeContext';
import { loadCerts } from '../lib/certsClient';
import { componentsOf } from '../utils/components';
import { bytesOf, downloadBytes, textOf } from '../utils/download';
import { carriedBy, fileNameOf } from '../utils/formats';
import { derOf, kindOf, nameOf, stemOf } from '../utils/records';

import { useEngine } from './useEngine';
import { useVault } from './useVault';

const CONVERT_ROUTE = '/certs/convert';

const SSH_EXTENSION = 'cert';

const EMPTY_OUTPUT = { password: '', legacy: false, friendly_name: '' };

/**
 * The actions a record's row, its page and its tree node share: Convert
 * opens the Convert page with the record loaded, Download hands the
 * browser the record as PEM through the engine (an SSH certificate as
 * its raw bytes), `convertTo` writes the record in any format the engine
 * takes, `der` standing in for the record's own DER and `issuers` the
 * chain written after the record and its key, `asText` answers the text
 * of a text format and throws on a failure, and `remove` takes the
 * record out of the vault alone, nothing sent to the store; every other
 * failure is one danger notice.
 *
 * @returns {{ convert: Function, download: Function, convertTo: Function, asText: Function, remove: Function }} The actions
 */
export const useRecordActions = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const notify = useNotify();
  const vault = useVault();
  const engine = useEngine();

  const convert = useCallback(
    record => navigate(`${CONVERT_ROUTE}?record=${encodeURIComponent(record.id)}`),
    [navigate]
  );

  const asText = useCallback(async (record, { to, key = null }) => {
    const held = await loadCerts();
    const answer = held.convert({
      components: componentsOf(record, key, kindOf, derOf),
      to,
      ...EMPTY_OUTPUT,
    });
    return textOf(answer.bytes);
  }, []);

  const convertTo = useCallback(
    (record, { to, key = null, der = '', issuers = [], stem = '', ...output }) => {
      const own = der ? { ...record, public_der_b64: der, private_der_b64: null } : record;
      return engine.run(held => {
        const answer = held.convert({
          components: carriedBy(componentsOf(own, key, kindOf, derOf, issuers), to),
          to,
          ...EMPTY_OUTPUT,
          ...output,
        });
        engine.save(answer, output.friendly_name || stem || stemOf(record), to);
      });
    },
    [engine]
  );

  const download = useCallback(
    record => {
      if (record.kind === 'ssh_certificate' && record.public_der_b64) {
        downloadBytes(
          bytesOf(record.public_der_b64),
          'application/octet-stream',
          fileNameOf(stemOf(record), SSH_EXTENSION, SSH_EXTENSION)
        );
        return Promise.resolve();
      }
      return convertTo(record, { to: 'pem' });
    },
    [convertTo]
  );

  const remove = useCallback(
    async record => {
      await vault.remove(record);
      notify('success', t('certs.notice.removed', { name: nameOf(record) }));
    },
    [vault, notify, t]
  );

  return { convert, download, convertTo, asText, remove };
};
