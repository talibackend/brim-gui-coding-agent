
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { fileContentAgent } from './agents/filecontent.agent';
import { discoveryWorkflow } from './workflows/discovery.workflow';

export const mastra = new Mastra({
  // agents: { fileContentAgent },
  workflows: { discoveryWorkflow },
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
