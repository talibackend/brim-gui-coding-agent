import { Agent } from '@mastra/core/agent';
import { codebaseGraphGeneratorWorkflow } from '../workflows/codebaseGraphGenerator.workflow';
import { graphProjectionOutputSchema } from '../schemas/schema';

export const mainAgent = new Agent({
  id: 'main_agent',
  name: 'Codebase Graph Generator',
  instructions: `You generate dynamic visual projections of any codebase. The codebaseGraphGeneratorWorkflow is the entry point — run it first to get base graph data and summary. From there, you can create alternative projections (execution flow, dependency trees, module maps, etc.) by analyzing and transforming the results.

    Output pure JSON: single object or array of {elements:{nodes:[{data:{id,label,type,description,memberCount,members,size,color}}],edges:[{data:{id,source,target,type,label,importCount,importedProperties}}]},summary:string}. No markdown.`,
  model: 'openai/gpt-5-mini',
  workflows: { codebaseGraphGeneratorWorkflow }
});