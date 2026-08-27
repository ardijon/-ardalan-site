import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    bankName: process.env.BANK_NAME || '',
    cardNumber: process.env.CARD_NUMBER || '',
    accountHolder: process.env.ACCOUNT_HOLDER || '',
  })
}
