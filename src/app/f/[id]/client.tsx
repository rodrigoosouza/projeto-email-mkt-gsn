'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'

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

export function PublicFormClient({ form }: { form: FormData }) {
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [values, setValues] = useState<Record<string, string>>({})

  const style = form.style || {}
  const btnColor = style.button_color || '#2563eb'
  const btnText = style.button_text || 'Enviar'
  const isDark = style.theme === 'dark'
  const successMsg = style.success_message || 'Formulario enviado com sucesso!'

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
        }, 1500)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: isDark ? '#0f172a' : '#f8fafc' }}>
        <div className="text-center space-y-4 max-w-md">
          <CheckCircle2 className="h-16 w-16 mx-auto" style={{ color: btnColor }} />
          <h2 className="text-2xl font-bold" style={{ color: isDark ? '#fff' : '#1e293b' }}>{successMsg}</h2>
          {style.redirect_url && (
            <p className="text-sm" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Redirecionando...</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: isDark ? '#0f172a' : '#f8fafc' }}>
      <div
        className="w-full max-w-md rounded-2xl shadow-xl p-8"
        style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff' }}
      >
        <div className="space-y-2 mb-6">
          <h1 className="text-2xl font-bold" style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>
            {form.name}
          </h1>
          {form.description && (
            <p className="text-sm" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
              {form.description}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {form.fields.map((field) => (
            <div key={field.name} className="space-y-1.5">
              <label
                htmlFor={field.name}
                className="text-sm font-medium"
                style={{ color: isDark ? '#e2e8f0' : '#374151' }}
              >
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>

              {field.type === 'textarea' ? (
                <textarea
                  id={field.name}
                  name={field.name}
                  required={field.required}
                  placeholder={field.placeholder || ''}
                  value={values[field.name] || ''}
                  onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 transition-all"
                  style={{
                    backgroundColor: isDark ? '#334155' : '#f9fafb',
                    borderColor: isDark ? '#475569' : '#d1d5db',
                    color: isDark ? '#f1f5f9' : '#1e293b',
                  }}
                />
              ) : field.type === 'select' ? (
                <select
                  id={field.name}
                  name={field.name}
                  required={field.required}
                  value={values[field.name] || ''}
                  onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 transition-all"
                  style={{
                    backgroundColor: isDark ? '#334155' : '#f9fafb',
                    borderColor: isDark ? '#475569' : '#d1d5db',
                    color: isDark ? '#f1f5f9' : '#1e293b',
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
                  className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 transition-all"
                  style={{
                    backgroundColor: isDark ? '#334155' : '#f9fafb',
                    borderColor: isDark ? '#475569' : '#d1d5db',
                    color: isDark ? '#f1f5f9' : '#1e293b',
                  }}
                />
              )}
            </div>
          ))}

          {error && (
            <p className="text-sm text-red-500 bg-red-50 p-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg py-3 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: btnColor }}
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
            ) : (
              btnText
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
