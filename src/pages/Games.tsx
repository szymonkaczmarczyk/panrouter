import { ArrowLeft, Binary, Cable, Cpu, Gamepad2, Globe, Hash, Layers, Play, RotateCcw, Route, Split, SquareTerminal, Trophy, Wrench } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import { setMeta } from '../app/meta';
import { href } from '../app/router';
import { GAME_COMPONENTS } from '../games/components';
import { GAMES, type GameMeta } from '../games/registry';
import { t, tr, tx } from '../i18n';
import { progress, recordGame } from '../state/progress';
import { ScoreRing } from '../ui/Quiz';
import { NotFound } from './NotFound';

const ICONS: Record<GameMeta['icon'], typeof Binary> = {
  binary: Binary,
  split: Split,
  layers: Layers,
  hash: Hash,
  route: Route,
  cpu: Cpu,
  cable: Cable,
  globe: Globe,
  wrench: Wrench,
  terminal: SquareTerminal,
};

export function GamesPage() {
  useEffect(() => setMeta(tx('Minigry', 'Mini-games'), tx('Dziesięć minigier o sieciach: liczby binarne, podsieci, porty, OSI, routing, IPv6, diagnostyka i CLI na czas.', 'Ten networking mini-games: binary, subnetting, ports, OSI, routing, IPv6, troubleshooting and a CLI speedrun.')), []);
  const p = progress.value;
  return (
    <div class="page fade-in">
      <header class="page-head">
        <span class="eyebrow">{t('nav.games')}</span>
        <h2>{tx('Ćwicz w kilka minut', 'Practice in a few minutes')}</h2>
        <p>{tx('Krótkie gry utrwalają to, czego trzeba używać odruchowo: liczenie podsieci, porty, warstwy i polecenia.', 'Short games drill what you need on reflex: subnetting, ports, layers and commands.')}</p>
      </header>
      <div class="games-grid">
        {GAMES.map((game, i) => {
          const Icon = ICONS[game.icon];
          const best = p.games[game.id]?.best;
          return (
            <a key={game.id} class={`card card-link game-card ${i % 5 === 0 ? 'game-card-wide' : ''}`} href={href(`/gry/${game.id}`)}>
              <div class="row" style={{ justifyContent: 'space-between' }}>
                <span class="module-icon">
                  <Icon aria-hidden="true" />
                </span>
                {best !== undefined ? (
                  <span class="badge badge-ok">
                    <Trophy aria-hidden="true" /> {best}
                  </span>
                ) : (
                  <span class="badge">{t('common.new')}</span>
                )}
              </div>
              <h4>{tr(game.title)}</h4>
              <p class="muted small">{tr(game.summary)}</p>
              <span class="dim small">
                {t('common.level')} {game.level} · {game.minutes} min
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

export function GamePage({ id }: { id: string }) {
  const game = GAMES.find((g) => g.id === id);
  const [stage, setStage] = useState<'intro' | 'play' | 'result'>('intro');
  const [score, setScore] = useState(0);
  const [run, setRun] = useState(0);
  useEffect(() => {
    if (game) setMeta(tr(game.title), tr(game.summary));
    setStage('intro');
  }, [id]);
  if (!game) return <NotFound />;
  const Component = GAME_COMPONENTS[game.id];
  const Icon = ICONS[game.icon];
  const best = progress.value.games[game.id]?.best ?? 0;
  const finish = (value: number) => {
    setScore(value);
    recordGame(game.id, value);
    setStage('result');
  };
  return (
    <div class="page fade-in game-page">
      <nav class="crumbs" aria-label={tx('Okruszki', 'Breadcrumbs')}>
        <a href={href('/gry')}>
          <ArrowLeft aria-hidden="true" />
          {t('nav.games')}
        </a>
      </nav>
      <header class="page-head">
        <h2 class="row" style={{ gap: 'var(--space-3)' }}>
          <Icon aria-hidden="true" class="bento-icon" /> {tr(game.title)}
        </h2>
        <p>{tr(game.summary)}</p>
      </header>
      {stage === 'intro' && (
        <div class="card stack game-intro">
          <p class="muted">{best ? tx(`Twój najlepszy wynik: ${best} na 100.`, `Your best score: ${best} out of 100.`) : tx('Pierwsza próba. Wynik zapisze się w Twoim postępie.', 'First attempt. The score will be saved to your progress.')}</p>
          <div>
            <button type="button" class="btn btn-primary btn-lg" onClick={() => setStage('play')} autoFocus>
              <Play aria-hidden="true" />
              {tx('Zagraj', 'Play')}
            </button>
          </div>
        </div>
      )}
      {stage === 'play' && <Component key={run} onFinish={finish} />}
      {stage === 'result' && (
        <div class="quiz-result fade-in">
          <ScoreRing percent={score} pass={70} />
          <h3>{score >= 90 ? tx('Mistrzostwo!', 'Mastery!') : score >= 70 ? tx('Bardzo dobrze', 'Very good') : tx('Jeszcze raz?', 'One more go?')}</h3>
          <p class="muted">{tx(`Wynik ${score} na 100. Najlepszy: ${Math.max(best, score)}.`, `Score ${score} out of 100. Best: ${Math.max(best, score)}.`)}</p>
          <div class="row-wrap">
            <button
              type="button"
              class="btn btn-primary"
              onClick={() => {
                setRun(run + 1);
                setStage('play');
              }}
            >
              <RotateCcw aria-hidden="true" />
              {tx('Zagraj ponownie', 'Play again')}
            </button>
            <a class="btn" href={href('/gry')}>
              <Gamepad2 aria-hidden="true" />
              {tx('Inne gry', 'Other games')}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
