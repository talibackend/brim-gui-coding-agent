import { createTool } from "@mastra/core/tools";
import { compressEdgesOutputSchema, generateGraphOutputSchema } from "../schemas/schema";
import { hierarchicalGraphAgent } from "../agents/hierarchicalGraph.agent";

export const generateHighLevelGraphTool = createTool({
    id : "generate_high_level_graph",
    inputSchema : compressEdgesOutputSchema,
    outputSchema : generateGraphOutputSchema,
    description: "Generate a high level graph representation of the codebase structure based on file paths and directory hierarchy",
    execute : async (inputData)=>{
        let response: any = await hierarchicalGraphAgent.generate(`${JSON.stringify(inputData.edges)}`);
        response = JSON.parse(response.text);

        return response;
    }
})