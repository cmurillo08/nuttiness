import './globals.css'

export const metadata = {
  title: 'Nuttiness'
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
