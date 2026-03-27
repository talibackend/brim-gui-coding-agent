
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { mainAgent } from './agents/main.agent';
import { fileContentAgent } from './agents/filecontent.agent';
import { discoveryWorkflow } from './workflows/discovery.workflow';
import { Store } from '../config/store.config';
import { VectorStore } from '../config/vector.config';

export const mastra = new Mastra({
  agents: { fileContentAgent, mainAgent },
  workflows: { discoveryWorkflow },
  storage : Store,
  vectors: {VectorStore},
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
