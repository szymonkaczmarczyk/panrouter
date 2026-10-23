import { describe, expect, it } from 'vitest';
import { emptyNetwork } from '../../src/sim/network';
import { SimController } from '../../src/sim/ui/controller';
import type { Network } from '../../src/sim/types';

function setup() {
  const stored: Network[] = [];
  const ctrl = new SimController(emptyNetwork(), (net) => stored.push(structuredClone(net)));
  return { ctrl, stored };
}

describe('historia zmian na planszy', () => {
  it('cofa i ponawia dodanie urządzeń', () => {
    const { ctrl } = setup();
    expect(ctrl.canUndo.value).toBe(false);
    ctrl.addDevice('pc', 0, 0);
    ctrl.addDevice('switch', 100, 0);
    expect(ctrl.net.devices).toHaveLength(2);
    expect(ctrl.undo()).toBe(true);
    expect(ctrl.net.devices).toHaveLength(1);
    expect(ctrl.canRedo.value).toBe(true);
    expect(ctrl.redo()).toBe(true);
    expect(ctrl.net.devices).toHaveLength(2);
    expect(ctrl.redo()).toBe(false);
  });

  it('nowa zmiana po cofnięciu kasuje ponawianie', () => {
    const { ctrl } = setup();
    ctrl.addDevice('pc', 0, 0);
    ctrl.undo();
    ctrl.addDevice('router', 0, 0);
    expect(ctrl.canRedo.value).toBe(false);
    expect(ctrl.net.devices.map((d) => d.kind)).toEqual(['router']);
  });

  it('przesuwa i usuwa grupę jako jedną zmianę', () => {
    const { ctrl } = setup();
    const a = ctrl.addDevice('pc', 0, 0);
    const b = ctrl.addDevice('pc', 50, 50);
    ctrl.moveDevices([a, b], 10, 20, true);
    expect(ctrl.net.devices.map((d) => [d.x, d.y])).toEqual([[10, 20], [60, 70]]);
    ctrl.deleteDevices([a, b]);
    expect(ctrl.net.devices).toHaveLength(0);
    ctrl.undo();
    expect(ctrl.net.devices).toHaveLength(2);
  });

  it('pusta, porzucona notatka nie trafia do historii', () => {
    const { ctrl, stored } = setup();
    const id = ctrl.addNote(0, 0);
    ctrl.setNoteText(id, '   ');
    expect(ctrl.net.notes).toHaveLength(0);
    expect(stored).toHaveLength(0);
    expect(ctrl.canUndo.value).toBe(false);
  });

  it('ogranicza długość historii', () => {
    const { ctrl } = setup();
    for (let i = 0; i < 80; i++) ctrl.addDevice('pc', i * 10, 0);
    let steps = 0;
    while (ctrl.undo()) steps++;
    expect(steps).toBe(59);
  });
});
