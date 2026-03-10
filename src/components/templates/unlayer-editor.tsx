'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Save, Loader2 } from 'lucide-react'

// Dynamic import to avoid SSR issues with react-email-editor
const EmailEditor = dynamic(
  () => import('react-email-editor').then((mod) => mod.default || mod),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center h-full bg-muted/30 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Carregando editor visual...</p>
      </div>
    ),
  }
)

interface UnlayerEditorProps {
  initialJson?: any
  onSave: (html: string, json: any) => void
  saving?: boolean
}

export function UnlayerEditor({ initialJson, onSave, saving }: UnlayerEditorProps) {
  const emailEditorRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const [editorHeight, setEditorHeight] = useState(600)

  // Measure container to give Unlayer an exact pixel height
  useEffect(() => {
    function updateHeight() {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const h = Math.floor(rect.height)
        if (h > 100) setEditorHeight(h)
      }
    }
    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  const onEditorReady = useCallback(() => {
    if (initialJson && emailEditorRef.current?.editor) {
      emailEditorRef.current.editor.loadDesign(initialJson)
    }
    setReady(true)
  }, [initialJson])

  const handleSave = useCallback(() => {
    const editor = emailEditorRef.current?.editor
    if (!editor) {
      // Fallback: try accessing via ref's exportHtml directly
      if (emailEditorRef.current?.exportHtml) {
        emailEditorRef.current.exportHtml(
          (data: { design: any; html: string }) => {
            onSave(data.html, data.design)
          }
        )
        return
      }
      console.error('Editor ref not available')
      return
    }

    editor.exportHtml(
      (data: { design: any; html: string }) => {
        onSave(data.html, data.design)
      }
    )
  }, [onSave])

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 flex-shrink-0">
        <p className="text-sm text-muted-foreground">
          {ready
            ? 'Arraste blocos da esquerda para montar seu email. Clique em elementos para editar.'
            : 'Carregando editor...'}
        </p>
        <Button onClick={handleSave} disabled={!ready || saving} size="sm">
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {saving ? 'Salvando...' : 'Salvar Template'}
        </Button>
      </div>

      {/* Editor container — measures itself and passes exact px to Unlayer */}
      <div ref={containerRef} className="flex-1 min-h-0">
        <EmailEditor
          ref={emailEditorRef}
          onReady={onEditorReady}
          minHeight={`${editorHeight}px`}
          options={{
            locale: 'pt-BR',
            displayMode: 'email',
            appearance: {
              theme: 'modern_light',
              panels: {
                tools: {
                  dock: 'left',
                },
              },
            },
            tools: {
              heading: { enabled: true },
              text: { enabled: true },
              image: { enabled: true },
              button: { enabled: true },
              divider: { enabled: true },
              html: { enabled: true },
              menu: { enabled: true },
              social: { enabled: true },
              video: { enabled: true },
              timer: { enabled: true },
            },
            mergeTags: [
              { name: 'Nome', value: '{{first_name}}' },
              { name: 'Sobrenome', value: '{{last_name}}' },
              { name: 'Nome Completo', value: '{{full_name}}' },
              { name: 'Email', value: '{{email}}' },
              { name: 'Empresa', value: '{{company}}' },
              { name: 'Cargo', value: '{{position}}' },
            ],
            features: {
              textEditor: {
                spellChecker: false,
                cleanPaste: true,
              },
              undoRedo: true,
            },
          }}
          style={{ height: `${editorHeight}px` }}
        />
      </div>
    </div>
  )
}
