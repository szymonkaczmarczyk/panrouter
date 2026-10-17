import { useEffect } from 'preact/hooks';
import { setMeta } from '../app/meta';
import { lang, tx } from '../i18n';

interface Doc {
  title: string;
  updated: string;
  sections: { h: string; p: string[] }[];
}

const PRIVACY: Record<'pl' | 'en', Doc> = {
  pl: {
    title: 'Polityka prywatności',
    updated: 'Ostatnia aktualizacja: 17 października 2026 r.',
    sections: [
      {
        h: '1. Administrator',
        p: [
          'Administratorem serwisu PanRouter jest [[imię i nazwisko lub nazwa firmy]], [[adres]], [[NIP, jeśli dotyczy]]. Kontakt w sprawach prywatności: [[adres e-mail]].',
        ],
      },
      {
        h: '2. Jakie dane przetwarzamy',
        p: [
          'PanRouter działa w całości w Twojej przeglądarce. Nie zakładasz konta i nie podajesz nam danych osobowych.',
          'Postęp nauki, wyniki quizów, ustawienia i zapisane topologie sieci są przechowywane wyłącznie w pamięci przeglądarki (localStorage) na Twoim urządzeniu. Nie wysyłamy ich na żaden serwer.',
        ],
      },
      {
        h: '3. Pliki cookie i analityka',
        p: [
          'Serwis nie używa plików cookie, narzędzi analitycznych, pikseli reklamowych ani zewnętrznych czcionek. Fonty są hostowane lokalnie razem z aplikacją.',
        ],
      },
      {
        h: '4. Hosting',
        p: [
          'Pliki strony udostępnia GitHub Pages (GitHub, Inc.). Dostawca może zapisywać w dziennikach serwera adres IP i informacje o przeglądarce w celu zapewnienia bezpieczeństwa i działania usługi (art. 6 ust. 1 lit. f RODO). Szczegóły znajdziesz w polityce prywatności dostawcy: https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement.',
        ],
      },
      {
        h: '5. Twoje prawa',
        p: [
          'Dane w przeglądarce możesz w każdej chwili usunąć w Ustawieniach (przycisk „Wyzeruj postęp”) albo czyszcząc dane witryny w przeglądarce.',
          'W zakresie danych przetwarzanych przez dostawcę hostingu przysługuje Ci prawo dostępu, sprostowania, usunięcia, ograniczenia przetwarzania, sprzeciwu oraz skargi do Prezesa Urzędu Ochrony Danych Osobowych (ul. Stawki 2, 00-193 Warszawa).',
        ],
      },
      {
        h: '6. Zmiany polityki',
        p: ['O zmianach poinformujemy na tej stronie, aktualizując datę na górze dokumentu.'],
      },
    ],
  },
  en: {
    title: 'Privacy policy',
    updated: 'Last updated: 17 October 2026',
    sections: [
      { h: '1. Controller', p: ['PanRouter is operated by [[full name or company name]], [[address]], [[tax ID, if applicable]]. Privacy contact: [[email address]].'] },
      {
        h: '2. What data we process',
        p: [
          'PanRouter runs entirely in your browser. You do not create an account and you do not give us any personal data.',
          'Learning progress, quiz scores, settings and saved network topologies are stored only in your browser storage (localStorage) on your device. We never send them to a server.',
        ],
      },
      { h: '3. Cookies and analytics', p: ['The site uses no cookies, analytics tools, advertising pixels or external fonts. Fonts are hosted locally with the app.'] },
      {
        h: '4. Hosting',
        p: [
          'The site files are served by GitHub Pages (GitHub, Inc.). The provider may log IP addresses and browser details in server logs to keep the service secure and running (Art. 6(1)(f) GDPR). See the provider’s privacy policy: https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement.',
        ],
      },
      {
        h: '5. Your rights',
        p: [
          'You can delete browser data at any time in Settings ("Reset progress") or by clearing site data in your browser.',
          'For data processed by the hosting provider you have the right of access, rectification, erasure, restriction, objection and to lodge a complaint with the Polish supervisory authority (President of the Personal Data Protection Office, ul. Stawki 2, 00-193 Warsaw).',
        ],
      },
      { h: '6. Changes', p: ['We will announce changes on this page and update the date at the top.'] },
    ],
  },
};

