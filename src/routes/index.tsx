import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: RouteComponent,
  loader: () => {
    const yyyymmdd = new Date().toISOString().split('T')[0]

    throw redirect({
      to: '/n/$title',
      params: {
        title: yyyymmdd,
      },
    })
  },
})

function RouteComponent() {
  const x: number = 'five'
  return null
}
