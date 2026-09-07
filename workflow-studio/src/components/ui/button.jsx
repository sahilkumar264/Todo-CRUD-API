import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const variants = cva("button", { variants: { variant: { default: "button-primary", secondary: "button-secondary", danger: "button-danger" } }, defaultVariants: { variant: "default" } });
export function Button({ className, variant, ...props }) { return <button className={cn(variants({ variant }), className)} {...props} />; }
