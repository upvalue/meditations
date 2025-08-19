import { Toaster as Sonner, type ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  const theme = 'light'

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group bg-red-500"
      duration={Infinity}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      closeButton={true}
      toastOptions={{
        style: {
          background: 'var(--color-zinc-800)',
        },
        classNames: {},
      }}
      {...props}
    />
  )
}

export { Toaster }