const TERMS: Record<'pl' | 'en', Doc> = {
  pl: {
    title: 'Regulamin',
    updated: 'Obowiązuje od: 17 października 2026 r.',
    sections: [
      { h: '§ 1. Postanowienia ogólne', p: ['Regulamin określa zasady korzystania z serwisu PanRouter prowadzonego przez [[imię i nazwisko lub nazwa firmy]], [[adres]], kontakt: [[adres e-mail]].', 'Serwis jest bezpłatnym narzędziem edukacyjnym do nauki sieci komputerowych.'] },
      { h: '§ 2. Wymagania techniczne', p: ['Do korzystania potrzebna jest aktualna przeglądarka internetowa z włączonym JavaScriptem. Serwis najlepiej działa na komputerze lub tablecie, symulator można obsługiwać także dotykiem.'] },
      {
        h: '§ 3. Zasady korzystania',
        p: [
          'Użytkownik korzysta z serwisu zgodnie z prawem i dobrymi obyczajami. Zabronione jest wprowadzanie treści bezprawnych.',
          'Symulator odwzorowuje działanie sieci w uproszczony sposób. Wyniki symulacji nie zastępują testów na prawdziwym sprzęcie. Nazwy modeli urządzeń są fikcyjne.',
        ],
      },
      { h: '§ 4. Odpowiedzialność', p: ['Serwis jest udostępniany w obecnej postaci. Administrator dokłada starań, by treści były rzetelne i aktualne, ale nie odpowiada za decyzje podjęte wyłącznie na ich podstawie.'] },
      { h: '§ 5. Reklamacje', p: ['Uwagi i reklamacje można zgłaszać na adres [[adres e-mail]]. Odpowiadamy w ciągu 14 dni.'] },
      { h: '§ 6. Postanowienia końcowe', p: ['W sprawach nieuregulowanych stosuje się przepisy prawa polskiego, w szczególności Kodeksu cywilnego i ustawy o świadczeniu usług drogą elektroniczną. Konsument może skorzystać z pozasądowych sposobów rozpatrywania reklamacji.'] },
    ],
  },
  en: {
    title: 'Terms of use',
    updated: 'Effective from: 17 October 2026',
    sections: [
      { h: '§ 1. General', p: ['These terms govern the use of PanRouter, operated by [[full name or company name]], [[address]], contact: [[email address]].', 'The service is a free educational tool for learning computer networking.'] },
      { h: '§ 2. Technical requirements', p: ['You need an up-to-date web browser with JavaScript enabled. The service works best on a computer or tablet, and the simulator also supports touch.'] },
      { h: '§ 3. Use of the service', p: ['Use the service lawfully and in good faith. Do not enter unlawful content.', 'The simulator models network behavior in a simplified way. Simulation results do not replace tests on real hardware. Device model names are fictional.'] },
      { h: '§ 4. Liability', p: ['The service is provided as is. The operator works to keep content accurate and current but is not liable for decisions based solely on it.'] },
      { h: '§ 5. Complaints', p: ['Send feedback and complaints to [[email address]]. We reply within 14 days.'] },
      { h: '§ 6. Final provisions', p: ['Polish law applies to matters not covered here, in particular the Civil Code and the Act on Providing Services by Electronic Means.'] },
    ],
  },
};

function LegalDoc({ doc, description }: { doc: Doc; description: string }) {
  useEffect(() => setMeta(doc.title, description), [doc.title]);
  return (
    <div class="page fade-in">
      <article class="legal">
        <header class="page-head">
          <span class="eyebrow">PanRouter</span>
          <h2>{doc.title}</h2>
          <p>{doc.updated}</p>
        </header>
        {doc.sections.map((section) => (
          <section key={section.h}>
            <h4>{section.h}</h4>
            {section.p.map((text) => (
              <p key={text}>{text}</p>
            ))}
          </section>
        ))}
      </article>
    </div>
  );
}

export function Privacy() {
  return <LegalDoc doc={PRIVACY[lang.value]} description={tx('Jak PanRouter przetwarza dane: wszystko zostaje w Twojej przeglądarce.', 'How PanRouter handles data: everything stays in your browser.')} />;
}

export function Terms() {
  return <LegalDoc doc={TERMS[lang.value]} description={tx('Zasady korzystania z bezpłatnego symulatora sieci PanRouter.', 'Rules for using the free PanRouter network simulator.')} />;
}
