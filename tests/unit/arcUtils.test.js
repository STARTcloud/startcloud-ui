import { describe, expect, it } from 'vitest';

import {
  ARC_FORM,
  arcApplyBody,
  arcFormOf,
  arcSliderBounds,
  arcValidateBody,
  bytesToGb,
  formatBytes,
  formatGbValue,
  getValidationColor,
  hasArcSettings,
  safeBytesToGb,
  safeParseFloat,
  sliderFill,
} from '../../src/features/hosts/utils/arcUtils.js';

const GIB = 1024 ** 3;

describe('the numbers', () => {
  it('turns bytes into gibibytes, zero for nothing', () => {
    expect(bytesToGb(2 * GIB)).toBe(2);
    expect(bytesToGb(0)).toBe(0);
    expect(bytesToGb('x')).toBe(0);
    expect(safeBytesToGb(undefined)).toBe(0);
  });

  it('parses and formats a typed value', () => {
    expect(safeParseFloat('1.5')).toBe(1.5);
    expect(safeParseFloat('')).toBeNull();
    expect(safeParseFloat('abc')).toBeNull();
    expect(formatGbValue('2')).toBe('2.00');
    expect(formatGbValue(null)).toBeNull();
  });

  it('formats bytes in steps of 1024', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1536)).toBe('1.50 KB');
    expect(formatBytes(3 * GIB)).toBe('3.00 GB');
  });

  it('tones the validation', () => {
    expect(getValidationColor(['x'], [])).toBe('danger');
    expect(getValidationColor([], ['x'])).toBe('warning');
    expect(getValidationColor([], [])).toBe('success');
  });

  it('fills a slider by the value between its bounds', () => {
    expect(sliderFill('', 0, 10)).toBe('0%');
    expect(sliderFill(5, 0, 10)).toBe('50%');
    expect(sliderFill(20, 0, 10)).toBe('100%');
    expect(sliderFill(-1, 0, 10)).toBe('0%');
    expect(sliderFill(5, 10, 10)).toBe('0%');
  });
});

describe('the form', () => {
  const tunables = {
    zfs_arc_max: { effective_value: 8 * GIB },
    zfs_arc_min: { effective_value: 0 },
    zfs_arc_max_percent: { effective_value: 60 },
    zfs_vdev_max_pending: { effective_value: 10 },
    zfs_prefetch_disable: { effective_value: 1 },
  };

  it('reads the tunables into the form', () => {
    expect(arcFormOf(null)).toBe(ARC_FORM);
    expect(arcFormOf(tunables)).toEqual({
      arc_max_gb: 8,
      arc_min_gb: '',
      arc_max_percent: 60,
      user_reserve_hint_pct: '',
      arc_meta_limit_gb: '',
      arc_meta_min_gb: '',
      vdev_max_pending: 10,
      prefetch_disable: true,
      apply_method: 'persistent',
    });
  });

  it('tells a form that names a tunable', () => {
    expect(hasArcSettings(ARC_FORM)).toBe(false);
    expect(hasArcSettings({ ...ARC_FORM, prefetch_disable: true })).toBe(true);
    expect(hasArcSettings({ ...ARC_FORM, arc_min_gb: '1' })).toBe(true);
  });

  it('builds the validate and the apply bodies', () => {
    const form = {
      ...ARC_FORM,
      arc_max_gb: '8',
      arc_max_percent: '60',
      vdev_max_pending: '10',
      apply_method: 'runtime',
    };
    expect(arcValidateBody(form)).toEqual({ arc_max_gb: 8 });
    expect(arcApplyBody(form)).toEqual({
      apply_method: 'runtime',
      arc_max_gb: 8,
      arc_max_percent: 60,
      vdev_max_pending: 10,
      prefetch_disable: false,
    });
    expect(arcApplyBody(ARC_FORM)).toEqual({ apply_method: 'persistent', prefetch_disable: false });
  });

  it('bounds the two sliders from the constraints', () => {
    const constraints = { min_recommended_arc_bytes: GIB, max_safe_arc_bytes: 32 * GIB };
    expect(arcSliderBounds(ARC_FORM, constraints)).toEqual({
      max: { min: '1.00', max: '32.00', value: '32.00' },
      min: { min: '1.00', max: '32.00', value: '1.00' },
    });
    expect(arcSliderBounds({ ...ARC_FORM, arc_max_gb: '8', arc_min_gb: '2' }, constraints)).toEqual(
      {
        max: { min: '2.00', max: '32.00', value: '8' },
        min: { min: '1.00', max: '8.00', value: '2' },
      }
    );
    expect(arcSliderBounds(ARC_FORM, null).max).toEqual({ min: '1', max: '100', value: '50' });
  });
});
