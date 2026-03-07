'use client'

import { Check, Play, Shield, Clock, Star, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PaginaCRO } from '@/lib/marketing/types'

interface CROPagePreviewProps {
  paginaCRO: PaginaCRO
  produtoServico?: string
}

export function CROPagePreview({ paginaCRO }: CROPagePreviewProps) {
  return (
    <div className="bg-background rounded-2xl border overflow-hidden shadow-2xl">
      {/* Browser Chrome */}
      <div className="bg-muted/50 px-4 py-3 flex items-center gap-2 border-b">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-destructive/60" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
          <div className="w-3 h-3 rounded-full bg-green-500/60" />
        </div>
        <div className="flex-1 mx-4">
          <div className="bg-background/80 rounded-lg px-4 py-1.5 text-sm text-muted-foreground text-center">
            www.sualandingpage.com.br
          </div>
        </div>
      </div>

      <div className="max-h-[70vh] overflow-y-auto">
        {/* Hero */}
        <section className="relative px-6 py-16 md:px-12 md:py-24 bg-gradient-to-b from-primary/5 to-background">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-6">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">{paginaCRO.urgencia}</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4">
              {paginaCRO.headlinePrincipal}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {paginaCRO.subheadline}
            </p>
            <div className="flex flex-col items-center gap-3">
              <Button size="lg" className="text-lg px-8 py-6 rounded-xl">
                {paginaCRO.ctaPrincipal}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Shield className="w-4 h-4" />
                {paginaCRO.microcopyProva}
              </p>
            </div>
          </div>
        </section>

        {/* Why Now */}
        <section className="px-6 py-12 md:px-12 bg-muted/30">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-semibold mb-4">Por que isso importa agora?</h2>
            <p className="text-muted-foreground">{paginaCRO.porqueImportaAgora}</p>
          </div>
        </section>

        {/* Benefits */}
        <section className="px-6 py-12 md:px-12">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-semibold text-center mb-8">O que voce vai conquistar</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {paginaCRO.beneficiosDiretos.map((b, i) => (
                <div key={i} className="flex items-start gap-3 p-4 bg-muted/30 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <span>{b}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="px-6 py-12 md:px-12 bg-muted/30">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-semibold text-center mb-8">Como funciona</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {paginaCRO.comoFunciona.map((step, i) => (
                <div key={i} className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center mx-auto mb-4 text-xl font-bold text-primary-foreground">
                    {i + 1}
                  </div>
                  <p>{step.replace(/^\d+\.\s/, '')}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Objections */}
        <section className="px-6 py-12 md:px-12">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-semibold text-center mb-8">Duvidas Frequentes</h2>
            <div className="space-y-4">
              {paginaCRO.quebraObjecoes.map((o, i) => (
                <div key={i} className="p-4 border rounded-xl">
                  <p>{o}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="px-6 py-12 md:px-12 bg-primary/5">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex justify-center gap-1 mb-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="w-6 h-6 text-yellow-500 fill-yellow-500" />
              ))}
            </div>
            <blockquote className="text-lg italic text-muted-foreground mb-4">
              &ldquo;{paginaCRO.provaSocial}&rdquo;
            </blockquote>
          </div>
        </section>

        {/* Video Script */}
        {paginaCRO.roteiroVideo && (
          <section className="px-6 py-12 md:px-12">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-semibold text-center mb-8">Previa do Video</h2>
              <div className="relative aspect-video bg-muted rounded-2xl flex items-center justify-center cursor-pointer overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
                <div className="relative z-10 w-20 h-20 rounded-full bg-primary flex items-center justify-center">
                  <Play className="w-8 h-8 text-primary-foreground ml-1" />
                </div>
                <div className="absolute bottom-4 left-4 right-4 text-center">
                  <p className="text-sm text-muted-foreground bg-background/80 backdrop-blur-sm rounded-lg p-3">
                    {paginaCRO.roteiroVideo.slice(0, 150)}...
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Final CTA */}
        <section className="px-6 py-16 md:px-12 bg-primary">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
              Pronto para transformar seus resultados?
            </h2>
            <p className="text-primary-foreground/80 mb-8">{paginaCRO.urgencia}</p>
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6 rounded-xl">
              {paginaCRO.ctaPrincipal}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}
