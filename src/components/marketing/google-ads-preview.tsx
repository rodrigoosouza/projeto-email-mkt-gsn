'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Shuffle, Monitor, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Anuncios } from '@/lib/marketing/types'

interface GoogleAdsPreviewProps {
  anuncios: Anuncios
  url?: string
  businessName?: string
}

export function GoogleAdsPreview({ anuncios, url = 'www.seusite.com.br', businessName = 'Sua Empresa' }: GoogleAdsPreviewProps) {
  const [currentTitles, setCurrentTitles] = useState([0, 1, 2])
  const [currentDescs, setCurrentDescs] = useState([0, 1])
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop')

  const shuffleAll = () => {
    const tAvail = anuncios.titulos.map((_, i) => i).sort(() => Math.random() - 0.5)
    setCurrentTitles(tAvail.slice(0, 3))
    const dAvail = anuncios.descricoes.map((_, i) => i).sort(() => Math.random() - 0.5)
    setCurrentDescs(dAvail.slice(0, 2))
  }

  const nextTitle = (pos: number) => {
    setCurrentTitles((prev) => {
      const n = [...prev]
      n[pos] = (n[pos] + 1) % anuncios.titulos.length
      return n
    })
  }

  const prevTitle = (pos: number) => {
    setCurrentTitles((prev) => {
      const n = [...prev]
      n[pos] = (n[pos] - 1 + anuncios.titulos.length) % anuncios.titulos.length
      return n
    })
  }

  const title1 = anuncios.titulos[currentTitles[0]] || 'Titulo 1'
  const title2 = anuncios.titulos[currentTitles[1]] || 'Titulo 2'
  const title3 = anuncios.titulos[currentTitles[2]] || 'Titulo 3'
  const desc1 = anuncios.descricoes[currentDescs[0]] || 'Descricao 1'
  const desc2 = anuncios.descricoes[currentDescs[1]] || 'Descricao 2'

  const titleCombinations = anuncios.titulos.length >= 3
    ? (anuncios.titulos.length * (anuncios.titulos.length - 1) * (anuncios.titulos.length - 2)) / 6
    : 1
  const descCombinations = anuncios.descricoes.length >= 2
    ? (anuncios.descricoes.length * (anuncios.descricoes.length - 1)) / 2
    : 1

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode('desktop')}
            className={cn(viewMode === 'desktop' && 'bg-primary text-primary-foreground')}
          >
            <Monitor className="w-4 h-4 mr-1" />
            Desktop
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode('mobile')}
            className={cn(viewMode === 'mobile' && 'bg-primary text-primary-foreground')}
          >
            <Smartphone className="w-4 h-4 mr-1" />
            Mobile
          </Button>
        </div>
        <Button variant="secondary" size="sm" onClick={shuffleAll}>
          <Shuffle className="w-4 h-4 mr-2" />
          Sortear combinacao
        </Button>
      </div>

      {/* Preview */}
      <div
        className={cn(
          'bg-white rounded-xl shadow-lg border overflow-hidden transition-all duration-300',
          viewMode === 'mobile' ? 'max-w-[375px] mx-auto' : 'w-full'
        )}
      >
        {/* Google search bar */}
        <div className="bg-[#f8f9fa] border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-blue-500">G</span>
            <div className="flex-1 bg-white rounded-full border px-4 py-2 text-sm text-gray-600">
              {businessName.toLowerCase()}
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-[#006621] bg-[#006621]/10 px-1.5 py-0.5 rounded">
              Patrocinado
            </span>
          </div>
          <div className="flex items-center gap-1 text-sm mb-1">
            <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
              {businessName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-xs text-gray-800">{businessName}</div>
              <div className="text-xs text-gray-600">{url}</div>
            </div>
          </div>
          <h3
            className={cn(
              'text-[#1a0dab] hover:underline cursor-pointer font-medium leading-tight',
              viewMode === 'desktop' ? 'text-xl' : 'text-lg'
            )}
          >
            {title1} | {title2} | {title3}
          </h3>
          <p className={cn('text-gray-600 mt-1 leading-snug', viewMode === 'desktop' ? 'text-sm' : 'text-xs')}>
            {desc1} {desc2}
          </p>
          <div className={cn('grid gap-2 mt-3 pt-3 border-t', viewMode === 'desktop' ? 'grid-cols-2' : 'grid-cols-1')}>
            <span className="text-[#1a0dab] text-sm">Fale Conosco</span>
            <span className="text-[#1a0dab] text-sm">Sobre Nos</span>
            <span className="text-[#1a0dab] text-sm">Produtos</span>
            <span className="text-[#1a0dab] text-sm">Depoimentos</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        <p className="text-sm font-medium mb-3">Navegue pelos titulos e descricoes:</p>
        <div className="space-y-2">
          {[0, 1, 2].map((pos) => (
            <div key={pos} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-16">Titulo {pos + 1}:</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => prevTitle(pos)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="flex-1 text-sm truncate">{anuncios.titulos[currentTitles[pos]]}</span>
              <span className="text-xs text-muted-foreground">
                {currentTitles[pos] + 1}/{anuncios.titulos.length}
              </span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => nextTitle(pos)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="border-t pt-3 space-y-2">
          {[0, 1].map((pos) => (
            <div key={pos} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-16">Desc {pos + 1}:</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() =>
                  setCurrentDescs((prev) => {
                    const n = [...prev]
                    n[pos] = (n[pos] - 1 + anuncios.descricoes.length) % anuncios.descricoes.length
                    return n
                  })
                }
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="flex-1 text-sm truncate">{anuncios.descricoes[currentDescs[pos]]}</span>
              <span className="text-xs text-muted-foreground">
                {currentDescs[pos] + 1}/{anuncios.descricoes.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() =>
                  setCurrentDescs((prev) => {
                    const n = [...prev]
                    n[pos] = (n[pos] + 1) % anuncios.descricoes.length
                    return n
                  })
                }
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-muted/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-primary">{anuncios.titulos.length}</div>
          <div className="text-xs text-muted-foreground">Titulos</div>
        </div>
        <div className="bg-muted/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-primary">{anuncios.descricoes.length}</div>
          <div className="text-xs text-muted-foreground">Descricoes</div>
        </div>
        <div className="bg-muted/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-primary">{titleCombinations}</div>
          <div className="text-xs text-muted-foreground">Comb. titulos</div>
        </div>
        <div className="bg-muted/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-primary">{titleCombinations * descCombinations}</div>
          <div className="text-xs text-muted-foreground">Comb. totais</div>
        </div>
      </div>
    </div>
  )
}
