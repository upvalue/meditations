import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: RouteComponent,
  loader: () => {
    // Check if demo mode is enabled
    const isDemoMode =
      !!import.meta.env.TEKNE_DEMO && import.meta.env.TEKNE_DEMO !== ''

    if (isDemoMode) {
      // Check if user has visited demo page before
      const hasVisitedDemo =
        localStorage.getItem('tekne-demo-visited') === 'true'

      if (!hasVisitedDemo) {
        // Redirect to demo page
        throw redirect({
          to: '/demo',
        })
      }
    }

    // Default behavior: redirect to today's date
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
