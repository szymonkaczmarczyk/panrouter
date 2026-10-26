# PanRouter

[Polski](README.md) · **English**

> Computer networking from zero to expert. In Polish, in the browser.

PanRouter is a network simulator in the spirit of Cisco Packet Tracer combined with a full course. On the canvas you
place routers, switches, Wi-Fi 7 access points, NGFW firewalls, servers and computers, connect them with copper or
fiber and configure them in the CLI or in panels. Simulation mode pauses every packet and explains what the device
did with it: ARP, switching, VLANs, routing, NAT, DHCP, DNS, the firewall and IPv6. Traffic can also be inspected in a
Wireshark-style packet analyzer and saved to a `.pcap` file. You can send a network to someone with
one link, save it as a PNG image, and install the whole app and use it without internet.

Around the simulator there is a learning path: 20 modules on five levels (from beginner to expert), quizzes with
explanations, 25 auto-graded labs, labs shared as a link by an instructor, a random fault generator, 10 minigames and a final exam with a practical part. Everything works in Polish,
and one button switches it to English. Hardware and technologies are up to date for 2026.

![PanRouter dashboard with the course tagline, a start button and a network illustration](docs/screenshots/01-pulpit.png)

## Who it is for

- **People starting from zero** who want to understand how a network works at home and at work. The first lessons
  assume no knowledge, and every new term is explained with an example.
- **IT vocational school and university students** preparing for vocational exams and networking certifications. The
  labs practice the same things as real lab rooms: addressing, VLANs, routing, OSPF, NAT, ACLs, EtherChannel, VRRP,
  port security, DHCP snooping and device hardening.
- **Teachers** who need a Polish-language simulator to show packet flow in class, with nothing to install.

It is not an emulator of a real router operating system. The simulator models network behavior in a simplified way,
and the device model names are fictional. The CLI syntax is based on the common IOS style, because that is how most
network engineers learn.

## How it works

```
Browser (Preact + TypeScript, no backend)
   │
   ├── src/sim/          network engine: frames, ARP, VLAN, STP, EtherChannel, port security, DHCP snooping,
   │                     routing, OSPF, VRRP/HSRP, DHCP, DNS, NAT, ACL, firewall, Wi-Fi
   │     ├── cli/        IOS-style CLI and computer command line (PL/EN)
   │     └── ui/         SVG canvas, palette, device panels, terminal, simulation mode
   ├── src/content/      lessons, diagrams, quizzes, graded labs, exam, glossary
   ├── src/games/        minigames
   ├── sw.js             service worker generated at build time: the whole app works offline
   └── localStorage      progress, saved networks and settings (nothing goes to a server)
```

**The engine** processes frames as an event queue. Each device decides the way real hardware does: a switch learns MAC
addresses and floods unknown destinations, a router looks for the longest prefix match and ARPs for the next hop, the
firewall tracks sessions, and NAT keeps a translation table. Every decision is written to a trace that simulation mode
uses.

**A ping from a computer** goes like this:

1. The computer checks whether the destination is in its subnet. If not, it sends the packet to the default gateway.
2. It doesn't know the gateway's MAC address, so it holds the packet and broadcasts an ARP request.
3. The switch records which port the sender is behind and floods the broadcast to ports in the same VLAN.
4. The router replies, the computer sends the held packet, and the router forwards it according to its routing table.
5. Each of these steps is visible in simulation mode, together with the Ethernet, IP and ICMP header fields.

**Labs** build a ready topology and check the result, not the way you got there. The "Check results" button runs
tests on a copy of the network: pings, web pages, routes, OSPF adjacencies, ports blocked by STP. Some checks
deliberately break a separate copy, e.g. plug in a foreign laptop or disconnect a cable in a channel. Every lab has a
solution script in the unit tests that proves it can be passed.

## Features

