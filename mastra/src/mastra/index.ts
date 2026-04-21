import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { mainAgent } from './agents/main.agent';
import { fileContentAgent } from './agents/filecontent.agent';
import { hierarchicalGraphAgent } from './agents/hierarchicalGraph.agent';
import { discoveryWorkflow } from './workflows/discovery.workflow';
import { Store } from '../config/store.config';
import { VectorStore } from '../config/vector.config';
import { exclusionPatternWorkflow } from './workflows/exclusionPattern.workflow';
import { codebaseGraphGeneratorWorkflow } from './workflows/codebaseGraphGenerator.workflow';
import { exclusionPatternsAgent } from './agents/exclusionPatterns.agent';

export const mastra = new Mastra({
  agents: { fileContentAgent, mainAgent, exclusionPatternsAgent, hierarchicalGraphAgent },
  workflows: { codebaseGraphGeneratorWorkflow },
  storage : Store,
  vectors: {VectorStore},
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});