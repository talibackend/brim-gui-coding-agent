import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { listFiles, fileExtensions, subdirectories } from "../tools/filesystem.tool";
import { exclusionPatternsAgent } from "../agents/exclusionPatterns.agent";

const listFilesStep = createStep(listFiles);
const fileExtensionsStep = createStep(fileExtensions);
const subDirectoriesStep = createStep(subdirectories);

const exclusionPatternsStep = createStep({
  id: "exclusion_patterns_step",
  description: "Generate exclusion patterns based on file extensions and subdirectories",
  inputSchema: z.object({
    "file-extensions": z.array(z.string()).describe('Array of file extensions'),
    "subdirectories": z.array(z.string()).describe('Array of sub directories'),
  }),
  outputSchema: z.array(z.string()).describe('Array of exclusion patterns'),
  execute: async ({ inputData }) => {
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
      return sanitizedPatterns;
    } catch (error) {
      console.error('Failed to parse exclusion patterns:', error);
      return [];
    }
  }
});

export const exclusionPatternWorkflow = createWorkflow({
  id: "exclusion_pattern_workflow",
  inputSchema: z.object({
    basepath: z.string().describe('Base directory path to scan')
  }),
  outputSchema: z.array(z.string()).describe('Array of exclusion patterns for the project')
})
.then(listFilesStep)
.parallel([fileExtensionsStep, subDirectoriesStep])
.then(exclusionPatternsStep)
.commit()