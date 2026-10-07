import PropTypes from 'prop-types';
import { useLayoutEffect, useRef } from 'react';

const fit = container => {
  const chips = [...container.querySelectorAll('[data-chip]')];
  const more = container.querySelector('[data-more]');
  chips.forEach(chip => {
    chip.hidden = false;
  });
  more.hidden = true;
  if (container.scrollWidth <= container.clientWidth) {
    return;
  }
  more.hidden = false;
  for (let shown = chips.length - 1; shown >= 0; shown -= 1) {
    chips[shown].hidden = true;
    const rest = chips.slice(shown).map(chip => chip.dataset.chip);
    more.textContent = `+${rest.length}`;
    more.title = rest.join(', ');
    if (container.scrollWidth <= container.clientWidth) {
      return;
    }
  }
};

/**
 * One version's verified providers as chips on one line, as many as the
 * width holds and a `+N` chip whose tooltip names the rest, fitted again
 * whenever the line's own size changes, so a card that narrows or a fold
 * that opens re-fits on the resize itself; a provider the catalog names a
 * verified box for links to that box's page, the box named in its tooltip.
 *
 * @param {Object} props
 * @param {Array<string>} props.providers - The provider names
 * @param {Function} [props.boxOf] - The box page of a provider, empty for none
 * @param {Function} [props.boxLabelOf] - The box a provider is verified with, empty for none
 */
const ProviderChips = ({ providers, boxOf = () => '', boxLabelOf = () => '' }) => {
  const line = useRef(null);
  const names = providers.join(',');

  useLayoutEffect(() => {
    const container = line.current;
    if (!container) {
      return undefined;
    }
    fit(container);
    const observer = new ResizeObserver(() => fit(container));
    observer.observe(container);
    return () => observer.disconnect();
  }, [names]);

  return (
    <span ref={line} className="providers-chips" data-list="providers">
      {providers.map(provider => {
        const box = boxOf(provider);
        return box ? (
          <a
            key={provider}
            href={box}
            target="_blank"
            rel="noreferrer"
            className="badge provider-chip provider-all"
            title={boxLabelOf(provider) || undefined}
            data-chip={provider}
          >
            {provider}
          </a>
        ) : (
          <span key={provider} className="badge provider-chip provider-all" data-chip={provider}>
            {provider}
          </span>
        );
      })}
      <span className="badge provider-more" data-more hidden />
    </span>
  );
};

ProviderChips.propTypes = {
  providers: PropTypes.arrayOf(PropTypes.string).isRequired,
  boxOf: PropTypes.func,
  boxLabelOf: PropTypes.func,
};

export default ProviderChips;
