import z from "zod";


// Define the input schema as an object with a single property containing the discovery data
export const generateMapInputSchema = z.object({
  discoveryData: z.array(z.object({
    filePath: z.string().describe('File path'),
    exports: z.array(z.string()).describe('Array of exported symbols from the file'),
    imports: z.array(z.string()).describe('Array of import statements in the file'),
    content: z.string().describe('Full content of the file'),
    description: z.string().describe('Description of the file\'s purpose and functionality')
  })).describe('Array of file analysis results from discovery workflow')
});

// Define Cytoscape element schemas
export const cytoscapeNodeSchema = z.object({
  data: z.object({
    id: z.string().describe('Unique identifier for the node'),
    label: z.string().describe('Display label for the node'),
    description: z.string().optional().describe('Description of the node\'s purpose'),
    filePath: z.string().optional().describe('Full file path for file nodes'),
    exports: z.array(z.string()).optional().describe('Array of exported symbols for file nodes'),
    imports: z.array(z.string()).optional().describe('Array of import statements for file nodes'),
    size: z.number().optional().describe('Visual size of the node in the graph visualization')
  })
});

export const cytoscapeEdgeSchema = z.object({
  data: z.object({
    id: z.string().describe('Unique identifier for the edge'),
    source: z.string().describe('ID of the source node'),
    target: z.string().describe('ID of the target node'),
    type: z.enum(['imports', 'exports', 'contains']).optional().describe('Type of relationship between nodes'),
    label: z.string().optional().describe('Display label for the edge'),
    importedProperty: z.string().optional().nullable().describe('Specific property being imported (if applicable)'),
    importCount: z.number().optional().describe('Number of imports consolidated in this edge'),
    allImports: z.array(z.string()).optional().describe('Array of all imported properties for this edge')
  })
});

export const cytoscapeGraphSchema = z.object({
  elements: z.object({
    nodes: z.array(cytoscapeNodeSchema).describe('Array of nodes in the graph'),
    edges: z.array(cytoscapeEdgeSchema).describe('Array of edges connecting nodes in the graph')
  }).describe('Graph elements including nodes and edges')
});

export const compressEdgesOutputSchema = z.object({
    edges : z.array(z.object({
        source : z.string().describe('ID of the source node'),
        target : z.string().describe('ID of the target node'),
        importedProperties : z.array(z.string()).describe('Array of imported properties for this edge'),
    }))
})