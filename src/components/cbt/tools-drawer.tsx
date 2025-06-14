
"use client";

import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Wrench, Calculator, Code2, Edit3, BarChart3, XIcon } from 'lucide-react'; // Using XIcon for close

// Import the embeddable tool components
import CalculatorEmbed from '@/components/tools/calculator-embed';
import SandboxEmbed from '@/components/tools/sandbox-embed';
import WhiteboardEmbed from '@/components/tools/whiteboard-embed';
import GraphingToolEmbed from '@/components/tools/graphing-tool-embed';
import { ScrollArea } from '../ui/scroll-area';

export function ToolsDrawer() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Wrench className="w-4 h-4" />
          Tools
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full max-w-xl md:max-w-2xl lg:max-w-3xl p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <div className="flex justify-between items-center">
            <SheetTitle className="text-xl font-semibold flex items-center gap-2">
              <Wrench className="w-5 h-5 text-primary" />
              Study Tools
            </SheetTitle>
            <SheetClose asChild>
              <Button variant="ghost" size="icon">
                <XIcon className="w-5 h-5" />
                <span className="sr-only">Close</span>
              </Button>
            </SheetClose>
          </div>
          <SheetDescription className="text-sm">
            Access calculator, code sandbox, whiteboard, and graphing tool.
          </SheetDescription>
        </SheetHeader>
        
        <Tabs defaultValue="calculator" className="flex-1 flex flex-col overflow-hidden p-1">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-1 mx-auto max-w-md sticky top-0 bg-background z-10 p-1 rounded-lg border">
            <TabsTrigger value="calculator" className="gap-1.5 text-xs sm:text-sm py-1.5 sm:py-2"><Calculator size={16}/>Calculator</TabsTrigger>
            <TabsTrigger value="sandbox" className="gap-1.5 text-xs sm:text-sm py-1.5 sm:py-2"><Code2 size={16}/>Sandbox</TabsTrigger>
            <TabsTrigger value="whiteboard" className="gap-1.5 text-xs sm:text-sm py-1.5 sm:py-2"><Edit3 size={16}/>Whiteboard</TabsTrigger>
            <TabsTrigger value="graphing" className="gap-1.5 text-xs sm:text-sm py-1.5 sm:py-2"><BarChart3 size={16}/>Graphing</TabsTrigger>
          </TabsList>
          
          <ScrollArea className="flex-1 p-1">
            <TabsContent value="calculator" className="mt-0">
              <CalculatorEmbed />
            </TabsContent>
            <TabsContent value="sandbox" className="mt-0">
              <SandboxEmbed />
            </TabsContent>
            <TabsContent value="whiteboard" className="mt-0">
              <WhiteboardEmbed />
            </TabsContent>
            <TabsContent value="graphing" className="mt-0">
              <GraphingToolEmbed />
            </TabsContent>
          </ScrollArea>
        </Tabs>
        
        <SheetFooter className="p-4 border-t mt-auto">
            <SheetClose asChild>
                <Button variant="outline" className="w-full sm:w-auto">Close Tools</Button>
            </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
