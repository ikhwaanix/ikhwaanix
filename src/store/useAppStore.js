import { create } from 'zustand';
import { api } from '../utils/api';

export const useAppStore = create((set, get) => ({
  currentUser: JSON.parse(localStorage.getItem('currentUser')) || null,
  isAuthenticated: !!localStorage.getItem('currentUser') && sessionStorage.getItem('isAuthenticated') === 'true',
  darkMode: localStorage.getItem('darkMode') === 'true',
  settings: null,
  announcements: [],
  notifications: JSON.parse(localStorage.getItem('notifications')) || [],
  
  // ==========================================
  // AUTHENTICATION ACTIONS
  // ==========================================
  
  login: async (no_ktm, no_kta, passkey) => {
    try {
      const response = await api.post('/auth/login', { no_ktm, no_kta, passkey });
      set({ currentUser: response.user, isAuthenticated: true });
      localStorage.setItem('currentUser', JSON.stringify(response.user));
      sessionStorage.setItem('isAuthenticated', 'true');
      
      // Load initial notifications for this user
      get().addNotification(`Selamat datang kembali, ${response.user.nama_lengkap}!`);
      return response.user;
    } catch (error) {
      throw error;
    }
  },
  
  loginQR: async (id_anggota_ikhwaan) => {
    try {
      const response = await api.post('/auth/login-qr', { id_anggota_ikhwaan });
      set({ currentUser: response.user, isAuthenticated: true });
      localStorage.setItem('currentUser', JSON.stringify(response.user));
      sessionStorage.setItem('isAuthenticated', 'true');
      
      get().addNotification(`Selamat datang kembali, ${response.user.nama_lengkap}!`);
      return response.user;
    } catch (error) {
      throw error;
    }
  },
  
  registerPasskey: async (no_ktm, no_kta, passkey) => {
    try {
      const response = await api.post('/auth/register-passkey', { no_ktm, no_kta, passkey });
      set({ currentUser: response.user, isAuthenticated: true });
      localStorage.setItem('currentUser', JSON.stringify(response.user));
      sessionStorage.setItem('isAuthenticated', 'true');
      get().addNotification(`Passkey berhasil dibuat. Selamat datang, ${response.user.nama_lengkap}!`);
      return response.user;
    } catch (error) {
      throw error;
    }
  },
  
  unlock: async (passkey) => {
    try {
      const user = get().currentUser;
      if (!user) throw new Error('Sesi tidak ditemukan. Harap login kembali.');
      
      const response = await api.post('/auth/unlock', { id_anggota: user.id_anggota, passkey });
      set({ currentUser: response.user, isAuthenticated: true });
      localStorage.setItem('currentUser', JSON.stringify(response.user));
      sessionStorage.setItem('isAuthenticated', 'true');
      return response.user;
    } catch (error) {
      throw error;
    }
  },
  
  logout: () => {
    set({ currentUser: null, isAuthenticated: false, notifications: [] });
    localStorage.removeItem('currentUser');
    localStorage.removeItem('notifications');
    sessionStorage.removeItem('isAuthenticated');
  },
  
  // ==========================================
  // CONFIGURATION & THEME ACTIONS
  // ==========================================
  
  toggleTheme: async () => {
    const nextMode = !get().darkMode;
    set({ darkMode: nextMode });
    localStorage.setItem('darkMode', String(nextMode));
    
    // Save to settings backend if admin
    const user = get().currentUser;
    if (user && user.role === 'Admin') {
      try {
        await api.post('/pengaturan', { dark_mode: nextMode });
      } catch (error) {
        console.error('Gagal menyimpan tema ke server:', error);
      }
    }
  },
  
  loadSettings: async () => {
    try {
      const settings = await api.get('/pengaturan');
      set({ settings });
      
      // Sync theme with server-wide theme setting if no local preference
      if (localStorage.getItem('darkMode') === null) {
        set({ darkMode: settings.dark_mode });
      }
      return settings;
    } catch (error) {
      console.error('Gagal memuat pengaturan:', error);
    }
  },
  
  updateSettings: async (updatedFields) => {
    try {
      const response = await api.post('/pengaturan', updatedFields);
      set({ settings: response.data });
      get().addNotification('Pengaturan organisasi berhasil diperbarui.');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ==========================================
  // ANNOUNCEMENTS
  // ==========================================
  
  loadAnnouncements: async () => {
    try {
      const announcements = await api.get('/pengumuman');
      // Sort newest first
      announcements.sort((a, b) => new Date(b.tanggal_publikasi) - new Date(a.tanggal_publikasi));
      set({ announcements });
    } catch (error) {
      console.error('Gagal memuat pengumuman:', error);
    }
  },
  
  addAnnouncement: async (ann) => {
    try {
      const response = await api.post('/pengumuman', ann);
      set(state => ({
        announcements: [response.data, ...state.announcements]
      }));
      get().addNotification(`Pengumuman baru disebarkan: ${ann.judul}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  deleteAnnouncement: async (id) => {
    try {
      await api.delete(`/pengumuman/${id}`);
      set(state => ({
        announcements: state.announcements.filter(p => p.id_pengumuman !== id)
      }));
      return true;
    } catch (error) {
      throw error;
    }
  },

  // ==========================================
  // NOTIFICATIONS (LOCAL READ/READ-ONLY SYSTEM)
  // ==========================================
  
  addNotification: (message) => {
    const newNotif = {
      id: generateId('nt'),
      message,
      timestamp: new Date().toISOString(),
      read: false
    };
    set(state => {
      const updated = [newNotif, ...state.notifications];
      localStorage.setItem('notifications', JSON.stringify(updated));
      return { notifications: updated };
    });
  },
  
  markAsRead: (id) => {
    set(state => {
      const updated = state.notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      );
      // Remove read notifications automatically after read as per PRD Section 5.1:
      // "Pemberitahuan akan hilang otomatis setelah dibaca (tidak bisa dihapus manual oleh anggota)"
      const filtered = updated.filter(n => !n.read);
      localStorage.setItem('notifications', JSON.stringify(filtered));
      return { notifications: filtered };
    });
  }
}));

const generateId = (prefix) => `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
