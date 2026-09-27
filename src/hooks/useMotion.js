import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

const MOTION_KEY = 'motion';

export const MOTION_VALUES = ['auto', 'reduce'];

const store = {
  motion: null,
  onPersist: null,
  listeners: new Set(),
};

export const isMotionPreference = value => MOTION_VALUES.includes(value);

const initStore = ({ onPersist }) => {
  if (store.motion === null) {
    const cached = localStorage.getItem(MOTION_KEY);
    store.motion = isMotionPreference(cached) ? cached : 'auto';
  }
  if (onPersist) {
    store.onPersist = onPersist;
  }
  return store.motion;
};

const subscribeMotion = listener => {
  store.listeners.add(listener);
  return () => store.listeners.delete(listener);
};

const notify = () => store.listeners.forEach(listener => listener());

const readMotion = () => store.motion;

const writeMotion = next => {
  store.motion = next;
  notify();
};

/**
 * The motion switch shared by every estate app, one store behind every
 * call so the profile's Preferences tab and any control that joins it
 * read and write the same preference, the person's own reduced-motion
 * switch beside the variant and the look: `auto` follows the device's
 * `prefers-reduced-motion`, `reduce` turns every animation and transition
 * off. The store holds the value in force; the browser's own key,
 * localStorage.motion, holds the visitor's own choice, written by the
 * person's own control alone, `persist` true, `reduce` set and auto
 * removing the key, and never from an account, whose value arrives
 * through setMotion with `persist` false once the profile loads and
 * overwrites the store without touching the key. The initial value is
 * localStorage.motion, else auto. `reduce` is stamped on the document as
 * data-motion, the attribute removed for auto and never composed with
 * data-bs-theme or data-brand, and every user change is handed to
 * onPersist so the app can write it through to the account, auto as a
 * cleared value.
 */
export const useMotion = ({ onPersist = null } = {}) => {
  useState(() => initStore({ onPersist }));
  const motion = useSyncExternalStore(subscribeMotion, readMotion);

  useEffect(() => {
    if (motion === 'reduce') {
      document.documentElement.setAttribute('data-motion', 'reduce');
    } else {
      document.documentElement.removeAttribute('data-motion');
    }
  }, [motion]);

  const setMotion = useCallback((value, { persist = true } = {}) => {
    if (!isMotionPreference(value)) {
      return;
    }
    writeMotion(value);
    if (!persist) {
      return;
    }
    if (value === 'reduce') {
      localStorage.setItem(MOTION_KEY, 'reduce');
    } else {
      localStorage.removeItem(MOTION_KEY);
    }
    if (store.onPersist) {
      store.onPersist(value);
    }
  }, []);

  return { motion, setMotion };
};
