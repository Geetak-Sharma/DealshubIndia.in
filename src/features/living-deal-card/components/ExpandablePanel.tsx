import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/utils/cn";
import { buttonVariants } from "@/components/foundation/Button";
import { trackEvent } from "@/platform/analytics";

interface ExpandablePanelProps {
  children: React.ReactNode;
  dealId: string;
}

export function ExpandablePanel({ children, dealId }: ExpandablePanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    if (newState) {
      trackEvent('expand_analysis', { dealId });
    }
  };

  return (
    <div className="flex flex-col mt-2 border-t border-border/40 pt-2">
      <button 
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-full text-muted-foreground hover:text-foreground flex items-center justify-center gap-2 h-8 text-xs group")}
        onClick={handleToggle}
        aria-expanded={isExpanded}
        aria-controls="analysis-panel-content"
      >
        {isExpanded ? "Hide AI Analysis" : "View AI Analysis"}
        <ChevronDown 
          className={`w-3.5 h-3.5 transition-transform duration-300 ease-[cubic-bezier(0.87,0,0.13,1)] ${isExpanded ? 'rotate-180' : ''}`} 
          aria-hidden="true" 
        />
      </button>
      
      <div 
        id="analysis-panel-content"
        className={`grid transition-[grid-template-rows,opacity,visibility] duration-300 ease-[cubic-bezier(0.87,0,0.13,1)] motion-reduce:transition-none ${
          isExpanded ? 'grid-rows-[1fr] opacity-100 visible' : 'grid-rows-[0fr] opacity-0 invisible'
        }`}
        aria-hidden={!isExpanded}
      >
        <div className="overflow-hidden">
          <div className="pt-3 pb-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
