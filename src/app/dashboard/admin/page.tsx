'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { LocalStorage } from '@/lib/store';
import { User } from '@/types';
import { getNextAvailableMonth } from '@/lib/utils';

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentActiveMonth, setCurrentActiveMonth] = useState({ month: 7, year: 2025 });

  useEffect(() => {
    if (isLoaded && user) {
      const allUsers = LocalStorage.getUsers();
      const userData = allUsers.find(u => u.id === user.id);
      const activeMonth = LocalStorage.getCurrentActiveMonth();
      
      setUsers(allUsers);
      setCurrentUser(userData || null);
      setIsAdmin(userData?.isAdmin || false);
      setCurrentActiveMonth(activeMonth);
    }
  }, [isLoaded, user]);

  const toggleAdminStatus = (userId: string) => {
    const updatedUsers = users.map(u => 
      u.id === userId ? { ...u, isAdmin: !u.isAdmin } : u
    );
    setUsers(updatedUsers);
    LocalStorage.saveUsers(updatedUsers);
    
    if (userId === currentUser?.id) {
      setIsAdmin(!isAdmin);
    }
  };

  const removeUser = (userId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
      const updatedUsers = users.filter(u => u.id !== userId);
      setUsers(updatedUsers);
      LocalStorage.saveUsers(updatedUsers);
    }
  };

  const advanceToNextMonth = () => {
    const nextMonth = getNextAvailableMonth();
    LocalStorage.setCurrentActiveMonth(nextMonth.month, nextMonth.year);
    setCurrentActiveMonth(nextMonth);
  };

  const setCustomMonth = (month: number, year: number) => {
    LocalStorage.setCurrentActiveMonth(month, year);
    setCurrentActiveMonth({ month, year });
  };

  if (!isLoaded) {
    return <div className="flex justify-center items-center min-h-screen">Cargando...</div>;
  }

  if (!currentUser || !isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h1 className="text-xl font-semibold text-red-800 mb-2">Acceso Denegado</h1>
          <p className="text-red-600">
            No tienes permisos de administrador para acceder a esta página.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 p-8 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-violet-500 to-purple-500 rounded-2xl flex items-center justify-center">
              <span className="text-2xl">⚙️</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Panel de Administración</h1>
              <p className="text-slate-600 text-lg">Gestiona usuarios, permisos y configuración del sistema</p>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 p-8 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-gradient-to-r from-emerald-100 to-emerald-200 rounded-2xl flex items-center justify-center">
              <span className="text-2xl">📅</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Gestión de Mes Activo</h2>
              <p className="text-slate-600">Controla qué mes ven los usuarios por defecto</p>
            </div>
          </div>
          
          <div className="bg-slate-50 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-slate-700 font-medium mb-1">
                  Mes activo actual:
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {new Date(currentActiveMonth.year, currentActiveMonth.month - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  Este es el mes que se muestra por defecto a todos los usuarios
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col lg:flex-row gap-4">
            <button
              onClick={advanceToNextMonth}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-3 rounded-xl font-semibold hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              🚀 Avanzar al Siguiente Mes
            </button>
            
            <div className="flex gap-3">
              <select
                value={currentActiveMonth.month}
                onChange={(e) => setCustomMonth(parseInt(e.target.value), currentActiveMonth.year)}
                className="border border-slate-300 rounded-xl px-4 py-3 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(currentActiveMonth.year, i, 1).toLocaleDateString('es-ES', { month: 'long' })}
                  </option>
                ))}
              </select>
              <select
                value={currentActiveMonth.year}
                onChange={(e) => setCustomMonth(currentActiveMonth.month, parseInt(e.target.value))}
                className="border border-slate-300 rounded-xl px-4 py-3 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                <option value={new Date().getFullYear() + 1}>{new Date().getFullYear() + 1}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-gradient-to-r from-sky-100 to-sky-200 rounded-2xl flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Usuarios Registrados ({users.length})
              </h2>
              <p className="text-slate-600">Gestiona permisos y usuarios del sistema</p>
            </div>
          </div>
        
          {users.length > 0 ? (
            <div className="bg-white rounded-xl overflow-hidden border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left py-4 px-6 font-semibold text-slate-900">Foto</th>
                      <th className="text-left py-4 px-6 font-semibold text-slate-900">Nombre</th>
                      <th className="text-left py-4 px-6 font-semibold text-slate-900">Email</th>
                      <th className="text-center py-4 px-6 font-semibold text-slate-900">Administrador</th>
                      <th className="text-center py-4 px-6 font-semibold text-slate-900">Fecha de Registro</th>
                      <th className="text-center py-4 px-6 font-semibold text-slate-900">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(userData => (
                      <tr key={userData.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-6">
                          {userData.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={userData.imageUrl} 
                              alt={userData.name}
                              className="w-10 h-10 rounded-full border-2 border-slate-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-emerald-100 to-sky-100 flex items-center justify-center border-2 border-slate-200">
                              <span className="text-slate-700 text-sm font-bold">
                                {userData.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                    </td>
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-semibold text-slate-900">{userData.name}</p>
                            {userData.nickname && (
                              <p className="text-sm text-slate-500">@{userData.nickname}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-slate-600">{userData.email}</td>
                        <td className="py-4 px-6 text-center">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            userData.isAdmin 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {userData.isAdmin ? '✓ Admin' : 'Usuario'}
                          </span>
                    </td>
                        <td className="py-4 px-6 text-center text-slate-600 font-medium">
                          {new Date(userData.createdAt).toLocaleDateString('es-ES')}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="flex justify-center space-x-2">
                            <button
                              onClick={() => toggleAdminStatus(userData.id)}
                              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                userData.isAdmin
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'
                                  : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200'
                              }`}
                            >
                              {userData.isAdmin ? '🔒 Quitar Admin' : '🔑 Hacer Admin'}
                            </button>
                            
                            {userData.id !== currentUser.id && (
                              <button
                                onClick={() => removeUser(userData.id)}
                                className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-100 text-red-700 hover:bg-red-200 border border-red-200 transition-all"
                              >
                                🗑️ Eliminar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">👥</span>
              </div>
              <p className="text-slate-500 text-lg font-medium">
                No hay usuarios registrados
              </p>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 mt-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <span className="text-lg">⚠️</span>
            </div>
            <h3 className="font-bold text-amber-800">Nota Importante</h3>
          </div>
          <p className="text-amber-700 leading-relaxed">
            Los permisos de administrador permiten gestionar usuarios, crear partidos, organizar equipos y registrar resultados. 
            Ten cuidado al otorgar estos permisos ya que dan acceso completo al sistema.
          </p>
        </div>
      </div>
  );
}