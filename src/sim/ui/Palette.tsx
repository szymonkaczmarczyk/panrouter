import { useState } from 'preact/hooks';
import { tr, tx } from '../../i18n';
import { CATEGORY_ORDER, MODELS, type DeviceCategory } from '../catalog';
import type { SimController } from './controller';
import { DeviceGlyph } from './DeviceGlyph';

const CATEGORY_LABEL: Record<DeviceCategory, [string, string]> = {
  routers: ['Routery', 'Routers'],
  switches: ['Przełączniki', 'Switches'],
  wireless: ['Bezprzewodowe', 'Wireless'],
  security: ['Bezpieczeństwo', 'Security'],
  end: ['Urządzenia końcowe', 'End devices'],
  wan: ['Internet', 'Internet'],
};

export function Palette({ ctrl }: { ctrl: SimController }) {
  const [category, setCategory] = useState<DeviceCategory | 'all'>('all');
  const models = MODELS.filter((m) => category === 'all' || m.category === category);
  return (
    <div class="palette" aria-label={tx('Paleta urządzeń', 'Device palette')}>
      <div class="palette-cats" role="tablist">
        <button type="button" role="tab" aria-selected={category === 'all'} onClick={() => setCategory('all')}>
          {tx('Wszystkie', 'All')}
        </button>
        {CATEGORY_ORDER.map((cat) => (
          <button key={cat} type="button" role="tab" aria-selected={category === cat} onClick={() => setCategory(cat)}>
            {tx(...CATEGORY_LABEL[cat])}
          </button>
        ))}
      </div>
      <div class="palette-items">
        {models.map((model) => (
          <button
            key={model.kind}
            type="button"
            class="palette-item"
            draggable
            aria-pressed={ctrl.placing.value === model.kind}
            title={`${tr(model.title)}: ${tr(model.desc)}`}
            onDragStart={(e) => {
              e.dataTransfer?.setData('application/x-panrouter-device', model.kind);
              if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
            }}
            onClick={() => {
              ctrl.tool.value = 'select';
              ctrl.placing.value = ctrl.placing.value === model.kind ? null : model.kind;
            }}
          >
            <DeviceGlyph kind={model.kind} size={40} />
            <span>{tr(model.title).replace(/ [A-Z]{2}-\d+[A-Z]*$/, '')}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
