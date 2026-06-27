import React from "react";
import { Button, type ButtonProps, buttonVariants } from "./Button";
import { cn } from "@/utils/cn";

export interface IconButtonProps extends Omit<ButtonProps, 'size'> {
  icon: React.ElementType;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon: Icon, className, ...props }, ref) => {
    return (
      <button className={cn(buttonVariants({ variant: props.variant }), "h-10 w-10 p-0", className)} ref={ref} {...props}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </button>
    );
  }
);
IconButton.displayName = "IconButton";
