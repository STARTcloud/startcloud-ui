import PropTypes from 'prop-types';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaCircleHalfStroke, FaHouse, FaMoon, FaSun } from 'react-icons/fa6';

const VARIANTS = ['auto', 'light', 'dark'];
const VARIANT_ICONS = { '': FaHouse, auto: FaCircleHalfStroke, light: FaSun, dark: FaMoon };

export const packShape = PropTypes.shape({
  name: PropTypes.string.isRequired,
  css: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  description: PropTypes.string,
  brand: PropTypes.string,
  logo: PropTypes.string,
});

export const lookShape = PropTypes.shape({
  pack: PropTypes.string.isRequired,
  packs: PropTypes.arrayOf(packShape).isRequired,
  setPack: PropTypes.func.isRequired,
  previewPack: PropTypes.func.isRequired,
  endPreview: PropTypes.func.isRequired,
});

const LookRow = ({ name, active, onPick, onPreview, onEndPreview, children }) => (
  <Dropdown.Item
    as="button"
    type="button"
    active={active}
    className="d-flex align-items-center"
    onClick={() => onPick(name)}
    onMouseEnter={() => onPreview(name)}
    onMouseLeave={onEndPreview}
    onFocus={() => onPreview(name)}
    onBlur={onEndPreview}
  >
    {children}
  </Dropdown.Item>
);

LookRow.propTypes = {
  name: PropTypes.string.isRequired,
  active: PropTypes.bool.isRequired,
  onPick: PropTypes.func.isRequired,
  onPreview: PropTypes.func.isRequired,
  onEndPreview: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
};

/**
 * The cluster's theme control while the host offers packs: one menu with
 * the variant rows, "Follow this site" first while the site names a
 * default variant, then auto, light and dark, then a Look section,
 * "Follow this site" first and one row per offered pack carrying that
 * pack's own mark and label from the host's `brand.packs`, hovering or
 * focusing a row previewing the look live and a click keeping it; closing
 * the menu ends any preview.
 */
const LookMenu = ({ theme, className }) => {
  const { t } = useTranslation();
  const { look } = theme;
  const Icon = VARIANT_ICONS[theme.preference] || FaCircleHalfStroke;
  const label = t('theme.look.menu');
  const variants = theme.siteVariant ? ['', ...VARIANTS] : VARIANTS;

  const pick = name => {
    look.endPreview();
    look.setPack(name);
  };

  return (
    <Dropdown
      as="li"
      align="end"
      className="nav-item"
      onToggle={open => {
        if (!open) {
          look.endPreview();
        }
      }}
    >
      <Dropdown.Toggle
        as="button"
        type="button"
        bsPrefix="nav-link"
        className={className}
        title={label}
        aria-label={label}
      >
        <Icon />
      </Dropdown.Toggle>
      <Dropdown.Menu>
        {variants.map(variant => {
          const VariantIcon = VARIANT_ICONS[variant];
          return (
            <Dropdown.Item
              key={variant || 'follow'}
              as="button"
              type="button"
              active={theme.preference === variant}
              onClick={() => theme.onPick(variant)}
            >
              <VariantIcon className="me-2" />
              {t(`theme.name.${variant || 'follow'}`)}
            </Dropdown.Item>
          );
        })}
        <Dropdown.Divider />
        <Dropdown.Header className="py-0">{t('theme.look.title')}</Dropdown.Header>
        <LookRow
          name=""
          active={look.pack === ''}
          onPick={pick}
          onPreview={look.previewPack}
          onEndPreview={look.endPreview}
        >
          {t('theme.look.follow')}
        </LookRow>
        {look.packs.map(pack => (
          <LookRow
            key={pack.name}
            name={pack.name}
            active={look.pack === pack.name}
            onPick={pick}
            onPreview={look.previewPack}
            onEndPreview={look.endPreview}
          >
            {pack.logo ? <img src={pack.logo} alt="" className="logo-sm me-2" /> : null}
            {pack.label}
          </LookRow>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
};

LookMenu.propTypes = {
  theme: PropTypes.shape({
    preference: PropTypes.string.isRequired,
    siteVariant: PropTypes.string,
    onPick: PropTypes.func.isRequired,
    look: lookShape.isRequired,
  }).isRequired,
  className: PropTypes.string.isRequired,
};

export default LookMenu;
