import { createTool } from "@mastra/core/tools";
import { discoveryWorkflowOutputSchema, generateGraphOutputSchema } from "../schemas/schema";
import { summaryAgent } from "../agents/summary.agent";
import { getRedisClient } from "../../config/redis.config";
import { getSha512OfString } from "../../utils/hash";

export const generateCodebaseSummaryTool = createTool({
    id : "generate_codebase_summary",
    inputSchema : generateGraphOutputSchema,
    outputSchema : discoveryWorkflowOutputSchema,
    description : "Generate a high level summary of the codebase structure and relationships based on the graph data",
    execute : async (inputData)=>{
        const graphDescription = JSON.stringify(inputData.elements);

        const cacheKey = `codebaseSummary:${getSha512OfString(graphDescription)}`;
        const redisClient = await getRedisClient();
        const cachedResult = await redisClient.get(cacheKey);
        
        if(cachedResult){
            console.log(`Cache hit for codebase summary generation`);
            return JSON.parse(cachedResult);
        }

        console.log(`Cache miss for codebase summary generation. Invoking agent...`);

        const response = await summaryAgent.generate(`Analyze this graph data and provide a summary:\n\n${graphDescription}`);
        console.log(`Storing codebase summary in cache`);
        await redisClient.set(cacheKey, JSON.stringify({
            elements: inputData.elements,
            summary: response.text
        }));

        return {
            elements: inputData.elements,
            summary: response.text
        };
    }
})