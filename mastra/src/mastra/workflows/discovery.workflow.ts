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
        let completedRecord : any = {};

        let keys = Object.keys(inputData);

        for(let i = 0; i < keys.length; i++){
            let key = keys[i]
            let content = inputData[key];

            let analysis : any;

            try {
                analysis = await fileContentAgent.generate(`Extract the necessary information from this file content:\n\n${content}`);
                analysis = JSON.parse(analysis.text);
            } catch (error : any) {
                console.log(error);
                continue;
            }

            completedRecord[key] = {
                content,
                ...analysis
            }
        }

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