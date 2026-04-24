import { createTool } from "@mastra/core/tools";
import { discoveryWorkflowOutputSchema, generateGraphOutputSchema } from "../schemas/schema";
import { summaryAgent } from "../agents/summary.agent";

export const generateCodebaseSummaryTool = createTool({
    id : "generate_codebase_summary",
    inputSchema : generateGraphOutputSchema,
    outputSchema : discoveryWorkflowOutputSchema,
    description : "Generate a high level summary of the codebase structure and relationships based on the graph data",
    execute : async (inputData)=>{
        // Convert graph data to a descriptive string for the agent
        const graphDescription = JSON.stringify(inputData.elements, null, 2);

        // Call the summary agent to generate a summary
        const response = await summaryAgent.generate(`Analyze this graph data and provide a summary:\n\n${graphDescription}`);

        return {
            elements: inputData.elements,
            summary: response.text
        };
    }
})