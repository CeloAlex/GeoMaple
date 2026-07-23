import bcrypt from 'bcrypt'
import { prisma } from '../db'
import { AppError } from '../utils/errors'
import { gerarSenhaTemporaria } from '../utils/senha'
import { gerarLoginSugerido } from '../utils/slug'
import { registrarAuditoria, calcDiff } from './auditService'

const PERFIS_VALIDOS = ['admin', 'editor', 'viewer']

function semSenha<T extends { senha: string }>(usuario: T) {
  const { senha: _senha, ...resto } = usuario
  return resto
}

export async function listarUsuarios(ativo?: boolean) {
  const usuarios = await prisma.user.findMany({
    where: ativo === undefined ? {} : { ativo },
    orderBy: { nome: 'asc' },
  })
  return usuarios.map(semSenha)
}

export async function obterUsuario(id: number) {
  const usuario = await prisma.user.findUnique({ where: { id } })
  if (!usuario) throw new AppError(404, 'Usuário não encontrado')
  return semSenha(usuario)
}

async function gerarLoginUnico(nome: string) {
  const base = gerarLoginSugerido(nome)
  let login = base
  let sufixo = 2
  while (await prisma.user.findUnique({ where: { login } })) {
    login = `${base}${sufixo}`
    sufixo++
  }
  return login
}

export async function criarUsuario(
  dados: {
    nome: string
    email: string
    login?: string
    perm?: string
    matricula?: string
    setor?: string
    telefone?: string
  },
  criadoPorId: number,
) {
  if (!dados.nome || !dados.email) {
    throw new AppError(400, 'nome e email são obrigatórios')
  }

  const perm = dados.perm ?? 'viewer'
  if (!PERFIS_VALIDOS.includes(perm)) {
    throw new AppError(400, `perm deve ser um de: ${PERFIS_VALIDOS.join(', ')}`)
  }

  const emailExistente = await prisma.user.findUnique({ where: { email: dados.email } })
  if (emailExistente) throw new AppError(409, 'Já existe um operador com este e-mail')

  const login = dados.login ?? (await gerarLoginUnico(dados.nome))
  const loginExistente = await prisma.user.findUnique({ where: { login } })
  if (loginExistente) throw new AppError(409, 'Já existe um operador com este login')

  const senhaTemporaria = gerarSenhaTemporaria()
  const senha = await bcrypt.hash(senhaTemporaria, 10)

  const usuario = await prisma.user.create({
    data: {
      nome: dados.nome,
      email: dados.email,
      login,
      senha,
      perm,
      matricula: dados.matricula,
      setor: dados.setor,
      telefone: dados.telefone,
      primeiroAcesso: true,
      createdBy: criadoPorId,
    },
  })

  await registrarAuditoria({
    userId: criadoPorId,
    acao: 'USER_CRIADO',
    entidade: `User:${usuario.id}`,
    detalhe: { login: usuario.login, perm: usuario.perm },
  })

  return { usuario: semSenha(usuario), senhaTemporaria }
}

export async function editarUsuario(
  id: number,
  dados: Record<string, unknown>,
  solicitante: { id: number; perm: string },
) {
  const usuario = await prisma.user.findUnique({ where: { id } })
  if (!usuario) throw new AppError(404, 'Usuário não encontrado')

  const isAdmin = solicitante.perm === 'admin'
  const isProprio = solicitante.id === id

  if (!isAdmin && !isProprio) {
    throw new AppError(403, 'Sem permissão para editar este operador')
  }

  const camposPessoais = ['nome', 'email', 'telefone']
  const camposAdmin = [...camposPessoais, 'login', 'perm', 'matricula', 'setor']
  const camposPermitidos = isAdmin ? camposAdmin : camposPessoais

  const atualizacao: Record<string, unknown> = {}
  for (const campo of camposPermitidos) {
    if (campo in dados) atualizacao[campo] = dados[campo]
  }

  if ('perm' in atualizacao && !PERFIS_VALIDOS.includes(atualizacao.perm as string)) {
    throw new AppError(400, `perm deve ser um de: ${PERFIS_VALIDOS.join(', ')}`)
  }

  if (atualizacao.email) {
    const emailExistente = await prisma.user.findUnique({ where: { email: atualizacao.email as string } })
    if (emailExistente && emailExistente.id !== id) {
      throw new AppError(409, 'Já existe um operador com este e-mail')
    }
  }

  if (atualizacao.login) {
    const loginExistente = await prisma.user.findUnique({ where: { login: atualizacao.login as string } })
    if (loginExistente && loginExistente.id !== id) {
      throw new AppError(409, 'Já existe um operador com este login')
    }
  }

  const atualizado = await prisma.user.update({ where: { id }, data: atualizacao })
  // Nunca logar a senha (não faz parte de camposPermitidos, mas reforça a regra aqui)
  const { antes, depois } = calcDiff(usuario, atualizado, Object.keys(atualizacao).filter((c) => c !== 'senha'))

  await registrarAuditoria({
    userId: solicitante.id,
    acao: 'USER_EDITADO',
    entidade: `User:${id}`,
    detalhe: { antes, depois },
  })

  return semSenha(atualizado)
}

