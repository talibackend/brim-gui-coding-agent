import { createTool } from '@mastra/core/tools';
import { file, z } from 'zod';

// Define the input schema as an object with a single property containing the discovery data
const generateMapInputSchema = z.object({
  discoveryData: z.array(z.object({
    filePath: z.string().describe('File path'),
    exports: z.array(z.string()).describe('Array of exported symbols from the file'),
    imports: z.array(z.string()).describe('Array of import statements in the file'),
    content: z.string().describe('Full content of the file'),
    description: z.string().describe('Description of the file\'s purpose and functionality')
  })).describe('Array of file analysis results from discovery workflow')
});

// Define Cytoscape element schemas
const cytoscapeNodeSchema = z.object({
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

const cytoscapeEdgeSchema = z.object({
  data: z.object({
    id: z.string().describe('Unique identifier for the edge'),
    source: z.string().describe('ID of the source node'),
    target: z.string().describe('ID of the target node'),
    type: z.enum(['imports', 'exports', 'contains']).optional().describe('Type of relationship between nodes'),
    label: z.string().optional().describe('Display label for the edge'),
    importedProperty: z.string().optional().nullable().describe('Specific property being imported (if applicable)')
  })
});

const cytoscapeGraphSchema = z.object({
  elements: z.object({
    nodes: z.array(cytoscapeNodeSchema).describe('Array of nodes in the graph'),
    edges: z.array(cytoscapeEdgeSchema).describe('Array of edges connecting nodes in the graph')
  }).describe('Graph elements including nodes and edges')
});

export const generateMapTool = createTool({
  id: 'generate-map',
  description: 'Transform discovery workflow output into Cytoscape-compatible graph data',
  inputSchema: generateMapInputSchema,
  outputSchema: cytoscapeGraphSchema.describe('Cytoscape-compatible graph data structure'),
  execute: async (inputData) => {

    const checkIfFileExists = (filePaths : Array<string>, filePath : string) : string =>{
        for(let i = 0; i < filePaths.length; i++){
            if(filePaths[i].startsWith(filePath)){
                return filePaths[i];
            }
        }

        return '';
    }

    // Helper function to calculate file depth
    const calculateFileDepth = (filePath: string): number => {
      // Count the number of path separators (both / and \)
      const separators = filePath.split(/[\/\\]/).filter(part => part.trim() !== '');
      return separators.length;
    }

    // Helper function to get just the filename from path
    const getFileName = (filePath: string): string => {
      const parts = filePath.split(/[\/\\]/);
      return parts[parts.length - 1] || filePath;
    }

    // Helper function to calculate node size based on depth
    const calculateNodeSize = (depth: number, maxDepth: number): number => {
      // Base size for root files (depth = 1)
      const baseSize = 300;
      // Minimum size (for deepest files)
      const minSize = 100;
      
      if (maxDepth <= 1) return baseSize;
      
      // Calculate size reduction per depth level
      const sizeReductionPerLevel = (baseSize - minSize) / (maxDepth - 1);
      
      // Size decreases as depth increases
      const size = Math.max(minSize, baseSize - (sizeReductionPerLevel * (depth - 1)));
      
      return Math.round(size);
    }
    
    const nodes: Array<{ data: any }> = [];
    const edges: Array<{ data: any }> = [];

    const files = inputData.discoveryData;
    const filePaths = files.map(file => file.filePath);

    // First pass: calculate max depth
    let maxDepth = 1;
    for(let i = 0; i < files.length; i++) {
      const depth = calculateFileDepth(files[i].filePath);
      if (depth > maxDepth) {
        maxDepth = depth;
      }
    }

    // Second pass: create nodes with size based on depth
    for(let i = 0; i < files.length; i++) {
      const currentFile = files[i];
      const filePath = currentFile.filePath;
      const depth = calculateFileDepth(filePath);
      const fileName = getFileName(filePath);
      
      const data = {
        id: filePath,
        label: fileName, // Just the filename, not full path
        description: currentFile.description,
        filePath: filePath,
        exports: currentFile.exports,
        imports: currentFile.imports,
        size: calculateNodeSize(depth, maxDepth),
      }

      nodes.push({ data });

      for(let j = 0; j < currentFile.imports.length; j++) {
        const importTarget = currentFile.imports[j];

        const importSplitted = importTarget.split('.');

        const edgeLabel = importSplitted[importSplitted.length - 1];
        importSplitted.pop();
        const importFilePath = importSplitted.join('.');

        const foundFilePath = checkIfFileExists(filePaths, importFilePath);
        if(foundFilePath && importFilePath){
          const _data = {
            id : `${filePath}-imports-${importFilePath}`,
            label : edgeLabel,
            source : filePath,
            target : foundFilePath,
            type : 'imports',
            importedProperty: edgeLabel
          }
          edges.push({ data: _data });
        }
      }
    }

    return {
      elements: {
        nodes,
        edges
      }
    }
  }
});