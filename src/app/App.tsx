import type { ComponentChildren } from 'preact';
import { ExamPage } from '../pages/Exam';
import { GamePage, GamesPage } from '../pages/Games';
import { Home } from '../pages/Home';
import { LabPage } from '../pages/LabPage';
import { LabsPage } from '../pages/LabsPage';
import { Learn } from '../pages/Learn';
import { DevicesPage, GlossaryPage } from '../pages/Library';
import { ModulePage } from '../pages/ModulePage';
import { QuizHub } from '../pages/QuizHub';
import { QuizPage } from '../pages/QuizPage';
import { Privacy, Terms } from '../pages/Legal';
import { NotFound } from '../pages/NotFound';
import { Sandbox } from '../pages/Sandbox';
import { Settings } from '../pages/Settings';
import { matchRoute, path } from './router';
import { Shell } from './Shell';

interface RouteDef {
  pattern: string;
  wide?: boolean;
  render: (params: Record<string, string>) => ComponentChildren;
}

const ROUTES: RouteDef[] = [
  { pattern: '/', render: () => <Home /> },
  { pattern: '/nauka', render: () => <Learn /> },
  { pattern: '/nauka/:id', render: (p) => <ModulePage id={p.id} /> },
  { pattern: '/quizy', render: () => <QuizHub /> },
  { pattern: '/quiz/:id', render: (p) => <QuizPage id={p.id} /> },
  { pattern: '/laboratoria', render: () => <LabsPage /> },
  { pattern: '/lab/:id', wide: true, render: (p) => <LabPage id={p.id} /> },
  { pattern: '/symulator', wide: true, render: () => <Sandbox /> },
  { pattern: '/gry', render: () => <GamesPage /> },
  { pattern: '/egzamin', render: () => <ExamPage /> },
  { pattern: '/gry/:id', render: (p) => <GamePage id={p.id} /> },
  { pattern: '/slownik', render: () => <GlossaryPage /> },
  { pattern: '/urzadzenia', render: () => <DevicesPage /> },
  { pattern: '/ustawienia', render: () => <Settings /> },
  { pattern: '/prywatnosc', render: () => <Privacy /> },
  { pattern: '/regulamin', render: () => <Terms /> },
];

export function App() {
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
