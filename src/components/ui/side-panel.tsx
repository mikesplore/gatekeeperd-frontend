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
      "!left-0 !right-0 !top-0 !bottom-0 !translate-x-0 !translate-y-0 !h-dvh !max-h-none w-screen max-w-none min-h-0 flex flex-col items-stretch gap-0 overflow-hidden rounded-none border-0 p-0 duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right sm:!left-auto sm:w-full sm:max-w-xl",
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
