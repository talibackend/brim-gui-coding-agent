import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { listFiles, readFiles } from "../tools/filesystem.tool";
import { fileContentAgent } from "../agents/filecontent.agent";
import { generateEdgesTool } from "../tools/generateEdges.tool";
import { summaryAgent } from "../agents/summary.agent";
import { hierarchicalGraphAgent } from "../agents/hierarchicalGraph.agent";
import { compressEdgesTool } from "../tools/compressEdges.tool";
import { compressEdgesOutputSchema, discoveryWorkflowOutputSchema, generateGraphOutputSchema } from "../schemas/schema";

const listFilesStep = createStep(listFiles);
const readFilesStep = createStep(readFiles);
const generateEdgesStep = createStep(generateEdgesTool);
const compressEdgesStep = createStep(compressEdgesTool);

const generateHighLevelGraphStep = createStep({
    id: "generate_high_level_graph_step",
    description: "Generate a high level graph representation of the codebase structure based on file paths and directory hierarchy",
    inputSchema: compressEdgesOutputSchema.describe("Compressed edges data structure"),
    outputSchema: generateGraphOutputSchema,
    execute: async ({ inputData }) => {

        let response: any = await hierarchicalGraphAgent.generate(`${JSON.stringify(inputData.edges)}`);
        response = JSON.parse(response.text);

        return response;
    }
})

const generateSummaryStep = createStep({
    id: "generate_summary_step",
    description: "Generate a summary of the graph structure using the summary agent",
    inputSchema: generateGraphOutputSchema,
    outputSchema: discoveryWorkflowOutputSchema,
    execute: async ({ inputData }) => {
        // Convert graph data to a descriptive string for the agent
        const graphDescription = JSON.stringify(inputData.elements, null, 2);

        // Call the summary agent to generate a summary
        const response = await summaryAgent.generate(`Analyze this graph data and provide a summary:\n\n${graphDescription}`);

        return {
            elements: inputData.elements,
            summary: response.text
        };
    }
});

const fileContentReconStep = createStep({
    id: "file_system_recon_step",
    description: "Intelligently extract, exports, imports and description from file content",
    inputSchema: z.array(z.object({
        filePath: z.string().describe('File path'),
        content: z.string().describe('File content')
    })).describe('Array of file objects with path and content'),
    outputSchema: z.object({
        discoveryData: z.array(z.object({
            filePath: z.string().describe('File path'),
            exports: z.array(z.string()).describe('Array of exported symbols from the file'),
            imports: z.array(z.string()).describe('Array of import statements in the file')
        }))
    }),
    execute: async ({ inputData }) => {
        const completedFiles: any[] = [];

        // Process all files concurrently using Promise.all
        const processingPromises = inputData.map(async (file) => {
            const { filePath, content } = file;
            let analysis: any;

            try {
                const response = await fileContentAgent.generate(`Extract the necessary information from this file located at: ${filePath}\n\nFile content:\n\n${content}`);
                analysis = JSON.parse(response.text);

                // Sanitize JSON for PostgreSQL storage - fix invalid escape sequences
                if (analysis.imports && Array.isArray(analysis.imports)) {
                    analysis.imports = analysis.imports.map((imp: string) =>
                        imp.replace(/\\\\/g, '\\\\\\\\').replace(/\\-(?![bfnrtu0-9])/g, '\\\\-')
                    );
                }
                if (analysis.exports && Array.isArray(analysis.exports)) {
                    analysis.exports = analysis.exports.map((exp: string) =>
                        exp.replace(/\\\\/g, '\\\\\\\\').replace(/\\-(?![bfnrtu0-9])/g, '\\\\-')
                    );
                }

                return { filePath, analysis, success: true };
            } catch (error: any) {
                console.log(`Error processing file ${filePath}:`, error);
                return { filePath, content, analysis: null, success: false, error };
            }
        });

        // Wait for all files to be processed
        const results = await Promise.all(processingPromises);

        // Build the completed array from successful results
        results.forEach(result => {
            if (result.success && result.analysis) {
                completedFiles.push({
                    filePath: result.filePath,
                    ...result.analysis
                });
            }
        });

        return { discoveryData: completedFiles };
    }
})

export const discoveryWorkflow = createWorkflow({
    id: "project_discovery_workflow",
    inputSchema: z.object({
        basepath: z.string().describe('Base directory path to scan'),
        exclude: z.array(z.string()).optional().default([]).describe('Array of patterns to exclude (supports wildcards *)'),
    }),
    outputSchema: discoveryWorkflowOutputSchema
})
.then(listFilesStep)
.then(readFilesStep)
.then(fileContentReconStep)
.then(generateEdgesStep)
.then(compressEdgesStep)
.then(generateHighLevelGraphStep)
.then(generateSummaryStep)
.commit()