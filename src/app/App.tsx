import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';
import { lazyPage, type LazyPage } from './lazy';
import { matchRoute, path } from './router';
import { Shell } from './Shell';

const Home = lazyPage(() => import('../pages/Home').then((m) => m.Home));
const Learn = lazyPage(() => import('../pages/Learn').then((m) => m.Learn));
const ModulePage = lazyPage(() => import('../pages/ModulePage').then((m) => m.ModulePage));
const QuizHub = lazyPage(() => import('../pages/QuizHub').then((m) => m.QuizHub));
const QuizPage = lazyPage(() => import('../pages/QuizPage').then((m) => m.QuizPage));
const LabsPage = lazyPage(() => import('../pages/LabsPage').then((m) => m.LabsPage));
const LabPage = lazyPage(() => import('../pages/LabPage').then((m) => m.LabPage));
const Sandbox = lazyPage(() => import('../pages/Sandbox').then((m) => m.Sandbox));
const GamesPage = lazyPage(() => import('../pages/Games').then((m) => m.GamesPage));
const GamePage = lazyPage(() => import('../pages/Games').then((m) => m.GamePage));
const ExamPage = lazyPage(() => import('../pages/Exam').then((m) => m.ExamPage));
const GlossaryPage = lazyPage(() => import('../pages/Library').then((m) => m.GlossaryPage));
const DevicesPage = lazyPage(() => import('../pages/Library').then((m) => m.DevicesPage));
const Settings = lazyPage(() => import('../pages/Settings').then((m) => m.Settings));
const Privacy = lazyPage(() => import('../pages/Legal').then((m) => m.Privacy));
const Terms = lazyPage(() => import('../pages/Legal').then((m) => m.Terms));
const CustomLabPage = lazyPage(() => import('../pages/CustomLab').then((m) => m.CustomLabPage));
const StatsPage = lazyPage(() => import('../pages/Stats').then((m) => m.StatsPage));
const ReviewPage = lazyPage(() => import('../pages/Review').then((m) => m.ReviewPage));
const IncidentSetup = lazyPage(() => import('../pages/Incident').then((m) => m.IncidentSetup));
const IncidentRunPage = lazyPage(() => import('../pages/Incident').then((m) => m.IncidentRunPage));
const NotFound = lazyPage(() => import('../pages/NotFound').then((m) => m.NotFound));

interface RouteDef {
  pattern: string;
  wide?: boolean;
  page: LazyPage<never>;
  render: (params: Record<string, string>) => ComponentChildren;
}

const ROUTES: RouteDef[] = [
  { pattern: '/', page: Home, render: () => <Home /> },
  { pattern: '/nauka', page: Learn, render: () => <Learn /> },
  { pattern: '/nauka/:id', page: ModulePage, render: (p) => <ModulePage id={p.id} /> },
  { pattern: '/quizy', page: QuizHub, render: () => <QuizHub /> },
  { pattern: '/lab-z-linku', wide: true, page: CustomLabPage, render: () => <CustomLabPage /> },
  { pattern: '/statystyki', page: StatsPage, render: () => <StatsPage /> },
  { pattern: '/powtorki', page: ReviewPage, render: () => <ReviewPage /> },
  { pattern: '/quiz/:id', page: QuizPage, render: (p) => <QuizPage id={p.id} /> },
  { pattern: '/laboratoria', page: LabsPage, render: () => <LabsPage /> },
  { pattern: '/lab/:id', wide: true, page: LabPage, render: (p) => <LabPage id={p.id} /> },
  { pattern: '/symulator', wide: true, page: Sandbox, render: () => <Sandbox /> },
  { pattern: '/awaria', page: IncidentSetup, render: () => <IncidentSetup /> },
  { pattern: '/awaria/zgloszenie', wide: true, page: IncidentRunPage, render: () => <IncidentRunPage /> },
  { pattern: '/gry', page: GamesPage, render: () => <GamesPage /> },
  { pattern: '/egzamin', page: ExamPage, render: () => <ExamPage /> },
  { pattern: '/gry/:id', page: GamePage, render: (p) => <GamePage id={p.id} /> },
  { pattern: '/slownik', page: GlossaryPage, render: () => <GlossaryPage /> },
  { pattern: '/urzadzenia', page: DevicesPage, render: () => <DevicesPage /> },
  { pattern: '/ustawienia', page: Settings, render: () => <Settings /> },
  { pattern: '/prywatnosc', page: Privacy, render: () => <Privacy /> },
  { pattern: '/regulamin', page: Terms, render: () => <Terms /> },
];

function preloadAll(): void {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData) return;
  const pages = new Set<LazyPage<never>>([...ROUTES.map((route) => route.page), NotFound]);
  for (const page of pages) void page.preload();
}

export function App() {
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((run: () => void) => window.setTimeout(run, 1200));
    idle(preloadAll);
  }, []);
  const current = path.value.split('#')[0];
  for (const route of ROUTES) {
    const params = matchRoute(route.pattern, current);
    if (params) {
      return (
        <Shell wide={Boolean(route.wide)}>
          {route.render(params)}
        </Shell>
      );
    }
  }
  return (
    <Shell wide={false}>
      <NotFound />
    </Shell>
  );
}
