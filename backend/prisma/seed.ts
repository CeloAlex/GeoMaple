import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  await prisma.user.upsert({
    where: { login: 'admin' },
    update: {},
    create: {
      nome: 'Administrador do Sistema',
      login: 'admin',
      email: 'cadastro@ouropreto.mg.gov.br',
      senha: await bcrypt.hash('Trocar@2025', 10),
      perm: 'admin',
      matricula: '00001',
      setor: 'Cadastro Técnico Municipal',
      primeiroAcesso: true,
    },
  })

  console.log('Seed concluído: admin inicial criado/atualizado.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
