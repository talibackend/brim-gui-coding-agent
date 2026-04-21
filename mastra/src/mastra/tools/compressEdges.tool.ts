import { cytoscapeGraphSchema } from "../schemas/schema";
import { createTool } from "@mastra/core/tools";
import { compressEdgesOutputSchema } from "../schemas/schema";

export const compressEdgesTool = createTool({
    id: "compress-edges",
    description : "Compress the edges list by removing unncessary properties from the object.",
    inputSchema : cytoscapeGraphSchema.describe("Cytoscape compatible graph data structure"),
    outputSchema : compressEdgesOutputSchema.describe("Compressed edges data structure"),
    execute : async (inputData)=>{
        const compressedEdges = inputData.elements.edges.map(edge => {
            const { source, target, importedProperty } = edge.data;
            return {
                source,
                target,
                importedProperties: importedProperty ? [importedProperty] : []
            }
        });

        return { edges : compressedEdges };
    }
})