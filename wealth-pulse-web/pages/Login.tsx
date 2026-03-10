
import React, { useState, useContext } from 'react';
import { I18nContext } from '../App';
import { httpClient } from '../services/http';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const { lang, t, setLang } = useContext(I18nContext);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    // 表单验证
    if (!email.trim()) {
      setError(lang === 'zh' ? '请输入邮箱地址' : 'Please enter email');
      return;
    }
    if (!password) {
      setError(lang === 'zh' ? '请输入密码' : 'Please enter password');
      return;
    }

    // 清空错误信息
    setError('');

    setLoading(true);
    try {
      // 调用后端真实登录接口
      // 使用 skipStatusCheck: true 来直接获取响应，而不是在状态码错误时 throw error
      const res: any = await httpClient.post('/api/auth/v1/password/login', {
        email,
        password,
      }, { autoHandleAuthError: false, skipStatusCheck: true });

      // 后端返回结构：
      // 成功：{ "msg": "success", "code": 200, "data": { "accessToken": "xxx" } }
      // 失败：{ "msg": "password or username not valid", "code": -1 }

      // 检查响应码
      if (res?.code !== 200) {
        // 根据后端返回的错误信息显示相应提示
        const errorMsg = res?.msg || '登录失败';
        // 转换后端英文错误信息为中文提示
        if (errorMsg.includes('password') || errorMsg.includes('username') || errorMsg.includes('email')) {
          throw new Error(lang === 'zh' ? '邮箱或密码错误' : 'Email or password not valid');
        }
        throw new Error(errorMsg);
      }

      // 登录成功，获取 token
      const token = res?.data?.accessToken;
      if (!token) {
        throw new Error('登录返回数据不包含 accessToken');
      }

      // 统一保存 token，并让 App 里的 isLoggedIn 生效
      httpClient.setToken(token);
      onLogin();
    } catch (err: any) {
      console.error('登录失败', err);
      // 显示错误信息
      setError(err?.message || (lang === 'zh' ? '登录失败，请检查账号或密码' : 'Login failed, please check your credentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 relative overflow-hidden">
      {/* 语言切换拨片 */}
      <div className="absolute top-8 right-8 z-50 bg-white/80 backdrop-blur-md p-1 rounded-2xl border border-slate-200 flex shadow-sm">
        <button 
          onClick={() => setLang('zh')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${lang === 'zh' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
        >
          中文
        </button>
        <button 
          onClick={() => setLang('en')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${lang === 'en' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
        >
          EN
        </button>
      </div>

      {/* 背景装饰 */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>

      <div className="w-full max-w-md bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 relative z-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center text-white shadow-xl shadow-indigo-600/20 mb-4 scale-110">
            <i className="fas fa-chart-line text-3xl"></i>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight italic">{t.login_title}</h1>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">{t.login_subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.login_admin}</label>
            <div className="relative">
              <i className="fas fa-user absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 text-sm"></i>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all"
                placeholder={t.login_admin}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.login_pwd}</label>
            <div className="relative">
              <i className="fas fa-lock absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 text-sm"></i>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all"
                placeholder={t.login_pwd}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center group uppercase tracking-widest text-[11px]"
          >
            {loading ? (
              <i className="fas fa-circle-notch animate-spin"></i>
            ) : (
              <>{t.login_btn} <i className="fas fa-arrow-right ml-3 group-hover:translate-x-1 transition-transform"></i></>
            )}
          </button>

          {/* 错误信息显示 */}
          {error && (
            <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-3">
              <i className="fas fa-exclamation-circle text-rose-500 text-base mt-0.5"></i>
              <span className="text-sm font-bold text-rose-700">{error}</span>
            </div>
          )}
        </form>

        <p className="text-center text-slate-300 text-[9px] font-black mt-10 uppercase tracking-[0.2em]">
          &copy; 2025 Pulse AI Alpha • {t.login_footer}
        </p>
      </div>
    </div>
  );
};

export default Login;
