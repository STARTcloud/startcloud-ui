import PropTypes from 'prop-types';
import { useEffect, useRef } from 'react';

import { useFolds } from '../../../../hooks/useFolds';
import { rules } from '../../../../lib/runtime';

import DeleteAccountSection from './DeleteAccountSection';
import EmailSection from './EmailSection';
import LinkedAccountsSection from './LinkedAccountsSection';
import PasskeysSection from './PasskeysSection';
import PasswordSection from './PasswordSection';
import RecoverySection from './RecoverySection';
import TfaSection from './TfaSection';

const DEFAULT_MIN_LENGTH = 15;
const PREFS_KEY = 'table_prefs_profile_security';

const passwordMinLength = () =>
  Number(rules?.forms?.password?.properties?.password?.minLength) || DEFAULT_MIN_LENGTH;

/**
 * The Security section of the identity contract at `/user/profile/security`:
 * the password, email, two-factor, passkeys, linked accounts (while the
 * adapter carries `linked`), recovery and delete-account cards stacked
 * full width in the contract's order, each a `SectionCard` whose fold is
 * kept under `table_prefs_profile_security`, each over the `account`
 * adapter and the step-up guard; `focusEmail` scrolls the email card into
 * view when the Profile section's Change link opened it.
 */
const SecurityTab = ({ account, profile, guard, focusEmail, onSaved, onDeleted }) => {
  const emailRef = useRef(null);
  const folds = useFolds(PREFS_KEY);

  useEffect(() => {
    if (focusEmail) {
      emailRef.current?.scrollIntoView({ block: 'start' });
    }
  }, [focusEmail]);

  return (
    <div className="tab-pane fade show active">
      <PasswordSection
        account={account}
        hasPassword={Boolean(profile.has_local_auth)}
        minLength={passwordMinLength()}
        guard={guard}
        onSaved={onSaved}
        folds={folds}
      />
      <EmailSection
        account={account}
        guard={guard}
        onSaved={onSaved}
        sectionRef={emailRef}
        folds={folds}
      />
      <TfaSection
        account={account}
        profile={profile}
        guard={guard}
        onSaved={onSaved}
        folds={folds}
      />
      <PasskeysSection account={account} guard={guard} onSaved={onSaved} folds={folds} />
      {account.linked ? (
        <LinkedAccountsSection
          account={account}
          profile={profile}
          guard={guard}
          onSaved={onSaved}
          folds={folds}
        />
      ) : null}
      <RecoverySection account={account} guard={guard} folds={folds} />
      <DeleteAccountSection
        account={account}
        email={profile.email || ''}
        guard={guard}
        onDeleted={onDeleted}
        folds={folds}
      />
    </div>
  );
};

SecurityTab.propTypes = {
  account: PropTypes.object.isRequired,
  profile: PropTypes.object.isRequired,
  guard: PropTypes.func.isRequired,
  focusEmail: PropTypes.bool.isRequired,
  onSaved: PropTypes.func.isRequired,
  onDeleted: PropTypes.func.isRequired,
};

export default SecurityTab;
