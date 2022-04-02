import { BotModule } from '../botModule';
import { commandMap } from './commands';
import { BotModuleMeta, ExecCommand } from '../../types';

export class Core extends BotModule<ExecCommand> {
  public static meta: BotModuleMeta = {
    id: 'core',
    title: 'Core',
  };

  public commandMap = commandMap;

  constructor() {
    super(Core.meta);
  }
}
