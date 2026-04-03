import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { exclusionPatternWorkflow } from "./exclusionPattern.workflow";
import { discoveryWorkflow } from "./discovery.workflow";

export const codebaseGraphGeneratorWorkflow = createWorkflow({
  id: "codebase_graph_generator_workflow",
  description: "Workflow to generate a graph representation of the codebase structure",
  inputSchema: z.object({
    basepath: z.string().describe('Base directory path to scan'),
    exclude: z.array(z.string()).optional().default([]).describe('Array of patterns to exclude (supports wildcards *)'),
  }),
  outputSchema: z.object({
    graphData: z.object({
      elements: z.object({
        nodes: z.array(z.object({
          data: z.object({
            id: z.string(),
            label: z.string(),
            type: z.enum(['file', 'export', 'import']).optional(),
            description: z.string().optional(),
            filePath: z.string().optional(),
            exports: z.array(z.string()).optional(),
            imports: z.array(z.string()).optional(),
            size: z.number().optional()
          })
        })),
        edges: z.array(z.object({
          data: z.object({
            id: z.string(),
            source: z.string(),
            target: z.string(),
            type: z.enum(['imports', 'exports', 'contains']).optional(),
            label: z.string().optional(),
            importedProperty: z.string().optional().nullable()
          })
        }))
      })
    }),
    summary: z.string().describe('Summary analysis of the graph structure')
  })
})
.then(exclusionPatternWorkflow)
.then(discoveryWorkflow)
.commit()