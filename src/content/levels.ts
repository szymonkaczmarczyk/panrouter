import { l } from '../i18n/l10n';
import type { Level } from './types';

export const LEVELS: Level[] = [
  {
    id: 1,
    title: l('Pierwsze kroki', 'First steps'),
    rank: l('Laik', 'Newcomer'),
    summary: l(
      'Czym jest sieć, z jakich urządzeń się składa, jak działają kable, światłowody i Wi-Fi. Budujesz pierwszą sieć i sieć domową.',
      'What a network is, what devices it is made of, how cables, fiber and Wi-Fi work. You build your first network and a home network.',
    ),
  },
  {
    id: 2,
    title: l('Fundamenty', 'Foundations'),
    rank: l('Adept', 'Apprentice'),
    summary: l(
      'Model OSI i TCP/IP, liczby binarne, adresowanie IPv4, Ethernet, przełączanie i ARP. Widzisz każdy pakiet w trybie symulacji.',
      'The OSI and TCP/IP models, binary numbers, IPv4 addressing, Ethernet, switching and ARP. You watch every packet in simulation mode.',
    ),
  },
  {
    id: 3,
    title: l('Technik sieci', 'Network technician'),
    rank: l('Technik', 'Technician'),
    summary: l(
      'TCP i UDP, podsieci i VLSM, routing statyczny, VLAN-y i trunki, routing między VLAN-ami. Konfigurujesz urządzenia w CLI.',
      'TCP and UDP, subnetting and VLSM, static routing, VLANs and trunks, inter-VLAN routing. You configure devices in the CLI.',
    ),
  },
  {
    id: 4,
    title: l('Administrator', 'Administrator'),
    rank: l('Administrator', 'Administrator'),
    summary: l(
      'DHCP i DNS w szczegółach, OSPF, NAT, listy ACL, zapory nowej generacji i IPv6. Sieć firmy zaczyna działać jak prawdziwa.',
      'DHCP and DNS in depth, OSPF, NAT, ACLs, next-generation firewalls and IPv6. The company network starts to behave like a real one.',
    ),
  },
  {
    id: 5,
    title: l('Inżynier i ekspert', 'Engineer and expert'),
    rank: l('Ekspert', 'Expert'),
    summary: l(
      'Wi-Fi w firmie, redundancja i STP, bezpieczeństwo i Zero Trust, VPN, automatyzacja, monitoring i projektowanie sieci.',
      'Enterprise Wi-Fi, redundancy and STP, security and Zero Trust, VPNs, automation, monitoring and network design.',
    ),
  },
];