| Path | What it is |
|---|---|
| `#/` | Dashboard: progress, rank, learning streak, levels and shortcuts to exercises |
| `#/nauka` | Learning path: 5 levels, 20 modules, labs at every level |
| `#/nauka/:modul` | A lesson in chapters with diagrams, CLI examples and a quiz at the end |
| `#/laboratoria`, `#/lab/:id` | 25 tasks in the simulator with instructions, hints and grading |
| `#/lab-z-linku?lab=…` | A lab prepared by an instructor: the network, task and pass conditions stored in the link |
| `#/awaria` | Fault generator: random faults in a ready network, user tickets, hints and a graded fix |
| `#/symulator` | Your own network from scratch or from one of 4 templates, saved networks, file, network link and PNG image |
| `#/gry`, `#/gry/:id` | 10 minigames: binary, subnets, ports, OSI, MAC table, routing, IPv6, troubleshooting, timed CLI |
| `#/quizy`, `#/quiz/:id` | Module quizzes, a quick mix and a mistakes review |
| `#/powtorki` | Reviews for today: wrong questions and chosen glossary terms come back after 1, 3 and 7 days |
| `#/statystyki` | A chart of exam attempts, a results table, weakest modules, faults and reviews |
| `#/egzamin` | Final exam: 30 questions in 45 minutes and a network to configure |
| `#/slownik` | 88 terms with search and a “Review” button next to every term |
| `#/urzadzenia` | 2026 hardware and a list of technologies that are no longer used |
| `#/ustawienia` | Language, reduced motion, terminal, app install, progress backup |

**Simulator**

- 14 device types: edge router, Wi-Fi 7 home router, access switch with PoE, L3 switch, NGFW firewall, Wi-Fi 7 access
  point, internet cloud, computer, laptop, smartphone, server, printer, IP camera and IP phone.
- Copper and fiber cables with port type checks, port LEDs, Wi-Fi range and PoE power.
- CLI: modes, command abbreviations, `?` help, Tab completion, error messages like on real hardware,
  `show running-config`, `show ip route`, `show vlan brief`, `show spanning-tree`, `show ip ospf neighbor`,
  `show ip nat translations`, `show etherchannel summary`, `show vrrp brief`, `show standby brief`,
  `show port-security`, `show ip dhcp snooping binding`, `show ipv6 interface brief`, `show ipv6 route`,
  `show ipv6 neighbors` and more.
- Computer command line in Polish or English: `ipconfig`, `ping`, `tracert`, `nslookup`, `arp -a`, `curl`, `ssh`,
  `telnet`.
- Graphical panels that run real CLI commands and show them under the form.
- Simulation mode: step-by-step playback, protocol filters, packet details layer by layer.
- Layer 2 security: port security (address limit, sticky, shutdown, restrict and protect actions, err-disabled state)
  and DHCP snooping with trusted ports and a binding table.
- Redundancy: EtherChannel with LACP (active, passive) and on mode, suspending mismatched ports, a backup VRRP and HSRP
  gateway with failover.
- Network link: the topology stored in the page URL (deflate compression), no server. The recipient confirms replacing
  their network, and a broken or tampered link is rejected.
- Canvas export to PNG at double resolution, with the project fonts embedded.
- IPv6: static and EUI-64 addresses, link-local addresses, SLAAC on computers, neighbor discovery (NDP), static routes,
  IPv6 ping and traceroute in the router CLI and the computer command line.
- OSPFv3 (`ipv6 router ospf`, `ipv6 ospf 1 area 0`, `show ipv6 ospf neighbor`) with routes via link-local addresses,
  and stateful and stateless DHCPv6 (`ipv6 dhcp pool`, the `managed-config-flag` and `other-config-flag` flags).
- VPN between branches: a `Tunnel0` interface in IPsec mode (`crypto isakmp key`, `crypto ipsec profile`,
  `tunnel protection`) or GRE. The analyzer shows only ESP with router addresses on the way, and the inner packet
  for GRE. Different keys leave the tunnel down (`show crypto isakmp sa`).
- Wireshark-style packet analyzer: a table with No., time, source, destination, protocol, length and info, a display
  filter (`ip.addr == 10.10.10.1 and icmp`, `ipv6`, `esp`, `tcp.port == 80`, `dropped`), layers, a byte dump and `.pcap`
  export that real Wireshark opens.
