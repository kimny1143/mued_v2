import { cva } from "class-variance-authority";

// ボタンのバリエーション
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        brand: "bg-black text-white hover:bg-black/90",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
        wide: "h-9 px-6 py-2"
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

// カードのバリエーション
export const cardVariants = cva(
  "rounded-xl border bg-card text-card-foreground shadow", 
  {
    variants: {
      variant: {
        default: "",
        outline: "border border-gray-200 shadow-sm",
        solid: "bg-white",
        elevated: "shadow-lg",
      },
      padding: {
        none: "",
        sm: "p-2",
        md: "p-4",
        lg: "p-6",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "lg",
    },
  }
);

// 入力フィールドのバリエーション
export const inputVariants = cva(
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50", 
  {
    variants: {
      variant: {
        default: "",
        filled: "bg-gray-100 border-transparent focus:bg-white focus:border-input",
        outline: "border-gray-300",
        flushed: "border-t-0 border-l-0 border-r-0 rounded-none px-0",
      },
      size: {
        default: "h-9 px-3 py-1",
        sm: "h-7 px-2 py-1 text-xs",
        lg: "h-11 px-4 py-2 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
); 