import React from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogTitle,
} from '@/components/ui/catalystdialog'
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
} from '@/components/ui/description-list'
import { HelpCircle } from 'lucide-react'
import { useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { getAllKeybindings, keybindings } from '@/lib/keys'

const HelpDialog = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) => {
  const allKeybindings = getAllKeybindings()

  console.log(allKeybindings)

  return (
    <Dialog open={isOpen} onClose={onClose} className="text-primary">
      <DialogTitle>Help</DialogTitle>
      <DialogBody>
        <DescriptionList>
          {allKeybindings.map((keybinding) => (
            <React.Fragment key={keybinding.name}>
              <DescriptionTerm>
                <Badge>{keybinding.displayKey}</Badge>
              </DescriptionTerm>
              <DescriptionDetails>{keybinding.description}</DescriptionDetails>
            </React.Fragment>
          ))}
        </DescriptionList>
      </DialogBody>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog >
  )
}

const DocumentSearch = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) => {
  const [search, setSearch] = useState('')

  return (
    <Dialog open={isOpen} onClose={onClose} className="text-primary">
      example document search dialog
    </Dialog>
  )
}

/*
 * Bar that lives at the top. Has various controls
 */
export const TopBar = () => {
  const [helpOpen, setHelpOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  useHotkeys(keybindings.documentSearch.key, () => {
    setSearchOpen((h) => !h)
  })

  return (
    <div className="bg-zinc-800 py-2 pt-4 pl-[160px]">
      <Button className="cursor-pointer" onClick={() => setHelpOpen(!helpOpen)}>
        <HelpCircle className="w-4 h-4" />
      </Button>
      <HelpDialog isOpen={helpOpen} onClose={() => setHelpOpen(false)} />

      <DocumentSearch
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </div>
  )
}
