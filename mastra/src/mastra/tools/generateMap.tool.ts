import { createTool } from '@mastra/core/tools';
import { generateMapInputSchema, cytoscapeEdgeSchema, cytoscapeGraphSchema, cytoscapeNodeSchema } from '../schemas/schema'

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

      // Group imports by source file to consolidate multiple imports into single edges
      const importGroups: Record<string, string[]> = {};
      
      for(let j = 0; j < currentFile.imports.length; j++) {
        const importTarget = currentFile.imports[j];
        const importSplitted = importTarget.split('.');
        const importedProperty = importSplitted[importSplitted.length - 1];
        importSplitted.pop();
        const importFilePath = importSplitted.join('.');

        const foundFilePath = checkIfFileExists(filePaths, importFilePath);
        if(foundFilePath && importFilePath){
          if (!importGroups[foundFilePath]) {
            importGroups[foundFilePath] = [];
          }
          importGroups[foundFilePath].push(importedProperty);
        }
      }

      // Create consolidated edges for each source file
      for (const [sourceFilePath, importedProperties] of Object.entries(importGroups)) {
        const edgeId = `${filePath}-imports-${sourceFilePath}`;
        
        // Create aggregated label: first property + count of remaining
        let edgeLabel = '';
        let importedProperty = '';
        
        if (importedProperties.length === 1) {
          edgeLabel = importedProperties[0];
          importedProperty = importedProperties[0];
        } else {
          const firstProperty = importedProperties[0];
          const remainingCount = importedProperties.length - 1;
          edgeLabel = `${firstProperty} and ${remainingCount} others`;
          importedProperty = importedProperties.join(', ');
        }

        const _data = {
          id: edgeId,
          label: edgeLabel,
          source: filePath,
          target: sourceFilePath,
          type: 'imports',
          importedProperty: importedProperty,
          importCount: importedProperties.length,
          allImports: importedProperties
        }
        edges.push({ data: _data });
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