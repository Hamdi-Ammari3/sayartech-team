import React from 'react'
import './style.css'
import { Cairo } from 'next/font/google'
import { GlobalStateProvider } from '../globalState'

const cairo = Cairo({
  subsets:['latin'],
  weight:['400','700'],
  display:'swap'
})

export const metadata = {
  title: "SAFE - سيف",
  description: "Your kids journey to school is our mission",
};


export default function RootLayout({children}) {
  return (
    <html lang="en" className={cairo.className}>
      <body id='app-container'>
        <GlobalStateProvider>
          {children}
        </GlobalStateProvider> 
      </body>
    </html>
  )
}
