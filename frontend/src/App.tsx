import { useEffect } from 'react'
import { useAuthStore } from './store/authStore'
import { useMunicipioStore } from './store/municipioStore'
import { Login } from './pages/Login'
import { TrocaSenhaObrigatoria } from './pages/TrocaSenhaObrigatoria'
import { MainLayout } from './components/MainLayout'

function App() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const primeiroAcesso = useAuthStore((s) => s.usuario?.primeiroAcesso)
  const carregarMunicipio = useMunicipioStore((s) => s.carregar)

  useEffect(() => {
    carregarMunicipio()
  }, [carregarMunicipio])

  if (!accessToken) return <Login />
  if (primeiroAcesso) return <TrocaSenhaObrigatoria />
  return <MainLayout />
}

export default App
