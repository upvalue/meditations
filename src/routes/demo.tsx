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
    navigate({
      to: '/n/$title',
      params: {
        title: 'Tutorial',
      },
    })
  }

  return (
    <CopyLayout
      columns
      title="Hey, listen!"
      primaryAction={{
        text: 'Continue to demo',
        onClick: handleContinueDemo,
      }}
      secondaryAction={{
        text: 'This is deeply offensive, take me to a better website',
        href: 'https://html5zombo.com',
      }}
      thirdAction={{
        text: 'Interested but I think software UX peaked in 1991',
        href: 'https://upvalue.github.io/kamas-web',
      }}
    >
      <div className="max-w-[50%] text-left">

        <p>
          This is a demo for a productivity app that's currently super alpha. The
          demo saves data in your browser storage, doesn't persist it, probably
          has horrible bugs and should not, under any circumstances, actually be
          used.
        </p>
        <p>
          It's also currently targeting a Mac laptop -- key bindings aren't yet OS aware
          and the design is not responsive for small screens.
        </p>
      </div>
    </CopyLayout>
  )
}
