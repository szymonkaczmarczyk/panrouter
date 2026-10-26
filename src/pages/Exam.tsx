import { Award, ChartColumn, CircleCheck, CircleX, ClipboardCheck, Clock, ListChecks, Network } from 'lucide-preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { setMeta } from '../app/meta';
import { href } from '../app/router';
import { Blocks } from '../content/Blocks';
import { MODULES } from '../content';
import { EXAM, EXAM_LAB, pickTheory } from '../content/exam';
import { makeLabContext } from '../content/labs/context';
import type { Question } from '../content/types';
import { lang, t, tr, tx } from '../i18n';
import { SimController } from '../sim/ui/controller';
import { Workspace } from '../sim/ui/Workspace';
import { overallPercent } from '../state/learning';
import { progress, recordExam } from '../state/progress';
import { Quiz, ScoreRing } from '../ui/Quiz';

type Stage = 'intro' | 'theory' | 'practical' | 'result';

function Practical({ onDone }: { onDone: (percent: number, results: boolean[]) => void }) {
  const ctrl = useMemo(() => new SimController(EXAM_LAB.build(), () => {}), []);
  useEffect(() => {
    ctrl.sim.autoDhcp();
    ctrl.bump();
  }, []);
  const finish = () => {
    if (!window.confirm(tx('Zakończyć egzamin praktyczny i oddać sieć do oceny?', 'Finish the practical exam and submit the network for grading?'))) return;
    const ctx = makeLabContext(ctrl.net, ctrl.sim);
    const results = EXAM_LAB.checks.map((c) => {
      try {
        return c.test(ctx);
      } catch {
        return false;
      }
    });
    onDone(Math.round((results.filter(Boolean).length / results.length) * 100), results);
  };
  return (
    <div class="exam-practical">
      <Workspace
        ctrl={ctrl}
        leading={
          <span class="badge badge-warn">
            <Award aria-hidden="true" /> {tx('Egzamin: część praktyczna', 'Exam: practical part')}
          </span>
        }
        side={
          <aside class="lab-side">
            <div class="lab-side-head" style={{ paddingLeft: 'var(--space-4)' }}>
              <span class="eyebrow">{tx('Część 2 z 2', 'Part 2 of 2')}</span>
              <h4>{tr(EXAM_LAB.title)}</h4>
              <p class="muted small">{tr(EXAM_LAB.summary)}</p>
            </div>
            <div class="lab-side-body">
              <Blocks blocks={EXAM_LAB.steps[lang.value]} />
              <p class="muted small">{tx('Na egzaminie nie widzisz wyników poszczególnych zadań przed oddaniem.', 'During the exam you do not see task results before submitting.')}</p>
            </div>
            <div class="lab-side-foot">
              <div class="spacer" />
              <button type="button" class="btn btn-primary" onClick={finish}>
                <ClipboardCheck aria-hidden="true" />
                {tx('Zakończ i oddaj', 'Finish and submit')}
              </button>
            </div>
          </aside>
        }
      />
    </div>
  );
}

function moduleBreakdown(questions: Question[], wrong: string[]): Record<string, [number, number]> {
  const owner = new Map(MODULES.flatMap((m) => m.quiz.map((q) => [q.id, m.id] as const)));
  const missed = new Set(wrong);
  const result: Record<string, [number, number]> = {};
  for (const q of questions) {
    const id = owner.get(q.id);
    if (!id) continue;
    const [asked, misses] = result[id] ?? [0, 0];
    result[id] = [asked + 1, misses + (missed.has(q.id) ? 1 : 0)];
  }
  return result;
}

