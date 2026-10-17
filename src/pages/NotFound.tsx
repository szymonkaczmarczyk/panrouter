import { ArrowLeft, Network } from 'lucide-preact';
import { useEffect } from 'preact/hooks';
import { setMeta } from '../app/meta';
import { href } from '../app/router';
import { t, tx } from '../i18n';

export function NotFound() {
  useEffect(() => setMeta(t('notFound.title'), t('notFound.text')), []);
  return (
    <div class="page fade-in not-found">
      <div class="nf-code mono" aria-hidden="true">
        <span>Destination host unreachable</span>
        <strong>404</strong>
      </div>
      <h2>{t('notFound.title')}</h2>
      <p class="lead">{t('notFound.text')}</p>
      <div class="hero-actions">
        <a class="btn btn-primary btn-lg" href={href('/')}>
          <ArrowLeft aria-hidden="true" />
          {t('notFound.home')}
        </a>
        <a class="btn btn-lg" href={href('/symulator')}>
          <Network aria-hidden="true" />
          {tx('Otwórz symulator', 'Open the simulator')}
        </a>
      </div>
    </div>
  );
}
