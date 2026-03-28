import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { listFiles, readFiles } from "../tools/filesystem.tool";
import { fileContentAgent } from "../agents/filecontent.agent";

const listFilesStep = createStep(listFiles);
const readFilesStep = createStep(readFiles);

const fileContentReconStep = createStep({
    id : "file_system_recon_step",
    description : "Intelligently extract, exports, imports and description from file content",
    inputSchema: z.record(z.string(), z.string()).describe('Object mapping file paths to their contents'),
    outputSchema: z.record(z.string(), z.object({
        exports : z.array(z.string()),
        imports : z.array(z.string()),
        content : z.string(),
        description : z.string()
    })),
    execute : async ({inputData}) =>{
        console.log(inputData);
        let completedRecord : any = {};

        const keys = Object.keys(inputData);
        
        // Process all files concurrently using Promise.all
        const processingPromises = keys.map(async (key) => {
            const content = inputData[key];
            let analysis : any;

            try {
                const response = await fileContentAgent.generate(`Extract the necessary information from this file located at: ${key}\n\nFile content:\n\n${content}`);
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
                if (analysis.description && typeof analysis.description === 'string') {
                    analysis.description = analysis.description.replace(/\\\\/g, '\\\\\\\\').replace(/\\-(?![bfnrtu0-9])/g, '\\\\-');
                }

                return { key, content, analysis, success: true };
            } catch (error : any) {
                console.log(`Error processing file ${key}:`, error);
                return { key, content, analysis: null, success: false, error };
            }
        });

        // Wait for all files to be processed
        const results = await Promise.all(processingPromises);

        // Build the completed record from successful results
        results.forEach(result => {
            if (result.success && result.analysis) {
                completedRecord[result.key] = {
                    content: result.content,
                    ...result.analysis
                };
            }
        });

        return completedRecord;
    }
})

export const discoveryWorkflow = createWorkflow({
    id : "project_discovery_workflow",
    inputSchema : z.object({
        basepath: z.string().describe('Base directory path to scan'),
        exclude: z.array(z.string()).optional().default([]).describe('Array of patterns to exclude (supports wildcards *)'),
    }),
    outputSchema : z.record(z.string(), z.object({
        exports : z.array(z.string()),
        imports : z.array(z.string()),
        content : z.string(),
        description : z.string()
    }))
})
.then(listFilesStep)
.then(readFilesStep)
.then(fileContentReconStep)