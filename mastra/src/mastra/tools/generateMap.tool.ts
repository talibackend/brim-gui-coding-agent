import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// Define the input schema as an object with a single property containing the discovery data
const generateMapInputSchema = z.object({
  discoveryData: z.record(
    z.string(),
    z.object({
      exports: z.array(z.string()),
      imports: z.array(z.string()),
      content: z.string(),
      description: z.string()
    })
  ).describe('Discovery workflow output data')
});

// Define Cytoscape element schemas
const cytoscapeNodeSchema = z.object({
  data: z.object({
    id: z.string(),
    label: z.string(),
    type: z.enum(['file', 'export', 'import']).optional(),
    description: z.string().optional(),
    filePath: z.string().optional(),
    exports: z.array(z.string()).optional(),
    imports: z.array(z.string()).optional(),
    size: z.number().optional()
  })
});

const cytoscapeEdgeSchema = z.object({
  data: z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    type: z.enum(['imports', 'exports', 'contains']).optional(),
    label: z.string().optional(),
    importedProperty: z.string().optional().nullable()
  })
});

const cytoscapeGraphSchema = z.object({
  elements: z.object({
    nodes: z.array(cytoscapeNodeSchema),
    edges: z.array(cytoscapeEdgeSchema)
  })
});

export const generateMapTool = createTool({
  id: 'generate-map',
  description: 'Transform discovery workflow output into Cytoscape-compatible graph data',
  inputSchema: generateMapInputSchema,
  outputSchema: cytoscapeGraphSchema,
  execute: async (inputData) => {
    const nodes: Array<{ data: any }> = [];
    const edges: Array<{ data: any }> = [];
    const nodeIds = new Set<string>();
    const edgeIds = new Set<string>();

    const discoveryData = inputData.discoveryData;

    // Calculate file depths and find min/max depth
    const fileDepths = new Map<string, number>();
    let minDepth = Infinity;
    let maxDepth = 0;

    Object.keys(discoveryData).forEach((filePath) => {
      // Count path segments to determine depth
      const depth = filePath.split('/').length;
      fileDepths.set(filePath, depth);
      minDepth = Math.min(minDepth, depth);
      maxDepth = Math.max(maxDepth, depth);
    });

    // Function to calculate size based on depth (250 for shallowest, 100 for deepest)
    const calculateSize = (depth: number): number => {
      if (maxDepth === minDepth) return 175; // All files at same depth
      
      // Linear interpolation: size = 250 - ((depth - minDepth) / (maxDepth - minDepth)) * 150
      // Minimum size 100, maximum size 250, increment steps of ~20
      const normalizedDepth = (depth - minDepth) / (maxDepth - minDepth);
      return Math.round(250 - (normalizedDepth * 150));
    };

    // First, create nodes for all files
    Object.entries(discoveryData).forEach(([filePath, fileData]) => {
      if (!nodeIds.has(filePath)) {
        const depth = fileDepths.get(filePath) || minDepth;
        const size = calculateSize(depth);
        
        nodes.push({
          data: {
            id: filePath,
            label: filePath.split('/').pop() || filePath,
            type: 'file',
            description: fileData.description,
            filePath: filePath,
            exports: fileData.exports,
            imports: fileData.imports,
            size: size
          }
        });
        nodeIds.add(filePath);
      }
    });

    // Create edges based on imports between files
    Object.entries(discoveryData).forEach(([sourceFilePath, sourceFileData]) => {
      sourceFileData.imports.forEach((importString: string) => {
        // Parse import in format "/absolute/path/to/file.importedProperty"
        const lastDotIndex = importString.lastIndexOf('.');
        let importedFilePath = importString;
        let importedProperty = '';
        
        if (lastDotIndex !== -1) {
          importedFilePath = importString.substring(0, lastDotIndex);
          importedProperty = importString.substring(lastDotIndex + 1);
        }
        
        // Find the target file that matches this absolute path
        const targetFilePath = Object.keys(discoveryData).find(key => 
          key === importedFilePath || importedFilePath.includes(key) || key.includes(importedFilePath)
        );

        if (targetFilePath && targetFilePath !== sourceFilePath) {
          // If there's an imported property, check if the target file exports it
          if (importedProperty) {
            const targetFileData = discoveryData[targetFilePath];
            if (!targetFileData.exports.includes(importedProperty)) {
              return; // Skip if property not exported
            }
          }
          
          const edgeId = `${sourceFilePath}_imports_${importString}`;
          
          if (!edgeIds.has(edgeId)) {
            edges.push({
              data: {
                id: edgeId,
                source: sourceFilePath,
                target: targetFilePath,
                type: 'imports',
                label: 'imports',
                importedProperty: importedProperty || null
              }
            });
            edgeIds.add(edgeId);
          }
        }
      });
    });

    return {
      elements: {
        nodes,
        edges
      }
    };
  }
});