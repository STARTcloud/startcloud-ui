import L from 'leaflet';
import PropTypes from 'prop-types';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';

const WORLD_CENTER = [20, 0];
const WORLD_ZOOM = 2;
const MIN_RADIUS = 6;
const MAX_RADIUS = 22;

const radiusOf = (count, max) => MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * Math.sqrt(count / max);

const popupNode = ({ point, t, navigate }) => {
  const node = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = [point.city, point.country].filter(Boolean).join(', ');
  const count = document.createElement('div');
  count.textContent = t('admin.dashboard.map.count', { count: point.count });
  const link = document.createElement('a');
  link.href = '/admin/logins';
  link.textContent = t('admin.dashboard.map.viewLogins');
  link.addEventListener('click', event => {
    event.preventDefault();
    navigate('/admin/logins');
  });
  node.append(title, count, link);
  return node;
};

/**
 * The login map of the Dashboard: Leaflet with marker clusters over the
 * points the heatmap answer carries, the tile layer from the answer's
 * `tiles` (`url`, `max_zoom`, `referrer_policy`, `no-referrer` unless
 * named), the attribution drawn as text beside the map rather than
 * injected as HTML, every popup built from DOM nodes and linking to the
 * Logins page; loaded lazily by the Dashboard route alone.
 */
const LoginMap = ({ tiles, points }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    const map = L.map(containerRef.current, { attributionControl: false }).setView(
      WORLD_CENTER,
      WORLD_ZOOM
    );
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !tiles?.url) {
      return undefined;
    }
    const layer = L.tileLayer(tiles.url, {
      maxZoom: tiles.max_zoom || 18,
      referrerPolicy: tiles.referrer_policy || 'no-referrer',
    }).addTo(map);
    return () => {
      layer.remove();
    };
  }, [tiles]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return undefined;
    }
    const cluster = L.markerClusterGroup();
    const max = points.reduce((most, point) => Math.max(most, point.count), 1);
    points.forEach(point => {
      const marker = L.circleMarker([point.lat, point.lng], {
        radius: radiusOf(point.count, max),
        weight: 1,
      });
      marker.bindPopup(popupNode({ point, t, navigate }));
      cluster.addLayer(marker);
    });
    map.addLayer(cluster);
    layerRef.current = cluster;
    return () => {
      map.removeLayer(cluster);
    };
  }, [navigate, points, t]);

  return (
    <div>
      <div ref={containerRef} className="login-map" aria-label={t('admin.dashboard.map.title')} />
      {tiles?.attribution ? <div className="small text-muted mt-1">{tiles.attribution}</div> : null}
    </div>
  );
};

LoginMap.propTypes = {
  tiles: PropTypes.shape({
    url: PropTypes.string,
    attribution: PropTypes.string,
    max_zoom: PropTypes.number,
    referrer_policy: PropTypes.string,
  }),
  points: PropTypes.arrayOf(
    PropTypes.shape({
      city: PropTypes.string,
      country: PropTypes.string,
      lat: PropTypes.number.isRequired,
      lng: PropTypes.number.isRequired,
      count: PropTypes.number.isRequired,
    })
  ).isRequired,
};

export default LoginMap;
