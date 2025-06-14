
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Play, Code2, Terminal, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Language = "javascript" | "python" | "java" | "cpp";

export default function SandboxEmbed() {
  const [language, setLanguage] = useState<Language>("javascript");
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const placeholderCode = (lang: Language): string => {
    switch (lang) {
      case "javascript":
        return "console.log('Hello from JavaScript!');";
      case "python":
        return "print('Hello from Python!')";
      case "java":
        return "public class Main {\n  public static void main(String[] args) {\n    System.out.println(\"Hello from Java!\");\n  }\n}";
      case "cpp":
        return "#include <iostream>\n\nint main() {\n  std::cout << \"Hello from C++!\" << std::endl;\n  return 0;\n}";
      default:
        return "";
    }
  };

  useEffect(() => {
    setCode(placeholderCode(language));
    setOutput("");
    setError(null);
  }, [language]);

  const handleExecuteCode = async () => {
    setIsLoading(true);
    setOutput("");
    setError(null);

    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate execution time

    if (language === "javascript" && code.includes("console.log")) {
      try {
        let capturedOutput = "";
        const originalLog = console.log;
        console.log = (...args) => {
          capturedOutput += args.map(String).join(" ") + "\n";
        };
        new Function(code)(); 
        console.log = originalLog;
        setOutput(capturedOutput.trim() || "Execution finished with no output.");
      } catch (e: any) {
        setError(`JavaScript Error: ${e.message}`);
        setOutput("");
      }
    } else {
      // Placeholder for other languages
      setOutput(`Execution for ${language} is not fully implemented in this demo.\nYour Code:\n${code}\n\nThis sandbox simulates JavaScript execution in the browser. True multi-language support requires a secure backend execution environment.`);
    }
    setIsLoading(false);
  };

  return (
    <Card className="shadow-xl w-full max-w-2xl mx-auto my-4">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center text-primary flex items-center justify-center gap-2">
          <Code2 className="w-8 h-8" /> Code Execution Sandbox
        </CardTitle>
        <CardDescription className="text-center">
          Test code snippets. JavaScript runs client-side; other languages are simulated.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="language-select" className="text-base font-medium">Select Language</Label>
          <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
            <SelectTrigger id="language-select" className="w-full md:w-[200px] mt-1">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="javascript">JavaScript</SelectItem>
              <SelectItem value="python">Python</SelectItem>
              <SelectItem value="java">Java</SelectItem>
              <SelectItem value="cpp">C++</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="code-editor" className="text-base font-medium">Code Editor</Label>
          <Textarea
            id="code-editor"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={`Enter your ${language} code here...`}
            className="min-h-[250px] font-mono text-sm bg-muted/50 border-input focus:border-primary"
            spellCheck="false"
          />
        </div>

        <Button onClick={handleExecuteCode} disabled={isLoading} className="w-full text-md py-2.5">
          {isLoading ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Play className="w-5 h-5 mr-2" />
          )}
          Execute Code
        </Button>

        {error && (
          <Alert variant="destructive">
            <Terminal className="w-4 h-4" />
            <AlertTitle>Execution Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {output && !error && (
          <div>
            <Label htmlFor="output-display" className="text-base font-medium">Output</Label>
            <Textarea
              id="output-display"
              value={output}
              readOnly
              className="min-h-[120px] font-mono text-sm bg-muted border-input"
            />
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Alert variant="default" className="w-full">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Note on Security & Execution</AlertTitle>
          <AlertDescription>
            JavaScript execution is client-side. Other languages show placeholder output.
            Real-world multi-language sandboxes require secure, isolated server-side execution.
          </AlertDescription>
        </Alert>
      </CardFooter>
    </Card>
  );
}
