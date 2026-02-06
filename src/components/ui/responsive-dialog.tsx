import * as React from "react"
import { useMediaQuery } from "@/hooks/use-media-query"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
    SheetClose,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const ResponsiveDialogContext = React.createContext<{ isDesktop: boolean }>({ isDesktop: true })

export function ResponsiveDialog({ children, ...props }: React.ComponentProps<typeof Dialog>) {
    const isDesktop = useMediaQuery("(min-width: 768px)")

    return (
        <ResponsiveDialogContext.Provider value={{ isDesktop }}>
            {isDesktop ? (
                <Dialog {...props}>{children}</Dialog>
            ) : (
                <Sheet {...props}>{children}</Sheet>
            )}
        </ResponsiveDialogContext.Provider>
    )
}

export function ResponsiveDialogTrigger(props: React.ComponentProps<typeof DialogTrigger>) {
    const { isDesktop } = React.useContext(ResponsiveDialogContext)
    if (isDesktop) return <DialogTrigger {...props} />
    return <SheetTrigger {...props} />
}

export function ResponsiveDialogClose(props: React.ComponentProps<typeof DialogClose>) {
    const { isDesktop } = React.useContext(ResponsiveDialogContext)
    if (isDesktop) return <DialogClose {...props} />
    return <SheetClose {...props} />
}

export function ResponsiveDialogContent({ className, children, ...props }: React.ComponentProps<typeof SheetContent>) {
    const { isDesktop } = React.useContext(ResponsiveDialogContext)

    if (isDesktop) {
        return (
            <DialogContent className={className} {...props}>
                {children}
            </DialogContent>
        )
    }

    return (
        <SheetContent side="bottom" className={cn("overflow-y-auto max-h-[90vh]", className)} {...props}>
            {children}
        </SheetContent>
    )
}

export function ResponsiveDialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    const { isDesktop } = React.useContext(ResponsiveDialogContext)
    if (isDesktop) return <DialogHeader className={className} {...props} />
    return <SheetHeader className={cn("text-left", className)} {...props} />
}

export function ResponsiveDialogTitle({ className, ...props }: React.ComponentProps<typeof DialogTitle>) {
    const { isDesktop } = React.useContext(ResponsiveDialogContext)
    if (isDesktop) return <DialogTitle className={className} {...props} />
    return <SheetTitle className={className} {...props} />
}

export function ResponsiveDialogDescription({ className, ...props }: React.ComponentProps<typeof DialogDescription>) {
    const { isDesktop } = React.useContext(ResponsiveDialogContext)
    if (isDesktop) return <DialogDescription className={className} {...props} />
    return <SheetDescription className={className} {...props} />
}

export function ResponsiveDialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    const { isDesktop } = React.useContext(ResponsiveDialogContext)
    if (isDesktop) return <DialogFooter className={className} {...props} />
    return <SheetFooter className={className} {...props} />
}
