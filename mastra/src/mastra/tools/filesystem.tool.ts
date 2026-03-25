import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const readFileAsync = promisify(fs.readFile);

export const listFiles = createTool({
  id: 'list-files',
  description: 'Recursively list all files in a directory, optionally excluding patterns',
  inputSchema: z.object({
    basepath: z.string().describe('Base directory path to scan'),
    exclude: z.array(z.string()).optional().default([]).describe('Array of patterns to exclude (supports wildcards *)'),
  }),
  outputSchema: z.array(z.string()).describe('Array of relative file paths'),
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
    
    function readDirRecursive(currentPath: string): void {
      const items = fs.readdirSync(currentPath, { withFileTypes: true });
      for (const item of items) {
        const itemRelativePath = `${item.parentPath}/${item.name}`;

        console.log(itemRelativePath);

        if (shouldExclude(itemRelativePath)) {
          continue;
        }
        
        if (item.isDirectory()) {
          readDirRecursive(itemRelativePath);
        } else {
          result.push(itemRelativePath);
        }
      }
    }
    
    readDirRecursive(basepath);
    return result;
  },
});

export const readFiles = createTool({
  id: 'read-files',
  description: 'Read multiple files concurrently and return their contents',
  inputSchema: z.array(z.string()).describe('Array of file paths to read'),
  outputSchema: z.record(z.string(), z.string()).describe('Object mapping file paths to their contents'),
  execute: async (inputData) => {
    const readPromises = inputData.map(async (filepath) => {
      const fullPath = filepath;
      try {
        const content = await readFileAsync(fullPath, 'utf-8');
        return { filepath, content };
      } catch (error) {
        return { filepath, content: `Error reading file: ${error}` };
      }
    });
    
    const results = await Promise.all(readPromises);
    
    const contents: Record<string, string> = {};
    results.forEach(({ filepath, content }) => {
      contents[filepath] = content;
    });
    
    return contents;
  },
});