import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

/**
 * Map of variant → CSS class (from globals.css)
 */
const variantMap = {
  default: "btn btn-primary",
  destructive: "btn btn-danger",
  outline: "btn btn-outline",
  secondary: "btn btn-secondary",
  ghost: "btn btn-ghost",
  link: "btn btn-link",
}

/**
 * Map of size → CSS class
 */
const sizeMap = {
  default: "",
  sm: "btn-sm",
  lg: "btn-lg",
  icon: "btn-icon",
}

/**
 * Button Component – matches your global theme
 */
const Button = React.forwardRef((props, ref) => {
  const {
    className = "",
    variant = "default",
    size = "default",
    asChild = false,
    ...rest
  } = props

  const Comp = asChild ? Slot : "button"

  const baseClasses = "btn"
  const variantClasses = variantMap[variant] || variantMap.default
  const sizeClasses = sizeMap[size] || sizeMap.default

  return (
    <Comp
      className={cn(baseClasses, variantClasses, sizeClasses, className)}
      ref={ref}
      {...rest}
    />
  )
})

Button.displayName = "Button"

export { Button }