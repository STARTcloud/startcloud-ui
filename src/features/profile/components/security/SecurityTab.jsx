import PropTypes from 'prop-types';
import { useEffect, useRef } from 'react';

import { rules } from '../../../../lib/runtime';

import DeleteAccountSection from './DeleteAccountSection';
import EmailSection from './EmailSection';
import PasskeysSection from './PasskeysSection';
import PasswordSection from './PasswordSection';
import RecoverySection from './RecoverySection';
import TfaSection from './TfaSection';

const DEFAULT_MIN_LENGTH = 15;

const passwordMinLength = () =>
  Number(rules?.forms?.password?.properties?.password?.minLength) || DEFAULT_MIN_LENGTH;

/**
 * The Security tab of the identity contract at `#security`: the password,
 * email, two-factor, passkeys, recovery and delete-account sections, each
 * over the `account` adapter and the step-up guard; `focusEmail` scrolls
 * the email section into view when the Profile tab's Change link opened
 * the tab.
 */
const SecurityTab = ({ account, profile, guard, focusEmail, onSaved, onDeleted }) => {
  const emailRef = useRef(null);

  useEffect(() => {
    if (focusEmail) {
      emailRef.current?.scrollIntoView({ block: 'start' });
    }
  }, [focusEmail]);

  return (
    <div className="tab-pane fade show active">
      <div className="row">
        <div className="col-lg-6">
          <PasswordSection
            account={account}
            hasPassword={Boolean(profile.has_local_auth)}
            minLength={passwordMinLength()}
            guard={guard}
            onSaved={onSaved}
          />
          <EmailSection account={account} guard={guard} onSaved={onSaved} sectionRef={emailRef} />
          <PasskeysSection account={account} guard={guard} onSaved={onSaved} />
        </div>
        <div className="col-lg-6">
          <TfaSection account={account} profile={profile} guard={guard} onSaved={onSaved} />
          <RecoverySection account={account} guard={guard} />
          <DeleteAccountSection
            account={account}
            email={profile.email || ''}
            guard={guard}
            onDeleted={onDeleted}
          />
        </div>
      </div>
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
