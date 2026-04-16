import { X, UserCog, UserPlus, UserMinus, UserPen, ShieldCheck, User } from "lucide-react"

interface AdminSidebarProps {
  userName: string
  userEmail: string
  isAdmin: boolean
  onClose: () => void
  onNavigate: (page: "criar" | "deletar" | "editar") => void
  activePage: "criar" | "deletar" | "editar" | null
}

export function AdminSidebar({
  userName,
  userEmail,
  isAdmin,
  onClose,
  onNavigate,
  activePage,
}: AdminSidebarProps) {
  const menuItems = [
    { id: "criar",   label: "Criar Usuário",   icon: UserPlus,  color: "text-green-600"  },
    { id: "editar",  label: "Editar Usuário",   icon: UserPen,   color: "text-blue-600"   },
    { id: "deletar", label: "Deletar Usuário",  icon: UserMinus, color: "text-red-600"    },
  ] as const

  return (
    <>
      {/* Overlay escuro atrás do sidebar */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-72 bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-left duration-300">

        {/* Header do sidebar */}
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 px-6 py-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2 text-white font-semibold">
              <UserCog className="w-5 h-5" />
              <span>Painel Admin</span>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Info do usuário */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-white" />
            </div>
            <div className="overflow-hidden">
              <p className="text-white font-semibold text-sm truncate">{userName}</p>
              <p className="text-blue-100 text-xs truncate">{userEmail}</p>
              <div className="flex items-center gap-1 mt-1">
                {isAdmin ? (
                  <span className="flex items-center gap-1 bg-yellow-400/20 text-yellow-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-yellow-300/30">
                    <ShieldCheck className="w-3 h-3" />
                    Administrador
                  </span>
                ) : (
                  <span className="flex items-center gap-1 bg-white/10 text-blue-100 text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/20">
                    <User className="w-3 h-3" />
                    Usuário
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Menu de navegação */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-3">
            Gerenciar Usuários
          </p>
          {menuItems.map(({ id, label, icon: Icon, color }) => (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activePage === id
                  ? "bg-blue-50 text-blue-700 shadow-sm"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon className={`w-4 h-4 ${activePage === id ? "text-blue-500" : color}`} />
              {label}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100">
          <p className="text-[10px] text-gray-400 text-center">
            PetShop Manager — Painel Admin
          </p>
        </div>
      </div>
    </>
  )
}
