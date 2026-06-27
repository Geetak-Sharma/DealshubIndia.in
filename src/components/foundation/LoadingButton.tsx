import React from "react";
import { Button, type ButtonProps } from "./Button";

export interface LoadingButtonProps extends ButtonProps {
  loadingText?: string;
}

export const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ children, loadingText, ...props }, ref) => {
    return (
      <Button ref={ref} disabled aria-busy="true" {...props}>
        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        {loadingText || children}
      </Button>
    );
  }
);
LoadingButton.displayName = "LoadingButton";
