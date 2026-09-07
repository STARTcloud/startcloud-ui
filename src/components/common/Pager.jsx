import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6';

const WINDOW = 2;

const pagesAround = (page, totalPages) => {
  const first = Math.max(0, page - WINDOW);
  const last = Math.min(totalPages - 1, page + WINDOW);
  const pages = [];
  for (let index = first; index <= last; index += 1) {
    pages.push(index);
  }
  return pages;
};

/**
 * The page strip of the inbox and the admin tables: previous, the pages
 * around the current one while the total is known, next, and the
 * "Showing a to b of n" line while a total is given; pages are
 * zero-based as the routes count them.
 */
const Pager = ({ page, totalPages = 0, hasNext = false, size = 0, total = 0, onChange }) => {
  const { t } = useTranslation();
  const known = totalPages > 0;
  const canPrevious = page > 0;
  const canNext = known ? page < totalPages - 1 : hasNext;
  if (!known && !canPrevious && !canNext) {
    return null;
  }
  const from = total > 0 ? page * size + 1 : 0;
  const to = total > 0 ? Math.min(total, (page + 1) * size) : 0;
  return (
    <nav className="d-flex align-items-center justify-content-center gap-2 flex-wrap mt-3">
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        disabled={!canPrevious}
        onClick={() => onChange(page - 1)}
        aria-label={t('pager.previous')}
        title={t('pager.previous')}
      >
        <FaChevronLeft aria-hidden />
      </button>
      {known
        ? pagesAround(page, totalPages).map(index => (
            <button
              key={index}
              type="button"
              className={`btn btn-sm ${index === page ? 'btn-primary' : 'btn-outline-secondary'}`}
              aria-current={index === page ? 'page' : undefined}
              aria-label={t('pager.page', { page: index + 1 })}
              onClick={() => onChange(index)}
            >
              {index + 1}
            </button>
          ))
        : null}
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        disabled={!canNext}
        onClick={() => onChange(page + 1)}
        aria-label={t('pager.next')}
        title={t('pager.next')}
      >
        <FaChevronRight aria-hidden />
      </button>
      {total > 0 ? (
        <span className="small text-body-secondary ms-2">
          {t('pager.showing', { from, to, total })}
        </span>
      ) : null}
    </nav>
  );
};

Pager.propTypes = {
  page: PropTypes.number.isRequired,
  totalPages: PropTypes.number,
  hasNext: PropTypes.bool,
  size: PropTypes.number,
  total: PropTypes.number,
  onChange: PropTypes.func.isRequired,
};

export default Pager;
