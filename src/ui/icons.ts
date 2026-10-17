import {
  Binary,
  Cable,
  Cloud,
  Cpu,
  Gauge,
  Globe,
  Layers,
  Lock,
  Network,
  Radio,
  Route,
  Router,
  Server,
  Shield,
  ShieldCheck,
  Split,
  Waypoints,
  Wifi,
  Workflow,
  Wrench,
} from 'lucide-preact';

export const ICONS = {
  network: Network,
  router: Router,
  cable: Cable,
  globe: Globe,
  layers: Layers,
  binary: Binary,
  split: Split,
  cpu: Cpu,
  route: Route,
  waypoints: Waypoints,
  server: Server,
  shield: Shield,
  shieldCheck: ShieldCheck,
  lock: Lock,
  wifi: Wifi,
  radio: Radio,
  cloud: Cloud,
  workflow: Workflow,
  gauge: Gauge,
  wrench: Wrench,
};

export type IconName = keyof typeof ICONS;

export function iconFor(name: string) {
  return ICONS[name as IconName] ?? Network;
}
