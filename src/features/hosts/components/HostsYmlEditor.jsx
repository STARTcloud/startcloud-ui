import { yaml as yamlLanguage } from '@codemirror/lang-yaml';
import { linter, lintGutter } from '@codemirror/lint';
import { oneDark } from '@codemirror/theme-one-dark';
import CodeMirror, { EditorView } from '@uiw/react-codemirror';
import PropTypes from 'prop-types';
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { parseDocument } from 'yaml';

import { useTheme } from '../../../hooks/useTheme';

const EDITOR_HEIGHT = '60vh';

const yamlLinter = linter(view => {
  const text = view.state.doc.toString();
  if (!text.trim()) {
    return [];
  }
  return parseDocument(text).errors.map(problem => {
    const [from = 0, to = 0] = Array.isArray(problem.pos) ? problem.pos : [];
    return {
      from: Math.min(from, text.length),
      to: Math.min(Math.max(to, from + 1), text.length),
      severity: 'error',
      message: problem.message,
    };
  });
});

/**
 * The YAML editor of a machine's Hosts.yml, hyperweaver-ui's over our
 * CodeMirror: the yaml language, the parser's own errors in the lint
 * gutter as the text changes, the dark theme while the estate's resolved
 * mode is dark, and `jumpTo(line, column)` on its ref, which lands the
 * cursor where a refused save names its problem.
 */
const HostsYmlEditor = forwardRef(({ value, onChange, disabled }, ref) => {
  const viewRef = useRef(null);
  const { resolved } = useTheme();

  useImperativeHandle(ref, () => ({
    jumpTo: (line, column) => {
      const view = viewRef.current;
      if (!view || !line) {
        return;
      }
      const docLine = view.state.doc.line(Math.max(1, Math.min(line, view.state.doc.lines)));
      const pos = Math.min(docLine.from + Math.max(0, (column || 1) - 1), docLine.to);
      view.dispatch({
        selection: { anchor: pos },
        effects: EditorView.scrollIntoView(pos, { y: 'center' }),
      });
      view.focus();
    },
  }));

  const extensions = useMemo(() => [yamlLanguage(), yamlLinter, lintGutter()], []);

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      theme={resolved === 'dark' ? oneDark : 'light'}
      extensions={extensions}
      height={EDITOR_HEIGHT}
      readOnly={disabled}
      onCreateEditor={view => {
        viewRef.current = view;
      }}
    />
  );
});

HostsYmlEditor.displayName = 'HostsYmlEditor';

HostsYmlEditor.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default HostsYmlEditor;
