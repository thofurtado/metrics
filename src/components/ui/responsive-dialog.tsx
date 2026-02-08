
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

// Re-export Dialog components directly to ensure consistent responsive behavior (Full Screen Mobile / Centered Desktop)
// This effectively removes the Sheet usage on mobile to fix layout issues requested by the user.

export const ResponsiveDialog = Dialog
export const ResponsiveDialogTrigger = DialogTrigger
export const ResponsiveDialogClose = DialogClose
export const ResponsiveDialogContent = DialogContent
export const ResponsiveDialogHeader = DialogHeader
export const ResponsiveDialogTitle = DialogTitle
export const ResponsiveDialogDescription = DialogDescription
export const ResponsiveDialogFooter = DialogFooter
