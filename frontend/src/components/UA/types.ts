import type { ImovelRegistro } from '../../types/imovel'

export type UAFormData = {
  insc: string
  prop: string
  uso: string
  st: string
  at_cad: string
  ac_cad: string
  frac_ideal: string
  num_pav: string
  obs: string
}

export function uaParaFormData(ua: ImovelRegistro): UAFormData {
  return {
    insc: ua.insc,
    prop: ua.prop,
    uso: ua.uso,
    st: ua.st,
    at_cad: ua.at_cad != null ? String(ua.at_cad) : '',
    ac_cad: ua.ac_cad != null ? String(ua.ac_cad) : '',
    frac_ideal: ua.frac_ideal ?? '',
    num_pav: ua.num_pav != null ? String(ua.num_pav) : '',
    obs: ua.obs ?? '',
  }
}
