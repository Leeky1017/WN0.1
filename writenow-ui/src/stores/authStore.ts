/**
 * Auth Store
 * 
 * Zustand store 管理认证状态。
 * 当前为本地单用户模式（临时方案），后续对接 auth:* IPC。
 * 
 * @see DESIGN_SPEC.md 11.7 临时方案：单用户本地模式
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 用户类型定义
 * 
 * 后续对接后端时，此类型应与 src/types/ipc-generated.ts 同步
 */
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'free' | 'pro' | 'admin';
  createdAt: string;
  updatedAt: string;
}

/**
 * 本地默认用户
 * 
 * 在认证系统完成前，使用此硬编码用户
 */
const LOCAL_USER: User = {
  id: 'local-user',
  email: 'local@writenow.app',
  name: 'Local User',
  role: 'pro', // 本地模式默认 Pro
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export interface AuthState {
  // 状态
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // 登录凭证记忆
  rememberMe: boolean;
  rememberedEmail: string | null;
  
  // Actions
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  setRememberMe: (value: boolean) => void;
  clearError: () => void;
  
  // 重置
  reset: () => void;
}

const initialState = {
  // 本地单用户模式：默认已认证
  user: LOCAL_USER,
  isAuthenticated: true,
  isLoading: false,
  error: null,
  rememberMe: false,
  rememberedEmail: null,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...initialState,

      /**
       * 登录
       * 
       * 当前为本地模式，直接设置本地用户。
       * 后续对接 auth:login IPC 后，需要：
       * 1. 调用 window.api.invoke('auth:login', { email, password, rememberMe })
       * 2. 处理 IpcResponse<{ token, user }>
       * 3. 存储 token 到安全存储
       */
      login: async (email: string, _password: string, rememberMe = false) => {
        set({ isLoading: true, error: null });
        
        try {
          // 模拟网络延迟
          await new Promise((resolve) => setTimeout(resolve, 500));
          
          // 本地模式：直接认证成功
          const userName = email.split('@')[0] || 'User';
          set({
            user: {
              ...LOCAL_USER,
              email,
              name: userName,
            },
            isAuthenticated: true,
            isLoading: false,
            rememberMe,
            rememberedEmail: rememberMe ? email : null,
          });
        } catch {
          set({
            error: 'Login failed. Please try again.',
            isLoading: false,
          });
        }
      },

      /**
       * 登出
       * 
       * 后续对接 auth:logout IPC 后，需要：
       * 1. 调用 window.api.invoke('auth:logout')
       * 2. 清除本地 token
       */
      logout: async () => {
        set({ isLoading: true });
        
        try {
          // 模拟网络延迟
          await new Promise((resolve) => setTimeout(resolve, 200));
          
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        } catch {
          set({ isLoading: false });
        }
      },

      setRememberMe: (value: boolean) => set({ rememberMe: value }),

      clearError: () => set({ error: null }),

      reset: () => set(initialState),
    }),
    {
      name: 'writenow-auth',
      // 只持久化记住的邮箱
      partialize: (state) => ({
        rememberMe: state.rememberMe,
        rememberedEmail: state.rememberedEmail,
      }),
    }
  )
);
