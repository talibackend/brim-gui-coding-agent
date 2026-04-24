import { createWorkflow } from "@mastra/core/workflows";
import { exclusionPatternWorkflow } from "./exclusionPattern.workflow";
import { discoveryWorkflow } from "./discovery.workflow";
import { codebaseGraphGeneratorWorkflowOutputSchema, discoveryWorkflowInputSchema } from "../schemas/schema";

export const codebaseGraphGeneratorWorkflow = createWorkflow({
  id: "codebase_graph_generator_workflow",
  description: "Workflow to generate a graph representation of the codebase structure",
  inputSchema: discoveryWorkflowInputSchema,
  outputSchema: codebaseGraphGeneratorWorkflowOutputSchema
})
.then(exclusionPatternWorkflow)
.then(discoveryWorkflow)
.commit()