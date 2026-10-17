import { l } from '../../i18n/l10n';
import type { Module } from '../types';

export const m54: Module = {
  id: 'automatyzacja',
  level: 5,
  icon: 'gauge',
  minutes: 22,
  title: l('Automatyzacja, monitoring i diagnostyka', 'Automation, monitoring and troubleshooting'),
  summary: l(
    'SNMPv3, syslog, NetFlow i telemetria, NETCONF z YANG, Ansible i Python, źródło prawdy, sieci w chmurze i metodyczne szukanie usterek.',
    'SNMPv3, syslog, NetFlow and telemetry, NETCONF with YANG, Ansible and Python, a source of truth, cloud networking and methodical troubleshooting.',
  ),
  labs: ['awaria', 'kampus'],
  games: ['detektyw-sieci', 'cli-na-czas'],
  sections: [
    {
      id: 'monitoring',
      title: l('Monitoring: wiedzieć przed użytkownikiem', 'Monitoring: know before the users do'),
      body: {
        pl: [
          {
            t: 'table',
            head: ['Narzędzie', 'Co daje', 'Uwagi'],
            rows: [
              ['SNMPv3', 'liczniki, stan interfejsów, alarmy', 'tylko wersja 3, z uwierzytelnianiem i szyfrowaniem'],
              ['syslog', 'zdarzenia z urządzeń', 'centralny serwer, synchronizacja NTP, retencja'],
              ['NetFlow / IPFIX', 'kto z kim rozmawia i ile', 'analiza ruchu, wykrywanie anomalii'],
              ['Telemetria strumieniowa (gNMI)', 'dane co sekundę zamiast odpytywania', 'standard w nowych platformach'],
              ['sondy syntetyczne', 'czy aplikacja działa z perspektywy użytkownika', 'np. cykliczne logowanie i pomiar czasu'],
            ],
          },
          { t: 'callout', kind: 'tip', text: 'Najpierw ustal linię bazową: jakie obciążenie i opóźnienie są normalne. Bez tego trudno rozpoznać, co jest problemem.' },
        ],
        en: [
          {
            t: 'table',
            head: ['Tool', 'What it gives', 'Notes'],
            rows: [
              ['SNMPv3', 'counters, interface state, alerts', 'version 3 only, with authentication and encryption'],
              ['syslog', 'events from devices', 'central server, NTP sync, retention'],
              ['NetFlow / IPFIX', 'who talks to whom and how much', 'traffic analysis, anomaly detection'],
              ['Streaming telemetry (gNMI)', 'data every second instead of polling', 'standard on new platforms'],
              ['synthetic probes', 'does the app work from the user’s view', 'e.g. a periodic login with timing'],
            ],
          },
          { t: 'callout', kind: 'tip', text: 'Set a baseline first: what load and latency are normal. Without it you cannot tell what is a problem.' },
        ],
      },
    },
    {
      id: 'automatyzacja',
      title: l('Sieć jako kod', 'Network as code'),
      body: {
        pl: [
          { t: 'p', text: 'Ręczne wpisywanie tych samych poleceń na stu przełącznikach to błędy i stracony czas. Dziś konfigurację opisuje się w plikach, trzyma w Git i wdraża automatycznie.' },
          {
            t: 'terms',
            items: [
              ['YANG', 'język modeli danych opisujący konfigurację i stan urządzeń'],
              ['NETCONF i RESTCONF', 'protokoły do pobierania i zmiany konfiguracji według modeli YANG (przez SSH lub HTTPS)'],
              ['Ansible', 'narzędzie bez agentów: playbooki YAML wykonują zadania na wielu urządzeniach naraz'],
              ['Python', 'biblioteki Netmiko, NAPALM, Nornir, ncclient do własnej automatyzacji'],
              ['Źródło prawdy', 'np. NetBox: jedna baza adresów, urządzeń i połączeń, z której generuje się konfiguracje'],
              ['CI/CD dla sieci', 'zmiana w Git, automatyczne testy, przegląd i wdrożenie z możliwością cofnięcia'],
            ],
          },
          { t: 'code', lines: ['- name: Ustaw VLAN-y na przełącznikach dostępowych', '  hosts: dostep', '  tasks:', '    - name: VLAN 10 BIURO', '      cisco.ios.ios_vlans:', '        config:', '          - vlan_id: 10', '            name: BIURO', '        state: merged'], caption: 'Fragment playbooka Ansible: ten sam VLAN na wszystkich przełącznikach z grupy.' },
        ],
        en: [
          { t: 'p', text: 'Typing the same commands on a hundred switches means errors and wasted time. Today configuration is described in files, kept in Git and deployed automatically.' },
          {
            t: 'terms',
            items: [
              ['YANG', 'a data modeling language describing device configuration and state'],
              ['NETCONF and RESTCONF', 'protocols to read and change configuration per YANG models (over SSH or HTTPS)'],
              ['Ansible', 'an agentless tool: YAML playbooks run tasks on many devices at once'],
              ['Python', 'Netmiko, NAPALM, Nornir and ncclient libraries for custom automation'],
              ['Source of truth', 'e.g. NetBox: one database of addresses, devices and links used to generate configs'],
              ['CI/CD for networks', 'a change in Git, automatic tests, review and deployment with rollback'],
            ],
          },
          { t: 'code', lines: ['- name: Set VLANs on access switches', '  hosts: access', '  tasks:', '    - name: VLAN 10 OFFICE', '      cisco.ios.ios_vlans:', '        config:', '          - vlan_id: 10', '            name: OFFICE', '        state: merged'], caption: 'An Ansible playbook excerpt: the same VLAN on every switch in the group.' },
        ],
      },
    },
    {
      id: 'chmura',
      title: l('Sieci w chmurze i SD-WAN', 'Cloud networking and SD-WAN'),
      body: {
        pl: [
          { t: 'p', text: 'W chmurze publicznej sieć to też kod. Tworzysz **VPC** (wirtualną sieć) z podsieciami, tablicami tras, bramą internetową i NAT. Zamiast zapory sprzętowej są **grupy zabezpieczeń** i reguły sieciowe. Oddziały łączą się z chmurą przez VPN, dedykowane łącza albo SD-WAN.' },
          { t: 'list', items: ['Planuj adresację tak, żeby VPC nie nakładały się z siecią biura.', 'Domyślnie blokuj ruch przychodzący, otwieraj tylko potrzebne porty.', 'Zasady segmentacji, routingu i diagnostyki są te same co w serwerowni.'] },
        ],
        en: [
          { t: 'p', text: 'In the public cloud the network is code too. You create a **VPC** (virtual network) with subnets, route tables, an internet gateway and NAT. Instead of a hardware firewall there are **security groups** and network rules. Branches reach the cloud via VPN, dedicated links or SD-WAN.' },
          { t: 'list', items: ['Plan addressing so VPCs do not overlap with the office network.', 'Block inbound traffic by default and open only needed ports.', 'Segmentation, routing and troubleshooting principles are the same as in a server room.'] },
        ],
      },
    },
    {
      id: 'diagnoza',
      title: l('Metodyczne szukanie usterek', 'Methodical troubleshooting'),
      body: {
        pl: [
          {
            t: 'list',
            ordered: true,
            items: [
              '**Zdefiniuj problem**: kto, co, od kiedy, czy coś się zmieniło? Odtwórz go.',
              '**Zbierz fakty**: `ping`, `tracert`, `show ip interface brief`, `show ip route`, `show vlan brief`, logi.',
              '**Postaw hipotezę** i sprawdzaj warstwy: od dołu, od góry albo dziel na pół (np. ping do połowy drogi).',
              '**Wprowadź jedną zmianę naraz** i sprawdź efekt.',
              '**Udokumentuj**: przyczynę, poprawkę i to, jak zapobiec powtórce.',
            ],
          },
          { t: 'table', head: ['Objaw', 'Częsta przyczyna'], rows: [['adres 169.254.x.x', 'brak DHCP: kabel, VLAN, przekaźnik'], ['ping do bramy działa, dalej nie', 'brak trasy lub NAT, brak trasy powrotnej'], ['ping po IP działa, po nazwie nie', 'DNS'], ['ping działa, strona nie', 'port, zapora, usługa'], ['działa tylko część komputerów', 'VLAN na porcie, trunk, maska'], ['pierwszy ping ginie', 'normalne: ARP na routerze']] },
          { t: 'callout', kind: 'tip', text: 'Laboratorium „Awaria w biurze” to sieć z kilkoma ukrytymi usterkami. Przećwicz na nim tę metodę.' },
        ],
        en: [
          {
            t: 'list',
            ordered: true,
            items: [
              '**Define the problem**: who, what, since when, did anything change? Reproduce it.',
              '**Gather facts**: `ping`, `tracert`, `show ip interface brief`, `show ip route`, `show vlan brief`, logs.',
              '**Form a hypothesis** and check layers: bottom-up, top-down or divide and conquer (e.g. ping halfway).',
              '**Make one change at a time** and verify the effect.',
              '**Document**: the cause, the fix and how to prevent it.',
            ],
          },
          { t: 'table', head: ['Symptom', 'Common cause'], rows: [['address 169.254.x.x', 'no DHCP: cable, VLAN, relay'], ['ping to gateway works, beyond does not', 'missing route or NAT, no return route'], ['ping by IP works, by name does not', 'DNS'], ['ping works, the site does not', 'port, firewall, service'], ['only some computers work', 'port VLAN, trunk, mask'], ['the first ping is lost', 'normal: ARP on the router']] },
          { t: 'callout', kind: 'tip', text: 'The "Office outage" lab is a network with several hidden faults. Practice this method on it.' },
        ],
      },
    },
  ],
  quiz: [
    { id: 'q54-1', kind: 'single', q: l('Której wersji SNMP używasz w 2026?', 'Which SNMP version do you use in 2026?'), options: [l('v1', 'v1'), l('v2c', 'v2c'), l('v3', 'v3')], answer: 2, explain: l('Tylko SNMPv3 ma uwierzytelnianie i szyfrowanie.', 'Only SNMPv3 has authentication and encryption.') },
    { id: 'q54-2', kind: 'single', q: l('Co opisuje modele konfiguracji dla NETCONF i RESTCONF?', 'What describes configuration models for NETCONF and RESTCONF?'), options: [l('YANG', 'YANG'), l('JSON Schema dla przeglądarek', 'Browser JSON Schema'), l('MIB SNMPv1', 'SNMPv1 MIB'), l('HTML', 'HTML')], answer: 0, explain: l('YANG to język modeli danych urządzeń sieciowych.', 'YANG is the data modeling language for network devices.') },
    { id: 'q54-3', kind: 'single', q: l('Ping po adresie IP działa, a po nazwie nie. Co sprawdzasz?', 'Ping by IP works but by name does not. What do you check?'), options: [l('DNS', 'DNS'), l('Kabel', 'The cable'), l('VLAN', 'The VLAN'), l('STP', 'STP')], answer: 0, explain: l('Skoro IP działa, routing jest w porządku. Problem jest w rozwiązywaniu nazw.', 'Since IP works, routing is fine. The issue is name resolution.') },
    { id: 'q54-4', kind: 'single', q: l('Co pokazuje NetFlow?', 'What does NetFlow show?'), options: [l('Kto z kim rozmawia i ile danych przesyła', 'Who talks to whom and how much data'), l('Temperaturę procesora', 'CPU temperature'), l('Hasła użytkowników', 'User passwords'), l('Mapę Wi-Fi', 'A Wi-Fi map')], answer: 0, explain: l('NetFlow i IPFIX zbierają statystyki przepływów ruchu.', 'NetFlow and IPFIX collect traffic flow statistics.') },
    { id: 'q54-5', kind: 'single', q: l('Do czego służy źródło prawdy, np. NetBox?', 'What is a source of truth such as NetBox for?'), options: [l('Jedna baza adresów, urządzeń i połączeń do generowania konfiguracji', 'One database of addresses, devices and links to generate configs'), l('Zapora sieciowa', 'A firewall'), l('Serwer DHCP', 'A DHCP server'), l('Antywirus', 'Antivirus')], answer: 0, explain: l('Automatyzacja potrzebuje jednego, wiarygodnego opisu sieci.', 'Automation needs one trustworthy description of the network.') },
    { id: 'q54-6', kind: 'order', q: l('Ułóż kroki metodycznej diagnozy.', 'Order the troubleshooting steps.'), items: [l('Zdefiniuj problem', 'Define the problem'), l('Zbierz fakty', 'Gather facts'), l('Postaw hipotezę i sprawdź', 'Form and test a hypothesis'), l('Wprowadź jedną zmianę', 'Make one change'), l('Udokumentuj', 'Document')], explain: l('Bez faktów i dokumentacji naprawy są przypadkowe i się powtarzają.', 'Without facts and documentation fixes are random and repeat.') },
    { id: 'q54-7', kind: 'single', q: l('Co w chmurze publicznej zastępuje fizyczną sieć LAN?', 'What replaces the physical LAN in the public cloud?'), options: [l('VPC z podsieciami', 'A VPC with subnets'), l('Koncentrator', 'A hub'), l('Modem', 'A modem'), l('Kabel Cat8', 'Cat8 cable')], answer: 0, explain: l('VPC to wirtualna sieć z podsieciami, trasami i regułami.', 'A VPC is a virtual network with subnets, routes and rules.') },
    { id: 'q54-8', kind: 'single', q: l('Dlaczego przy naprawie zmieniasz jedną rzecz naraz?', 'Why change one thing at a time when fixing?'), options: [l('Żeby wiedzieć, co naprawdę pomogło', 'To know what actually helped'), l('Bo tak wymaga CLI', 'The CLI requires it'), l('Żeby było szybciej', 'To be faster'), l('Bez powodu', 'No reason')], answer: 0, explain: l('Wiele zmian naraz zaciera przyczynę i może dodać nowe usterki.', 'Many changes at once hide the cause and can add new faults.') },
  ],
};
