import fs from 'fs';
import path from 'path';

const transcriptPath = "C:\\Users\\ACER\\.gemini\\antigravity-ide\\brain\\877c4ed4-4a7c-44b1-bf89-2aa77fe9bde1\\.system_generated\\logs\\transcript.jsonl";
const targetPath = "e:\\Working\\Viettel\\Frontend\\src\\app\\App.tsx";

// Read original file
let content = fs.readFileSync(targetPath, 'utf8');

const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n').filter(Boolean);

for (const line of lines) {
    try {
        const entry = JSON.parse(line);
        if (entry.type !== "PLANNER_RESPONSE" && entry.type !== "MODEL_RESPONSE") continue;
        
        if (entry.tool_calls) {
            for (const call of entry.tool_calls) {
                if (call.name === "default_api:replace_file_content" || call.name === "default_api:multi_replace_file_content" || call.name === "default_api:write_to_file") {
                    
                    const args = call.arguments;
                    if (args && args.TargetFile && args.TargetFile.endsWith("App.tsx")) {
                        
                        if (call.name === "default_api:write_to_file") {
                            content = args.CodeContent;
                        } else if (call.name === "default_api:replace_file_content") {
                            // Single replace
                            content = content.replace(args.TargetContent, args.ReplacementContent);
                        } else if (call.name === "default_api:multi_replace_file_content") {
                            // Multi replace
                            if (args.ReplacementChunks) {
                                for (const chunk of args.ReplacementChunks) {
                                    content = content.replace(chunk.TargetContent, chunk.ReplacementContent);
                                }
                            }
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.error("Error parsing line", e);
    }
}

fs.writeFileSync("e:\\Working\\Viettel\\Frontend\\src\\app\\App_recovered.tsx", content);
console.log("Recovery complete. Length:", content.length);
