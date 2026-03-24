import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';

export const filesystemTool = createTool({
  id: 'list-files',
  description: 'Recursively list all files in a directory, optionally excluding patterns',
  inputSchema: z.object({
    basepath: z.string().describe('Base directory path to scan'),
    exclude: z.array(z.string()).optional().default([]).describe('Array of patterns to exclude (supports wildcards *)'),
  }),
  outputSchema: z.object({
    files: z.array(z.string()).describe('Array of relative file paths'),
  }),
  execute: async (inputData) => {
    const { basepath, exclude = [] } = inputData;
    
    function shouldExclude(itemPath: string): boolean {
      return exclude.some(pattern => {
        if (pattern.includes('*')) {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'));
          return regex.test(itemPath);
        }
        return itemPath.includes(pattern);
      });
    }
    
    const result: string[] = [];
    
    function readDirRecursive(currentPath: string, relativePath: string = ''): void {
      const items = fs.readdirSync(currentPath, { withFileTypes: true });
      
      for (const item of items) {
        const itemPath = path.join(currentPath, item.name);
        const itemRelativePath = relativePath ? path.join(relativePath, item.name) : item.name;
        
        if (shouldExclude(itemRelativePath)) {
          continue;
        }
        
        if (item.isDirectory()) {
          readDirRecursive(itemPath, itemRelativePath);
        } else {
          result.push(itemRelativePath);
        }
      }
    }
    
    readDirRecursive(basepath);
    return { files: result };
  },
});