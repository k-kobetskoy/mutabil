/**
 * Distance and driving time between the two addresses (decisions D16). No geocoding in the MVP:
 * zones have approximate centroids; quick mode uses a rough route class.
 */
import type { OrderInput } from '@/contract/order';
import type { Cfg } from '@/config';

export type ZoneClass = 'city' | 'suburb' | 'intercity';

export type RouteInfo = {
  km: number;
  driveH: number;
  fromClass: ZoneClass;
  intercity: boolean;
  peak: boolean;
  source: 'zones' | 'quick';
};

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function findZone(cfg: Cfg, id: string | undefined) {
  return id ? cfg.zones.zones.find((z) => z.id === id) : undefined;
}

export function routeInfo(order: OrderInput, cfg: Cfg): RouteInfo {
  const { drive } = cfg.time;
  const from = findZone(cfg, order.from?.zoneId);
  const to = findZone(cfg, order.to?.zoneId);
  const peak = cfg.app.slots.find((s) => s.id === order.schedule?.slot)?.peak ?? false;

  let km: number;
  let fromClass: ZoneClass;
  let intercity: boolean;
  let source: RouteInfo['source'];

  if (from && to) {
    source = 'zones';
    intercity = from.class === 'intercity' || to.class === 'intercity';
    fromClass = intercity ? 'intercity' : from.class === 'suburb' || to.class === 'suburb' ? 'suburb' : 'city';
    if (intercity) km = order.distanceKm ?? cfg.zones.intercityDefaultKm;
    else if (from.id === to.id || from.lat === null || to.lat === null || from.lng === null || to.lng === null) km = cfg.zones.sameZoneKm;
    else km = haversineKm({ lat: from.lat, lng: from.lng }, { lat: to.lat, lng: to.lng }) * drive.detourFactor;
  } else {
    source = 'quick';
    const r = order.route ?? 'city';
    intercity = r === 'intercity';
    fromClass = r;
    km = intercity && order.distanceKm ? order.distanceKm : cfg.zones.quickRouteKm[r];
  }

  const driveH = intercity
    ? km / drive.intercitySpeedKmh
    : Math.max(drive.minDriveMin / 60, (km / drive.avgUrbanSpeedKmh) * (peak ? drive.peakFactor : 1));

  return { km, driveH, fromClass, intercity, peak, source };
}
