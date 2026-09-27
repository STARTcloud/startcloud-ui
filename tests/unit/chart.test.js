import { describe, expect, it } from 'vitest';

import {
  CHART_PROBES,
  CHART_TONES,
  chartOption,
  formatValue,
  hasPoints,
  toneAt,
} from '../../src/utils/chart.js';

const colors = Object.fromEntries(CHART_PROBES.map(name => [name, `color-${name}`]));

const points = [
  [1000, 1],
  [2000, 2],
];

const optionOf = chart => chartOption({ title: 'Chart', colors, ...chart });

describe('toneAt', () => {
  it('takes the ten tones in order and round again', () => {
    expect(CHART_TONES).toHaveLength(10);
    expect(toneAt(0)).toBe('blue');
    expect(toneAt(1)).toBe('orange');
    expect(toneAt(10)).toBe('blue');
    expect(toneAt(11)).toBe('orange');
  });
});

describe('formatValue', () => {
  it('holds the number to its decimals, drops trailing zeros and adds the unit', () => {
    expect(formatValue(1.5, ' GB')).toBe('1.5 GB');
    expect(formatValue(1.23456)).toBe('1.23');
    expect(formatValue(2, '%', 1)).toBe('2%');
    expect(formatValue('3.10', ' Mbps')).toBe('3.1 Mbps');
  });

  it('answers a dash for a value that is no number', () => {
    expect(formatValue(null)).toBe('-');
    expect(formatValue(undefined, ' GB')).toBe('-');
    expect(formatValue('')).toBe('-');
    expect(formatValue('none')).toBe('-');
  });
});

describe('hasPoints', () => {
  it('answers whether any series holds a point, a hidden one counted', () => {
    expect(hasPoints([])).toBe(false);
    expect(hasPoints([{ points: [] }])).toBe(false);
    expect(hasPoints([{ points: [] }, { points, hidden: true }])).toBe(true);
  });
});

describe('chartOption', () => {
  it('draws one line per series that is not hidden, under its key and name', () => {
    const option = optionOf({
      series: [
        { key: 'used', name: 'Used', points },
        { key: 'free', name: 'Free', points, hidden: true },
      ],
    });
    expect(option.series.map(line => [line.id, line.name, line.type])).toEqual([
      ['used', 'Used', 'line'],
    ]);
    expect(option.series[0].data).toBe(points);
  });

  it('paints a series in the tone it names and the others in the next free tone', () => {
    const option = optionOf({
      series: [
        { key: 'a', name: 'A', points, tone: 'red' },
        { key: 'b', name: 'B', points },
        { key: 'c', name: 'C', points },
      ],
    });
    expect(option.series.map(line => line.lineStyle.color)).toEqual([
      'color-red',
      'color-blue',
      'color-orange',
    ]);
  });

  it('carries the dash, the width and the opacity of a series', () => {
    const option = optionOf({
      series: [
        { key: 'a', name: 'A', points, dash: 'dash', width: 3, opacity: 0.5 },
        { key: 'b', name: 'B', points, dash: 'short-dash' },
        { key: 'c', name: 'C', points, dash: 'short-dot' },
        { key: 'd', name: 'D', points },
      ],
    });
    expect(option.series.map(line => line.lineStyle.type)).toEqual([
      'dashed',
      [6, 3],
      [2, 3],
      'solid',
    ]);
    expect(option.series[0].lineStyle.width).toBe(3);
    expect(option.series[0].lineStyle.opacity).toBe(0.5);
    expect(option.series[3].lineStyle.width).toBe(2);
    expect(option.series[3].lineStyle.opacity).toBe(1);
  });

  it('draws the first value axis on the left and the second on the right', () => {
    const option = optionOf({
      series: [{ key: 'a', name: 'A', points, axis: 1 }],
      axes: [
        { name: 'Size', min: 0 },
        { name: 'Rate', min: 0, max: 100 },
      ],
    });
    expect(option.yAxis.map(axis => [axis.name, axis.position, axis.min, axis.max])).toEqual([
      ['Size', 'left', 0, undefined],
      ['Rate', 'right', 0, 100],
    ]);
    expect(option.series[0].yAxisIndex).toBe(1);
    expect(option.grid.top).toBe(36);
  });

  it('writes the unit of the series, or of its axis, after a tooltip value', () => {
    const option = optionOf({
      series: [
        { key: 'a', name: 'A', points },
        { key: 'b', name: 'B', points, axis: 1, digits: 1 },
        { key: 'c', name: 'C', points, unit: 'x' },
      ],
      axes: [{ unit: ' GB' }, { unit: '%' }],
    });
    const written = option.series.map(line => line.tooltip.valueFormatter(12.34));
    expect(written).toEqual(['12.34 GB', '12.3%', '12.34x']);
  });

  it('draws the legend and the zoom only while asked for', () => {
    const series = [{ key: 'a', name: 'A', points }];
    const plain = optionOf({ series });
    const full = optionOf({ series, legend: true, zoom: true });
    expect(plain.legend.show).toBe(false);
    expect(plain.dataZoom).toEqual([]);
    expect(plain.grid.bottom).toBe(8);
    expect(plain.grid.top).toBe(16);
    expect(full.legend.show).toBe(true);
    expect(full.dataZoom.map(zoom => zoom.type)).toEqual(['inside', 'slider']);
    expect(full.grid.bottom).toBe(72);
  });

  it('opens the description with the title and turns the patterns on', () => {
    const option = optionOf({ series: [{ key: 'a', name: 'A', points }] });
    expect(option.aria.enabled).toBe(true);
    expect(option.aria.label.general.withoutTitle).toBe('Chart');
    expect(option.aria.decal.show).toBe(true);
  });

  it('does not animate while motion is reduced', () => {
    const series = [{ key: 'a', name: 'A', points }];
    expect(optionOf({ series }).animation).toBe(true);
    expect(optionOf({ series, reduced: true }).animation).toBe(false);
  });

  it('draws the point itself of a series that holds one alone', () => {
    const option = optionOf({
      series: [
        { key: 'a', name: 'A', points: [[1000, 1]] },
        { key: 'b', name: 'B', points },
      ],
    });
    expect(option.series.map(line => line.showSymbol)).toEqual([true, false]);
  });

  it('takes every colour from the ones handed in', () => {
    const option = optionOf({ series: [{ key: 'a', name: 'A', points }] });
    expect(option.textStyle.color).toBe('color-text');
    expect(option.tooltip.backgroundColor).toBe('color-surface');
    expect(option.tooltip.borderColor).toBe('color-line');
    expect(option.xAxis.axisLabel.color).toBe('color-muted');
    expect(option.yAxis[0].splitLine.lineStyle.color).toBe('color-line');
  });
});
