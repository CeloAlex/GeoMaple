export function Legend() {
  return (
    <div className="absolute right-2.5 bottom-9 z-700 rounded-lg bg-white px-3 py-2.5 text-[10.5px] text-gray-700 shadow-lg">
      <h4 className="mb-1.5 text-[11px] font-bold">Legenda</h4>
      <div className="flex items-center gap-1.5 py-0.5">
        <span className="inline-block h-2.5 w-3.5 rounded-[2px] border-2 border-[#2980b9] bg-[#d6eaf8]" />
        Cadastro Definitivo
      </div>
      <div className="flex items-center gap-1.5 py-0.5">
        <span className="inline-block h-2.5 w-3.5 rounded-[2px] border-2 border-dashed border-[#e67e22] bg-[#e67e22]/20" />
        Delimitação Provisória
      </div>
      <div className="flex items-center gap-1.5 py-0.5">
        <span className="inline-block h-2.5 w-3.5 rounded-[2px] border-2 border-[#c9a227] bg-[#c9a227]/15" />
        Quadras georreferenciadas
      </div>
      <div className="flex items-center gap-1.5 py-0.5">
        <span className="inline-block h-2.5 w-3.5 rounded-[2px] border-2 border-[#f1c40f] bg-[#f1c40f]/30" />
        Imóvel selecionado
      </div>
    </div>
  )
}
