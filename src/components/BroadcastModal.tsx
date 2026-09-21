import React, { useState, useEffect, useCallback } from 'react';
import { Megaphone, X, AlertTriangle, BellRing, Check, UploadCloud, ArrowLeft, ShieldAlert } from 'lucide-react';
import { BroadcastMessage } from '../types';

interface BroadcastModalProps {
  currentRole?: 'client' | 'technician' | 'admin' | 'none' | string;
  loggedInTechId?: string | null;
  onNavigateTab?: (tab: string) => void;
}

export const BroadcastModal: React.FC<BroadcastModalProps> = ({
  currentRole,
  loggedInTechId,
  onNavigateTab
}) => {
  const [activeBroadcast, setActiveBroadcast] = useState<BroadcastMessage | null>(null);

  const checkBroadcasts = useCallback(async () => {
    try {
      const res = await fetch(`/api/announcements?t=${Date.now()}`);
      if (!res.ok) return;
      const data = await res.json();
      const list: BroadcastMessage[] = data.broadcasts || data.announcements || [];

      if (!Array.isArray(list) || list.length === 0) {
        setActiveBroadcast(null);
        return;
      }

      // Check if current user in context is a technician
      const isTech = Boolean(
        loggedInTechId ||
        localStorage.getItem('ir_logged_in_tech_id') ||
        localStorage.getItem('session_user_role') === 'technician' ||
        localStorage.getItem('ir_current_role') === 'technician' ||
        localStorage.getItem('ir_role_selection') === 'technician' ||
        currentRole === 'technician'
      );

      const effectiveTechId = loggedInTechId || localStorage.getItem('ir_logged_in_tech_id');
      const userKey = isTech 
        ? (effectiveTechId ? `tech_${effectiveTechId}` : 'tech_user') 
        : (localStorage.getItem('session_user_id') ? `client_${localStorage.getItem('session_user_id')}` : 'guest');

      // Sort messages: Urgent first, then warning, then info, then newest
      const sorted = [...list].sort((a, b) => {
        const pA = a.priority === 'urgent' ? 3 : a.priority === 'warning' ? 2 : 1;
        const pB = b.priority === 'urgent' ? 3 : b.priority === 'warning' ? 2 : 1;
        if (pA !== pB) return pB - pA;
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });

      // Find first matching active AND undismissed broadcast
      const matching = sorted.find(b => {
        const isMsgActive = Boolean(
          b.isActive || 
          (b as any).is_active === 1 || 
          (b as any).is_active === true || 
          String(b.isActive) === 'true'
        );
        if (!isMsgActive) return false;

        const target = (b.targetRole || 'all').toLowerCase();
        
        // Strict role matching
        if (target === 'technician') {
          if (!isTech) return false;
        } else if (target === 'client') {
          if (isTech) return false;
        }

        // Check dismissal for THIS specific user
        if (b.priority === 'urgent') {
          // Urgent messages are required every session until acknowledged in current session
          const sessionDismissed = sessionStorage.getItem(`ir_dismissed_session_${userKey}_${b.id}`);
          if (sessionDismissed) return false;
        } else {
          const permDismissed = localStorage.getItem(`ir_dismissed_${userKey}_${b.id}`);
          if (permDismissed) return false;
        }

        return true;
      });

      if (matching) {
        setActiveBroadcast(matching);
        // Haptic feedback for urgent broadcasts on mobile/app
        if (matching.priority === 'urgent' && typeof navigator !== 'undefined' && navigator.vibrate) {
          try { navigator.vibrate([100, 80, 100]); } catch (_) {}
        }
      } else {
        setActiveBroadcast(null);
      }
    } catch (err) {
      console.error('Error checking broadcast messages:', err);
    }
  }, [currentRole, loggedInTechId]);

  useEffect(() => {
    // Initial check
    checkBroadcasts();

    // Listen for login and role switch events
    const handleLoginCompleted = () => {
      // Small timeout to allow localStorage to flush
      setTimeout(checkBroadcasts, 150);
    };

    window.addEventListener('user_login_completed', handleLoginCompleted);
    window.addEventListener('storage', handleLoginCompleted);
    window.addEventListener('focus', checkBroadcasts);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkBroadcasts();
      }
    });

    // Real-time polling every 4 seconds so message pops up in app immediately
    const interval = setInterval(checkBroadcasts, 4000);

    return () => {
      window.removeEventListener('user_login_completed', handleLoginCompleted);
      window.removeEventListener('storage', handleLoginCompleted);
      window.removeEventListener('focus', checkBroadcasts);
      clearInterval(interval);
    };
  }, [checkBroadcasts]);

  if (!activeBroadcast) return null;

  const isTech = Boolean(
    loggedInTechId ||
    localStorage.getItem('ir_logged_in_tech_id') ||
    localStorage.getItem('session_user_role') === 'technician' ||
    localStorage.getItem('ir_current_role') === 'technician' ||
    localStorage.getItem('ir_role_selection') === 'technician' ||
    currentRole === 'technician'
  );

  const effectiveTechId = loggedInTechId || localStorage.getItem('ir_logged_in_tech_id');
  const userKey = isTech 
    ? (effectiveTechId ? `tech_${effectiveTechId}` : 'tech_user') 
    : (localStorage.getItem('session_user_id') ? `client_${localStorage.getItem('session_user_id')}` : 'guest');

  const isUrgent = activeBroadcast.priority === 'urgent';
  const isWarning = activeBroadcast.priority === 'warning';

  // Detect if action is related to document upload
  const isDocUploadAction = 
    activeBroadcast.actionType === 'upload_docs' ||
    activeBroadcast.title?.includes('مدرک') ||
    activeBroadcast.title?.includes('مدارک') ||
    activeBroadcast.message?.includes('مدرک') ||
    activeBroadcast.message?.includes('مدارک') ||
    activeBroadcast.message?.includes('پرونده') ||
    activeBroadcast.message?.includes('آپلود') ||
    activeBroadcast.message?.includes('بارگذاری');

  const handleAcknowledge = () => {
    if (activeBroadcast) {
      localStorage.setItem(`ir_dismissed_${userKey}_${activeBroadcast.id}`, 'true');
      sessionStorage.setItem(`ir_dismissed_session_${userKey}_${activeBroadcast.id}`, 'true');
      setActiveBroadcast(null);
    }
  };

  const handleExecuteAction = () => {
    if (!activeBroadcast) return;

    // Acknowledge this broadcast
    handleAcknowledge();

    if (isDocUploadAction && isTech) {
      if (onNavigateTab) {
        onNavigateTab('profile-docs');
      }
      window.dispatchEvent(new CustomEvent('navigate_tech_tab', { detail: 'profile-docs' }));

      // Also ensure tab switch if user is in technician view
      const docTabBtn = document.getElementById('tab-profile-docs');
      if (docTabBtn) {
        docTabBtn.click();
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 text-right font-sans" 
      dir="rtl"
      role="dialog"
      aria-modal="true"
    >
      <div 
        className={`bg-white w-full max-w-lg rounded-3xl shadow-2xl border overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh] ${
          isUrgent 
            ? 'border-red-500 ring-4 ring-red-500/25' 
            : isWarning 
            ? 'border-amber-400 ring-4 ring-amber-500/20' 
            : 'border-blue-400 ring-4 ring-blue-500/20'
        }`}
      >
        {/* Header */}
        <div className={`p-4 sm:p-5 text-white flex items-center justify-between shrink-0 ${
          isUrgent 
            ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700' 
            : isWarning 
            ? 'bg-gradient-to-r from-amber-500 to-orange-600' 
            : 'bg-gradient-to-r from-blue-600 to-indigo-700'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
              isUrgent ? 'bg-white/25 text-white animate-pulse' : 'bg-white/20 text-white'
            }`}>
              {isUrgent ? (
                <AlertTriangle className="w-6 h-6 text-white animate-bounce" />
              ) : isWarning ? (
                <ShieldAlert className="w-6 h-6 text-white" />
              ) : (
                <Megaphone className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black bg-white/25 px-2 py-0.5 rounded-md tracking-wide">
                  {isUrgent ? '🚨 پیام اضطراری و فوری مدیریت' : isWarning ? '⚡ هشدار مهم کدیار۲۴' : '📢 اطلاعیه مدیریت کدیار۲۴'}
                </span>
                {isUrgent && (
                  <span className="text-[9px] font-extrabold bg-red-950/40 text-rose-200 px-1.5 py-0.5 rounded">
                    اقدام الزامی
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-black mt-1 leading-tight">{activeBroadcast.title}</h3>
            </div>
          </div>

          {/* Close button ONLY if NOT urgent */}
          {!isUrgent && (
            <button
              onClick={handleAcknowledge}
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition cursor-pointer shrink-0"
              title="بستن اعلان"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4 bg-slate-50/60 overflow-y-auto">
          {isUrgent && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-2xl text-[11px] font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>این پیام از سوی مدیریت کدیار ارسال شده و تکمیل خواسته آن برای ادامه همکاری الزامی است.</span>
            </div>
          )}

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line font-bold">
              {activeBroadcast.message}
            </p>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
            <span className="flex items-center gap-1.5 font-bold">
              <BellRing className="w-3.5 h-3.5 text-slate-400" />
              مخاطب: {activeBroadcast.targetRole === 'all' ? 'عموم کاربران و تکنسین‌ها' : activeBroadcast.targetRole === 'technician' ? 'همکاران و تکنسین‌های فنی' : 'مشتریان محترم'}
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              {new Date(activeBroadcast.created_at || Date.now()).toLocaleDateString('fa-IR')}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            {isDocUploadAction && isTech ? (
              <>
                <button
                  type="button"
                  onClick={handleExecuteAction}
                  className="w-full py-3.5 px-4 rounded-2xl text-white font-black text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[98%]"
                >
                  <UploadCloud className="w-5 h-5 animate-pulse" />
                  <span>📂 ورود مستقیم به بخش آپلود مدارک و پرونده</span>
                </button>

                <button
                  type="button"
                  onClick={handleAcknowledge}
                  className="w-full py-2.5 px-4 rounded-xl text-slate-600 hover:text-slate-800 font-bold text-[11px] transition cursor-pointer text-center"
                >
                  متوجه شدم، بعداً مدارک را بارگذاری می‌کنم
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleAcknowledge}
                className={`w-full py-3.5 px-4 rounded-2xl text-white font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[98%] ${
                  isUrgent
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-500/25'
                    : isWarning
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/25'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>{isUrgent ? 'تایید و متعهد می‌شوم اقدام کنم' : 'متوجه شدم و تایید می‌کنم'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
