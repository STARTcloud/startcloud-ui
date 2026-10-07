import { describe, expect, it } from 'vitest';

import {
  CHART_PROBES,
  CHART_TONES,
  axisSpan,
  chartOption,
  entitiesOf,
  formatValue,
  hasPoints,
  isolatedAfter,
  latestValue,
  legendSelected,
  newestOf,
  sparkOption,
  toneAt,
  withAlpha,
  zoomedRange,
} from '../../src/utils/chart.js';

const colors = Object.fromEntries(CHART_PROBES.map(name => [name, `color-${name}`]));

const points = [
  [1000, 1],
  [2000, 2],
];

const range = { from: 0, to: 2000 };

const optionOf = chart => chartOption({ title: 'Chart', colors, ...chart });

const valuesOf = data => data.map(point => (Array.isArray(point) ? point : point.value));

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

describe('entitiesOf and newestOf', () => {
  it('list every distinct entity once, in order, and none for plain lines', () => {
    expect(
      entitiesOf([
        { entity: 'igb0', points },
        { entity: 'igb0', points },
        { entity: 'vnic0', points },
        { points },
      ])
    ).toEqual(['igb0', 'vnic0']);
    expect(entitiesOf([{ points }])).toEqual([]);
  });

  it('answer the newest instant any series holds, null while none does', () => {
    expect(newestOf([{ points }, { points: [[5000, 1]] }, { points: [] }])).toBe(5000);
    expect(newestOf([{ points: [] }])).toBeNull();
  });
});

describe('isolatedAfter', () => {
  it('isolates the entity clicked and shows all again on the second click', () => {
    expect(isolatedAfter(null, 'igb0')).toBe('igb0');
    expect(isolatedAfter('igb0', 'vnic0')).toBe('vnic0');
    expect(isolatedAfter('igb0', 'igb0')).toBeNull();
  });
});

describe('withAlpha', () => {
  it('replaces the alpha of an rgb colour and leaves other text alone', () => {
    expect(withAlpha('rgb(13, 110, 253)', 0.18)).toBe('rgba(13, 110, 253, 0.18)');
    expect(withAlpha('rgba(13, 110, 253, 1)', 0)).toBe('rgba(13, 110, 253, 0)');
    expect(withAlpha('color-blue', 0.5)).toBe('color-blue');
  });
});

