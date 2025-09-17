import React from 'react'

export default function App() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Quiz Giustizia</h1>
      <nav className="flex space-x-4 mb-6">
        <button className="px-4 py-2 rounded bg-blue-600 text-white">Esercitati</button>
        <button className="px-4 py-2 rounded bg-gray-200">Crea</button>
        <button className="px-4 py-2 rounded bg-gray-200">Archivio</button>
        <button className="px-4 py-2 rounded bg-gray-200">Impostazioni</button>
      </nav>
      <p className="text-gray-700">Benvenuto! Qui potrai gestire i tuoi quiz per il concorso.</p>
    </div>
  )
}
