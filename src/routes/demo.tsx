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

  const disclaimerContent = (
    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900/20 dark:border-yellow-700">
      <p className="text-sm text-yellow-800 dark:text-yellow-200">
        <strong>Demo Mode:</strong> This is a demonstration version of Tekne.
        Your data may not be permanently saved and features may be limited.
      </p>
    </div>
  )

  return (
    <CopyLayout
      title="Hey! Listen!"
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
        demo saves data in your browser storage, and doesn't persist it,
        probably has horrible bugs and should not, under any circumstances,
        actually be used.
      </p>
    </CopyLayout>
  )
}
