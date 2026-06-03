import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database with clean initial state...')

  // Clean existing data
  await prisma.timeEntry.deleteMany()
  await prisma.calendarEvent.deleteMany()
  await prisma.courseResource.deleteMany()
  await prisma.course.deleteMany()
  await prisma.milestone.deleteMany()
  await prisma.goalTag.deleteMany()
  await prisma.goalProject.deleteMany()
  await prisma.goal.deleteMany()
  await prisma.budgetItem.deleteMany()
  await prisma.budget.deleteMany()
  await prisma.transaction.deleteMany()
  await prisma.transactionCategory.deleteMany()
  await prisma.financeAccount.deleteMany()
  await prisma.journalTag.deleteMany()
  await prisma.journalEntry.deleteMany()
  await prisma.habitLog.deleteMany()
  await prisma.habitTag.deleteMany()
  await prisma.habit.deleteMany()
  await prisma.bookmarkTag.deleteMany()
  await prisma.bookmark.deleteMany()
  await prisma.noteLink.deleteMany()
  await prisma.noteTag.deleteMany()
  await prisma.note.deleteMany()
  await prisma.noteFolder.deleteMany()
  await prisma.taskDependency.deleteMany()
  await prisma.taskTag.deleteMany()
  await prisma.task.deleteMany()
  await prisma.project.deleteMany()
  await prisma.tag.deleteMany()
  await prisma.settings.deleteMany()
  await prisma.userProfile.deleteMany()
  await prisma.widget.deleteMany()
  await prisma.workspace.deleteMany()

  // ============================================
  // Default User Profile (minimal, clean)
  // ============================================
  console.log('  Creating default user profile...')
  await prisma.userProfile.create({
    data: {
      name: '',
      email: '',
      timezone: 'UTC',
      locale: 'en',
      theme: 'system',
      setupComplete: false,
      settings: {
        create: {
          currency: 'USD',
          weekStartsOn: 1,
          defaultView: 'dashboard',
        },
      },
    },
  })

  // ============================================
  // Default Finance Categories (essential for app functionality)
  // ============================================
  console.log('  Creating default transaction categories...')
  const defaultCategories = [
    { name: 'Salary', icon: '💰', color: '#22c55e', type: 'income' as const },
    { name: 'Freelance', icon: '💻', color: '#3b82f6', type: 'income' as const },
    { name: 'Investment Income', icon: '📈', color: '#8b5cf6', type: 'income' as const },
    { name: 'Other Income', icon: '💵', color: '#06b6d4', type: 'income' as const },
    { name: 'Groceries', icon: '🛒', color: '#f97316', type: 'expense' as const },
    { name: 'Rent', icon: '🏠', color: '#ef4444', type: 'expense' as const, isSystem: true },
    { name: 'Utilities', icon: '⚡', color: '#eab308', type: 'expense' as const },
    { name: 'Transportation', icon: '🚗', color: '#8b5cf6', type: 'expense' as const },
    { name: 'Entertainment', icon: '🎬', color: '#ec4899', type: 'expense' as const },
    { name: 'Dining Out', icon: '🍽️', color: '#06b6d4', type: 'expense' as const },
    { name: 'Healthcare', icon: '🏥', color: '#dc2626', type: 'expense' as const },
    { name: 'Shopping', icon: '🛍️', color: '#f43f5e', type: 'expense' as const },
    { name: 'Education', icon: '📚', color: '#10b981', type: 'expense' as const },
    { name: 'Savings', icon: '🏦', color: '#22c55e', type: 'expense' as const },
    { name: 'Other Expense', icon: '📦', color: '#64748b', type: 'expense' as const },
  ]

  for (const category of defaultCategories) {
    await prisma.transactionCategory.create({ data: category })
  }

  // ============================================
  // Default Note Folders (essential for app functionality)
  // ============================================
  console.log('  Creating default note folders...')
  await Promise.all([
    prisma.noteFolder.create({ data: { name: 'Personal', icon: '📁', color: '#22c55e', order: 0 } }),
    prisma.noteFolder.create({ data: { name: 'Work', icon: '💼', color: '#3b82f6', order: 1 } }),
    prisma.noteFolder.create({ data: { name: 'Ideas', icon: '💡', color: '#eab308', order: 2 } }),
  ])

  // ============================================
  // Default Finance Account (essential for app functionality)
  // ============================================
  console.log('  Creating default finance account...')
  await prisma.financeAccount.create({
    data: {
      name: 'Main Account',
      type: 'checking',
      balance: 0,
      currency: 'USD',
      color: '#3b82f6',
      icon: '🏦',
      isDefault: true,
    },
  })

  console.log('✅ Clean seed complete!')
  console.log('  - 1 empty user profile (setup not complete)')
  console.log('  - 15 default transaction categories')
  console.log('  - 3 default note folders')
  console.log('  - 1 default finance account')
  console.log('  - No demo/mock data')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
