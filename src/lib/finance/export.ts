import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import type { FinanceAccount, Transaction, Budget } from '@/stores/finance-store'
import { formatCurrency } from './currency'

interface ExportReportOptions {
  accounts: FinanceAccount[]
  transactions: Transaction[]
  budgets: Budget[]
  dateRange: { start: string; end: string }
  totalIncome: number
  totalExpense: number
  currency: string
}

export const exportFinanceReportToPDF = ({
  accounts,
  transactions,
  budgets,
  dateRange,
  totalIncome,
  totalExpense,
  currency,
}: ExportReportOptions) => {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  const margin = 20

  // Title
  doc.setFontSize(22)
  doc.setTextColor(16, 185, 129) // Emerald-500
  doc.text('Life OS - Financial Report', margin, 25)

  // Date Range
  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139) // Gray-500
  const rangeText = dateRange.start && dateRange.end 
    ? `${format(new Date(dateRange.start), 'PPP')} - ${format(new Date(dateRange.end), 'PPP')}`
    : 'Full History'
  doc.text(`Period: ${rangeText}`, margin, 32)
  doc.text(`Generated on: ${format(new Date(), 'PPP p')}`, margin, 37)

  // Summary Cards
  doc.setDrawColor(226, 232, 240) // Slate-200
  doc.line(margin, 45, pageWidth - margin, 45)

  doc.setFontSize(12)
  doc.setTextColor(30, 41, 59) // Slate-800
  doc.text('Summary', margin, 55)

  const summaryY = 65
  const boxWidth = (pageWidth - margin * 2 - 10) / 3

  // Income Box
  doc.setFillColor(240, 253, 244) // Emerald-50
  doc.rect(margin, summaryY, boxWidth, 25, 'F')
  doc.setFontSize(10)
  doc.setTextColor(5, 150, 105) // Emerald-600
  doc.text('Total Income', margin + 5, summaryY + 8)
  doc.setFontSize(12)
  doc.text(formatCurrency(totalIncome, currency), margin + 5, summaryY + 18)

  // Expense Box
  doc.setFillColor(254, 242, 242) // Rose-50
  doc.rect(margin + boxWidth + 5, summaryY, boxWidth, 25, 'F')
  doc.setTextColor(225, 29, 72) // Rose-600
  doc.text('Total Expense', margin + boxWidth + 10, summaryY + 8)
  doc.text(formatCurrency(totalExpense, currency), margin + boxWidth + 10, summaryY + 18)

  // Net Box
  const net = totalIncome - totalExpense
  doc.setFillColor(248, 250, 252) // Slate-50
  doc.rect(margin + (boxWidth + 5) * 2, summaryY, boxWidth, 25, 'F')
  doc.setTextColor(net >= 0 ? 5 : 225, net >= 0 ? 150 : 29, net >= 0 ? 105 : 72)
  doc.text('Net Balance', margin + (boxWidth + 5) * 2 + 5, summaryY + 8)
  doc.text(formatCurrency(net, currency), margin + (boxWidth + 5) * 2 + 5, summaryY + 18)

  // Accounts Table
  doc.setFontSize(12)
  doc.setTextColor(30, 41, 59)
  doc.text('Account Balances', margin, 105)

  autoTable(doc, {
    startY: 110,
    head: [['Account', 'Type', 'Balance']],
    body: accounts.map(a => [
      a.name,
      a.type.charAt(0).toUpperCase() + a.type.slice(1),
      formatCurrency(a.balance, a.currency)
    ]),
    headStyles: { fillColor: [16, 185, 129], textColor: 255 },
    margin: { left: margin, right: margin },
  })

  // Transactions Table
  const finalY = (doc as any).lastAutoTable.finalY || 150
  doc.setFontSize(12)
  doc.text('Transactions', margin, finalY + 15)

  autoTable(doc, {
    startY: finalY + 20,
    head: [['Date', 'Description', 'Category', 'Type', 'Amount']],
    body: transactions.slice(0, 50).map(t => [
      format(new Date(t.date), 'MMM d, yyyy'),
      t.description,
      t.categoryName || 'Uncategorized',
      t.type.toUpperCase(),
      { content: formatCurrency(t.amount, currency), styles: { textColor: t.type === 'income' ? [5, 150, 105] : [225, 29, 72] } }
    ]),
    headStyles: { fillColor: [16, 185, 129], textColor: 255 },
    margin: { left: margin, right: margin },
  })

  // Footer
  const pageCount = doc.internal.pages.length - 1
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    )
  }

  // Save the PDF
  doc.save(`LifeOS_Finance_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
}
