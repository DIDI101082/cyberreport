'use client'

import { Shield, Key, Globe, Bell } from 'lucide-react'

const SECTIONS = [
  {
    title: 'API de Inteligencia Artificial',
    icon: Key,
    description: 'Configurá tu clave de Anthropic para usar la generación con IA.',
    content: (
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Clave de API Anthropic</label>
          <input
            type="password"
            defaultValue="sk-ant-api..."
            readOnly
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 font-mono text-gray-500"
          />
          <p className="text-xs text-gray-400 mt-1">Configurada en las variables de entorno del servidor (<code>ANTHROPIC_API_KEY</code>)</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
          <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="claude-opus-4-5">claude-opus-4-5 (Recomendado)</option>
            <option value="claude-sonnet-4-5">claude-sonnet-4-5 (Más rápido)</option>
          </select>
        </div>
      </div>
    ),
  },
  {
    title: 'Configuración de la empresa',
    icon: Globe,
    description: 'Datos de tu organización que aparecerán en los reportes.',
    content: (
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la empresa</label>
          <input
            defaultValue="Accusys Technology"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sitio web</label>
          <input
            defaultValue="https://accusys.com.ar"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email de contacto</label>
          <input
            defaultValue="info@accusys.com.ar"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>
    ),
  },
  {
    title: 'Seguridad',
    icon: Shield,
    description: 'Configuraciones de seguridad de la plataforma.',
    content: (
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-gray-900">Autenticación de dos factores</p>
            <p className="text-xs text-gray-500">Requerida para todos los usuarios</p>
          </div>
          <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-full font-medium">Activo</span>
        </div>
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-gray-900">Row Level Security (Supabase)</p>
            <p className="text-xs text-gray-500">Aislamiento de datos por tenant</p>
          </div>
          <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-full font-medium">Activo</span>
        </div>
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-gray-900">Cifrado en tránsito</p>
            <p className="text-xs text-gray-500">HTTPS/TLS en toda la plataforma</p>
          </div>
          <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-full font-medium">Activo</span>
        </div>
      </div>
    ),
  },
]

export default function SettingsPage() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-500 text-sm mt-1">Ajustes de la plataforma CyberReport</p>
      </div>

      <div className="space-y-6">
        {SECTIONS.map(({ title, icon: Icon, description, content }) => (
          <div key={title} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <Icon className="w-4 h-4 text-blue-600" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4 ml-11">{description}</p>
            {content}
          </div>
        ))}
      </div>
    </div>
  )
}