- Canvas work: undo and redo (Ctrl+Z, Ctrl+Shift+Z), selecting several devices with a Shift box and moving them
  together, notes on the canvas and up to 30 saved networks under your own names.
- A short tutorial on the first visit to an empty canvas: two computers, a cable and a ping. It closes itself when
  someone loads a ready network.
- On a phone the simulation panel is a collapsible sheet, and fitting the view keeps clear of hints and panels.

**Fault generator**

The simulator breaks one of four ready networks (1, 2 or 3 faults depending on difficulty) and shows the symptoms users
report. Faults cover 15 kinds, from a shut port and a wrong VLAN to missing routes, ACLs, DHCP pools and DNS records.
The fix is graded by how the network works, not by undoing a specific change, so any correct solution counts. The same
ticket number always gives the same fault.

**Learning and progress**

- Spaced reviews: a wrong answer in a quiz or the exam comes back after 1 day, a right one moves it to 3 and then
  7 days, and after three right answers in a row it leaves. Glossary terms work as flashcards with keys 1 and 2.
  The dashboard shows “For today: N reviews”.
- Exam history: every attempt saves theory, practice and mistakes per module. The statistics page draws a chart of
  attempts with the 75% pass line and lists the weakest modules with a link to the lesson.

**Lab from a link**

