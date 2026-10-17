import { l } from '../../i18n/l10n';
import type { Module } from '../types';

export const m51: Module = {
  id: 'wifi-firma',
  level: 5,
  icon: 'wifi',
  minutes: 17,
  title: l('Wi-Fi w firmie', 'Enterprise Wi-Fi'),
  summary: l(
    'Planowanie kanałów i zasięgu, roaming, WPA3-Enterprise z 802.1X i RADIUS, sieć gości oraz zarządzanie z kontrolera lub chmury.',
    'Channel and coverage planning, roaming, WPA3-Enterprise with 802.1X and RADIUS, guest networks and controller or cloud management.',
  ),
  labs: ['siec-domowa'],
  games: [],
  sections: [
    {
      id: 'planowanie',
      title: l('Planowanie zasięgu i kanałów', 'Coverage and channel planning'),
      body: {
        pl: [
          { t: 'p', text: 'W biurze nie chodzi o największą moc, tylko o **pojemność**: wiele mniejszych komórek z sąsiadami na różnych kanałach. Przed wdrożeniem robi się pomiar radiowy (site survey) i plan na mapie budynku.' },
          {
            t: 'list',
            items: [
              '**2,4 GHz**: tylko trzy kanały bez nakładania (1, 6, 11), dla starych urządzeń IoT. Często wyłącza się je na części punktów.',
              '**5 GHz**: wiele kanałów, w biurach zwykle szerokość 20-40 MHz, żeby zmieścić więcej komórek.',
              '**6 GHz**: najwięcej czystego pasma, kanały 80-320 MHz, wymaga WPA3. Zasięg mniejszy, więc punktów potrzeba gęściej.',
              'Punkty montuje się na suficie, co kilkanaście metrów, z zasilaniem PoE++ i łączem multigigabit.',
            ],
          },
          { t: 'figure', id: 'wifi-bands', caption: 'Każde pasmo ma inną rolę w sieci firmowej.' },
        ],
        en: [
          { t: 'p', text: 'In an office the goal is not maximum power but **capacity**: many smaller cells with neighbors on different channels. Before deployment you run a site survey and plan on the building map.' },
          {
            t: 'list',
            items: [
              '**2.4 GHz**: only three non-overlapping channels (1, 6, 11), for old IoT devices. Often disabled on some APs.',
              '**5 GHz**: many channels, offices usually use 20-40 MHz widths to fit more cells.',
              '**6 GHz**: the most clean spectrum, 80-320 MHz channels, requires WPA3. Shorter range, so APs go denser.',
              'APs are ceiling-mounted every dozen or so meters, with PoE++ power and a multigigabit uplink.',
            ],
          },
          { t: 'figure', id: 'wifi-bands', caption: 'Each band has a different role in an enterprise network.' },
        ],
      },
    },
    {
      id: 'zabezpieczenia',
      title: l('WPA3-Enterprise i 802.1X', 'WPA3-Enterprise and 802.1X'),
      body: {
        pl: [
          { t: 'p', text: 'Wspólne hasło do całej firmy to zły pomysł: wycieka, a po odejściu pracownika trzeba je zmieniać wszystkim. W firmie każdy loguje się **własną tożsamością** przez **802.1X**.' },
          {
            t: 'terms',
            items: [
              ['Suplikant', 'urządzenie użytkownika, które chce się dołączyć'],
              ['Uwierzytelniający', 'punkt dostępowy lub przełącznik, który przepuszcza ruch dopiero po zgodzie serwera'],
              ['Serwer RADIUS', 'sprawdza tożsamość w katalogu firmy i może przypisać VLAN lub politykę'],
              ['EAP-TLS', 'logowanie certyfikatem urządzenia, najbezpieczniejsza i zalecana metoda'],
            ],
          },
          {
            t: 'list',
            items: [
              '**WPA3-Personal (SAE)** w domu i małych firmach: odporny na zgadywanie hasła offline.',
              '**WPA3-Enterprise** w firmach, opcjonalnie w trybie 192-bitowym dla danych wrażliwych.',
              '**Sieć gości**: osobny SSID i VLAN, izolacja klientów, tylko dostęp do internetu, czasem portal z regulaminem.',
              '**Ochrona ramek zarządzających (PMF)** jest w WPA3 obowiązkowa i utrudnia rozłączanie użytkowników przez napastnika.',
            ],
          },
        ],
        en: [
          { t: 'p', text: 'One shared password for the whole company is a bad idea: it leaks, and when someone leaves everyone has to change it. In companies each user signs in with **their own identity** through **802.1X**.' },
          {
            t: 'terms',
            items: [
              ['Supplicant', 'the user device that wants to join'],
              ['Authenticator', 'the AP or switch that lets traffic through only after the server agrees'],
              ['RADIUS server', 'checks identity against the company directory and can assign a VLAN or policy'],
              ['EAP-TLS', 'sign-in with a device certificate, the most secure and recommended method'],
            ],
          },
          {
            t: 'list',
            items: [
              '**WPA3-Personal (SAE)** at home and in small businesses: resistant to offline password guessing.',
              '**WPA3-Enterprise** in companies, optionally in 192-bit mode for sensitive data.',
              '**Guest network**: separate SSID and VLAN, client isolation, internet only, sometimes a terms portal.',
              '**Protected Management Frames (PMF)** are mandatory in WPA3 and make kicking users off harder for attackers.',
            ],
          },
        ],
      },
    },
    {
      id: 'zarzadzanie',
      title: l('Roaming i zarządzanie', 'Roaming and management'),
      body: {
        pl: [
          { t: 'p', text: 'Gdy idziesz korytarzem z laptopem w rozmowie wideo, urządzenie przełącza się między punktami. Standardy **802.11k, v i r** pomagają: punkty podpowiadają sąsiadów, kierują klienta i skracają ponowne uwierzytelnianie do milisekund.' },
          { t: 'p', text: 'Dziesiątki punktów zarządza się centralnie: z **kontrolera** w serwerowni albo z **chmury**. Jedna polityka, automatyczny dobór kanałów i mocy, mapy pokrycia, statystyki klientów i aktualizacje dla wszystkich naraz.' },
          { t: 'callout', kind: 'tip', text: 'W PanRouter punkt dostępowy może przypisać SSID do VLAN-u. Wtedy jego port staje się trunkiem, a ruch Wi-Fi trafia do wybranej sieci.' },
        ],
        en: [
          { t: 'p', text: 'When you walk down a corridor in a video call, the laptop switches between APs. The **802.11k, v and r** standards help: APs suggest neighbors, steer the client and shorten re-authentication to milliseconds.' },
          { t: 'p', text: 'Dozens of APs are managed centrally: from a **controller** in the server room or from the **cloud**. One policy, automatic channel and power selection, coverage maps, client statistics and updates for all at once.' },
          { t: 'callout', kind: 'tip', text: 'In PanRouter an access point can map an SSID to a VLAN. Its port then becomes a trunk and Wi-Fi traffic lands in the chosen network.' },
        ],
      },
    },
  ],
  quiz: [
    { id: 'q51-1', kind: 'single', q: l('Które kanały 2,4 GHz nie nakładają się?', 'Which 2.4 GHz channels do not overlap?'), options: [l('1, 6, 11', '1, 6, 11'), l('1, 2, 3', '1, 2, 3'), l('36, 40, 44', '36, 40, 44'), l('Wszystkie', 'All')], answer: 0, explain: l('W 2,4 GHz są tylko trzy kanały 20 MHz bez nakładania: 1, 6 i 11.', 'There are only three non-overlapping 20 MHz channels at 2.4 GHz: 1, 6 and 11.') },
    { id: 'q51-2', kind: 'single', q: l('Która metoda logowania do Wi-Fi w firmie jest najbezpieczniejsza?', 'Which enterprise Wi-Fi sign-in method is most secure?'), options: [l('Wspólne hasło WPA2', 'A shared WPA2 password'), l('EAP-TLS z certyfikatami', 'EAP-TLS with certificates'), l('Sieć otwarta z ukrytym SSID', 'An open network with hidden SSID'), l('Filtrowanie MAC', 'MAC filtering')], answer: 1, explain: l('EAP-TLS używa certyfikatów, więc nie ma hasła do wykradzenia.', 'EAP-TLS uses certificates, so there is no password to steal.') },
    { id: 'q51-3', kind: 'single', q: l('Co sprawdza tożsamość użytkownika w 802.1X?', 'What checks the user identity in 802.1X?'), options: [l('Serwer RADIUS', 'A RADIUS server'), l('Serwer DNS', 'A DNS server'), l('Router domowy', 'A home router'), l('Przełącznik L2 sam', 'An L2 switch alone')], answer: 0, explain: l('Punkt dostępowy przekazuje dane do serwera RADIUS, który podejmuje decyzję.', 'The AP passes credentials to the RADIUS server, which decides.') },
    { id: 'q51-4', kind: 'single', q: l('Które pasmo wymaga WPA3?', 'Which band requires WPA3?'), options: [l('2,4 GHz', '2.4 GHz'), l('5 GHz', '5 GHz'), l('6 GHz', '6 GHz')], answer: 2, explain: l('W paśmie 6 GHz dopuszczone jest tylko WPA3 (lub OWE dla sieci otwartych).', 'The 6 GHz band allows only WPA3 (or OWE for open networks).') },
    { id: 'q51-5', kind: 'multi', q: l('Co powinna mieć sieć gości? Wybierz wszystkie.', 'What should a guest network have? Select all.'), options: [l('Osobny VLAN', 'A separate VLAN'), l('Izolację klientów', 'Client isolation'), l('Dostęp do serwerów firmy', 'Access to company servers'), l('Dostęp tylko do internetu', 'Internet access only')], answer: [0, 1, 3], explain: l('Goście nie powinni widzieć zasobów firmy ani siebie nawzajem.', 'Guests should see neither company resources nor each other.') },
    { id: 'q51-6', kind: 'single', q: l('Do czego służą 802.11k, v i r?', 'What are 802.11k, v and r for?'), options: [l('Do szybkiego roamingu', 'Fast roaming'), l('Do szyfrowania', 'Encryption'), l('Do PoE', 'PoE'), l('Do VLAN-ów', 'VLANs')], answer: 0, explain: l('Pomagają klientowi wybrać kolejny punkt i szybko się do niego przełączyć.', 'They help the client pick the next AP and switch to it quickly.') },
    { id: 'q51-7', kind: 'single', q: l('Dlaczego w biurze używa się węższych kanałów 5 GHz?', 'Why do offices use narrower 5 GHz channels?'), options: [l('Żeby zmieścić więcej komórek bez zakłóceń', 'To fit more cells without interference'), l('Bo szerokie są nielegalne', 'Wide ones are illegal'), l('Żeby zwiększyć zasięg 10 razy', 'To multiply range by 10'), l('Bo wymaga tego PoE', 'PoE requires it')], answer: 0, explain: l('Więcej niezależnych kanałów to większa pojemność przy wielu punktach.', 'More independent channels means more capacity with many APs.') },
    { id: 'q51-8', kind: 'single', q: l('Pracownik odchodzi z firmy z WPA3-Enterprise. Co robisz?', 'An employee leaves a company with WPA3-Enterprise. What do you do?'), options: [l('Zmieniasz hasło Wi-Fi wszystkim', 'Change the Wi-Fi password for everyone'), l('Wyłączasz jego konto lub certyfikat', 'Disable their account or certificate'), l('Restartujesz punkty dostępowe', 'Reboot the APs'), l('Nic', 'Nothing')], answer: 1, explain: l('Każdy ma własną tożsamość, więc odbierasz dostęp tylko jednej osobie.', 'Everyone has their own identity, so you revoke just one person.') },
  ],
};
