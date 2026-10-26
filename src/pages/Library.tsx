import { Ban, BookA, CalendarCheck, CalendarPlus, Search } from 'lucide-preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { setMeta } from '../app/meta';
import { GLOSSARY } from '../content/glossary';
import { lang, t, tr, tx } from '../i18n';
import { l, type L10n } from '../i18n/l10n';
import { CATEGORY_ORDER, MODELS } from '../sim/catalog';
import { DeviceGlyph } from '../sim/ui/DeviceGlyph';
import { progress, toggleTermReview } from '../state/progress';
import { termKey } from '../state/reviews';

export function GlossaryPage() {
  const [query, setQuery] = useState('');
  useEffect(() => setMeta(tx('Słownik pojęć sieciowych', 'Networking glossary'), tx('Ponad 80 pojęć sieciowych wyjaśnionych prostym językiem. Wybrane hasła wracają w powtórkach.', 'Over 80 networking terms explained in plain language. Chosen terms come back in reviews.')), []);
  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term, 'pl')).filter((g) => !q || g.term.toLowerCase().includes(q) || tr(g.def).toLowerCase().includes(q));
  }, [query, lang.value]);
  const letters = [...new Set(items.map((g) => g.term[0].toUpperCase()))];
  return (
    <div class="page fade-in">
      <header class="page-head">
        <span class="eyebrow">{t('nav.glossary')}</span>
        <h2>{tx('Pojęcia od A do Z', 'Terms from A to Z')}</h2>
        <p>{tx('Krótkie definicje skrótów i pojęć z kursu. Wpisz słowo, żeby zawęzić listę. Przyciskiem „Powtarzaj” dodasz hasło do powtórek po 1, 3 i 7 dniach.', 'Short definitions of acronyms and terms from the course. Type a word to filter. The “Review” button adds a term to reviews after 1, 3 and 7 days.')}</p>
      </header>
      <div class="search-box">
        <Search aria-hidden="true" />
        <input class="input" type="search" value={query} onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)} placeholder={tx('np. VLAN, NAT, brama', 'e.g. VLAN, NAT, gateway')} aria-label={t('common.search')} />
      </div>
      <nav class="letters" aria-label={tx('Litery', 'Letters')}>
        {letters.map((letter) => (
          <a key={letter} href={`#/slownik`} onClick={(e) => {
            e.preventDefault();
            document.getElementById(`litera-${letter}`)?.scrollIntoView({ behavior: 'smooth' });
          }}>
            {letter}
          </a>
        ))}
      </nav>
      {items.length === 0 ? (
        <div class="empty">
          <BookA aria-hidden="true" />
          <p>{tx('Nie znaleziono pojęcia. Spróbuj innego słowa albo skrótu.', 'No term found. Try another word or acronym.')}</p>
        </div>
      ) : (
        <dl class="terms glossary">
          {items.map((g, i) => {
            const first = i === 0 || items[i - 1].term[0].toUpperCase() !== g.term[0].toUpperCase();
            const queued = Boolean(progress.value.reviews[termKey(g.term)]);
            return (
              <div key={g.term} id={first ? `litera-${g.term[0].toUpperCase()}` : undefined}>
                <dt>{g.term}</dt>
                <dd>
                  {tr(g.def)}
                  <div class="term-review">
                    <button type="button" class="btn btn-sm btn-ghost" aria-pressed={queued} onClick={() => toggleTermReview(g.term)} aria-label={queued ? tx(`Usuń ${g.term} z powtórek`, `Remove ${g.term} from reviews`) : tx(`Powtarzaj hasło ${g.term}`, `Review the term ${g.term}`)}>
                      {queued ? <CalendarCheck aria-hidden="true" /> : <CalendarPlus aria-hidden="true" />}
                      {queued ? tx('W powtórkach', 'In reviews') : tx('Powtarzaj', 'Review')}
                    </button>
                  </div>
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </div>
  );
}

const EXTRA: { group: L10n; items: { name: L10n; desc: L10n }[] }[] = [
  {
    group: l('Dostęp do internetu', 'Internet access'),
    items: [
      { name: l('ONT XGS-PON', 'XGS-PON ONT'), desc: l('Terminal światłowodowy 10 Gb/s u klienta. Starsze instalacje używają GPON 2,5 Gb/s.', 'A 10 Gb/s fiber terminal at the customer. Older installs use 2.5 Gb/s GPON.') },
      { name: l('Router 5G (FWA)', '5G router (FWA)'), desc: l('Internet stacjonarny przez sieć komórkową, często za CGNAT.', 'Fixed internet over the mobile network, often behind CGNAT.') },
      { name: l('Modem DOCSIS 3.1', 'DOCSIS 3.1 modem'), desc: l('Internet przez sieć kablową, wciąż popularny w miastach.', 'Internet over the cable network, still common in cities.') },
    ],
  },
  {
    group: l('Moduły i kable', 'Modules and cables'),
    items: [
      { name: l('Skrętka Cat6A', 'Cat6A cable'), desc: l('10 Gb/s na 100 m, standard nowych instalacji.', '10 Gb/s over 100 m, the standard for new installs.') },
      { name: l('Światłowód OM4 i OS2', 'OM4 and OS2 fiber'), desc: l('Wielomodowy w budynku, jednomodowy na kilometry.', 'Multimode in a building, single-mode for kilometers.') },
      { name: l('SFP+, SFP28, QSFP28, QSFP-DD', 'SFP+, SFP28, QSFP28, QSFP-DD'), desc: l('Wkładki 10, 25, 100 i 400 Gb/s.', '10, 25, 100 and 400 Gb/s optics.') },
      { name: l('Kable DAC i AOC', 'DAC and AOC cables'), desc: l('Tanie krótkie połączenia w jednej szafie.', 'Cheap short links within one rack.') },
    ],
  },
  {
    group: l('Zarządzanie i usługi', 'Management and services'),
    items: [
      { name: l('Kontroler WLAN lub chmura', 'WLAN controller or cloud'), desc: l('Centralna konfiguracja i monitoring punktów dostępowych.', 'Central configuration and monitoring of access points.') },
      { name: l('Serwer RADIUS / NAC', 'RADIUS / NAC server'), desc: l('Uwierzytelnianie 802.1X dla przewodów i Wi-Fi.', '802.1X authentication for wired and Wi-Fi.') },
      { name: l('NAS', 'NAS'), desc: l('Serwer plików z dyskami, w domu i małej firmie.', 'A file server with disks for homes and small businesses.') },
    ],
  },
];

const LEGACY: L10n[] = [
  l('Koncentratory (huby): zastąpione przełącznikami.', 'Hubs: replaced by switches.'),
  l('Kable koncentryczne 10BASE2 i 10BASE5 w sieciach LAN.', '10BASE2 and 10BASE5 coaxial LAN cables.'),
  l('Kable krosowane: zbędne dzięki auto-MDIX.', 'Crossover cables: unnecessary thanks to auto-MDIX.'),
  l('Łącza szeregowe, Frame Relay, ISDN i modemy telefoniczne.', 'Serial links, Frame Relay, ISDN and dial-up modems.'),
  l('Porty FastEthernet 100 Mb/s w nowym sprzęcie.', '100 Mb/s FastEthernet ports in new equipment.'),
  l('Zabezpieczenia WEP i WPA (TKIP).', 'WEP and WPA (TKIP) security.'),
  l('RIP jako protokół routingu w firmach.', 'RIP as an enterprise routing protocol.'),
  l('Telnet do zarządzania i SNMPv1/v2c bez szyfrowania.', 'Telnet for management and unencrypted SNMPv1/v2c.'),
];

export function DevicesPage() {
  useEffect(() => setMeta(tx('Sprzęt sieciowy 2026', 'Network gear 2026'), tx('Aktualne urządzenia sieciowe: routery, przełączniki multigigabit, Wi-Fi 7, zapory NGFW, ONT i wkładki SFP.', 'Current network gear: routers, multigigabit switches, Wi-Fi 7, NGFW firewalls, ONTs and SFP optics.')), []);
  const sorted = [...MODELS].sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));
  return (
    <div class="page fade-in">
      <header class="page-head">
        <span class="eyebrow">{t('nav.devices')}</span>
        <h2>{tx('Sprzęt, którego używa się dziś', 'Gear people use today')}</h2>
        <p>{tx('Urządzenia z symulatora i to, co jeszcze spotkasz w sieciach w 2026 roku. Nazwy modeli w symulatorze są fikcyjne, technologie prawdziwe.', 'Devices from the simulator and what else you will meet in networks in 2026. Simulator model names are fictional, the technology is real.')}</p>
      </header>
      <div class="device-grid">
        {sorted.map((model) => (
          <article key={model.kind} class="card device-card">
            <DeviceGlyph kind={model.kind} size={56} />
            <div class="stack" style={{ gap: 'var(--space-2)' }}>
              <h4>{tr(model.title)}</h4>
              <p class="muted small">{tr(model.desc)}</p>
              <ul class="spec-list">
                {model.specs.map((s) => (
                  <li key={s.pl}>{tr(s)}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
      {EXTRA.map((group) => (
        <section key={group.group.pl} class="section">
          <div class="section-head">
            <h2>{tr(group.group)}</h2>
          </div>
          <div class="grid-3">
            {group.items.map((item) => (
              <div key={item.name.pl} class="card stack" style={{ gap: 'var(--space-2)' }}>
                <h4>{tr(item.name)}</h4>
                <p class="muted small">{tr(item.desc)}</p>
              </div>
            ))}
          </div>
        </section>
      ))}
      <section class="section card stack legacy">
        <h3 class="row" style={{ gap: 'var(--space-3)' }}>
          <Ban aria-hidden="true" style={{ color: 'var(--danger)' }} />
          {tx('Tego już nie używamy', 'What we no longer use')}
        </h3>
        <p class="muted">{tx('Jeśli zobaczysz to w starym podręczniku, traktuj jako historię.', 'If you see these in an old textbook, treat them as history.')}</p>
        <ul class="legacy-list">
          {LEGACY.map((item) => (
            <li key={item.pl}>{tr(item)}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