An instructor builds a network in the simulator and chooses File, then “Turn this network into a lab”. They enter a
title, a task and conditions (e.g. “PC1 pings SRV1”, “PC2 cannot ping 10.0.0.5”, “PC1 opens http://…”), check them
on their network and copy the link. The learner gets that network with instructions and a “Check results” button,
and their work is saved in the browser separately for each link.

**App**

- Pages load separately, so the first visit downloads about half of the code, and the browser fetches the rest in the
  background.
- PWA: manifest with icons and shortcuts, install on phone and desktop, offline use and a new version notice with a
  refresh button.

## Screenshots

### Learning

| Learning path | Lesson with a diagram |
|---|---|
| ![First level module list with progress](docs/screenshots/02-sciezka-nauki.png) | ![Chapter on 802.1Q trunks with a two-switch diagram](docs/screenshots/03-lekcja.png) |

| Quiz with an explanation | Final exam |
|---|---|
| ![Network address question with the answer graded](docs/screenshots/08-quiz.png) | ![Exam start screen with two parts](docs/screenshots/11-egzamin.png) |

### Simulator

| "Small office" template | Router CLI |
|---|---|
| ![Office topology with a router, switch, server, Wi-Fi access point and camera](docs/screenshots/04-symulator.png) | ![show ip interface brief and show ip route output in the terminal](docs/screenshots/05-cli.png) |

| Simulation mode | Graded lab |
|---|---|
| ![ARP request flooding with a decision explanation and frame fields](docs/screenshots/06-tryb-symulacji.png) | ![Lab with instructions and a checklist of tasks](docs/screenshots/07-laboratorium.png) |

### Analysis, faults and IPv6

| Packet analyzer | Fault generator |
|---|---|
| ![Analyzer with an icmp filter, packet list, frame fields and a byte dump](docs/screenshots/15-analizator.png) | ![Difficulty and ticket number selection in the fault generator](docs/screenshots/16-generator-awarii.png) |

| Ticket to fix | Notes and group selection |
|---|---|
| ![Ticket with check results, hints and a two-branch network](docs/screenshots/17-zgloszenie-awarii.png) | ![Canvas with two notes and PC1 and PC2 selected](docs/screenshots/18-notatki-i-zaznaczenie.png) |

| IPv6 lab | IPsec VPN in the analyzer |
|---|---|
| ![show ipv6 interface brief and show ipv6 route output in the router CLI](docs/screenshots/19-ipv6-cli.png) | ![ESP packets between branch routers with encrypted bytes](docs/screenshots/21-vpn-ipsec.png) |

### Minigames and library

| Minigames | The "Subnetter" game |
|---|---|
| ![Grid of ten minigames](docs/screenshots/09-minigry.png) | ![Task to find the network and broadcast address](docs/screenshots/10-gra-podsieci.png) |

| 2026 hardware |
|---|
| ![Device catalog with descriptions and specs](docs/screenshots/12-sprzet-2026.png) |

### Phone

| Dashboard | Lesson |
|---|---|
| ![Dashboard on a phone screen with bottom navigation](docs/screenshots/13-telefon-pulpit.png) | ![OSI model lesson on a phone screen](docs/screenshots/14-telefon-lekcja.png) |

| Simulation on a phone |
|---|
| ![Canvas above the collapsible step-by-step simulation panel on a phone screen](docs/screenshots/20-telefon-symulacja.png) |

All data in the screenshots is sample data. Addresses come from private and documentation ranges. The screenshots show
the Polish version of the interface.

## Getting started

Requires Node.js 20 or newer.

```bash
npm install
npm run dev             # http://127.0.0.1:4400
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server on port 4400 |
| `npm run build` | TypeScript type check and build to `dist/` |
| `npm run preview` | Build preview on port 4401 |
| `npm test` | 129 unit tests (engine, IPv6, OSPFv3, DHCPv6, VPN, CLI, labs, reviews, fault generator, analyzer, content) |
| `npm run test:e2e` | 74 Playwright tests (desktop and phone) with axe accessibility checks, including offline mode on the build |
| `node scripts/assets.mjs` | Regenerates the favicon, app icons and Open Graph image |

The project has no backend, database or environment variables. Progress is stored in the browser's `localStorage`,
and in Settings you can download it to a JSON file and load it on another computer.

## Publishing

The build in `dist/` is plain static files. Routing works through `#`, and asset paths are relative (`base: './'`), so
the site works on GitHub Pages in a repository subfolder with no extra configuration. The service worker
(`dist/sw.js`) is generated on every build with a file list and a version computed from their content, so after
publishing users get a new version notice. In dev mode the service worker is disabled.

The `.github/workflows/ci.yml` workflow checks types, runs unit tests, the build and e2e tests on every push and pull
request, and publishes `dist/` to GitHub Pages from the `main` branch. In the repository settings (Settings, Pages,
Source) choose “GitHub Actions” once.

The target address is `https://szymonkaczmarczyk.github.io/panrouter/` (set in `index.html`, `public/robots.txt` and
`public/sitemap.xml`). If the domain changes, update these three files.

## Structure

```
src/
  app/              app shell, hash routing, meta tags
  sim/              DOM-free network engine: network, topology (STP, OSPF, routes), engine (frames and services)
    cli/            IOS-style parser and commands, show, host command line
    ui/             canvas, palette, device panels, terminal, simulation panel
    templates.ts    ready networks: home, office, two branches, campus
  content/          course modules, SVG diagrams, labs, exam, glossary
  games/            minigames and their registry
  pages/            app views
  state/            progress, XP and ranks in localStorage
  i18n/             PL/EN interface texts
  styles/           tokens and styles
tests/
  unit/             Vitest: engine, CLI, templates, labs, content
  e2e/              Playwright with axe-core
public/             favicon, app icons, manifest, Open Graph image, robots.txt, sitemap.xml, 404.html
scripts/            icon and OG image generator, service worker build plugin
docs/screenshots/   screenshots used in the README
.github/workflows/  tests, build and GitHub Pages deployment
```

## Security and privacy

- No accounts, cookies, analytics or external resources. Fonts (DM Sans, JetBrains Mono) are self-hosted.
- Text typed by the user reaches the interface only as text, never as inserted HTML.
- Passwords in simulated configurations (`enable secret`, `username ... secret`) are stored as hashes, as the course
  teaches.
- Networks from a file, a link and browser storage are validated: every field has its type and range checked, unknown
  fields are rejected, and link decompression has a size limit.
- Security content is defensive. The course reminds you that you may only test your own networks or networks you have
  written permission for.

## Accessibility

Keyboard navigation with visible focus, keyboard shortcuts shown next to simulator buttons, ARIA labels,
`prefers-reduced-motion` support and a separate reduced motion toggle. E2e tests check pages with axe-core.

## Documentation

- [`docs/screenshots/`](docs/screenshots/) - screenshots of every part of the app used in this README.

## License

The project is released under the MIT license. See [LICENSE](LICENSE) for details.
