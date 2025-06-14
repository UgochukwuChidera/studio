
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart3, LineChart, Download, PlusCircle, Trash2 } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend } from "@/components/ui/chart"; // Removed ChartLegendContent
import { CartesianGrid, XAxis, YAxis, Line, ComposedChart as RechartsComposedChart, LegendProps } from "recharts";
import { useToast } from '@/hooks/use-toast';

interface DataPoint {
  x: number;
  y: number;
}

interface DataSet {
  id: string;
  fnInput: string;
  data: DataPoint[];
  color: string; 
  name: string;
}

const parseFunction = (fnString: string): ((x: number) => number) | null => {
  if (!fnString.trim()) return null;
  try {
    // Sanitize more carefully for security if this were server-side or evaluating untrusted input
    const sanitizedFn = fnString.replace(/[^-()\d/*+xX.^বাহিনীর\s]/g, '');
    // Basic replacements for common math functions and constants
    return new Function('x', `
      const sin = Math.sin;
      const cos = Math.cos;
      const tan = Math.tan;
      const log = Math.log10; // log base 10
      const ln = Math.log;   // natural log
      const sqrt = Math.sqrt;
      const pow = Math.pow;
      const PI = Math.PI;
      const e = Math.E;
      try { 
        let result = ${sanitizedFn
          .replace(/\^/g, '**') // Exponentiation
          .replace(/(\d)x/g, '$1*x') // Implicit multiplication 2x -> 2*x
          .replace(/x(\d)/g, 'x*$1') // Implicit multiplication x2 -> x*2
        };
        return result;
      } catch(e) { 
        console.error('Function eval error:', e);
        return NaN; 
      }
    `) as (x: number) => number;
  } catch (e) {
    console.error("Error parsing function string:", e);
    return null;
  }
};


const chartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--primary))", 
  "hsl(var(--accent))",
];

let clientSideIdCounter = 0;

export default function GraphingToolEmbed() {
  const [dataSets, setDataSets] = useState<DataSet[]>([
    // Initialize with one default function
    { id: `initial-fn-${Date.now()}`, fnInput: 'x^2', data: [], color: chartColors[0], name: 'Function 1' }
  ]);
  const [xMin, setXMin] = useState(-10);
  const [xMax, setXMax] = useState(10);
  const [step, setStep] = useState(0.1);
  const { toast } = useToast();

  const handleAddDataSet = () => {
    if (dataSets.length >= chartColors.length) {
      toast({ title: "Limit Reached", description: "Maximum number of functions/datasets reached.", variant: "destructive" });
      return;
    }
    setDataSets([
      ...dataSets,
      {
        id: `client-fn-${clientSideIdCounter++}-${Date.now()}`, 
        fnInput: '',
        data: [],
        color: chartColors[dataSets.length % chartColors.length],
        name: `Function ${dataSets.length + 1}`
      }
    ]);
  };

  const handleRemoveDataSet = (id: string) => {
    setDataSets(dataSets.filter(ds => ds.id !== id));
  };

  const handleFnInputChange = (id: string, value: string) => {
    setDataSets(dataSets.map(ds => ds.id === id ? { ...ds, fnInput: value } : ds));
  };
  
  const handleNameChange = (id: string, value: string) => {
    setDataSets(dataSets.map(ds => ds.id === id ? { ...ds, name: value } : ds));
  };

  const generateData = useCallback(() => {
    const updatedDataSets = dataSets.map(dataSet => {
      const func = parseFunction(dataSet.fnInput);
      if (!func) {
        if(dataSet.fnInput.trim() !== "") { // Only toast if input was attempted
            toast({ title: "Invalid Function", description: `Could not parse: "${dataSet.fnInput}" for ${dataSet.name}. Please check syntax.`, variant: "destructive" });
        }
        return { ...dataSet, data: [] };
      }
      const newData: DataPoint[] = [];
      for (let xVal = xMin; xVal <= xMax; xVal += step) {
        // Ensure xVal is not excessively small to avoid too many points with small steps
        const x = parseFloat(xVal.toPrecision(10)); // Control precision of x
        const y = func(x);
        if (!isNaN(y) && isFinite(y)) {
          newData.push({ x: x, y: parseFloat(y.toPrecision(10)) }); // Control precision of y
        }
      }
      return { ...dataSet, data: newData };
    });
    setDataSets(updatedDataSets);
    if (updatedDataSets.some(ds => ds.data.length > 0)) {
       toast({ title: "Graph Updated", description: "Data generated and graph updated." });
    } else if (updatedDataSets.every(ds => ds.fnInput.trim() === "" || !parseFunction(ds.fnInput))) {
        // No data and no valid functions attempted
    } else {
        toast({ title: "No Data to Plot", description: "No valid functions yielded data points in the given range or functions are empty.", variant: "default" });
    }
  }, [dataSets, xMin, xMax, step, toast]);

  useEffect(() => {
    generateData(); // Generate initial data for the default x^2 function
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount


  const chartConfig = useMemo(() => {
    const config: any = {};
    dataSets.forEach(ds => {
      config[ds.id] = { label: ds.name, color: ds.color };
    });
    return config;
  }, [dataSets]);
  
  const combinedData = useMemo(() => {
    const allXValues = new Set<number>();
    dataSets.forEach(ds => ds.data.forEach(p => allXValues.add(p.x)));
    
    const sortedXValues = Array.from(allXValues).sort((a, b) => a - b);
    
    return sortedXValues.map(x => {
      const point: any = { x }; // Ensure x is the primary key for the XAxis
      dataSets.forEach(ds => {
        const yVal = ds.data.find(p => Math.abs(p.x - x) < (step / 2))?.y; // Match x with tolerance
        point[ds.id] = yVal; 
      });
      return point;
    });
  }, [dataSets, step]);


  // Custom Legend for Recharts
    const CustomLegend = (props: LegendProps) => {
        const { payload } = props;
        if (!payload || payload.length === 0) return null;

        return (
            <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 mt-3">
                {payload.map((entry, index) => {
                    const dataKey = entry.dataKey as string;
                    const correspondingDataSet = dataSets.find(ds => ds.id === dataKey);
                    const label = correspondingDataSet ? correspondingDataSet.name : entry.value;
                    
                    return (
                        <div key={`item-${index}`} className="flex items-center space-x-1.5 text-xs cursor-pointer">
                            <span style={{ backgroundColor: entry.color, width: '10px', height: '10px', borderRadius: '50%', display: 'inline-block' }}></span>
                            <span>{label}</span>
                        </div>
                    );
                })}
            </div>
        );
    };


  return (
    <Card className="shadow-xl w-full max-w-3xl mx-auto my-4">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center text-primary flex items-center justify-center gap-2">
          <BarChart3 className="w-8 h-8" /> Graphing Tool
        </CardTitle>
        <CardDescription className="text-center">
          Visualize functions. E.g., <code>x^2</code>, <code>sin(PI*x/180)</code>, <code>log(x)</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {dataSets.map((ds, index) => (
            <Card key={ds.id} className="p-3 space-y-2 bg-muted/50">
                <div className="flex justify-between items-center">
                <Label htmlFor={`fnName-${ds.id}`} className="text-sm font-medium" style={{color: ds.color}}>
                    {ds.name || `Function ${index + 1}`}
                </Label>
                {dataSets.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveDataSet(ds.id)} aria-label="Remove function" className="h-7 w-7">
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                )}
                </div>
                <Input
                id={`fnName-${ds.id}`}
                value={ds.name}
                onChange={(e) => handleNameChange(ds.id, e.target.value)}
                placeholder="Function Name"
                className="text-xs h-8"
                />
                <Input
                id={`fnInput-${ds.id}`}
                value={ds.fnInput}
                onChange={(e) => handleFnInputChange(ds.id, e.target.value)}
                placeholder="e.g., x^3 - 2*x + 5"
                className="text-sm h-9"
                />
            </Card>
            ))}
        </div>
        <Button onClick={handleAddDataSet} variant="outline" size="sm" className="w-full">
            <PlusCircle className="w-4 h-4 mr-2" /> Add Function
        </Button>

        <Card className="p-3 bg-muted/50">
          <h3 className="text-sm font-medium mb-1.5 text-foreground">Graph Settings</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="xMin" className="text-xs">X Min</Label>
              <Input id="xMin" type="number" value={xMin} onChange={(e) => setXMin(parseFloat(e.target.value))} className="h-9 text-sm mt-0.5" />
            </div>
            <div>
              <Label htmlFor="xMax" className="text-xs">X Max</Label>
              <Input id="xMax" type="number" value={xMax} onChange={(e) => setXMax(parseFloat(e.target.value))} className="h-9 text-sm mt-0.5"/>
            </div>
            <div>
              <Label htmlFor="step" className="text-xs">Step</Label>
              <Input id="step" type="number" value={step} onChange={(e) => setStep(parseFloat(e.target.value))} step="0.01" className="h-9 text-sm mt-0.5"/>
            </div>
          </div>
        </Card>

        <Button onClick={generateData} className="w-full text-md py-2.5">
          <LineChart className="w-5 h-5 mr-2" /> Plot Graph
        </Button>

        {dataSets.some(ds => ds.data.length > 0) && (
          <ChartContainer config={chartConfig} className="aspect-video h-[400px] w-full mt-4">
            <RechartsComposedChart data={combinedData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))"/>
              <XAxis dataKey="x" type="number" domain={['dataMin', 'dataMax']} allowDuplicatedCategory={false} tick={{fontSize: 10}} axisLine={{stroke: "hsl(var(--foreground))"}} tickLine={{stroke: "hsl(var(--foreground))"}} />
              <YAxis type="number" domain={['auto', 'auto']} tick={{fontSize: 10}} axisLine={{stroke: "hsl(var(--foreground))"}} tickLine={{stroke: "hsl(var(--foreground))"}}/>
              <ChartTooltip content={<ChartTooltipContent />} />
              {dataSets.map(ds => (
                 ds.data.length > 0 && (
                  <Line
                    key={ds.id}
                    dataKey={ds.id} // This should match the key used in combinedData
                    type="monotone"
                    stroke={ds.color}
                    strokeWidth={2.5}
                    dot={false}
                    name={ds.name} // Used by default Recharts legend if ChartLegend is not used or for tooltip
                    connectNulls={true} // Optional: to connect lines across NaN values
                  />
                 )
              ))}
              <ChartLegend content={<CustomLegend />} />
            </RechartsComposedChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

