import React from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  KBarProvider,
  KBarPortal,
  KBarPositioner,
  KBarAnimator,
  KBarSearch,
  KBarResults,
  useMatches,
  useKBar,
  useRegisterActions,
  type Action,
} from 'kbar'
import { trpc } from '@/trpc/client'
import { useMemo, useEffect, useState } from 'react'

const RenderResults = () => {
  const { results } = useMatches()

  return (
    <KBarResults
      items={results}
      onRender={({ item, active }) =>
        typeof item === 'string' ? (
          <div className="p-2 text-sm text-gray-500 uppercase font-medium">
            {item}
          </div>
        ) : (
          <div
            className={`p-3 cursor-pointer border-l-2 ${
              active
                ? 'bg-blue-100 border-blue-500 text-blue-900'
                : 'bg-white border-transparent'
            }`}
          >
            <div className="font-medium">{item.name}</div>
            {item.subtitle && (
              <div className="text-sm text-gray-600">{item.subtitle}</div>
            )}
          </div>
        )
      }
    />
  )
}

const DocumentSearchContent = () => {
  const navigate = useNavigate()
  const kbarState = useKBar((state) => state)
  const query = kbarState.searchQuery || ''
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 200)
    return () => clearTimeout(timer)
  }, [query])

  const searchDocs = trpc.searchDocs.useQuery(
    { query: debouncedQuery },
    { 
      enabled: true,
      staleTime: 1000,
    }
  )

  const actions = useMemo((): Action[] => {
    if (searchDocs.data) {
      return searchDocs.data.map(doc => ({
        id: `doc-${doc.id}`,
        name: doc.title,
        subtitle: doc.subtitle,
        perform: () => navigate({ to: `/n/${doc.id}` }),
        keywords: doc.title.toLowerCase(),
      }))
    }
    return []
  }, [searchDocs.data, navigate])

  useRegisterActions(actions, [actions])

  return (
    <KBarPortal>
      <KBarPositioner className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-32">
        <KBarAnimator className="w-full max-w-xl">
          <div className="bg-white rounded-lg shadow-xl overflow-hidden">
            <KBarSearch
              className="w-full px-4 py-3 text-lg border-none outline-none"
              placeholder="Search documents..."
            />
            <div className="border-t border-gray-200 max-h-96 overflow-y-auto">
              <RenderResults />
            </div>
          </div>
        </KBarAnimator>
      </KBarPositioner>
    </KBarPortal>
  )
}

interface DocumentSearchProps {
  children: React.ReactNode
}

export const DocumentSearch: React.FC<DocumentSearchProps> = ({ children }) => {
  return (
    <KBarProvider actions={[]}>
      <DocumentSearchContent />
      {children}
    </KBarProvider>
  )
}