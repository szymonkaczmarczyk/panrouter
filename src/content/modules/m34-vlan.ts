import { l } from '../../i18n/l10n';
import type { Module } from '../types';

export const m34: Module = {
  id: 'vlan',
  level: 3,
  icon: 'waypoints',
  minutes: 20,
  title: l('VLAN-y, trunki i routing między VLAN-ami', 'VLANs, trunks and inter-VLAN routing'),
  summary: l(
    'Wirtualne sieci na jednym przełączniku, porty dostępowe i trunki 802.1Q, VLAN natywny, router na patyku i interfejsy SVI.',
    'Virtual networks on one switch, access ports and 802.1Q trunks, the native VLAN, router on a stick and SVI interfaces.',
  ),
  labs: ['vlan', 'inter-vlan'],
  games: ['cli-na-czas'],
  sections: [
    {
      id: 'idea',
      title: l('Jeden przełącznik, wiele sieci', 'One switch, many networks'),
      body: {
        pl: [
          { t: 'p', text: '**VLAN** (wirtualna sieć LAN) dzieli jeden fizyczny przełącznik na kilka logicznych. Komputery księgowości w VLAN 10 i goście w VLAN 20 mogą siedzieć przy tym samym przełączniku, ale nie widzą swoich rozgłoszeń i nie rozmawiają bez routera.' },
          {
            t: 'list',
            items: [
              '**Bezpieczeństwo**: goście nie widzą serwerów, a kamery nie widzą komputerów.',
              '**Porządek**: osobna podsieć IP na każdy VLAN i łatwe reguły zapory.',
              '**Mniejsze domeny rozgłoszeniowe**: mniej zbędnego ruchu.',
              '**Elastyczność**: zmiana działu to zmiana VLAN-u na porcie, bez przekładania kabli.',
            ],
          },
          { t: 'code', lines: ['SW1(config)# vlan 10', 'SW1(config-vlan)# name BIURO', 'SW1(config-vlan)# vlan 20', 'SW1(config-vlan)# name GOSCIE', 'SW1(config)# interface range g1/0/1 - 8', 'SW1(config-if-range)# switchport mode access', 'SW1(config-if-range)# switchport access vlan 10'], caption: 'Tworzenie VLAN-ów i przypisanie portów dostępowych.' },
        ],
        en: [
          { t: 'p', text: 'A **VLAN** (virtual LAN) splits one physical switch into several logical ones. Accounting PCs in VLAN 10 and guests in VLAN 20 can share a switch, yet they do not see each other’s broadcasts and cannot talk without a router.' },
          {
            t: 'list',
            items: [
              '**Security**: guests do not see servers and cameras do not see PCs.',
              '**Order**: a separate IP subnet per VLAN and simple firewall rules.',
              '**Smaller broadcast domains**: less unnecessary traffic.',
              '**Flexibility**: moving a department means changing a port’s VLAN, not recabling.',
            ],
          },
          { t: 'code', lines: ['SW1(config)# vlan 10', 'SW1(config-vlan)# name BIURO', 'SW1(config-vlan)# vlan 20', 'SW1(config-vlan)# name GOSCIE', 'SW1(config)# interface range g1/0/1 - 8', 'SW1(config-if-range)# switchport mode access', 'SW1(config-if-range)# switchport access vlan 10'], caption: 'Creating VLANs and assigning access ports.' },
        ],
      },
    },
    {
      id: 'trunk',
      title: l('Trunk 802.1Q', 'The 802.1Q trunk'),
      body: {
        pl: [
          { t: 'p', text: 'Port **dostępowy** należy do jednego VLAN-u i wysyła ramki bez znacznika. Port **trunk** przenosi wiele VLAN-ów naraz: do każdej ramki dokłada 4-bajtowy **znacznik 802.1Q** z 12-bitowym numerem VLAN (1-4094).' },
          { t: 'figure', id: 'vlan-trunk', caption: 'Jeden kabel między przełącznikami przenosi oba VLAN-y dzięki znacznikom.' },
          { t: 'code', lines: ['SW1(config)# interface g1/0/24', 'SW1(config-if)# switchport mode trunk', 'SW1(config-if)# switchport trunk allowed vlan 10,20', 'SW1(config-if)# switchport trunk native vlan 999', 'SW1# show interfaces trunk'], caption: 'Trunk z listą dozwolonych VLAN-ów i nieużywanym VLAN-em natywnym.' },
          { t: 'callout', kind: 'warn', title: 'Dobre praktyki', text: 'Ustaw trunk ręcznie po obu stronach i wyłącz negocjację (`switchport nonegotiate`). Ogranicz dozwolone VLAN-y. Jako natywny wybierz nieużywany VLAN, a VLAN 1 zostaw pusty. Niezgodny VLAN natywny po obu stronach to cicha i podstępna usterka.' },
        ],
        en: [
          { t: 'p', text: 'An **access** port belongs to one VLAN and sends untagged frames. A **trunk** port carries many VLANs at once: it adds a 4-byte **802.1Q tag** with a 12-bit VLAN number (1-4094) to each frame.' },
          { t: 'figure', id: 'vlan-trunk', caption: 'One cable between switches carries both VLANs thanks to the tags.' },
          { t: 'code', lines: ['SW1(config)# interface g1/0/24', 'SW1(config-if)# switchport mode trunk', 'SW1(config-if)# switchport trunk allowed vlan 10,20', 'SW1(config-if)# switchport trunk native vlan 999', 'SW1# show interfaces trunk'], caption: 'A trunk with an allowed VLAN list and an unused native VLAN.' },
          { t: 'callout', kind: 'warn', title: 'Best practices', text: 'Configure trunks manually on both sides and disable negotiation (`switchport nonegotiate`). Limit allowed VLANs. Use an unused VLAN as native and keep VLAN 1 empty. A native VLAN mismatch between both sides is a quiet and tricky fault.' },
        ],
      },
    },
    {
      id: 'routing',
      title: l('Routing między VLAN-ami', 'Routing between VLANs'),
      body: {
        pl: [
          { t: 'p', text: 'Każdy VLAN to osobna podsieć, więc do komunikacji między nimi potrzebny jest router. Są dwa popularne sposoby.' },
          { t: 'h', text: 'Router na patyku' },
          { t: 'figure', id: 'router-on-stick', caption: 'Jeden fizyczny port routera, po jednym podinterfejsie na VLAN.' },
          { t: 'code', lines: ['R1(config)# interface g0/0/0', 'R1(config-if)# no shutdown', 'R1(config-if)# interface g0/0/0.10', 'R1(config-subif)# encapsulation dot1Q 10', 'R1(config-subif)# ip address 192.168.10.1 255.255.255.0', 'R1(config-subif)# interface g0/0/0.20', 'R1(config-subif)# encapsulation dot1Q 20', 'R1(config-subif)# ip address 192.168.20.1 255.255.255.0'], caption: 'Port przełącznika w stronę routera musi być trunkiem.' },
          { t: 'h', text: 'Przełącznik warstwy 3 i interfejsy SVI' },
          { t: 'p', text: 'W firmach częściej używa się przełącznika L3. Każdy VLAN dostaje wirtualny interfejs **SVI** z adresem bramy, a routing odbywa się w sprzęcie z pełną prędkością portów.' },
          { t: 'code', lines: ['DSW1(config)# ip routing', 'DSW1(config)# interface vlan 10', 'DSW1(config-if)# ip address 192.168.10.1 255.255.255.0', 'DSW1(config-if)# no shutdown', 'DSW1(config)# interface vlan 20', 'DSW1(config-if)# ip address 192.168.20.1 255.255.255.0'], caption: 'SVI działa (up/up), gdy VLAN istnieje i ma co najmniej jeden aktywny port.' },
        ],
        en: [
          { t: 'p', text: 'Each VLAN is a separate subnet, so talking between them needs a router. There are two popular ways.' },
          { t: 'h', text: 'Router on a stick' },
          { t: 'figure', id: 'router-on-stick', caption: 'One physical router port, one subinterface per VLAN.' },
          { t: 'code', lines: ['R1(config)# interface g0/0/0', 'R1(config-if)# no shutdown', 'R1(config-if)# interface g0/0/0.10', 'R1(config-subif)# encapsulation dot1Q 10', 'R1(config-subif)# ip address 192.168.10.1 255.255.255.0', 'R1(config-subif)# interface g0/0/0.20', 'R1(config-subif)# encapsulation dot1Q 20', 'R1(config-subif)# ip address 192.168.20.1 255.255.255.0'], caption: 'The switch port toward the router must be a trunk.' },
          { t: 'h', text: 'Layer 3 switch and SVIs' },
          { t: 'p', text: 'Companies more often use an L3 switch. Each VLAN gets a virtual **SVI** interface with the gateway address, and routing happens in hardware at full port speed.' },
          { t: 'code', lines: ['DSW1(config)# ip routing', 'DSW1(config)# interface vlan 10', 'DSW1(config-if)# ip address 192.168.10.1 255.255.255.0', 'DSW1(config-if)# no shutdown', 'DSW1(config)# interface vlan 20', 'DSW1(config-if)# ip address 192.168.20.1 255.255.255.0'], caption: 'An SVI is up/up when the VLAN exists and has at least one active port.' },
        ],
      },
    },
  ],
  quiz: [
    { id: 'q34-1', kind: 'input', q: l('Ile bajtów ma znacznik 802.1Q?', 'How many bytes is an 802.1Q tag?'), answer: ['4'], explain: l('Znacznik ma 4 bajty, z czego 12 bitów to numer VLAN.', 'The tag is 4 bytes, 12 bits of which are the VLAN ID.') },
    { id: 'q34-2', kind: 'single', q: l('Port przenoszący wiele VLAN-ów to:', 'A port carrying many VLANs is:'), options: [l('port dostępowy', 'an access port'), l('trunk', 'a trunk'), l('port routowany', 'a routed port'), l('port konsoli', 'a console port')], answer: 1, explain: l('Trunk przenosi ramki wielu VLAN-ów ze znacznikami 802.1Q.', 'A trunk carries frames of many VLANs with 802.1Q tags.') },
    { id: 'q34-3', kind: 'single', q: l('PC w VLAN 10 i PC w VLAN 20 na tym samym przełączniku L2, bez routera. Czy się spingują?', 'A PC in VLAN 10 and a PC in VLAN 20 on the same L2 switch, no router. Can they ping?'), options: [l('Tak', 'Yes'), l('Nie', 'No')], answer: 1, explain: l('VLAN-y to osobne sieci. Bez routera ruch między nimi nie przejdzie.', 'VLANs are separate networks. Without a router traffic cannot cross.') },
    { id: 'q34-4', kind: 'input', q: l('Wpisz polecenie dla podinterfejsu routera, które przypisuje go do VLAN 30.', 'Type the router subinterface command that ties it to VLAN 30.'), answer: ['encapsulation dot1q 30'], explain: l('encapsulation dot1Q 30 mówi, że ramki z tagiem 30 trafiają do tego podinterfejsu.', 'encapsulation dot1Q 30 sends frames tagged 30 to this subinterface.') },
    { id: 'q34-5', kind: 'single', q: l('Czego potrzebuje przełącznik L3, by routować między SVI?', 'What does an L3 switch need to route between SVIs?'), options: [l('Polecenia ip routing', 'The ip routing command'), l('Trunku do routera', 'A trunk to a router'), l('Serwera DHCP', 'A DHCP server'), l('Natywnego VLAN 1', 'Native VLAN 1')], answer: 0, explain: l('Bez ip routing przełącznik traktuje SVI tylko jako interfejsy zarządzania.', 'Without ip routing the switch treats SVIs only as management interfaces.') },
    { id: 'q34-6', kind: 'single', q: l('Router na patyku nie działa, a port przełącznika do routera jest w trybie access. Co się dzieje?', 'Router on a stick fails and the switch port to the router is in access mode. What happens?'), options: [l('Działa normalnie', 'It works'), l('Ramki z tagami z routera są odrzucane na porcie dostępowym', 'Tagged frames from the router are dropped on the access port'), l('Powstaje pętla', 'A loop forms'), l('Port przechodzi w PoE', 'The port turns to PoE')], answer: 1, explain: l('Port w stronę routera musi być trunkiem, żeby przyjmować ramki z tagami.', 'The port toward the router must be a trunk to accept tagged frames.') },
    { id: 'q34-7', kind: 'multi', q: l('Które praktyki zwiększają bezpieczeństwo trunków? Wybierz wszystkie.', 'Which practices make trunks safer? Select all.'), options: [l('Nieużywany VLAN natywny', 'An unused native VLAN'), l('Ograniczenie dozwolonych VLAN-ów', 'Limiting allowed VLANs'), l('Wyłączenie negocjacji DTP', 'Disabling DTP negotiation'), l('Wszystkie porty jako trunk', 'All ports as trunks')], answer: [0, 1, 2], explain: l('Trunki ustawiasz świadomie i ograniczasz. Porty do komputerów zostają dostępowe.', 'Configure trunks deliberately and limit them. Ports to PCs stay access.') },
    { id: 'q34-8', kind: 'single', q: l('Interfejs Vlan10 ma stan up/down. Najbardziej prawdopodobna przyczyna?', 'Interface Vlan10 shows up/down. Most likely cause?'), options: [l('W VLAN 10 nie ma żadnego aktywnego portu', 'No active port is in VLAN 10'), l('Brak trasy domyślnej', 'No default route'), l('Zły DNS', 'Wrong DNS'), l('Brak hasła enable', 'No enable password')], answer: 0, explain: l('SVI wymaga istniejącego VLAN-u i co najmniej jednego aktywnego portu w nim.', 'An SVI needs an existing VLAN with at least one active port.') },
  ],
};
