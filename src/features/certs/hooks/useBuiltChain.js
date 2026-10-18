import { useEffect, useRef, useState } from 'react';

import { loadCerts } from '../lib/certsClient';
import { derOf, kindOf } from '../utils/records';

const EMPTY = { chain: null, issuers: [] };

const hopFrom = (chain, from) => chain.hops.find(entry => entry.from === from) || null;

const reaches = hop => hop && hop.to !== null && hop.to !== undefined;

const issuersOf = (chain, records) => {
  const issuers = [];
  const seen = new Set([0]);
  let hop = hopFrom(chain, 0);
  while (reaches(hop) && !seen.has(hop.to)) {
    seen.add(hop.to);
    issuers.push({ kind: kindOf(records[hop.to]), der_b64: derOf(records[hop.to]) });
    hop = hopFrom(chain, hop.to);
  }
  return issuers;
};

/**
 * The chain the engine builds over one record and the vault's
 * authorities: the chain as the engine answered it, the record at index
 * 0 and the authorities after it, and the issuers the record's hops
 * reach as engine components, the leaf's issuer first; null and none
 * while the engine has not answered.
 *
 * @param {Object} record - The record at the chain's start
 * @param {Array<Object>} authorities - The vault's authority records with a DER
 * @returns {{ chain: Object|null, issuers: Array<{ kind: string, der_b64: string }> }} The chain
 */
export const useBuiltChain = (record, authorities) => {
  const [built, setBuilt] = useState(EMPTY);
  const held = useRef([]);
  const records = [record, ...authorities];
  const signature = records.map(entry => `${entry.id}|${derOf(entry)}`).join('\n');

  useEffect(() => {
    held.current = records;
  });

  useEffect(() => {
    let mounted = true;
    const chained = held.current;
    loadCerts()
      .then(engine => engine.build_chain(chained.map(derOf)))
      .then(chain => {
        if (mounted) {
          setBuilt({ chain, issuers: issuersOf(chain, chained) });
        }
      })
      .catch(() => {
        if (mounted) {
          setBuilt(EMPTY);
        }
      });
    return () => {
      mounted = false;
    };
  }, [signature]);

  return built;
};
