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
import { useState, useRef, useEffect } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { getAllKeybindings, keybindings } from '@/lib/keys'
import { trpc } from '@/trpc'
import { useNavigate } from '@tanstack/react-router'

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
    </Dialog>
  )
}

/*
 * Bar that lives at the top. Has various controls
 */
export const ControlBar = ({
  title,
  allowTitleEdit = false,
}: {
  title: string
  allowTitleEdit?: boolean
}) => {
  const [helpOpen, setHelpOpen] = useState(false)
  const [proposedTitle, setProposedTitle] = useState(title)
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const editableRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const renameDocMutation = trpc.renameDoc.useMutation({
    onSuccess: (data) => {
      setError(null)
      setIsEditing(false)
      navigate({
        to: '/n/$title',
        params: {
          title: proposedTitle.trim(),
        },
      })
    },
    onError: (error) => {
      // Extract a clean error message from TRPC/Zod validation errors
      let message = error.message
      try {
        const parsed = JSON.parse(message)
        if (Array.isArray(parsed) && parsed[0]?.message) {
          message = parsed[0].message
        }
      } catch {
        // If parsing fails, use the original message
      }
      setError(message)
    },
  })

  useEffect(() => {
    setProposedTitle(title)
  }, [title])

  useEffect(() => {
    if (isEditing && editableRef.current) {
      // Set the initial content only when entering edit mode
      editableRef.current.textContent = proposedTitle
      editableRef.current.focus()

      // Select all text
      const range = document.createRange()
      range.selectNodeContents(editableRef.current)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
    }
  }, [isEditing])

  const handleSubmit = () => {
    if (proposedTitle.trim() !== title && allowTitleEdit) {
      renameDocMutation.mutate({
        oldName: title,
        newName: proposedTitle.trim(),
      })
    } else {
      setIsEditing(false)
      setError(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      setProposedTitle(title)
      setIsEditing(false)
      setError(null)
    }
  }

  return (
    <div className="bg-zinc-900 py-2 pt-4 pl-[138px] pr-4">
      <div className="flex justify-between">
        <div className="flex flex-col">
          <div
            className="text-2xl text-zinc-500 cursor-pointer"
            onClick={() => {
              if (allowTitleEdit) {
                setIsEditing(true)
              }
            }}
          >
            {isEditing ? (
              <div
                ref={editableRef}
                contentEditable
                suppressContentEditableWarning={true}
                className="outline-none "
                onInput={(e) =>
                  setProposedTitle(e.currentTarget.textContent || '')
                }
                onBlur={handleSubmit}
                onKeyDown={handleKeyDown}
              />
            ) : (
              title
            )}
          </div>
          {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
        </div>

        <div>
          <Button
            className="cursor-pointer "
            onClick={() => setHelpOpen(!helpOpen)}
          >
            <HelpCircle className="w-4 h-4" />
          </Button>

          <HelpDialog isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
        </div>
      </div>
    </div>
  )
}
