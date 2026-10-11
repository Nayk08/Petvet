import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

function Dialog({
  ...props
}) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({
  ...props
}) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
  ...props
}) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
  ...props
}) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props} />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          // bg-popover/text-popover-foreground (the shadcn defaults) don't
          // pick up this app's .dark class the way every other component's
          // explicit dark: classes do, leaving dialogs stuck light while
          // their own contents (which DO use dark:) render correctly —
          // spelling it out explicitly here matches the rest of the app.
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-6 rounded-xl bg-white border border-slate-200 p-6 text-sm text-slate-800 ring-1 ring-black/5 duration-100 outline-none sm:max-w-md dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 dark:ring-white/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          // Phones (below md): a full-screen sheet that scrolls on its own; the
          // DialogFooter below sticks to its bottom. Important (!) so a modal's
          // own sm:max-w-*/max-h-* sizing can't shrink it back into a card.
          "max-md:inset-0 max-md:translate-x-0 max-md:translate-y-0 max-md:w-full max-md:max-w-none! max-md:max-h-none! max-md:h-auto max-md:rounded-none! max-md:border-0 max-md:ring-0 max-md:overflow-y-auto max-md:overscroll-contain max-md:content-start max-md:pt-[calc(1.5rem+env(safe-area-inset-top))]",
          className
        )}
        {...props}>
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close data-slot="dialog-close" asChild>
            <Button variant="ghost" className="absolute top-4 right-4 max-md:top-[calc(0.5rem+env(safe-area-inset-top))] max-md:right-2 max-md:size-11" size="icon-sm">
              <XIcon />
              <span className="sr-only">Close</span>
            </Button>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({
  className,
  ...props
}) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props} />
  );
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        // Phones: pinned to the bottom of the full-screen sheet (bleeds over
        // the sheet's p-6), so the primary action is always reachable. Two
        // buttons per row (Cancel left, action right; a 3rd wraps full width).
        // -bottom-6 cancels the sheet's p-6 so it sits flush with the bottom.
        "max-md:sticky max-md:-bottom-6 max-md:z-10 max-md:-mx-6 max-md:-mb-6 max-md:mt-2 max-md:px-6 max-md:pt-3 max-md:pb-[calc(0.75rem+env(safe-area-inset-bottom))] max-md:border-t max-md:border-slate-200 max-md:bg-white dark:max-md:border-slate-800 dark:max-md:bg-slate-900 max-md:*:min-h-11 max-md:flex-row max-md:flex-wrap max-md:*:flex-1 max-md:*:basis-[calc(50%-0.25rem)]",
        className,
      )}
      {...props}>
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogTitle({
  className,
  ...props
}) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("font-heading leading-none font-medium", className)}
      {...props} />
  );
}

function DialogDescription({
  className,
  ...props
}) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-slate-500 dark:text-slate-400 *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-slate-900 dark:*:[a]:hover:text-white",
        className
      )}
      {...props} />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
