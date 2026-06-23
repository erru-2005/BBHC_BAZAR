import * as DialogPrimitive from '@radix-ui/react-dialog'
import { XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

function Dialog({ ...props }) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({ className, ...props }) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50 backdrop-blur-sm',
        className
      )}
      {...props}
    />
  )
}

function DialogContent({ className, children, ...props }) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
        <DialogPrimitive.Content
          data-slot="dialog-content"
          className={cn(
            'pointer-events-auto bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 relative z-50 grid w-[clamp(18rem,92vw,30rem)] max-h-[min(90vh,100%)] overflow-y-auto rounded-lg border shadow-lg duration-200 outline-none',
            className
          )}
          {...props}
        >
          {children}
        </DialogPrimitive.Content>
      </div>
    </DialogPortal>
  )
}

function DialogBody({ className, ...props }) {
  return (
    <div
      data-slot="dialog-body"
      className={cn('px-4 py-6 sm:px-6', className)}
      {...props}
    />
  )
}

function DialogHeader({
  className,
  children,
  hideCloseButton = false,
  ...props
}) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        'bg-muted/30 flex flex-col gap-2 rounded-t-lg border-b p-4 text-center sm:text-left',
        className
      )}
      {...props}
    >
      {children}
      {!hideCloseButton && (
        <DialogPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-full opacity-80 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-4">
          <XIcon />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogFooter({ className, ...props }) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        'bg-muted/30 flex flex-col gap-2 rounded-b-lg border-t px-4 py-3 sm:flex-row sm:justify-end sm:px-6',
        className
      )}
      {...props}
    />
  )
}

function DialogTitle({ className, ...props }) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('font-heading text-lg leading-none font-medium', className)}
      {...props}
    />
  )
}

function DialogDescription({ className, ...props }) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger
}
