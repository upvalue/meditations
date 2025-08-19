import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'

import { cn } from '@/lib/utils'

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'bg-zinc-100 text-zinc-500 inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px] dark:bg-zinc-800 dark:text-zinc-400',
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "data-[state=active]:bg-white dark:data-[state=active]:text-focus-visible:border-zinc-950 focus-visible:ring-zinc-950/50 focus-visible:outline-ring dark:data-[state=active]:border-zinc-200 dark:data-[state=active]:bg-zinc-200/30 text-zinc-950 dark:text-zinc-500 inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-zinc-200 border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 dark:data-[state=active]:bg-zinc-950 dark:dark:data-[state=active]:text-zinc-50 dark:focus-visible:border-zinc-300 dark:focus-visible:ring-zinc-300/50 dark:dark:data-[state=active]:border-zinc-800 dark:dark:data-[state=active]:bg-zinc-800/30 dark:text-zinc-50 dark:dark:text-zinc-400 dark:border-zinc-800",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('flex-1 outline-none', className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
