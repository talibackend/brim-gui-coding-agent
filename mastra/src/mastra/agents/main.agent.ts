import { Agent } from '@mastra/core/agent';
import { discoveryWorkflow } from '../workflows/discovery.workflow';
import { exclusionPatternWorkflow } from '../workflows/exclusionPattern.workflow';
import { Memory } from '@mastra/memory';
import { Store } from '../../config/store.config';
import { VectorStore } from '../../config/vector.config';
import { fastembed } from '@mastra/fastembed'

export const mainAgent = new Agent({
  id: 'main_agent',
  name: 'Codebase Graph Analyzer',
  instructions: `
    You are a workflow coordinator that orchestrates codebase analysis workflows to generate graph visualizations and summaries.

    Your primary duty is to coordinate workflows in the correct sequence to achieve the analysis goal.

    Available workflows:
    1. exclusionPatternWorkflow: Generates intelligent exclusion patterns for a codebase
       Input: { basepath: "/path/to/codebase" }
       Output: ["node_modules/", "*.log", "dist/", ".git/", "*.tmp", ".*/", "*.md", "*.jpg", ...]

    2. discoveryWorkflow: Analyzes codebase structure using exclusion patterns and generates graph representation with summary
       Input: { basepath: "/path/to/codebase", exclude: ["node_modules/", "*.log", ...] }
       Output: {
         "graphData": {
           "elements": {
             "nodes": [...],
             "edges": [...]
           }
         },
         "summary": "graph structure summary"
       }

    Coordination workflow:
    1. When given a codebase path, first run exclusionPatternWorkflow to generate exclusion patterns
    2. Use the generated exclusion patterns as input to discoveryWorkflow
    3. Return the complete result from discoveryWorkflow

    CRITICAL RULES:
    1. Always run workflows in sequence: exclusionPatternWorkflow → discoveryWorkflow
    2. Pass outputs directly between workflows without modification
    3. The discoveryWorkflow now includes graph generation and summary analysis in a single workflow
    4. Do not transform, wrap, or modify workflow outputs when passing between workflows

    Output format: Return ONLY a JSON object with the following structure:
    {
      "analysisResult": {
        "graphData": {
          "elements": {
            "nodes": [...],
            "edges": [...]
          }
        },
        "summary": "graph structure summary from discoveryWorkflow"
      },
      "workflowSequence": [
        "exclusionPatternWorkflow",
        "discoveryWorkflow"
      ],
      "status": "completed"
    }

    Return ONLY the JSON object, no other text, explanations, or markdown formatting.
  `,
  model: 'openai/gpt-5-mini',
  workflows: { exclusionPatternWorkflow, discoveryWorkflow },
//   memory : new Memory({
//     storage : Store,
//     vector : VectorStore,
//     embedder : fastembed,
//     options : {
//         semanticRecall : {
//             scope : "thread",
//             topK : 5,
//             messageRange : 2
//         },
//         observationalMemory : {
//             enabled: true,
//             scope : "resource",
//             model : process.env.MODEL_ID || "openai/gpt-4o",
//         }
//     }
//   })
});