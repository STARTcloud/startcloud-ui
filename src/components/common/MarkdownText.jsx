import PropTypes from 'prop-types';
import Markdown from 'react-markdown';

const MarkdownLink = ({ href = '', children = null }) => (
  <a href={href} target="_blank" rel="noopener noreferrer">
    {children}
  </a>
);

MarkdownLink.propTypes = {
  href: PropTypes.string,
  children: PropTypes.node,
};

const COMPONENTS = { a: MarkdownLink };

/**
 * The one prose block of the estate: a description, a README or a set of
 * release notes written in Markdown and drawn as Markdown, every link a
 * real link that opens in its own tab and carries no referrer to the
 * opener. Raw HTML is never rendered and a scheme the renderer does not
 * trust is dropped, so a description is text a person writes, never
 * markup a person injects.
 */
const MarkdownText = ({ text, className = '' }) => {
  if (!text) {
    return null;
  }
  return (
    <div className={className}>
      <Markdown components={COMPONENTS}>{text}</Markdown>
    </div>
  );
};

MarkdownText.propTypes = {
  text: PropTypes.string,
  className: PropTypes.string,
};

export default MarkdownText;
