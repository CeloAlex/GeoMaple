// Configuração do município atendido por esta implantação do GeoMaple.
// Nada aqui deve ser hardcoded em outros arquivos — sempre importar deste módulo,
// para que uma nova prefeitura possa ser atendida apenas trocando as variáveis de ambiente.
export const municipio = {
  nome: process.env.MUNICIPIO_NOME ?? 'Ouro Preto',
  uf: process.env.MUNICIPIO_UF ?? 'MG',
  ibge: process.env.MUNICIPIO_IBGE ?? '3146107',
  centro: {
    lat: Number(process.env.MUNICIPIO_CENTRO_LAT ?? -20.3855),
    lng: Number(process.env.MUNICIPIO_CENTRO_LNG ?? -43.5035),
    zoom: Number(process.env.MUNICIPIO_CENTRO_ZOOM ?? 17),
  },
}
