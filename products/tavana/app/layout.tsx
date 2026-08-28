export const metadata = {
  title: 'توانا — سیستم جذب هوشمند نماینده بیمه',
  description: 'سیستم هوشمند ارزیابی و جذب نماینده بیمه با فیلترینگ رفتاری و امتیازدهی خودکار',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}