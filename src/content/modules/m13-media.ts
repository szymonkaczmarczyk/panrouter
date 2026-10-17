import { l } from '../../i18n/l10n';
import type { Module } from '../types';

export const m13: Module = {
  id: 'media',
  level: 1,
  icon: 'cable',
  minutes: 16,
  title: l('Kable, światłowody, PoE i Wi-Fi', 'Cables, fiber, PoE and Wi-Fi'),
  summary: l(
    'Skrętka kategorii 6A, światłowód jedno- i wielomodowy, wkładki SFP, zasilanie PoE oraz Wi-Fi 6E i 7.',
    'Category 6A twisted pair, single-mode and multimode fiber, SFP optics, PoE power and Wi-Fi 6E and 7.',
  ),
  labs: ['siec-domowa'],
  games: ['kabel-do-portu'],
  sections: [
    {
      id: 'skretka',
      title: l('Skrętka i złącze RJ45', 'Twisted pair and the RJ45 connector'),
      body: {
        pl: [
          { t: 'p', text: 'Najpopularniejszy kabel sieciowy to **skrętka**: cztery pary miedzianych przewodów skręconych ze sobą, zakończone wtykiem **RJ45**. Skręcenie zmniejsza zakłócenia. Maksymalna długość kanału to **100 metrów**.' },
          {
            t: 'table',
            head: ['Kategoria', 'Prędkość', 'Zastosowanie w 2026'],
            rows: [
              ['Cat5e', '1 Gb/s (2,5 Gb/s na krótkich odcinkach)', 'starsze instalacje, do wymiany przy remoncie'],
              ['Cat6', '1 Gb/s na 100 m, 10 Gb/s do ok. 55 m', 'typowe biura i domy'],
              ['**Cat6A**', '10 Gb/s na 100 m', 'zalecana do nowych instalacji i punktów Wi-Fi 7'],
              ['Cat8', '25-40 Gb/s do 30 m', 'krótkie połączenia w serwerowniach'],
            ],
          },
          { t: 'p', text: 'Dawniej trzeba było pamiętać o kablach prostych i krosowanych. Dziś porty mają **auto-MDIX** i same dopasowują pary, więc zwykły kabel łączy dowolne dwa urządzenia.' },
          { t: 'callout', kind: 'tip', text: 'Kabel ekranowany (np. F/UTP lub S/FTP) pomaga w halach z silnikami i w pobliżu kabli zasilających. W biurze zwykle wystarczy U/UTP.' },
        ],
        en: [
          { t: 'p', text: 'The most common network cable is **twisted pair**: four pairs of copper wires twisted together, ending in an **RJ45** plug. Twisting reduces interference. The maximum channel length is **100 meters**.' },
          {
            t: 'table',
            head: ['Category', 'Speed', 'Use in 2026'],
            rows: [
              ['Cat5e', '1 Gb/s (2.5 Gb/s on short runs)', 'older installations, replace during renovation'],
              ['Cat6', '1 Gb/s over 100 m, 10 Gb/s up to about 55 m', 'typical offices and homes'],
              ['**Cat6A**', '10 Gb/s over 100 m', 'recommended for new installations and Wi-Fi 7 APs'],
              ['Cat8', '25-40 Gb/s up to 30 m', 'short runs in server rooms'],
            ],
          },
          { t: 'p', text: 'You used to need straight-through and crossover cables. Today ports have **auto-MDIX** and match the pairs themselves, so a regular cable connects any two devices.' },
          { t: 'callout', kind: 'tip', text: 'Shielded cable (e.g. F/UTP or S/FTP) helps in halls with motors and near power cables. In an office U/UTP is usually enough.' },
        ],
      },
    },
    {
      id: 'swiatlowod',
      title: l('Światłowód i wkładki SFP', 'Fiber and SFP optics'),
      body: {
        pl: [
          { t: 'p', text: '**Światłowód** przesyła dane impulsami światła w cienkim włóknie szklanym. Nie łapie zakłóceń elektromagnetycznych i działa na dużych odległościach. W szafach sieciowych i między budynkami to dziś standard.' },
          { t: 'figure', id: 'fiber-copper', caption: 'Miedź jest tania i może zasilać urządzenia. Światłowód wygrywa zasięgiem i odpornością na zakłócenia.' },
          {
            t: 'list',
            items: [
              '**Wielomodowy (OM3, OM4)**: grubszy rdzeń, tańsza optyka, setki metrów w budynku.',
              '**Jednomodowy (OS2)**: cienki rdzeń, kilometry i więcej. Tak łączą się kampusy i operatorzy, także w domowym FTTH.',
              'Złącze **LC** to najczęstsze złącze w przełącznikach i routerach.',
            ],
          },
          { t: 'p', text: 'Przełączniki i routery mają gniazda na wymienne **wkładki optyczne**. Dobierasz je do prędkości i odległości:' },
          {
            t: 'table',
            head: ['Gniazdo', 'Prędkość', 'Gdzie'],
            rows: [
              ['SFP', '1 Gb/s', 'starsze łącza, ONT'],
              ['SFP+', '10 Gb/s', 'łącza w górę z przełączników dostępowych'],
              ['SFP28', '25 Gb/s', 'serwery i przełączniki dystrybucyjne'],
              ['QSFP28', '100 Gb/s', 'rdzeń sieci, centra danych'],
              ['QSFP-DD i OSFP', '400-800 Gb/s', 'duże centra danych i klastry AI'],
            ],
          },
          { t: 'callout', kind: 'info', text: 'Na krótkie połączenia w jednej szafie stosuje się kable **DAC** (miedziane z wtopionymi wkładkami) albo **AOC** (aktywne optyczne). Są tańsze niż dwie wkładki i patchcord.' },
        ],
        en: [
          { t: 'p', text: '**Fiber** carries data as light pulses in a thin glass strand. It is immune to electromagnetic interference and works over long distances. Inside network racks and between buildings it is the standard today.' },
          { t: 'figure', id: 'fiber-copper', caption: 'Copper is cheap and can power devices. Fiber wins on reach and interference immunity.' },
          {
            t: 'list',
            items: [
              '**Multimode (OM3, OM4)**: thicker core, cheaper optics, hundreds of meters inside a building.',
              '**Single-mode (OS2)**: thin core, kilometers and beyond. Campuses and operators use it, also for home FTTH.',
              'The **LC** connector is the most common on switches and routers.',
            ],
          },
          { t: 'p', text: 'Switches and routers have slots for pluggable **optics**. You choose them by speed and distance:' },
          {
            t: 'table',
            head: ['Slot', 'Speed', 'Where'],
            rows: [
              ['SFP', '1 Gb/s', 'older links, ONTs'],
              ['SFP+', '10 Gb/s', 'uplinks from access switches'],
              ['SFP28', '25 Gb/s', 'servers and distribution switches'],
              ['QSFP28', '100 Gb/s', 'network core, data centers'],
              ['QSFP-DD and OSFP', '400-800 Gb/s', 'large data centers and AI clusters'],
            ],
          },
          { t: 'callout', kind: 'info', text: 'For short links within one rack you use **DAC** cables (copper with built-in transceivers) or **AOC** (active optical). They are cheaper than two optics plus a patch cord.' },
        ],
      },
    },
    {
      id: 'poe',
      title: l('Zasilanie przez Ethernet (PoE)', 'Power over Ethernet (PoE)'),
      body: {
        pl: [
          { t: 'p', text: 'PoE przesyła prąd tym samym kablem co dane. Jeden kabel do punktu dostępowego na suficie wystarcza, nie trzeba gniazdka obok. Przełącznik sprawdza najpierw, czy urządzenie obsługuje PoE, i dopiero wtedy podaje napięcie.' },
          {
            t: 'table',
            head: ['Standard', 'Moc na porcie przełącznika', 'Typowe urządzenia'],
            rows: [
              ['802.3af (PoE)', '15,4 W', 'telefony IP, proste kamery'],
              ['802.3at (PoE+)', '30 W', 'kamery obrotowe, punkty Wi-Fi 6'],
              ['802.3bt typ 3 (PoE++)', '60 W', 'punkty Wi-Fi 7, wyświetlacze'],
              ['802.3bt typ 4', '90 W', 'oświetlenie, terminale, mini komputery'],
            ],
          },
          { t: 'callout', kind: 'warn', text: 'W symulatorze kamera, telefon IP i punkt dostępowy włączą się tylko po podłączeniu do portu przełącznika z PoE. Port routera ich nie zasili.' },
        ],
        en: [
          { t: 'p', text: 'PoE sends power over the same cable as data. One cable to a ceiling access point is enough, no outlet needed nearby. The switch first checks that the device supports PoE and only then applies voltage.' },
          {
            t: 'table',
            head: ['Standard', 'Power at the switch port', 'Typical devices'],
            rows: [
              ['802.3af (PoE)', '15.4 W', 'IP phones, simple cameras'],
              ['802.3at (PoE+)', '30 W', 'PTZ cameras, Wi-Fi 6 APs'],
              ['802.3bt type 3 (PoE++)', '60 W', 'Wi-Fi 7 APs, displays'],
              ['802.3bt type 4', '90 W', 'lighting, kiosks, mini PCs'],
            ],
          },
          { t: 'callout', kind: 'warn', text: 'In the simulator a camera, IP phone or access point turns on only when connected to a PoE switch port. A router port will not power it.' },
        ],
      },
    },
    {
      id: 'wifi',
      title: l('Wi-Fi 6, 6E i 7 w praktyce', 'Wi-Fi 6, 6E and 7 in practice'),
      body: {
        pl: [
          { t: 'p', text: 'Wi-Fi przesyła dane falami radiowymi w trzech pasmach. Każde pasmo to kompromis między zasięgiem, prędkością i tłokiem.' },
          { t: 'figure', id: 'wifi-bands', caption: 'Niższa częstotliwość lepiej przechodzi przez ściany. Wyższa daje szersze kanały i mniej zakłóceń.' },
          {
            t: 'table',
            head: ['Standard', 'Nazwa IEEE', 'Najważniejsze cechy'],
            rows: [
              ['Wi-Fi 6', '802.11ax', 'OFDMA, lepsza praca przy wielu urządzeniach, 2,4 i 5 GHz'],
              ['Wi-Fi 6E', '802.11ax', 'to samo plus pasmo 6 GHz'],
              ['**Wi-Fi 7**', '802.11be', 'kanały 320 MHz, 4096-QAM, MLO (kilka pasm naraz), mniejsze opóźnienia'],
            ],
          },
          { t: 'p', text: 'Każda sieć ma nazwę **SSID** i hasło. Urządzenie łączy się z najbliższym punktem o tej samej nazwie. Ściany, odległość i inne sieci obniżają sygnał.' },
          { t: 'callout', kind: 'tip', text: 'Wi-Fi to wspólne medium: wszyscy na jednym kanale dzielą się czasem nadawania. Dlatego stały komputer czy konsolę lepiej podłączyć kablem.' },
        ],
        en: [
          { t: 'p', text: 'Wi-Fi sends data over radio waves in three bands. Each band trades off range, speed and congestion.' },
          { t: 'figure', id: 'wifi-bands', caption: 'Lower frequency passes walls better. Higher frequency gives wider channels and less interference.' },
          {
            t: 'table',
            head: ['Standard', 'IEEE name', 'Key features'],
            rows: [
              ['Wi-Fi 6', '802.11ax', 'OFDMA, better with many devices, 2.4 and 5 GHz'],
              ['Wi-Fi 6E', '802.11ax', 'the same plus the 6 GHz band'],
              ['**Wi-Fi 7**', '802.11be', '320 MHz channels, 4096-QAM, MLO (several bands at once), lower latency'],
            ],
          },
          { t: 'p', text: 'Every network has a name, the **SSID**, and a password. A device joins the nearest access point with that name. Walls, distance and other networks weaken the signal.' },
          { t: 'callout', kind: 'tip', text: 'Wi-Fi is a shared medium: everyone on one channel shares airtime. That is why a desktop PC or a console is better on a cable.' },
        ],
      },
    },
  ],
  quiz: [
    {
      id: 'q13-1',
      kind: 'input',
      q: l('Jaka jest maksymalna długość kanału dla skrętki Ethernet (w metrach)?', 'What is the maximum Ethernet twisted pair channel length (in meters)?'),
      answer: ['100', '100 m', '100m'],
      placeholder: '100',
      explain: l('Standard Ethernet na skrętce przewiduje do 100 m, łącznie z patchcordami.', 'Twisted pair Ethernet is specified up to 100 m including patch cords.'),
    },
    {
      id: 'q13-2',
      kind: 'single',
      q: l('Którą kategorię skrętki wybierzesz do nowej instalacji z punktami Wi-Fi 7 i 10 Gb/s na 100 m?', 'Which cable category would you pick for a new install with Wi-Fi 7 APs and 10 Gb/s over 100 m?'),
      options: [l('Cat5e', 'Cat5e'), l('Cat6', 'Cat6'), l('Cat6A', 'Cat6A'), l('Cat3', 'Cat3')],
      answer: 2,
      explain: l('Cat6A obsługuje 10 Gb/s na pełnych 100 m. Cat6 tylko do około 55 m.', 'Cat6A supports 10 Gb/s over the full 100 m. Cat6 only up to about 55 m.'),
    },
    {
      id: 'q13-3',
      kind: 'single',
      q: l('Budynki kampusu dzieli 3 km. Jakiego światłowodu potrzebujesz?', 'Campus buildings are 3 km apart. What fiber do you need?'),
      options: [l('Wielomodowego OM4', 'Multimode OM4'), l('Jednomodowego OS2', 'Single-mode OS2'), l('Skrętki Cat8', 'Cat8 twisted pair'), l('Kabla DAC', 'A DAC cable')],
      answer: 1,
      explain: l('Wielomodowy sięga setek metrów. Kilometry to zadanie dla jednomodowego.', 'Multimode reaches hundreds of meters. Kilometers call for single-mode.'),
    },
    {
      id: 'q13-4',
      kind: 'single',
      q: l('Dlaczego dziś nie potrzebujesz kabla krosowanego między dwoma przełącznikami?', 'Why do you no longer need a crossover cable between two switches?'),
      options: [l('Bo wszystkie porty są światłowodowe', 'Because all ports are fiber'), l('Dzięki auto-MDIX porty same dopasowują pary', 'Thanks to auto-MDIX ports match the pairs themselves'), l('Bo przełączniki łączy się tylko przez Wi-Fi', 'Because switches only connect over Wi-Fi'), l('Bo kable krosowane są zabronione', 'Because crossover cables are banned')],
      answer: 1,
      explain: l('Auto-MDIX wykrywa układ par w kablu i dopasowuje nadawanie i odbiór.', 'Auto-MDIX detects the cable pair layout and matches transmit and receive.'),
    },
    {
      id: 'q13-5',
      kind: 'single',
      q: l('Wkładka 25 Gb/s pasuje do gniazda:', 'A 25 Gb/s optic fits into a slot called:'),
      options: [l('SFP', 'SFP'), l('SFP+', 'SFP+'), l('SFP28', 'SFP28'), l('RJ45', 'RJ45')],
      answer: 2,
      explain: l('SFP28 to 25 Gb/s, SFP+ to 10 Gb/s, a SFP to 1 Gb/s.', 'SFP28 is 25 Gb/s, SFP+ is 10 Gb/s and SFP is 1 Gb/s.'),
    },
    {
      id: 'q13-6',
      kind: 'single',
      q: l('Punkt dostępowy Wi-Fi 7 potrzebuje 45 W. Który standard PoE wystarczy?', 'A Wi-Fi 7 AP needs 45 W. Which PoE standard is enough?'),
      options: [l('802.3af', '802.3af'), l('802.3at', '802.3at'), l('802.3bt', '802.3bt'), l('Żaden, PoE ma maksymalnie 15 W', 'None, PoE maxes out at 15 W')],
      answer: 2,
      explain: l('802.3bt daje 60 lub 90 W na porcie. 802.3at kończy się na 30 W.', '802.3bt delivers 60 or 90 W per port. 802.3at stops at 30 W.'),
    },
    {
      id: 'q13-7',
      kind: 'multi',
      q: l('Które cechy należą do Wi-Fi 7? Wybierz wszystkie.', 'Which features belong to Wi-Fi 7? Select all.'),
      options: [l('Kanały 320 MHz', '320 MHz channels'), l('MLO, czyli kilka pasm naraz', 'MLO, several bands at once'), l('Szyfrowanie WEP', 'WEP encryption'), l('Pasmo 6 GHz', 'The 6 GHz band')],
      answer: [0, 1, 3],
      explain: l('Wi-Fi 7 korzysta z 6 GHz, szerokich kanałów i MLO. WEP to przestarzałe i złamane zabezpieczenie.', 'Wi-Fi 7 uses 6 GHz, wide channels and MLO. WEP is obsolete and broken.'),
    },
    {
      id: 'q13-8',
      kind: 'single',
      q: l('Które pasmo Wi-Fi ma największy zasięg przez ściany?', 'Which Wi-Fi band has the longest range through walls?'),
      options: [l('2,4 GHz', '2.4 GHz'), l('5 GHz', '5 GHz'), l('6 GHz', '6 GHz'), l('Wszystkie jednakowy', 'All the same')],
      answer: 0,
      explain: l('Niższa częstotliwość słabiej tłumi się w ścianach, ale pasmo 2,4 GHz jest zatłoczone i wolniejsze.', 'Lower frequency is absorbed less by walls, but 2.4 GHz is crowded and slower.'),
    },
  ],
};
