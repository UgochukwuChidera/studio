
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Eraser, Percent, Divide, X, Minus, Plus, Equal, Delete, SquareRadical, BookText, Pi, Power, Parentheses } from 'lucide-react';

const buttonLayout = [
  ['C', '(', ')', '⌫'],
  ['sin', 'cos', 'tan', 'log'],
  ['ln', '√', '^', 'π'],
  ['7', '8', '9', '/'],
  ['4', '5', '6', '*'],
  ['1', '2', '3', '-'],
  ['0', '.', '%', '+'],
  ['e', '', '', '='] 
];

export default function CalculatorEmbed() {
  const [input, setInput] = useState('');
  const [displayValue, setDisplayValue] = useState('0');

  const handleButtonClick = useCallback((value: string) => {
    if (value === 'C') {
      setInput('');
      setDisplayValue('0');
    } else if (value === '⌫') {
      if (displayValue.endsWith('π')) { // Check for π character in display
        setDisplayValue(prev => prev.slice(0, -1) || '0'); 
      } else if (displayValue.endsWith('e') && !displayValue.match(/loge$|lne$/)) { // Check for e character (not part of loge/lne)
         setDisplayValue(prev => prev.slice(0, -1) || '0'); 
      } else if (displayValue.match(/(sin|cos|tan|log|ln|√)\($/)) {
         setDisplayValue(prev => prev.replace(/(sin|cos|tan|log|ln|√)\($/, '') || '0');
      } else {
         setDisplayValue((prev) => (prev.length > 1 ? prev.slice(0,-1) : '0'));
      }
      // Raw input state is simpler for backspace
      setInput((prev) => prev.length > 1 ? prev.slice(0, -1) : '');
    } else if (value === '=') {
      if (!input.trim()) {
        setDisplayValue('0');
        return;
      }
      try {
        let safeEvalCompatibleInput = input
          .replace(/π/g, 'Math.PI')
          .replace(/(?<![a-zA-Z])e(?![a-zA-Z0-9.])/g, 'Math.E'); // 'e' as constant, not part of function name or number like 1e5

        safeEvalCompatibleInput = safeEvalCompatibleInput
          .replace(/√\(/g, 'Math.sqrt(')
          .replace(/log\(/g, 'Math.log10(')
          .replace(/ln\(/g, 'Math.log(')
          .replace(/sin\(/g, 'Math.sin(Math.PI/180*') // Degrees mode for trig
          .replace(/cos\(/g, 'Math.cos(Math.PI/180*') // Degrees mode for trig
          .replace(/tan\(/g, 'Math.tan(Math.PI/180*'); // Degrees mode for trig
        
        safeEvalCompatibleInput = safeEvalCompatibleInput
          .replace(/\^/g, '**')
          .replace(/%/g, '/100*'); // Percentage: 5% of X -> X * 5/100. If just 5% then 5/100. Needs context, simplifying to "value / 100"
                                     // For "X % Y", it would mean X * (Y/100). For "Y%", it means Y/100.
                                     // Current usage of '%' button appends, so "5%" means "5/100"
                                     // If input "100+5%", safeEvalCompatibleInput becomes "100+5/100*" - careful with trailing operator
        
        // Fix for percentage: if input is "X%", it becomes "X/100". If "A+X%", it's "A+X/100"
        // The previous replacement was to 'X/100*', which could be problematic.
        // A better approach for % might be to evaluate it immediately or handle it contextually.
        // For now, simple "value/100" if % is the last char, or part of sequence.
        // If `input` is "5%", `safeEvalCompatibleInput` becomes "5/100" (after % replacement)
        if (safeEvalCompatibleInput.endsWith('/100*')) { // From previous '*' logic
            safeEvalCompatibleInput = safeEvalCompatibleInput.slice(0, -1); // Remove trailing '*'
        }


        // Explicitly check for '}' or other clearly invalid characters before evaluation
        if (/[{}]/.test(safeEvalCompatibleInput)) {
            console.error("Invalid character (e.g., '{' or '}') in expression for evaluation:", safeEvalCompatibleInput);
            setDisplayValue('Error: Invalid char');
            setInput(''); // Clear input to prevent re-evaluation of bad state
            return;
        }
        // Check for empty or operator-only input, which can also cause errors
        if (!safeEvalCompatibleInput.match(/[0-9a-zA-Z]/) && safeEvalCompatibleInput.match(/^[^0-9a-zA-Z]+$/) ) {
            if (safeEvalCompatibleInput.trim() !== "") { // only error if it's not empty but still invalid
                 setDisplayValue('Error: Incomplete');
                 // setInput(''); // Optionally clear input
                 return;
            }
        }


        const result = new Function('return ' + safeEvalCompatibleInput)();
        if (typeof result === 'number' && !isNaN(result)) {
          const formattedResult = parseFloat(result.toPrecision(12)).toString();
          setDisplayValue(formattedResult);
          setInput(formattedResult);
        } else {
          setDisplayValue('Error');
          setInput('');
        }
      } catch (error) {
        console.error("Calculator eval error:", error, "Input was:", input, "Processed as:", safeEvalCompatibleInput);
        setDisplayValue('Error');
        setInput('');
      }
    } else if (['sin', 'cos', 'tan', 'log', 'ln', '√'].includes(value)) {
        const newDisplayVal = (displayValue === '0') ? value + '(' : displayValue + value + '(';
        setDisplayValue(newDisplayVal);
        setInput(input + value + '(');
    } else if (value === 'π') {
        const newDisplayVal = (displayValue === '0') ? 'π' : displayValue + 'π';
        setDisplayValue(newDisplayVal);
        setInput(input + 'π');
    } else if (value === 'e') {
        const newDisplayVal = (displayValue === '0') ? 'e' : displayValue + 'e';
        setDisplayValue(newDisplayVal);
        setInput(input + 'e');
    } else if (value === '^') {
        if (!input.trim() || ['+','-','*','/','('].includes(input.slice(-1))) { // Avoid starting with ^ or after operator without number
            return;
        }
        setDisplayValue(displayValue + value);
        setInput(input + value);
    } else if (value === '%') {
        if (!input.trim() || ['+','-','*','/','('].includes(input.slice(-1))) { // Avoid starting with % or after operator
            return;
        }
        setDisplayValue(displayValue + value);
        setInput(input + value);
    }
     else { // Numbers, decimal point, operators
      if (value === '.' && displayValue.split(/[\+\-\*\/]/).pop()?.includes('.')) { // Prevent multiple decimals in one number segment
        return;
      }
      if (displayValue === '0' && value !== '.') {
        setDisplayValue(value);
        setInput(value);
      } else {
        setDisplayValue(displayValue + value);
        setInput(input + value);
      }
    }
  }, [input, displayValue]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).closest('input, textarea, [contenteditable=true]')) {
        return;
      }
      // event.preventDefault(); // Keep this here to prevent default actions like page scroll for arrow keys etc.
      const key = event.key;
      
      let buttonValue: string | null = null;

      if (key >= '0' && key <= '9') buttonValue = key;
      else if (key === '.') buttonValue = '.';
      else if (key === '+') buttonValue = '+';
      else if (key === '-') buttonValue = '-';
      else if (key === '*') buttonValue = '*';
      else if (key === '/') buttonValue = '/';
      else if (key === '%') buttonValue = '%';
      else if (key === '^') buttonValue = '^';
      else if (key === '(') buttonValue = '(';
      else if (key === ')') buttonValue = ')';
      else if (key.toLowerCase() === 'p' && (event.metaKey || event.ctrlKey) ) { event.preventDefault(); buttonValue = 'π'; } // Ctrl+P for Pi
      else if (key.toLowerCase() === 'e' && (event.metaKey || event.ctrlKey) ) { event.preventDefault(); buttonValue = 'e'; } // Ctrl+E for e
      else if (key === 'Enter' || key === '=') { event.preventDefault(); buttonValue = '=';}
      else if (key === 'Backspace') { event.preventDefault(); buttonValue = '⌫';}
      else if (key === 'Escape') { event.preventDefault(); buttonValue = 'C';}
      else if (key.toLowerCase() === 's' && !event.metaKey && !event.ctrlKey) { event.preventDefault(); buttonValue = 'sin';}
      else if (key.toLowerCase() === 'c' && !event.metaKey && !event.ctrlKey) { event.preventDefault(); buttonValue = 'cos';}
      else if (key.toLowerCase() === 't' && !event.metaKey && !event.ctrlKey) { event.preventDefault(); buttonValue = 'tan';}
      else if (key.toLowerCase() === 'l' && event.shiftKey) { event.preventDefault(); buttonValue = 'ln';} // Shift+L for ln
      else if (key.toLowerCase() === 'l' && !event.metaKey && !event.ctrlKey && !event.shiftKey) { event.preventDefault(); buttonValue = 'log';} // L for log
      else if (key.toLowerCase() === 'r' && !event.metaKey && !event.ctrlKey) { event.preventDefault(); buttonValue = '√';} // R for root

      if (buttonValue) {
        handleButtonClick(buttonValue);
      } else {
        // If no button value matched, let the default behavior occur unless it's a key we specifically want to always prevent default for.
        // The initial event.preventDefault() might be too broad if we want some keys (like arrows for accessibility) to work.
        // For now, most non-calculator keys are not processed.
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleButtonClick]);

  const getIconForButton = (btn: string) => {
    switch (btn) {
      case 'C': return <Eraser size={20} />;
      case '%': return <Percent size={20} />;
      case '√': return <SquareRadical size={20} />;
      case '/': return <Divide size={20} />;
      case '*': return <X size={20} />;
      case '-': return <Minus size={20} />;
      case '+': return <Plus size={20} />;
      case '=': return <Equal size={20} />;
      case '⌫': return <Delete size={20} />;
      case '(': return <Parentheses size={20} className="transform scale-x-[-1]" />;
      case ')': return <Parentheses size={20} />;
      case 'log': return <BookText size={20} />; 
      case 'ln': return <BookText size={20} />; 
      case 'π': return <Pi size={20} />;
      case '^': return <Power size={20} />; 
      case 'e': return <span className="font-serif italic text-xl">e</span>;
      default: return btn;
    }
  };
  
  return (
    <Card className="w-full max-w-xs sm:max-w-sm shadow-2xl mx-auto my-4">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-xl font-bold text-center text-primary">Scientific Calculator</CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4">
        <Input
          type="text"
          value={displayValue}
          readOnly
          className="mb-3 sm:mb-4 h-16 sm:h-20 text-2xl sm:text-3xl text-right bg-muted rounded-lg p-3 sm:p-4 focus-visible:ring-primary selection:bg-primary/20"
          aria-label="Calculator display"
          tabIndex={-1}
        />
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {buttonLayout.flat().map((btn, index) => {
            if (btn === '') return <div key={`empty-${index}`} />; 
            let buttonSpecificClass = "";
            if (btn === '=') {
              buttonSpecificClass = 'col-span-3 bg-primary text-primary-foreground hover:bg-primary/90 text-lg sm:text-xl';
            } else if (['C', '%', '√', '/', '*', '-', '+', '⌫'].includes(btn)) {
              buttonSpecificClass = 'bg-secondary hover:bg-secondary/80 text-base sm:text-lg';
            } else if (['sin', 'cos', 'tan', 'log', 'ln', '^', '(', ')', 'π', 'e'].includes(btn)) {
              buttonSpecificClass = 'bg-muted hover:bg-muted/80 text-sm sm:text-base';
            }
             else { // Numbers
              buttonSpecificClass = 'bg-card hover:bg-muted/80 border border-input text-base sm:text-lg';
            }

            return (
              <Button
                key={`${btn}-${index}`}
                onClick={() => handleButtonClick(btn)}
                variant="outline"
                className={`h-12 sm:h-14 rounded-lg shadow-sm focus:ring-2 focus:ring-primary transition-all duration-100 ease-in-out active:scale-95 p-0 ${buttonSpecificClass}`}
                aria-label={btn}
              >
                <span className="flex items-center justify-center h-full w-full">
                   {getIconForButton(btn)}
                </span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

