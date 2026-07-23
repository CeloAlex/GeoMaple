import { useEffect, useState } from 'react'
import { api } from '../api/client'

type PreviewResposta = {
  payload: unknown
  erros: string[]
  configurado: boolean
}

type Props = {
  imovelId: number
  insc: string
  onClose: () => void
}

function extrairErro(err: unknown, fallback: string) {
  return (err as { response?: { data?: { erro?: string } } })?.response?.data?.erro ?? fallback
}

export function SinterModal({ imovelId, insc, onClose }: Props) {
  const [preview, setPreview] = useState<PreviewResposta | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [transmitindo, setTransmitindo] = useState(false)
  const [cib, setCib] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    api
      .get<PreviewResposta>(`/api/sinter/preview/${imovelId}`)
      .then(({ data }) => {
        if (!cancelado) setPreview(data)
      })
      .catch((err) => {
        if (!cancelado) setErro(extrairErro(err, 'Não foi possível montar o payload SINTER.'))
      })
      .finally(() => {
        if (!cancelado) setCarregando(false)
      })
    return () => {
      cancelado = true
    }
  }, [imovelId])

  const errosCriticos = (preview?.erros ?? []).filter((e) => !e.toLowerCase().includes('recomendado'))

  async function transmitir() {
    setTransmitindo(true)
    setErro(null)
    try {
      const { data } = await api.post(`/api/sinter/transmitir/${imovelId}`)
      setCib(data.cib)
    } catch (err) {
      setErro(extrairErro(err, 'Falha ao transmitir para o SINTER.'))
    } finally {
      setTransmitindo(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="text-base font-semibold text-navy">📡 Transmissão SINTER/CADURB — {insc}</h2>
          <button onClick={onClose} aria-label="Fechar" className="text-lg text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {carregando && <p className="text-sm text-gray-500">Montando payload…</p>}

          {preview && !preview.configurado && (
            <div className="mb-3 rounded border border-ambar bg-ambar/10 px-3 py-2 text-xs text-navy">
              ⚠️ Integração SINTER não configurada nesta implantação (credenciais ausentes). A transmissão real
              retornará erro até <code>SINTER_CLIENT_ID</code>/<code>SINTER_CLIENT_SECRET</code>/
              <code>SINTER_BASE_URL</code> serem definidas.
            </div>
          )}

          {preview && preview.erros.length > 0 && (
            <div className="mb-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
              <p className="mb-1 font-semibold">Atenção antes de transmitir:</p>
              <ul className="list-inside list-disc space-y-0.5">
                {preview.erros.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          {cib && (
            <div className="mb-3 rounded border border-verde/40 bg-verde/10 px-3 py-2 text-sm text-navy">
              ✅ CIB atribuído: <span className="font-mono font-semibold">{cib}</span>
            </div>
          )}

          {erro && <div className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>}

          {preview && (
            <div>
              <p className="mb-1 text-xs font-semibold text-navy">Payload CADURB (prévia)</p>
              <pre className="max-h-64 overflow-auto rounded bg-[#1a1a2e] p-3 text-[11px] text-[#a8d8a8]">
                {JSON.stringify(preview.payload, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3">
          <button onClick={onClose} className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
            Fechar
          </button>
          <button
            onClick={transmitir}
            disabled={transmitindo || errosCriticos.length > 0 || carregando}
            className="rounded bg-verde px-4 py-2 text-sm font-medium text-white hover:bg-verde/90 disabled:opacity-50"
          >
            {transmitindo ? 'Transmitindo…' : cib ? '🔄 Re-transmitir' : '📡 Transmitir para SINTER'}
          </button>
        </div>
      </div>
    </div>
  )
}
