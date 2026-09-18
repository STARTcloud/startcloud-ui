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
 * The Security section of the profile page: the password, email,
 * two-factor, passkeys, linked accounts, recovery and delete-account cards
 * stacked full width in the identity contract's order, each drawn only
 * while the `account` adapter carries its calls (`password`, `email`,
 * `tfa`, `passkeys`, `linked`, `backupCodes`, `deletion`), each a
 * `SectionCard` whose fold is kept under `table_prefs_profile_security`,
 * each over the adapter and the step-up guard; `focusEmail` scrolls the
 * email card into view when the Profile section's Change link opened it;
 * a `readOnly` adapter carries no security call, so the section is not
 * drawn and the Manage at identity provider link of the Profile section
 * is the way to the provider's own.
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
      {account.password ? (
        <PasswordSection
          account={account}
          hasPassword={Boolean(profile.has_local_auth)}
          minLength={passwordMinLength()}
          guard={guard}
          onSaved={onSaved}
          folds={folds}
        />
      ) : null}
      {account.email ? (
        <EmailSection
          account={account}
          guard={guard}
          onSaved={onSaved}
          sectionRef={emailRef}
          folds={folds}
        />
      ) : null}
      {account.tfa ? (
        <TfaSection
          account={account}
          profile={profile}
          guard={guard}
          onSaved={onSaved}
          folds={folds}
        />
      ) : null}
      {account.passkeys ? (
        <PasskeysSection account={account} guard={guard} onSaved={onSaved} folds={folds} />
      ) : null}
      {account.linked ? (
        <LinkedAccountsSection
          account={account}
          profile={profile}
          guard={guard}
          onSaved={onSaved}
          folds={folds}
        />
      ) : null}
      {account.backupCodes ? (
        <RecoverySection account={account} guard={guard} folds={folds} />
      ) : null}
      {account.deletion ? (
        <DeleteAccountSection
          account={account}
          email={profile.email || ''}
          guard={guard}
          onDeleted={onDeleted}
          folds={folds}
        />
      ) : null}
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
