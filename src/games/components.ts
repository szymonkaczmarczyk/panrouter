import type { FunctionComponent } from 'preact';
import { BinarySprint } from './BinarySprint';
import { CableToPort, MacTableGame, NetworkDetective, OsiLayers, PacketPath, PortsServices } from './ChoiceGames';
import { CliSpeedrun } from './CliSpeedrun';
import { Ipv6Compressor, SubnetSprint } from './InputGames';

export const GAME_COMPONENTS: Record<string, FunctionComponent<{ onFinish: (score: number) => void }>> = {
  'binarny-sprint': BinarySprint,
  'warstwy-osi': OsiLayers,
  'porty-uslugi': PortsServices,
  'kabel-do-portu': CableToPort,
  podsieciowiec: SubnetSprint,
  'tablica-mac': MacTableGame,
  'droga-pakietu': PacketPath,
  'ipv6-kompresor': Ipv6Compressor,
  'detektyw-sieci': NetworkDetective,
  'cli-na-czas': CliSpeedrun,
};
