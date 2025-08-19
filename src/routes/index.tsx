import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: RouteComponent,
  loader: () => {
    const yyyymmdd = new Date().toLocaleDateString('en-CA')

    throw redirect({
      to: '/n/$title',
      params: {
        title: yyyymmdd,
      },
    })
  },
})

function RouteComponent() {
  return null
}