export function ExamPage() {
  const [stage, setStage] = useState<Stage>('intro');
  const [seed, setSeed] = useState(() => Date.now() % 100000);
  const [theory, setTheory] = useState(0);
  const [theoryWrong, setTheoryWrong] = useState<string[]>([]);
  const [practical, setPractical] = useState(0);
  const [practicalResults, setPracticalResults] = useState<boolean[]>([]);
  const questions = useMemo(() => pickTheory(seed), [seed]);
  const exam = progress.value.exam;
  const ready = overallPercent.value;

  useEffect(() => setMeta(tx('Egzamin końcowy', 'Final exam'), tx('Egzamin z sieci komputerowych: 30 pytań teoretycznych i zadanie praktyczne w symulatorze.', 'A networking exam: 30 theory questions and a practical simulator task.')), []);

  const total = Math.round(theory * EXAM.theoryWeight + practical * EXAM.practicalWeight);
  const passed = total >= EXAM.passMark;

  if (stage === 'theory') {
    return (
      <div class="page fade-in">
        <header class="page-head">
          <span class="eyebrow">{tx('Część 1 z 2: teoria', 'Part 1 of 2: theory')}</span>
          <h2>{tx('Egzamin końcowy', 'Final exam')}</h2>
          <p>{tx('Odpowiedzi poznasz dopiero na końcu. Możesz wracać do poprzednich pytań.', 'You will see the answers only at the end. You can go back to earlier questions.')}</p>
        </header>
        <Quiz
          questions={questions}
          seed={seed}
          mode="exam"
          timeLimit={EXAM.theoryMinutes * 60}
          pass={EXAM.passMark}
          onFinish={(result) => {
            setTheory(result.percent);
            setTheoryWrong(result.wrong);
          }}
          resultExtra={() => (
            <button type="button" class="btn btn-primary btn-lg" onClick={() => setStage('practical')}>
              <Network aria-hidden="true" />
              {tx('Przejdź do części praktycznej', 'Go to the practical part')}
            </button>
          )}
        />
      </div>
    );
  }

  if (stage === 'practical') {
    return (
      <Practical
        onDone={(percent, results) => {
          setPractical(percent);
          setPracticalResults(results);
          const final = Math.round(theory * EXAM.theoryWeight + percent * EXAM.practicalWeight);
          recordExam({ theory, practical: percent, total: final, passed: final >= EXAM.passMark, modules: moduleBreakdown(questions, theoryWrong), wrong: theoryWrong });
          setStage('result');
        }}
      />
    );
  }

  if (stage === 'result') {
    return (
      <div class="page fade-in">
        <div class="quiz-result">
          <ScoreRing percent={total} pass={EXAM.passMark} />
          <h2>{passed ? tx('Egzamin zdany!', 'Exam passed!') : tx('Egzamin niezdany', 'Exam not passed')}</h2>
          <p class="lead">
            {tx(`Teoria ${theory}% (waga 70%), praktyka ${practical}% (waga 30%). Wynik ${total}%, próg ${EXAM.passMark}%.`, `Theory ${theory}% (70% weight), practice ${practical}% (30% weight). Total ${total}%, pass mark ${EXAM.passMark}%.`)}
          </p>
          <ul class="check-list card" style={{ padding: 'var(--space-5)', width: '100%', maxWidth: '640px' }}>
            {EXAM_LAB.checks.map((c, i) => (
              <li key={c.id} class={practicalResults[i] ? 'ok' : 'fail'}>
                {practicalResults[i] ? <CircleCheck aria-hidden="true" /> : <CircleX aria-hidden="true" />}
                <span>{tr(c.label)}</span>
              </li>
            ))}
          </ul>
          <div class="row-wrap">
            <button
              type="button"
              class="btn btn-primary"
              onClick={() => {
                setSeed(seed + 7);
                setStage('intro');
              }}
            >
              {tx('Podejdź jeszcze raz', 'Retake the exam')}
            </button>
            <a class="btn" href={href('/statystyki')}>
              <ChartColumn aria-hidden="true" />
              {tx('Statystyki podejść', 'Attempt statistics')}
            </a>
            <a class="btn btn-ghost" href={href('/powtorki')}>
              {tx('Błędne pytania wrócą w powtórkach', 'Wrong questions come back in reviews')}
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div class="page fade-in">
      <header class="page-head">
        <span class="eyebrow">{t('nav.exam')}</span>
        <h2>{tx('Sprawdź, ile już umiesz', 'See how much you know')}</h2>
        <p>{tx('Egzamin ma dwie części. Teoria to pytania z całego kursu, a praktyka to sieć do skonfigurowania w symulatorze.', 'The exam has two parts. Theory covers questions from the whole course and practice is a network to configure in the simulator.')}</p>
      </header>
      <div class="grid-2">
        <div class="card stack">
          <ListChecks aria-hidden="true" class="bento-icon" />
          <h4>{tx('Część 1: teoria', 'Part 1: theory')}</h4>
          <p class="muted small">{tx(`${EXAM.theoryCount} pytań, po 6 z każdego poziomu. ${EXAM.theoryMinutes} minut. Waga 70%.`, `${EXAM.theoryCount} questions, 6 from each level. ${EXAM.theoryMinutes} minutes. 70% weight.`)}</p>
        </div>
        <div class="card stack">
          <Network aria-hidden="true" class="bento-icon" />
          <h4>{tx('Część 2: praktyka', 'Part 2: practice')}</h4>
          <p class="muted small">{tx('Biuro z dwoma VLAN-ami, DHCP i NAT. Ocena automatyczna, 8 zadań. Waga 30%.', 'An office with two VLANs, DHCP and NAT. Automatic grading, 8 tasks. 30% weight.')}</p>
        </div>
      </div>
      <section class="section card stack" style={{ maxWidth: '760px' }}>
        <div class="row-wrap">
          <Clock aria-hidden="true" style={{ width: 18, height: 18, color: 'var(--warn)' }} />
          <span>{tx(`Gotowość: ukończono ${ready}% kursu. Zalecamy co najmniej 70%.`, `Readiness: ${ready}% of the course done. We recommend at least 70%.`)}</span>
        </div>
        <div class="progress progress-ok">
          <span style={{ width: `${ready}%` }} />
        </div>
        {exam.attempts > 0 && (
          <p class="row-wrap muted small">
            {tx(`Liczba podejść: ${exam.attempts}. Najlepszy wynik: ${exam.best}%.`, `Attempts: ${exam.attempts}. Best score: ${exam.best}%.`)}
            <a class="btn btn-sm btn-ghost" href={href('/statystyki')}>
              <ChartColumn aria-hidden="true" />
              {tx('Historia i najsłabsze moduły', 'History and weakest modules')}
            </a>
          </p>
        )}
        <div class="row-wrap">
          <button type="button" class="btn btn-primary btn-lg" onClick={() => setStage('theory')}>
            <Award aria-hidden="true" />
            {tx('Rozpocznij egzamin', 'Start the exam')}
          </button>
        </div>
      </section>
    </div>
  );
}
