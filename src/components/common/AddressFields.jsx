import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { loadCountries, regionsFor } from '../../lib/countries';

import Field from './Field';

const PLACES_SCRIPT = 'https://maps.googleapis.com/maps/api/js';
const KEY_PATTERN = /^[A-Za-z0-9_-]+$/;

export const EMPTY_ADDRESS = {
  line1: '',
  line2: '',
  city: '',
  state: '',
  postal_code: '',
  country: '',
  country_code: '',
  formatted: '',
  latitude: null,
  longitude: null,
};

export const addressShape = PropTypes.shape({
  line1: PropTypes.string,
  line2: PropTypes.string,
  city: PropTypes.string,
  state: PropTypes.string,
  postal_code: PropTypes.string,
  country: PropTypes.string,
  country_code: PropTypes.string,
  formatted: PropTypes.string,
  latitude: PropTypes.number,
  longitude: PropTypes.number,
});

let placesPromise = null;

const loadPlaces = key => {
  if (!KEY_PATTERN.test(key)) {
    return Promise.reject(new Error('invalid places key'));
  }
  placesPromise ||= new Promise((resolve, reject) => {
    if (window.google?.maps?.places) {
      resolve(window.google.maps.places);
      return;
    }
    const script = document.createElement('script');
    script.src = `${PLACES_SCRIPT}?key=${encodeURIComponent(key)}&libraries=places&loading=async`;
    script.async = true;
    script.onload = () => {
      window.google.maps.importLibrary('places').then(resolve, reject);
    };
    script.onerror = () => reject(new Error('places script failed'));
    document.head.appendChild(script);
  });
  return placesPromise;
};

const component = (place, type, short = false) => {
  const entry = (place.address_components || []).find(part => part.types.includes(type));
  if (!entry) {
    return '';
  }
  return short ? entry.short_name : entry.long_name;
};

const addressOf = place => {
  const number = component(place, 'street_number');
  const route = component(place, 'route');
  const location = place.geometry?.location;
  return {
    line1: [number, route].filter(Boolean).join(' '),
    line2: component(place, 'subpremise'),
    city: component(place, 'locality') || component(place, 'postal_town'),
    state: component(place, 'administrative_area_level_1'),
    postal_code: component(place, 'postal_code'),
    country: component(place, 'country'),
    country_code: component(place, 'country', true),
    formatted: place.formatted_address || '',
    latitude: location ? location.lat() : null,
    longitude: location ? location.lng() : null,
  };
};

const usePlacesAutocomplete = ({ inputRef, placesKey, onPlace }) => {
  const onPlaceRef = useRef(onPlace);

  useEffect(() => {
    onPlaceRef.current = onPlace;
  });

  useEffect(() => {
    if (!placesKey || !inputRef.current) {
      return undefined;
    }
    let autocomplete = null;
    let cancelled = false;
    loadPlaces(placesKey)
      .then(places => {
        if (cancelled || !inputRef.current) {
          return;
        }
        autocomplete = new places.Autocomplete(inputRef.current, {
          types: ['address'],
          fields: ['address_components', 'formatted_address', 'geometry'],
        });
        autocomplete.addListener('place_changed', () => {
          onPlaceRef.current(addressOf(autocomplete.getPlace()));
        });
      })
      .catch(() => null);
    return () => {
      cancelled = true;
      if (autocomplete && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, [inputRef, placesKey]);
};

const useCountries = () => {
  const { i18n } = useTranslation();
  const [countries, setCountries] = useState([]);
  useEffect(() => {
    let mounted = true;
    loadCountries(i18n.language)
      .then(list => {
        if (mounted) {
          setCountries(list);
        }
      })
      .catch(() => null);
    return () => {
      mounted = false;
    };
  }, [i18n.language]);
  return countries;
};

/**
 * The postal address block every address form draws: line 1 (with the
 * Google Places autocomplete while `placesKey` is given, its placeholder
 * drawn only then), line 2, the country select from the shared country
 * list, the state with the suggestions for the picked country, the city
 * and the postal code; `value` is the identity contract's address record
 * and `onChange` receives the whole record after every edit.
 */
const AddressFields = ({ value, onChange, rules = null, idPrefix = 'address', placesKey = '' }) => {
  const { t } = useTranslation();
  const line1Ref = useRef(null);
  const countries = useCountries();
  const address = { ...EMPTY_ADDRESS, ...value };
  const regions = regionsFor(address.country_code);
  const listId = `${idPrefix}-regions`;

  usePlacesAutocomplete({
    inputRef: line1Ref,
    placesKey,
    onPlace: next => onChange({ ...address, ...next }),
  });

  const set = (name, fieldValue) => onChange({ ...address, [name]: fieldValue, formatted: '' });

  const setCountry = code => {
    const country = countries.find(entry => entry.code === code)?.label || '';
    onChange({ ...address, country_code: code, country, formatted: '' });
  };

  const text = (name, autoComplete, extra = {}) => (
    <Field
      id={`${idPrefix}-${name}`}
      label={t(`profile.address.${extra.labelKey || name}`)}
      error={rules?.errors?.[name] || ''}
      className="mb-3"
    >
      {aria => (
        <input
          {...aria}
          ref={extra.ref}
          type="text"
          className="form-control"
          autoComplete={autoComplete}
          list={extra.list}
          placeholder={extra.placeholder}
          value={address[name] || ''}
          onChange={event => set(name, event.target.value)}
          onBlur={() => rules?.onBlur?.(name)}
        />
      )}
    </Field>
  );

  const knownCountry = countries.some(entry => entry.code === address.country_code);

  return (
    <div className="row">
      <div className="col-12">
        {text('line1', 'address-line1', {
          ref: line1Ref,
          placeholder: placesKey ? t('profile.address.searchPlaceholder') : undefined,
        })}
      </div>
      <div className="col-md-6">{text('line2', 'address-line2')}</div>
      <div className="col-md-6">
        <Field
          id={`${idPrefix}-country_code`}
          label={t('profile.address.country')}
          error={rules?.errors?.country_code || ''}
          className="mb-3"
        >
          {aria => (
            <select
              {...aria}
              className="form-select"
              autoComplete="country"
              value={address.country_code || ''}
              onChange={event => setCountry(event.target.value)}
              onBlur={() => rules?.onBlur?.('country_code')}
            >
              <option value="">{t('profile.address.countryNone')}</option>
              {address.country_code && !knownCountry ? (
                <option value={address.country_code}>
                  {address.country || address.country_code}
                </option>
              ) : null}
              {countries.map(entry => (
                <option key={entry.code} value={entry.code}>
                  {entry.label}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>
      <div className="col-md-6">
        {text('state', 'address-level1', { list: regions.length > 0 ? listId : undefined })}
        {regions.length > 0 ? (
          <datalist id={listId}>
            {regions.map(region => (
              <option key={region} value={region} />
            ))}
          </datalist>
        ) : null}
      </div>
      <div className="col-md-6">{text('city', 'address-level2')}</div>
      <div className="col-md-6">
        {text('postal_code', 'postal-code', { labelKey: 'postalCode' })}
      </div>
    </div>
  );
};

AddressFields.propTypes = {
  value: addressShape.isRequired,
  onChange: PropTypes.func.isRequired,
  rules: PropTypes.shape({
    errors: PropTypes.objectOf(PropTypes.string),
    onBlur: PropTypes.func,
  }),
  idPrefix: PropTypes.string,
  placesKey: PropTypes.string,
};

export default AddressFields;
