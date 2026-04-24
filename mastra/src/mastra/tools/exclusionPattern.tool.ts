import { createTool } from "@mastra/core/tools";
import { discoveryWorkflowInputSchema, exclusionPatternInputSchema } from "../schemas/schema";
import { exclusionPatternsAgent } from "../agents/exclusionPatterns.agent";
import { getRedisClient } from "../../config/redis.config";
import { getSha512OfString } from "../../utils/hash";


export const exclusionPatternTool = createTool({
    id: "exclusion_pattern_tool",
    inputSchema: exclusionPatternInputSchema,
    outputSchema: discoveryWorkflowInputSchema,
    description: "Tool to generate exclusion patterns to the list of files in the codebase",
    execute: async (inputData) => {

        // Transform input to match agent's expected format
        const agentInput = {
            extensions: inputData["file-extensions"],
            subdirectories: inputData["subdirectories"]
        };

        // Perform caching here.
        const redisClient = await getRedisClient();
        const payloadHash = getSha512OfString(JSON.stringify(agentInput));
        const cacheKey = `exclusionPatterns:${payloadHash}`;
        const search = await redisClient.get(cacheKey);

        if(search){
            console.log('Cache hit for exclusion patterns');
            return { basepath : agentInput.extensions.basepath, exclude : JSON.parse(search) };
        }


        console.log('Cache miss for exclusion patterns, invoking agent...');

        const response = await exclusionPatternsAgent.generate(
            `Generate exclusion patterns for a project with this data: ${JSON.stringify(agentInput)}`
        );

        try {
            const patterns = JSON.parse(response.text);
            // Sanitize patterns for JSON storage - fix invalid escape sequences
            const sanitizedPatterns = Array.isArray(patterns)
                ? patterns.map((pattern: string) =>
                    pattern.replace(/\\\\/g, '\\\\\\\\').replace(/\\-(?![bfnrtu0-9])/g, '\\\\-')
                )
                : [];
            
            console.log('Storing exclusion patterns in cache');
            await redisClient.set(cacheKey, JSON.stringify(sanitizedPatterns))
            return { basepath: agentInput.extensions.basepath, exclude: sanitizedPatterns };
        } catch (error) {
            console.error('Failed to parse exclusion patterns:', error);
            return { basepath: agentInput.extensions.basepath, exclude: [] };
        }
    }
})