import { describe, expect, it } from 'vitest';

import { CSV_COLUMNS, exportCsv } from '../../src/features/vdi/utils/exportRows.js';
import { fleetSummary, swapCellOf, vmStatus } from '../../src/features/vdi/utils/vmStatus.js';

const NOW = Date.parse('2026-10-12T09:00:00Z');
const FRESH = '2026-10-12T08:59:30Z';
const t = key => key;

const vmOf = (swap, more = {}) => ({
  instance_id: 'i-1',
  hostname: 'VDI-1',
  status: 'active',
  last_checkin: FRESH,
  last_user_checkin: FRESH,
  last_startup_checkin: FRESH,
  user: { username: 'ACME\\jlee', session_state: 'active' },
  drives: [{ letter: 'H', status: 'healthy' }],
  desktop: { status: 'ok', icon_count: 12 },
  swap,
  ...more,
});

describe('the swap pressure of a VM', () => {
  it('reads swap_pressure after the icons and before healthy', () => {
    expect(vmStatus(vmOf({ usage_pct: 95.2, status: 'swap_pressure' }), NOW)).toBe('swap_pressure');
    expect(vmStatus(vmOf({ usage_pct: 19.8, status: 'ok' }), NOW)).toBe('healthy');
    expect(
      vmStatus(
        vmOf(
          { usage_pct: 95.2, status: 'swap_pressure' },
          { drives: [{ letter: 'H', status: 'broken' }] }
        ),
        NOW
      )
    ).toBe('cifs_broken');
  });

  it('counts the VMs under pressure on the sixth card', () => {
    const summary = fleetSummary(
      [vmOf({ usage_pct: 95.2, status: 'swap_pressure' }), vmOf({ usage_pct: 12, status: 'ok' })],
      NOW
    );
    expect(summary.counts.swap_pressure).toBe(1);
    expect(summary.counts.healthy).toBe(1);
  });

  it('draws the cell as a percent with the pages-in rate, red under pressure, a dash for n_a and nothing without a report', () => {
    expect(swapCellOf(vmOf({ usage_pct: 19.8, pages_input_per_sec: 12.3, status: 'ok' }))).toEqual({
      text: '20%',
      pressure: false,
      title: '12.3 pages/s',
    });
    expect(swapCellOf(vmOf({ usage_pct: 95.2, status: 'swap_pressure' })).pressure).toBe(true);
    expect(swapCellOf(vmOf({ usage_pct: 0, status: 'n_a' })).text).toBe('—');
    expect(swapCellOf(vmOf(null)).text).toBe('');
    expect(swapCellOf(vmOf({}, { user: null })).text).toBe('');
  });

  it('carries swap after icons in the CSV', () => {
    expect(CSV_COLUMNS.indexOf('swap')).toBe(CSV_COLUMNS.indexOf('icons') + 1);
    const csv = exportCsv([vmOf({ usage_pct: 19.8, status: 'ok' })], { t, now: NOW });
    expect(csv.split('\n')[1]).toContain('"12","19.8"');
  });
});
