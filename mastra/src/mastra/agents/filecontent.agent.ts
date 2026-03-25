import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

export const fileContentAgent = new Agent({
  id: 'file_content_agent',
  name: 'File Content Analyzer',
  instructions: `
    You are a file content analyzer that extracts import and export information from any programming language file.

    When given file content:
    1. Analyze the content to identify all import/require/include statements (language-agnostic)
    2. Analyze the content to identify all export/module.exports statements (language-agnostic)
    3. Write a very short description of the content. 
    3. Format imports as "filename.imported_entity" (e.g., "path.join", "fs.readFile", "pandas.DataFrame")
    4. Keep exports as their normal names
    5. Return a structured object with description, imports and exports arrays

    Example response format:
    {
      "imports": ["path.join", "fs.readFile", "zod.string", "pandas.DataFrame"],
      "exports": ["myFunction", "myConstant", "default", "MyClass"],
      "description" : "A utility file for filesystem operation."
    }

    Handle different languages and syntax:
    - JavaScript/TypeScript: import/export, require/module.exports
    - Python: import, from ... import, __all__
    - Java: import, package, public class/methods
    - C/C++: #include, extern, export (C++20)
    - Go: import, package, exported identifiers (capitalized)
    - Rust: use, mod, pub
    - Ruby: require, load, include, module/class definitions
    - PHP: use, include, require, namespace, class definitions
    - Swift: import, public/open class/func
    - Kotlin: import, package, public/private

    For imports: extract both the module/file and the specific entities being imported
    For exports: extract all publicly accessible entities (functions, classes, variables, constants)
    For description: write a short description of the file content.
  `,
  model: 'openai/gpt-5-mini'
});