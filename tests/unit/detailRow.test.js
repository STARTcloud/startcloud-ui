import { createInstance } from 'i18next';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it } from 'vitest';

import { DetailRow } from '../../src/components/common/ScopeList.jsx';

const i18n = createInstance();
i18n.init({
  lng: 'en',
  ns: ['auth'],
  defaultNS: 'auth',
  initAsync: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
  resources: {
    en: {
      auth: {
        consent: {
          detail: {
            locations: 'Locations: {{value}}',
            field: { user: 'Account', host: 'Machine', service: 'Service' },
          },
        },
      },
    },
  },
});

const DETAIL = {
  type: 'pam_sign_in',
  description: 'Sign in to a machine',
  user: 'prominic',
  host: 'host-1162.example',
  remote_host: '203.0.113.7',
  service: 'sshd',
};

const render = props =>
  renderToStaticMarkup(createElement(I18nextProvider, { i18n }, createElement(DetailRow, props)));

const fieldLine = (label, value) =>
  `<span class="scope-row-field"><span class="scope-row-field-label">${label}</span><span class="scope-row-value">${value}</span></span>`;

describe('DetailRow', () => {
  it('draws every member beyond the type, the description and the RFC members as one labelled line', () => {
    const markup = render({ detail: DETAIL });
    expect(markup).toContain(
      '<span class="scope-row-label" title="pam_sign_in">Sign in to a machine</span>'
    );
    expect(markup).toContain(fieldLine('Account', 'prominic'));
    expect(markup).toContain(fieldLine('Machine', 'host-1162.example'));
    expect(markup).toContain(fieldLine('Service', 'sshd'));
    expect(markup.match(/class="scope-row-field"/gu)).toHaveLength(4);
    expect(markup).not.toContain('scope-row-large');
  });

  it('labels a member with no key by its own name', () => {
    expect(render({ detail: DETAIL })).toContain(fieldLine('remote_host', '203.0.113.7'));
  });

  it('draws the RFC members on their own lines and never as a field', () => {
    const markup = render({
      detail: {
        type: 'domino_vault',
        description: 'Access an ID Vault',
        locations: ['https://vault.example'],
        actions: null,
        datatypes: null,
        identifier: null,
        privileges: null,
      },
    });
    expect(markup).toContain('Locations: https://vault.example');
    expect(markup).not.toContain('scope-row-field');
  });

  it('draws the row as the centre of a page when large', () => {
    expect(render({ detail: DETAIL, large: true })).toContain('class="scope-row scope-row-large"');
  });
});
