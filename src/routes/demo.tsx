import { createFileRoute, useNavigate } from '@tanstack/react-router'
import CopyLayout from '@/layouts/CopyLayout'

export const Route = createFileRoute('/demo')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()

  const handleContinueDemo = () => {
    // Mark that user has visited the demo page
    localStorage.setItem('tekne-demo-visited', 'true')

    // Navigate to today's date document
    const yyyymmdd = new Date().toLocaleDateString('en-CA')
    navigate({
      to: '/n/$title',
      params: {
        title: yyyymmdd,
      },
    })
  }

  return (
    <CopyLayout
      title="Hey, listen!"
      primaryAction={{
        text: 'Continue to demo',
        onClick: handleContinueDemo,
      }}
      secondaryAction={{
        text: 'This is deeply offensive, take me to a better website',
        href: 'https://html5zombo.com',
      }}
    >
      <p className="max-w-[50%]  text-left">
        This is a demo for a productivity app that's currently super alpha. The
        demo saves data in your browser storage, doesn't persist it, probably
        has horrible bugs and should not, under any circumstances, actually be
        used.
      </p>
    </CopyLayout>
  )
}
