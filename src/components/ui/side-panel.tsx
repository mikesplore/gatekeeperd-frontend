import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { cn } from "@/lib/utils";

export const SidePanel = Dialog;

export const SidePanelContent = React.forwardRef<
  React.ElementRef<typeof DialogContent>,
  React.ComponentPropsWithoutRef<typeof DialogContent>
>(({ className, ...props }, ref) => (
  <DialogContent
    ref={ref}
    className={cn(
      "left-auto right-0 top-0 h-screen max-h-screen w-full translate-x-0 translate-y-0 gap-0 overflow-y-auto rounded-none border-y-0 border-r-0 p-0 sm:max-w-xl",
      className,
    )}
    {...props}
  />
));
SidePanelContent.displayName = "SidePanelContent";

export const SidePanelHeader = DialogHeader;
export const SidePanelFooter = DialogFooter;
export const SidePanelTitle = DialogTitle;
export const SidePanelDescription = DialogDescription;