describe('axisSpan and zoomedRange', () => {
  it('widen the axis a span to either side for the card and keep the range under the slider', () => {
    expect(axisSpan(range)).toEqual({ from: -2000, to: 4000 });
    expect(axisSpan(range, true)).toBe(range);
    expect(axisSpan(null)).toBeNull();
  });

  it('read the range a zoom reached by its instants or its percent, never narrower than the least', () => {
    const base = { from: 0, to: 10000 };
    expect(zoomedRange({ startValue: 1000, endValue: 5000 }, base, 10)).toEqual({
      from: 1000,
      to: 5000,
    });
    expect(zoomedRange({ batch: [{ start: 10, end: 50 }] }, base, 10)).toEqual({
      from: 1000,
      to: 5000,
    });
    expect(zoomedRange({ startValue: 4000, endValue: 4002 }, base, 1000)).toEqual({
      from: 3501,
      to: 4501,
    });
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
    expect(valuesOf(option.series[0].data)).toEqual(points);
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

  it('fills under every line from its tone to clear and smooths it', () => {
    const option = optionOf({ series: [{ key: 'a', name: 'A', points, tone: 'blue' }] });
    const [{ areaStyle, smooth }] = option.series;
    expect(smooth).toBe(0.25);
    expect(areaStyle.color.type).toBe('linear');
    expect(areaStyle.color.colorStops.map(stop => stop.color)).toEqual([
      'color-blue',
      'color-blue',
    ]);
    expect(
      optionOf({
        series: [{ key: 'a', name: 'A', points, tone: 'blue' }],
        colors: { ...colors, blue: 'rgb(1, 2, 3)' },
      }).series[0].areaStyle.color.colorStops.map(stop => stop.color)
    ).toEqual(['rgba(1, 2, 3, 0.18)', 'rgba(1, 2, 3, 0)']);
  });

  it('dots the newest point of a line and no other, a break kept before it', () => {
    const option = optionOf({
      series: [
        { key: 'a', name: 'A', points },
        {
          key: 'b',
          name: 'B',
          points: [
            [1000, 1],
            [2000, null],
            [3000, 3],
          ],
        },
      ],
    });
    const [first, second] = option.series;
    expect(first.symbol).toBe('none');
    expect(first.showSymbol).toBe(true);
    expect(first.data[0]).toEqual([1000, 1]);
    expect(first.data[1]).toEqual({ value: [2000, 2], symbol: 'circle', symbolSize: 7 });
    expect(second.data).toEqual([
      [1000, 1],
      [2000, null],
      { value: [3000, 3], symbol: 'circle', symbolSize: 7 },
    ]);
  });

  it('breaks a line at a null point instead of joining across it', () => {
    const option = optionOf({ series: [{ key: 'a', name: 'A', points }] });
    expect(option.series[0].connectNulls).toBe(false);
  });

  it('thins every line to the pixels across the plot', () => {
    const many = [...Array(1000).keys()].map(index => [index * 1000, index % 7]);
    const option = optionOf({ series: [{ key: 'a', name: 'A', points: many }], width: 272 });
    expect(option.series[0].data.length).toBe(200);
    expect(valuesOf(option.series[0].data)[0]).toEqual(many[0]);
    expect(valuesOf(option.series[0].data).at(-1)).toEqual(many.at(-1));
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

  it('names every line in the tooltip with its value and the unit of the line, or of its axis', () => {
    const option = optionOf({
      series: [
        { key: 'a', name: 'A', points },
        { key: 'b', name: 'B', points, axis: 1, digits: 1 },
        { key: 'c', name: 'C', points, unit: 'x' },
      ],
      axes: [{ unit: ' GB' }, { unit: '%' }],
    });
    const written = option.tooltip.formatter([
      { seriesId: 'a', marker: '', value: [1000, 12.34] },
      { seriesId: 'b', marker: '', value: { value: [1000, 12.34] } },
      { seriesId: 'c', marker: '', value: [1000, 12.34] },
      { seriesId: 'c', marker: '', value: [1000, null] },
    ]);
    expect(written).toContain('A</span><span class="fw-semibold">12.34 GB</span>');
    expect(written).toContain('B</span><span class="fw-semibold">12.3%</span>');
    expect(written).toContain('C</span><span class="fw-semibold">12.34x</span>');
    expect(written.match(/fw-semibold">/gu)).toHaveLength(3);
    expect(option.tooltip.formatter([])).toBe('');
  });

  it('zooms inside the plot over the drawn range and adds the slider only while asked for', () => {
    const series = [{ key: 'a', name: 'A', points }];
    const card = optionOf({ series, range });
    const dialog = optionOf({ series, range, slider: true });
    expect(card.dataZoom.map(zoom => zoom.type)).toEqual(['inside']);
    expect(card.dataZoom[0]).toMatchObject({
      filterMode: 'none',
      zoomOnMouseWheel: true,
      moveOnMouseMove: true,
      startValue: 0,
      endValue: 2000,
    });
    expect([card.xAxis.min, card.xAxis.max]).toEqual([-2000, 4000]);
    expect(card.grid.bottom).toBe(8);
    expect(dialog.dataZoom.map(zoom => zoom.type)).toEqual(['inside', 'slider']);
    expect(dialog.dataZoom[0].startValue).toBeUndefined();
    expect([dialog.xAxis.min, dialog.xAxis.max]).toEqual([0, 2000]);
    expect(dialog.grid.bottom).toBe(44);
    expect(optionOf({ series }).xAxis.min).toBeUndefined();
  });

  it('draws the legend only for a chart of several entities, the isolated one alone shown', () => {
    const plain = optionOf({ series: [{ key: 'a', name: 'A', points }] });
    const entities = [
      { key: 'igb0:rx', name: 'igb0 rx', entity: 'igb0', points },
      { key: 'igb0:tx', name: 'igb0 tx', entity: 'igb0', points },
      { key: 'vnic0:rx', name: 'vnic0 rx', entity: 'vnic0', points },
    ];
    const all = optionOf({ series: entities });
    const one = optionOf({ series: entities, isolated: 'vnic0' });
    expect(plain.legend.show).toBe(false);
    expect(plain.series[0].name).toBe('A');
    expect(all.legend.show).toBe(true);
    expect(all.legend.data).toEqual(['igb0', 'vnic0']);
    expect(all.legend.selected).toEqual({ igb0: true, vnic0: true });
    expect(all.series.map(line => line.name)).toEqual(['igb0', 'igb0', 'vnic0']);
    expect(all.grid.bottom).toBe(36);
    expect(one.legend.selected).toEqual({ igb0: false, vnic0: true });
    expect(all.legend.triggerEvent).toBe(true);
    expect(legendSelected(entities, 'igb0')).toEqual({ igb0: true, vnic0: false });
    expect(legendSelected(entities, null)).toEqual({ igb0: true, vnic0: true });
    expect(legendSelected([{ key: 'a', points }], null)).toEqual({});
  });

  it('blurs no other line on a highlight, so a line the legend just hid is never put in a state', () => {
    const option = optionOf({
      series: [
        { key: 'igb0:total', name: 'igb0 total', entity: 'igb0', points },
        { key: 'vnic0:total', name: 'vnic0 total', entity: 'vnic0', points },
      ],
      isolated: 'igb0',
    });
    expect(option.series.map(line => line.emphasis)).toEqual([undefined, undefined]);
  });

  it('opens the description with the title and draws no patterns over the fills', () => {
    const option = optionOf({ series: [{ key: 'a', name: 'A', points }] });
    expect(option.aria.enabled).toBe(true);
    expect(option.aria.label.general.withoutTitle).toBe('Chart');
    expect(option.aria.decal.show).toBe(false);
  });

  it('draws a compact chart with no legend, no zoom, no axis names and no time labels over the range', () => {
    const entities = [
      { key: 'igb0:total', name: 'igb0 total', entity: 'igb0', points },
      { key: 'vnic0:total', name: 'vnic0 total', entity: 'vnic0', points },
    ];
    const option = optionOf({
      series: entities,
      axes: [{ name: 'Mbps', min: 0 }],
      range,
      compact: true,
    });
    expect(option.legend.show).toBe(false);
    expect(option.dataZoom).toEqual([]);
    expect(option.grid.top).toBe(8);
    expect(option.grid.bottom).toBe(8);
    expect(option.xAxis.axisLabel.show).toBe(false);
    expect(option.xAxis.axisTick.show).toBe(false);
    expect([option.xAxis.min, option.xAxis.max]).toEqual([0, 2000]);
    expect(option.yAxis[0].name).toBe('');
    expect(option.yAxis[0].axisLabel.fontSize).toBe(10);
    expect(option.yAxis[0].axisLine.show).toBe(false);
    expect(option.series).toHaveLength(2);
    expect(option.tooltip.trigger).toBe('axis');
  });

  it('does not animate while motion is reduced', () => {
    const series = [{ key: 'a', name: 'A', points }];
    expect(optionOf({ series }).animation).toBe(true);
    expect(optionOf({ series, reduced: true }).animation).toBe(false);
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

describe('sparkOption', () => {
  const sparkOf = spark => sparkOption({ title: 'Trend', colors, ...spark });

  it('draws the first shown series as one filled line dotted at its newest point, over the range', () => {
    const option = sparkOf({
      series: [
        { key: 'a', name: 'A', points, tone: 'green', hidden: true },
        { key: 'b', name: 'B', points, tone: 'blue' },
        { key: 'c', name: 'C', points, tone: 'red' },
      ],
      range,
    });
    expect(option.series.map(line => [line.id, line.lineStyle.color])).toEqual([
      ['b', 'color-blue'],
    ]);
    const [line] = option.series;
    expect(line.connectNulls).toBe(false);
    expect(line.smooth).toBe(0.25);
    expect(line.areaStyle.color.type).toBe('linear');
    expect(line.data[1]).toEqual({ value: [2000, 2], symbol: 'circle', symbolSize: 4 });
    expect([option.xAxis.min, option.xAxis.max]).toEqual([0, 2000]);
    expect(option.xAxis.show).toBe(false);
    expect(option.yAxis.show).toBe(false);
    expect(option.tooltip.show).toBe(false);
    expect(option.legend).toBeUndefined();
    expect(option.dataZoom).toBeUndefined();
    expect(option.aria.label.general.withoutTitle).toBe('Trend');
  });

  it('thins the line to the pixels across the cell and keeps its breaks', () => {
    const many = [...Array(500).keys()].map(index => [index * 1000, index % 3]);
    const thin = sparkOf({ series: [{ key: 'a', name: 'A', points: many }], width: 140 });
    expect(thin.series[0].data).toHaveLength(140);
    const broken = sparkOf({
      series: [
        {
          key: 'a',
          name: 'A',
          points: [
            [1000, 1],
            [2000, null],
            [3000, 3],
          ],
        },
      ],
    });
    expect(broken.series[0].data[1]).toEqual([2000, null]);
    expect(sparkOf({ series: [], reduced: true }).animation).toBe(false);
  });
});

describe('latestValue', () => {
  it('adds the newest point of every shown series and answers null while none holds one', () => {
    const series = [
      {
        key: 'a',
        points: [
          [1000, 1],
          [2000, 2],
        ],
      },
      {
        key: 'b',
        points: [
          [1000, 3],
          [2000, null],
        ],
      },
      { key: 'c', points: [[2000, 10]], hidden: true },
    ];
    expect(latestValue(series)).toBe(5);
    expect(latestValue([{ key: 'a', points: [] }])).toBeNull();
    expect(latestValue([{ key: 'a', points: [[1000, 4]], hidden: true }])).toBeNull();
  });
});