export async function alterarSenhaOperador(
  id: number,
  solicitante: { id: number; perm: string },
  body: { senhaAtual?: string; senhaNova?: string },
) {
  const usuario = await prisma.user.findUnique({ where: { id } })
  if (!usuario) throw new AppError(404, 'Usuário não encontrado')

  const isAdmin = solicitante.perm === 'admin'
  const isProprio = solicitante.id === id

  if (!isAdmin && !isProprio) {
    throw new AppError(403, 'Sem permissão para alterar a senha deste operador')
  }

  if (isProprio) {
    if (!body.senhaAtual || !body.senhaNova) {
      throw new AppError(400, 'senhaAtual e senhaNova são obrigatórios')
    }
    const senhaValida = await bcrypt.compare(body.senhaAtual, usuario.senha)
    if (!senhaValida) throw new AppError(401, 'Senha atual incorreta')
    if (body.senhaNova.length < 8) {
      throw new AppError(400, 'A nova senha deve ter no mínimo 8 caracteres')
    }

    const senha = await bcrypt.hash(body.senhaNova, 10)
    await prisma.user.update({ where: { id }, data: { senha, primeiroAcesso: false } })
    await registrarAuditoria({ userId: solicitante.id, acao: 'SENHA_TROCA', entidade: `User:${id}` })
    return { senhaTemporaria: undefined }
  }

  // Admin resetando a senha de outro operador: gera nova senha temporária
  const senhaTemporaria = gerarSenhaTemporaria()
  const senha = await bcrypt.hash(senhaTemporaria, 10)
  await prisma.user.update({
    where: { id },
    data: { senha, primeiroAcesso: true, tentativasFalhas: 0 },
  })

  await registrarAuditoria({
    userId: solicitante.id,
    acao: 'SENHA_TROCA_FORCADA',
    entidade: `User:${id}`,
  })

  return { senhaTemporaria }
}

export async function alterarStatusAtivo(
  id: number,
  ativo: boolean,
  solicitante: { id: number; perm: string },
) {
  if (solicitante.perm !== 'admin') {
    throw new AppError(403, 'Somente administradores podem ativar/desativar operadores')
  }

  if (solicitante.id === id && !ativo) {
    throw new AppError(400, 'Você não pode desativar a si mesmo')
  }

  const usuario = await prisma.user.findUnique({ where: { id } })
  if (!usuario) throw new AppError(404, 'Usuário não encontrado')

  if (!ativo && usuario.perm === 'admin') {
    const adminsAtivos = await prisma.user.count({ where: { perm: 'admin', ativo: true } })
    if (adminsAtivos <= 1) {
      throw new AppError(400, 'Não é possível desativar o último administrador ativo')
    }
  }

  const atualizado = await prisma.user.update({ where: { id }, data: { ativo } })

  await registrarAuditoria({
    userId: solicitante.id,
    acao: ativo ? 'USER_REATIVADO' : 'USER_DESATIVADO',
    entidade: `User:${id}`,
  })

  return semSenha(atualizado)
}
