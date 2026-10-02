import PropTypes from 'prop-types';
import { useCallback, useRef } from 'react';

import { useCssVar } from '../../../../hooks/useCssVar';

/**
 * An element tinted with one network color, the color set as
 * `--hw-topo-tint` through the CSSOM so the stylesheet's class reads it
 * and the element carries no style attribute: the chip bar's dots, the
 * network cards' bands and borders, the chips' network words, the
 * groups' heads and the drill panel's border. `anchorRef`, where given,
 * is handed the element too, the overlay's anchor of a network card.
 */
export const Tinted = ({
  as: Tag = 'span',
  tint = null,
  anchorRef = null,
  children = null,
  ...rest
}) => {
  const ref = useRef(null);
  const attach = useCallback(
    element => {
      ref.current = element;
      if (anchorRef) {
        anchorRef(element);
      }
    },
    [anchorRef]
  );
  useCssVar(ref, '--hw-topo-tint', tint);
  return (
    <Tag ref={attach} {...rest}>
      {children}
    </Tag>
  );
};

Tinted.propTypes = {
  as: PropTypes.elementType,
  tint: PropTypes.string,
  anchorRef: PropTypes.func,
  children: PropTypes.node,
};

/**
 * A bar whose width is a share of its row, the width set as
 * `--hw-topo-bar` for the stylesheet to read.
 */
export const Bar = ({ className, percent }) => {
  const ref = useRef(null);
  useCssVar(ref, '--hw-topo-bar', `${percent}%`);
  return <span ref={ref} className={className} />;
};

Bar.propTypes = {
  className: PropTypes.string.isRequired,
  percent: PropTypes.number.isRequired,
};

/**
 * An SVG path whose dash animation runs at a period the rate sets, the
 * period set as `--hw-topo-period` for the stylesheet to read; the
 * stroke and its width are the path's own presentation attributes.
 */
export const FlowPath = ({ period, ...rest }) => {
  const ref = useRef(null);
  useCssVar(ref, '--hw-topo-period', `${period.toFixed(2)}s`);
  return <path ref={ref} {...rest} />;
};

FlowPath.propTypes = {
  period: PropTypes.number.isRequired,
};
