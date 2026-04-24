import { createTool } from "@mastra/core/tools";
import { fileReconInputSchema, fileReconOutputSchema } from "../schemas/schema";
import { fileContentAgent } from "../agents/filecontent.agent";

export const fileReconTool = createTool({
    id: "file_recon_tool",
    inputSchema: fileReconInputSchema,
    outputSchema: fileReconOutputSchema,
    description: "Tool to perform file reconnaissance based on a given file path. It retrieves the file content, its imports, and its dependencies.",
    execute: async (inputData) => {
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