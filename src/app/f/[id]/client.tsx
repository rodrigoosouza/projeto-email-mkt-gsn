'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Loader2, Send, Sparkles } from 'lucide-react'

interface FormField {
  name: string
  label: string
  type: string
  required?: boolean
  placeholder?: string
  options?: string[]
}

interface FormData {
  id: string
  name: string
  description: string | null
  fields: FormField[]
  style: {
    button_color?: string
    button_text?: string
    theme?: string
    success_message?: string
    redirect_url?: string
  } | null
  form_type: string
  org_id: string
}

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return null
  let r = parseInt(result[1], 16) / 255
  let g = parseInt(result[2], 16) / 255
  let b = parseInt(result[3], 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

export function PublicFormClient({ form }: { form: FormData }) {
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [values, setValues] = useState<Record<string, string>>({})
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const style = form.style || {}
  const btnColor = style.button_color || '#6366f1'
  const btnText = style.button_text || 'Enviar'
  const isDark = style.theme === 'dark'
  const successMsg = style.success_message || 'Formulario enviado com sucesso!'

  const hsl = hexToHsl(btnColor)
  const accentHue = hsl ? hsl.h : 240

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch(`/api/forms/${form.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: values,
          source_url: window.location.href,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Erro ao enviar')
      }

      setSubmitted(true)

      if (style.redirect_url) {
        setTimeout(() => {
          window.location.href = style.redirect_url!
        }, 2000)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const bgGradient = isDark
    ? `linear-gradient(135deg, hsl(${accentHue}, 30%, 8%) 0%, hsl(${accentHue + 40}, 25%, 12%) 50%, hsl(${accentHue + 80}, 20%, 10%) 100%)`
    : `linear-gradient(135deg, hsl(${accentHue}, 60%, 97%) 0%, hsl(${accentHue + 40}, 50%, 95%) 50%, hsl(${accentHue + 80}, 45%, 96%) 100%)`

  const cardBg = isDark ? 'rgba(30, 30, 45, 0.85)' : 'rgba(255, 255, 255, 0.85)'
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'

  const inputBg = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)'
  const inputBorder = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
  const inputFocusBorder = btnColor
  const inputText = isDark ? '#f1f5f9' : '#1e293b'
  const inputPlaceholder = isDark ? '#64748b' : '#94a3b8'

  const labelColor = isDark ? '#cbd5e1' : '#475569'
  const titleColor = isDark ? '#f8fafc' : '#0f172a'
  const descColor = isDark ? '#94a3b8' : '#64748b'

  if (submitted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: bgGradient }}
      >
        <div
          className={`text-center max-w-md w-full rounded-3xl p-10 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          style={{
            backgroundColor: cardBg,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${cardBorder}`,
            boxShadow: isDark
              ? '0 25px 60px rgba(0, 0, 0, 0.5)'
              : '0 25px 60px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.03)',
          }}
        >
          <div
            className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${btnColor}, ${btnColor}dd)`,
              boxShadow: `0 8px 32px ${btnColor}40`,
            }}
          >
            <CheckCircle2 className="h-10 w-10 text-white" strokeWidth={2.5} />
          </div>

          <h2
            className="text-2xl font-bold mb-3"
            style={{ color: titleColor }}
          >
            {successMsg}
          </h2>

          <p
            className="text-sm leading-relaxed"
            style={{ color: descColor }}
          >
            Agradecemos pelo seu interesse. Entraremos em contato em breve.
          </p>

          {style.redirect_url && (
            <div className="mt-6 flex items-center justify-center gap-2" style={{ color: descColor }}>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Redirecionando...</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .form-card {
          animation: fadeInUp 0.6s ease-out;
        }
        .form-field {
          animation: fadeInUp 0.5s ease-out backwards;
        }
        .form-input:focus {
          border-color: ${inputFocusBorder} !important;
          box-shadow: 0 0 0 3px ${btnColor}20, 0 1px 3px rgba(0,0,0,0.08) !important;
          outline: none;
        }
        .form-input::placeholder {
          color: ${inputPlaceholder};
        }
        .submit-btn {
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 25px ${btnColor}35;
        }
        .submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .submit-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          background-size: 200% 100%;
          animation: shimmer 3s infinite;
        }
        .form-input {
          transition: all 0.2s ease;
        }
        .form-input:hover {
          border-color: ${btnColor}50 !important;
        }
      `}</style>

      <div
        className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6"
        style={{ background: bgGradient }}
      >
        {/* Decorative blurred orbs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div
            className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-30 blur-3xl"
            style={{ backgroundColor: `${btnColor}30` }}
          />
          <div
            className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-20 blur-3xl"
            style={{ backgroundColor: `hsl(${accentHue + 60}, 60%, 60%)` }}
          />
        </div>

        <div
          className="form-card w-full max-w-lg rounded-3xl relative z-10"
          style={{
            backgroundColor: cardBg,
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: `1px solid ${cardBorder}`,
            boxShadow: isDark
              ? '0 25px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)'
              : '0 25px 60px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.04)',
          }}
        >
          {/* Accent bar at top */}
          <div
            className="h-1.5 rounded-t-3xl"
            style={{
              background: `linear-gradient(90deg, ${btnColor}, hsl(${accentHue + 40}, 70%, 60%))`,
            }}
          />

          <div className="p-8 sm:p-10">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    background: `linear-gradient(135deg, ${btnColor}15, ${btnColor}25)`,
                  }}
                >
                  <Sparkles className="h-5 w-5" style={{ color: btnColor }} />
                </div>
                <div>
                  <h1
                    className="text-2xl sm:text-3xl font-bold tracking-tight"
                    style={{ color: titleColor }}
                  >
                    {form.name}
                  </h1>
                </div>
              </div>
              {form.description && (
                <p
                  className="text-base leading-relaxed ml-[52px]"
                  style={{ color: descColor }}
                >
                  {form.description}
                </p>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {form.fields.map((field, idx) => (
                <div
                  key={field.name}
                  className="form-field space-y-2"
                  style={{ animationDelay: `${idx * 0.06}s` }}
                >
                  <label
                    htmlFor={field.name}
                    className="block text-sm font-semibold"
                    style={{ color: labelColor }}
                  >
                    {field.label}
                    {field.required && (
                      <span className="ml-1" style={{ color: btnColor }}>*</span>
                    )}
                  </label>

                  {field.type === 'textarea' ? (
                    <textarea
                      id={field.name}
                      name={field.name}
                      required={field.required}
                      placeholder={field.placeholder || ''}
                      value={values[field.name] || ''}
                      onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
                      rows={4}
                      className="form-input w-full rounded-xl border px-4 py-3.5 text-sm leading-relaxed resize-none"
                      style={{
                        backgroundColor: inputBg,
                        borderColor: inputBorder,
                        color: inputText,
                      }}
                    />
                  ) : field.type === 'select' ? (
                    <select
                      id={field.name}
                      name={field.name}
                      required={field.required}
                      value={values[field.name] || ''}
                      onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
                      className="form-input w-full rounded-xl border px-4 py-3.5 text-sm appearance-none cursor-pointer"
                      style={{
                        backgroundColor: inputBg,
                        borderColor: inputBorder,
                        color: values[field.name] ? inputText : inputPlaceholder,
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(isDark ? '#64748b' : '#94a3b8')}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 14px center',
                        paddingRight: '2.5rem',
                      }}
                    >
                      <option value="">{field.placeholder || 'Selecione...'}</option>
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={field.name}
                      name={field.name}
                      type={field.type || 'text'}
                      required={field.required}
                      placeholder={field.placeholder || ''}
                      value={values[field.name] || ''}
                      onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
                      className="form-input w-full rounded-xl border px-4 py-3.5 text-sm"
                      style={{
                        backgroundColor: inputBg,
                        borderColor: inputBorder,
                        color: inputText,
                      }}
                    />
                  )}
                </div>
              ))}

              {error && (
                <div
                  className="flex items-center gap-2 text-sm p-3.5 rounded-xl"
                  style={{
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.06)',
                    color: isDark ? '#fca5a5' : '#dc2626',
                    border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.15)'}`,
                  }}
                >
                  <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="submit-btn w-full rounded-xl py-4 text-sm font-bold text-white flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                style={{
                  backgroundColor: btnColor,
                  boxShadow: `0 4px 14px ${btnColor}30`,
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>{btnText}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Powered by footer */}
        <p
          className="mt-8 text-xs tracking-wide relative z-10"
          style={{ color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)' }}
        >
          Powered by Plataforma Email
        </p>
      </div>
    </>
  )
}
