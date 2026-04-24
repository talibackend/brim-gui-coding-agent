import { createTool } from "@mastra/core/tools";
import { discoveryWorkflowInputSchema, exclusionPatternInputSchema } from "../schemas/schema";
import { exclusionPatternsAgent } from "../agents/exclusionPatterns.agent";

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
            return { basepath: agentInput.extensions.basepath, exclude: sanitizedPatterns };
        } catch (error) {
            console.error('Failed to parse exclusion patterns:', error);
            return { basepath: agentInput.extensions.basepath, exclude: [] };
        }
    }
})