import { l, type L10n } from '../i18n/l10n';

export interface GameMeta {
  id: string;
  title: L10n;
  summary: L10n;
  icon: 'binary' | 'split' | 'layers' | 'hash' | 'route' | 'cpu' | 'cable' | 'globe' | 'wrench' | 'terminal';
  minutes: number;
  level: 1 | 2 | 3 | 4 | 5;
}

export const GAMES: GameMeta[] = [
  {
    id: 'binarny-sprint',
    title: l('Binarny sprint', 'Binary sprint'),
    summary: l('Przełączaj bity, aż ułożą się w podaną liczbę. 60 sekund, każda trafiona liczba to punkt.', 'Flip bits until they make the given number. 60 seconds, one point per number.'),
    icon: 'binary',
    minutes: 2,
    level: 2,
  },
  {
    id: 'warstwy-osi',
    title: l('Warstwy OSI', 'OSI layers'),
    summary: l('Przypisz protokoły, urządzenia i jednostki danych do właściwej warstwy modelu OSI.', 'Assign protocols, devices and data units to the right OSI layer.'),
    icon: 'layers',
    minutes: 4,
    level: 2,
  },
  {
    id: 'porty-uslugi',
    title: l('Porty i usługi', 'Ports and services'),
    summary: l('Szybka seria: jaki port i protokół ma usługa. SSH, DNS, HTTPS, RDP, WireGuard i inne.', 'Quick fire: which port and protocol does a service use. SSH, DNS, HTTPS, RDP, WireGuard and more.'),
    icon: 'hash',
    minutes: 3,
    level: 3,
  },
  {
    id: 'kabel-do-portu',
    title: l('Kabel do portu', 'Cable to port'),
    summary: l('Dobierz kabel, wkładkę i zasilanie do sytuacji: 10 Gb/s na 300 m, kamera PoE, punkt Wi-Fi 7.', 'Pick the cable, optic and power for a situation: 10 Gb/s over 300 m, a PoE camera, a Wi-Fi 7 AP.'),
    icon: 'cable',
    minutes: 4,
    level: 1,
  },
  {
    id: 'podsieciowiec',
    title: l('Podsieciowiec', 'Subnet sprint'),
    summary: l('Dla adresu z maską wyznacz sieć, rozgłoszenie, zakres hostów i ich liczbę.', 'For an address with a mask, find the network, broadcast, host range and host count.'),
    icon: 'split',
    minutes: 5,
    level: 3,
  },
  {
    id: 'tablica-mac',
    title: l('Przełącznik uczy się', 'The switch learns'),
    summary: l('Przewiduj, co przełącznik zrobi z ramką: prześle, zaleje czy odfiltruje. Śledź tablicę MAC.', 'Predict what the switch does with a frame: forward, flood or filter. Track the MAC table.'),
    icon: 'cpu',
    minutes: 4,
    level: 2,
  },
  {
    id: 'droga-pakietu',
    title: l('Droga pakietu', 'Packet path'),
    summary: l('Wybierz trasę z tablicy routingu metodą najdłuższego dopasowania prefiksu.', 'Pick the route from the routing table using longest prefix match.'),
    icon: 'route',
    minutes: 4,
    level: 3,
  },
  {
    id: 'ipv6-kompresor',
    title: l('Kompresor IPv6', 'IPv6 compressor'),
    summary: l('Skracaj i rozwijaj adresy IPv6 według zasad RFC 5952.', 'Shorten and expand IPv6 addresses following RFC 5952 rules.'),
    icon: 'globe',
    minutes: 4,
    level: 4,
  },
  {
    id: 'detektyw-sieci',
    title: l('Detektyw sieci', 'Network detective'),
    summary: l('Objawy, wyniki poleceń i jedna przyczyna. Znajdź usterkę jak administrator na dyżurze.', 'Symptoms, command output and one root cause. Find the fault like an on-call admin.'),
    icon: 'wrench',
    minutes: 6,
    level: 4,
  },
  {
    id: 'cli-na-czas',
    title: l('CLI na czas', 'CLI speedrun'),
    summary: l('Wykonaj zadania na prawdziwym CLI symulatora. Liczy się wynik w konfiguracji, a nie dokładna pisownia.', 'Complete tasks in the simulator’s real CLI. What counts is the resulting config, not exact spelling.'),
    icon: 'terminal',
    minutes: 6,
    level: 3,
  },
];
