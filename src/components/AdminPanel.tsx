import { AdminConfigSection } from './admin/AdminConfigSection';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RepairOrder, ErrorCode, Technician, SparePart, CommonProblem, PartPurchase, BroadcastMessage } from '../types';
import { Shield, Users, User, AlertTriangle, FileCheck, Check, Ban, BarChart3, TrendingUp, Activity, PenTool, Layers, CheckCircle2, DollarSign, X, Info, Key, Eye, Truck, Laptop, Settings, Plus, Trash2, MapPin, Search, FileText, LogOut, MessageSquare, Send, Terminal, CheckCircle, Inbox, ShoppingBag, RefreshCw, Megaphone, Phone, Smartphone, Upload, Edit, Database, ChevronUp, ChevronDown, Save } from 'lucide-react';
import { DocumentViewer } from './DocumentViewer';
import { sanitizePhoneInput, validateIranianMobile, validateUrl, harmonizeErrorCode } from './validation';

const SmartCombobox: React.FC<{
  label: string;
  value: string;
  onChange: (val: string) => void;
  onSelectSuggestion?: (val: string) => void;
  placeholder: string;
  suggestions: string[];
  required?: boolean;
}> = ({ label, value, onChange, onSelectSuggestion, placeholder, suggestions, required }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const matches = React.useMemo(() => {
    const cleanVal = value.trim().toLowerCase();
    if (!cleanVal) return suggestions.slice(0, 8);
    return suggestions.filter(s => s.toLowerCase().includes(cleanVal));
  }, [value, suggestions]);

  return (
    <div ref={containerRef} className="relative text-right">
      <label className="block text-slate-700 text-[10px] font-extrabold mb-1">{label}</label>
      <div className="relative">
        <input
          required={required}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full bg-slate-50 border border-slate-205 text-xs px-3.5 py-2.5 rounded-xl outline-none focus:bg-white focus:border-blue-500 font-bold transition-all text-right"
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(''); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && matches.length > 0 && (
        <div className="absolute z-50 w-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
          {matches.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                if (onSelectSuggestion) {
                  onSelectSuggestion(item);
                } else {
                  onChange(item);
                }
                setIsOpen(false);
              }}
              className="w-full text-right px-4 py-2.5 hover:bg-blue-50/50 text-[11px] font-bold text-slate-750 hover:text-blue-700 transition-all flex items-center justify-between"
            >
              <span>{item}</span>
              <span className="text-[9px] text-slate-400 font-normal">پیشنهاد سیستم</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

interface AdminPanelProps {
  orders: RepairOrder[];
  errorCodes: ErrorCode[];
  technicians: Technician[];
  spareParts: SparePart[];
  citiesList: {name: string, regions: string[]}[];
  brandsList: string[];
  categoriesList: string[];
  modelsList: string[];
  onApproveErrorCode: (id: string) => void;
  onBulkApproveErrorCodes?: (ids: string[]) => void;
  onRejectErrorCode: (id: string) => void;
  onVerifyTechnician: (id: string, isVerified: boolean) => void;
  onUpdatePartStock: (id: string, newStock: number, newPrice: number) => void;
  onAdminCancelOrder: (orderId: string) => void;
  onApprovePayment?: (paymentId: string) => void;
  onRejectPayment?: (paymentId: string) => void;
  onUpdateCitiesList: (list: {name: string, regions: string[]}[]) => void;
  onUpdateBrandsList: (list: string[]) => void;
  onUpdateCategoriesList: (list: string[]) => void;
  onUpdateModelsList: (list: string[]) => void;
  onUpdateErrorCodesList: (list: ErrorCode[]) => void;
  onUpdateSparePartsList?: (list: SparePart[]) => void;
  commonProblems?: CommonProblem[];
  onUpdateCommonProblemsList?: (list: CommonProblem[]) => void;
  onLoginAsTechnician?: (techId: string) => void;
  onUpdateTechniciansList?: (list: Technician[]) => void;
  onLogout?: () => void;
  adminPassword?: string;
  onUpdateAdminPassword?: (newPass: string) => void;
  smsSettings?: any;
  onUpdateSmsSettings?: (settings: any) => void;
  smsLogs?: any[];
  onSendTestSms?: (phone: string, text: string, type: 'otp' | 'status') => void;
  onResetDatabase?: () => void;
  partPurchases?: PartPurchase[];
  onUpdatePartPurchases?: (list: PartPurchase[]) => void;
  usersList?: any[];
  onUpdateUsersList?: (list: any[]) => void;
  subscriptionsList?: any[];
  paymentsList?: any[];
  onForceRefreshDatabase?: () => Promise<void>;
  adminAnnouncement?: { text: string; isActive: boolean; style: 'info' | 'warning' | 'success' | 'danger' };
  onUpdateAdminAnnouncement?: (announcement: { text: string; isActive: boolean; style: 'info' | 'warning' | 'success' | 'danger' }) => void;
  trustBadges?: {
    badge1Link: string;
    badge1Image: string;
    badge2Link: string;
    badge2Image: string;
  };
  onUpdateTrustBadges?: (badges: {
    badge1Link: string;
    badge1Image: string;
    badge2Link: string;
    badge2Image: string;
  }) => void;
  supportPhone?: string;
  onUpdateSupportPhone?: (phone: string) => void;
  pageContents?: {
    aboutUs: string;
    contactUs: string;
    rules: string;
    dispute: string;
    appDownloadUrl?: string;
  };
  onUpdatePageContents?: (contents: {
    aboutUs: string;
    contactUs: string;
    rules: string;
    dispute: string;
    appDownloadUrl?: string;
  }) => void;
  userFeedbacks?: any[];
  onUpdateUserFeedbacks?: (feedbacks: any[]) => void;
  affiliateProducts?: any[];
  onUpdateAffiliateProducts?: (products: any[]) => void;
  categoryConfig?: any;
  onUpdateCategoryConfig?: (config: any) => void;
  onManualAddSubscription?: (userId: string, planId: string, customDays?: number) => void;
  onUpdatePostalTrackCode?: (purchaseId: string, postalCode: string) => void;
  onGoToHome?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  orders,
  errorCodes,
  technicians,
  spareParts,
  citiesList,
  brandsList,
  categoriesList,
  modelsList,
  onApproveErrorCode,
  onBulkApproveErrorCodes,
  onRejectErrorCode,
  onVerifyTechnician,
  onUpdatePartStock,
  onAdminCancelOrder,
  onApprovePayment,
  onRejectPayment,
  onUpdateCitiesList,
  onUpdateBrandsList,
  onUpdateCategoriesList,
  onUpdateModelsList,
  onUpdateErrorCodesList,
  onUpdateSparePartsList,
  commonProblems = [],
  onUpdateCommonProblemsList,
  onLoginAsTechnician,
  onUpdateTechniciansList,
  onLogout,
  onGoToHome,
  adminPassword,
  onUpdateAdminPassword,
  smsSettings,
  onUpdateSmsSettings,
  smsLogs = [],
  onSendTestSms,
  onResetDatabase,
  partPurchases = [],
  onUpdatePartPurchases,
  usersList = [],
  onUpdateUsersList,
  subscriptionsList = [],
  paymentsList = [],
  onForceRefreshDatabase,
  adminAnnouncement = { text: '', isActive: false, style: 'info' },
  onUpdateAdminAnnouncement,
  trustBadges = { badge1Link: 'https://enamad.ir', badge1Image: '', badge2Link: 'https://samandehi.ir', badge2Image: '' },
  onUpdateTrustBadges,
  supportPhone = '09120947304',
  onUpdateSupportPhone,
  pageContents = { aboutUs: '', contactUs: '', rules: '', dispute: '', appDownloadUrl: '' },
  onUpdatePageContents,
  userFeedbacks = [],
  onUpdateUserFeedbacks,
  affiliateProducts = [],
  onUpdateAffiliateProducts,
  categoryConfig = {},
  onUpdateCategoryConfig,
  onManualAddSubscription,
  onUpdatePostalTrackCode,
}) => {
  const [activeTab, setActiveTab] = React.useState<string>('metrics');
  
  // Support Tickets States
  const [adminTicketsList, setAdminTicketsList] = React.useState<any[]>([]);
  const [adminTicketsLoading, setAdminTicketsLoading] = React.useState(false);
  const [activeAdminTicketId, setActiveAdminTicketId] = React.useState<string | null>(null);
  const [adminReplyInput, setAdminReplyInput] = React.useState('');
  const [submittingAdminReply, setSubmittingAdminReply] = React.useState(false);
  const [adminTicketFilter, setAdminTicketFilter] = React.useState<'all' | 'open' | 'pending' | 'resolved' | 'closed'>('all');
  const [adminTicketStatusMsg, setAdminTicketStatusMsg] = React.useState('');

  // Payment, Subscription & Shipping Modal States
  const [payRoleFilter, setPayRoleFilter] = React.useState<'all' | 'client' | 'technician'>('all');
  const [payTypeFilter, setPayTypeFilter] = React.useState<'all' | 'subscription' | 'part_purchase' | 'commission' | 'wallet_recharge'>('all');
  const [payStatusFilter, setPayStatusFilter] = React.useState<'all' | 'pending' | 'completed' | 'failed'>('all');
  
  const [subRoleFilter, setSubRoleFilter] = React.useState<'all' | 'client' | 'technician' | 'admin'>('all');
  const [subStatusFilter, setSubStatusFilter] = React.useState<'all' | 'active' | 'expired' | 'none'>('all');
  const [manualSubModalOpen, setManualSubModalOpen] = React.useState(false);
  const [manualSubUserId, setManualSubUserId] = React.useState('');
  const [manualSubPlan, setManualSubPlan] = React.useState('1_month');
  const [manualSubCustomDays, setManualSubCustomDays] = React.useState<number>(30);
  const [manualSubUserSearch, setManualSubUserSearch] = React.useState('');
  const [submittingManualSub, setSubmittingManualSub] = React.useState(false);

  const [postalTrackModalItem, setPostalTrackModalItem] = React.useState<any | null>(null);
  const [postalTrackInput, setPostalTrackInput] = React.useState('');

  // Custom states for security audit, backup logs, and telemetry errors
  const [adminBackupsList, setAdminBackupsList] = React.useState<any[]>([]);
  const [adminBackupsLoading, setAdminBackupsLoading] = React.useState(false);
  const [activityLogsList, setActivityLogsList] = React.useState<any[]>([]);
  const [activityLogsLoading, setActivityLogsLoading] = React.useState(false);
  const [systemErrorsList, setSystemErrorsList] = React.useState<any[]>([]);
  const [systemErrorsLoading, setSystemErrorsLoading] = React.useState(false);

  // TechDocs state hooks
  const [selectedDeviceForDocs, setSelectedDeviceForDocs] = React.useState<any>(null);
  const [deviceDocsList, setDeviceDocsList] = React.useState<any[]>([]);
  const [deviceDocsLoading, setDeviceDocsLoading] = React.useState(false);
  const [deviceDocsError, setDeviceDocsError] = React.useState('');
  const [newDocTitleInput, setNewDocTitleInput] = React.useState('');
  const [newDocTypeInput, setNewDocTypeInput] = React.useState('Service Manual');
  const [newDocSizeInput, setNewDocSizeInput] = React.useState('2.5 MB');
  const [techDocsSearchQuery, setTechDocsSearchQuery] = React.useState('');
  const [techDocsStatusMsg, setTechDocsStatusMsg] = React.useState('');

  const [uploadMethod, setUploadMethod] = React.useState<'file' | 'link'>('file');
  const [uploadedFileBase64, setUploadedFileBase64] = React.useState('');
  const [uploadedFileName, setUploadedFileName] = React.useState('');
  const [externalUrlInput, setExternalUrlInput] = React.useState('');
  const [isSavingDoc, setIsSavingDoc] = React.useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setUploadedFileBase64(event.target.result as string);
        setUploadedFileName(file.name);
        
        const sizeInMB = file.size / (1024 * 1024);
        if (sizeInMB < 1) {
          setNewDocSizeInput(`${(file.size / 1024).toFixed(1)} KB`);
        } else {
          setNewDocSizeInput(`${sizeInMB.toFixed(1)} MB`);
        }
        
        if (!newDocTitleInput.trim()) {
          const titleWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
          setNewDocTitleInput(titleWithoutExt);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  React.useEffect(() => {
    if (selectedDeviceForDocs) {
      setDeviceDocsLoading(true);
      setDeviceDocsError('');
      fetch(`/api/device/${selectedDeviceForDocs.id}/tech-docs`)
        .then(res => {
          if (!res.ok) throw new Error('خطا در بارگذاری مدارک فنی');
          return res.json();
        })
        .then(data => {
          setDeviceDocsList(data.docs || []);
          setDeviceDocsLoading(false);
        })
        .catch(err => {
          setDeviceDocsError(err.message || 'خطای شبکه در دریافت اسناد');
          setDeviceDocsLoading(false);
        });
    } else {
      setDeviceDocsList([]);
    }
  }, [selectedDeviceForDocs]);

  // Auto-refresh fresh database users, technicians, and subscriptions when opening relevant tabs
  React.useEffect(() => {
    if (activeTab === 'users' || activeTab === 'technicians' || activeTab === 'subscriptions' || activeTab === 'payments') {
      onForceRefreshDatabase?.();
    }
  }, [activeTab]);

  // Fetch Admin Backups list when tab is active
  React.useEffect(() => {
    if (activeTab === 'backups') {
      setAdminBackupsLoading(true);
      fetch('/api/server-backups')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setAdminBackupsList(data.backups || []);
          }
          setAdminBackupsLoading(false);
        })
        .catch(err => {
          console.error("Error fetching backups:", err);
          setAdminBackupsLoading(false);
        });
    }
  }, [activeTab]);

  // Fetch Activity Logs when tab is active
  React.useEffect(() => {
    if (activeTab === 'activitylogs') {
      setActivityLogsLoading(true);
      fetch('/api/admin/activity-logs')
        .then(res => res.json())
        .then(data => {
          setActivityLogsList(data.logs || []);
          setActivityLogsLoading(false);
        })
        .catch(err => {
          console.error("Error fetching activity logs:", err);
          setActivityLogsLoading(false);
        });
    }
  }, [activeTab]);

  // Fetch System error_logs table when tab is active
  React.useEffect(() => {
    if (activeTab === 'system_errors') {
      setSystemErrorsLoading(true);
      fetch('/api/admin/error-logs')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setSystemErrorsList(data.errors || []);
          }
          setSystemErrorsLoading(false);
        })
        .catch(err => {
          console.error("Error fetching system errors:", err);
          setSystemErrorsLoading(false);
        });
    }
  }, [activeTab]);

  // Fetch Support Tickets when tab is active with real-time polling
  React.useEffect(() => {
    if (activeTab === 'tickets') {
      fetchTickets(false);
      const pollInterval = setInterval(() => {
        fetchTickets(true);
      }, 3000);
      return () => {
        clearInterval(pollInterval);
      };
    }
  }, [activeTab]);

  const fetchTickets = (isSilent = false) => {
    if (!isSilent) setAdminTicketsLoading(true);
    fetch('/api/tickets', {
      headers: {
        'X-Session-Token': localStorage.getItem('session_user_id') || ''
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success || data.status === 'ok') {
          setAdminTicketsList(data.tickets || data.data?.tickets || []);
        }
        if (!isSilent) setAdminTicketsLoading(false);
      })
      .catch(err => {
        if (!isSilent) {
          console.error("Error fetching admin tickets:", err);
          setAdminTicketsLoading(false);
        }
      });
  };

  const handleAdminSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAdminTicketId || !adminReplyInput.trim()) return;

    setSubmittingAdminReply(true);
    try {
      const res = await fetch(`/api/tickets/${activeAdminTicketId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Token': localStorage.getItem('session_user_id') || ''
        },
        body: JSON.stringify({ message: adminReplyInput.trim() })
      });
      const data = await res.json();
      if (data.success) {
        const updatedTk = data.ticket || data.data?.ticket;
        if (updatedTk) {
          setAdminTicketsList(prev => prev.map(t => String(t.id) === String(activeAdminTicketId) ? updatedTk : t));
        } else {
          fetchTickets(true);
        }
        setAdminReplyInput('');
        setAdminTicketStatusMsg('✅ پاسخ شما با موفقیت ثبت و ارسال شد.');
        setTimeout(() => setAdminTicketStatusMsg(''), 4000);
      } else {
        setAdminTicketStatusMsg('❌ خطا در ارسال پاسخ: ' + (data.error || 'خطای ناشناخته'));
        setTimeout(() => setAdminTicketStatusMsg(''), 4000);
      }
    } catch (e: any) {
      console.error("Error responding to ticket:", e);
      setAdminTicketStatusMsg('❌ خطا در ارتباط با سرور: ' + e.message);
      setTimeout(() => setAdminTicketStatusMsg(''), 4000);
    } finally {
      setSubmittingAdminReply(false);
    }
  };

  const handleAdminChangeStatus = async (ticketId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Token': localStorage.getItem('session_user_id') || ''
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        const updatedTk = data.ticket || data.data?.ticket;
        if (updatedTk) {
          setAdminTicketsList(prev => prev.map(t => String(t.id) === String(ticketId) ? updatedTk : t));
        } else {
          fetchTickets(true);
        }
        setAdminTicketStatusMsg('✅ وضعیت تیکت با موفقیت بروزرسانی شد.');
        setTimeout(() => setAdminTicketStatusMsg(''), 4000);
      } else {
        setAdminTicketStatusMsg('❌ خطا در تغییر وضعیت: ' + (data.error || 'خطای ناشناخته'));
        setTimeout(() => setAdminTicketStatusMsg(''), 4000);
      }
    } catch (e: any) {
      console.error("Error updating status:", e);
      setAdminTicketStatusMsg('❌ خطا در ارتباط با سرور: ' + e.message);
      setTimeout(() => setAdminTicketStatusMsg(''), 4000);
    }
  };

  const handleAddTechDoc = async () => {
    if (!selectedDeviceForDocs || !newDocTitleInput.trim() || !newDocTypeInput) {
      setTechDocsStatusMsg('❌ لطفا فیلدهای عنوان و نوع سند را وارد کنید.');
      setTimeout(() => setTechDocsStatusMsg(''), 4000);
      return;
    }

    if (uploadMethod === 'file' && !uploadedFileBase64) {
      setTechDocsStatusMsg('❌ لطفا ابتدا فایل مورد نظر خود را برای آپلود انتخاب کنید.');
      setTimeout(() => setTechDocsStatusMsg(''), 4000);
      return;
    }

    if (uploadMethod === 'link' && !externalUrlInput.trim()) {
      setTechDocsStatusMsg('❌ لطفا لینک دانلود مستقیم سند فنی را وارد کنید.');
      setTimeout(() => setTechDocsStatusMsg(''), 4000);
      return;
    }

    setIsSavingDoc(true);
    try {
      const res = await fetch(`/api/device/${selectedDeviceForDocs.id}/tech-docs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newDocTitleInput,
          type: newDocTypeInput,
          fileSize: newDocSizeInput,
          fileBase64: uploadMethod === 'file' ? uploadedFileBase64 : undefined,
          fileName: uploadMethod === 'file' ? uploadedFileName : undefined,
          externalUrl: uploadMethod === 'link' ? externalUrlInput.trim() : undefined
        })
      });
      if (!res.ok) throw new Error('خطا در ذخیره‌سازی سند');
      const data = await res.json();
      if (data.success) {
        setDeviceDocsList(prev => [data.doc, ...prev]);
        setNewDocTitleInput('');
        setUploadedFileBase64('');
        setUploadedFileName('');
        setExternalUrlInput('');
        setTechDocsStatusMsg('✅ سند فنی جدید با موفقیت اضافه و پیوست شد.');
        setTimeout(() => setTechDocsStatusMsg(''), 4000);
      }
    } catch (err: any) {
      setTechDocsStatusMsg(`❌ خطا: ${err.message}`);
      setTimeout(() => setTechDocsStatusMsg(''), 4000);
    } finally {
      setIsSavingDoc(false);
    }
  };

  const handleDeleteTechDoc = async (docId: string) => {
    if (!selectedDeviceForDocs) return;
    try {
      const res = await fetch(`/api/device/${selectedDeviceForDocs.id}/tech-docs/${docId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('خطا در حذف سند');
      const data = await res.json();
      if (data.success) {
        setDeviceDocsList(prev => prev.filter(d => d.id !== docId));
        setTechDocsStatusMsg('🗑️ سند فنی با موفقیت حذف گردید.');
        setTimeout(() => setTechDocsStatusMsg(''), 4000);
      }
    } catch (err: any) {
      setTechDocsStatusMsg(`❌ خطا در حذف: ${err.message}`);
      setTimeout(() => setTechDocsStatusMsg(''), 4000);
    }
  };

  // Editing tech doc state
  const [editingDocId, setEditingDocId] = React.useState<string | null>(null);
  const [editingDocTitle, setEditingDocTitle] = React.useState('');
  const [editingDocType, setEditingDocType] = React.useState('');
  const [editingDocSize, setEditingDocSize] = React.useState('');
  const [editingDocUrl, setEditingDocUrl] = React.useState('');

  // Separated management of error codes & problems by category
  const [selectedErrCatFilter, setSelectedErrCatFilter] = React.useState<string>('all');
  const [errSearchQuery, setErrSearchQuery] = React.useState<string>('');
  const [selectedProbCatFilter, setSelectedProbCatFilter] = React.useState<string>('all');

  const handleStartEditDoc = (doc: any) => {
    setEditingDocId(doc.id);
    setEditingDocTitle(doc.title);
    setEditingDocType(doc.type);
    setEditingDocSize(doc.fileSize);
    setEditingDocUrl(doc.fileUrl);
  };

  const handleCancelEditDoc = () => {
    setEditingDocId(null);
  };

  const handleSaveEditDoc = async () => {
    if (!selectedDeviceForDocs || !editingDocId) return;
    try {
      const res = await fetch(`/api/device/${selectedDeviceForDocs.id}/tech-docs/${editingDocId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingDocTitle,
          type: editingDocType,
          fileSize: editingDocSize,
          externalUrl: editingDocUrl
        })
      });
      if (!res.ok) throw new Error('خطا در ویرایش سند');
      const data = await res.json();
      if (data.success) {
        setDeviceDocsList(prev => prev.map(d => d.id === editingDocId ? data.doc : d));
        setEditingDocId(null);
        setTechDocsStatusMsg('✅ سند فنی با موفقیت ویرایش گردید.');
        setTimeout(() => setTechDocsStatusMsg(''), 4000);
      }
    } catch (err: any) {
      setTechDocsStatusMsg(`❌ خطا در ویرایش: ${err.message}`);
      setTimeout(() => setTechDocsStatusMsg(''), 4000);
    }
  };
  
  // Server-side database backup & recovery system inside Admin Panel
  const [adminServerBackups, setAdminServerBackups] = React.useState<any[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = React.useState(false);
  const [backupStatusMsg, setBackupStatusMsg] = React.useState('');

  const fetchAdminBackups = async () => {
    setIsLoadingBackups(true);
    try {
      const res = await fetch('/api/server-backups');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAdminServerBackups(data.backups);
        }
      }
    } catch (err: any) {
      console.error('Error fetching admin backups:', err);
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const createAdminBackup = async () => {
    try {
      setBackupStatusMsg('⏳ در حال ایجاد نسخه پشتیبان از کل پایگاه داده روی هاست...');
      const res = await fetch('/api/server-backups/create', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setBackupStatusMsg('✅ نسخه پشتیبان کامل با موفقیت روی هاست ذخیره گردید.');
          fetchAdminBackups();
          setTimeout(() => setBackupStatusMsg(''), 5000);
        } else {
          throw new Error(data.error || 'خطای ناپیوسته');
        }
      } else {
        throw new Error('خطا در برقراری ارتباط با سرور');
      }
    } catch (err: any) {
      setBackupStatusMsg(`❌ خطا در پشتیبان‌گیری: ${err.message}`);
      setTimeout(() => setBackupStatusMsg(''), 5000);
    }
  };

  const restoreAdminBackup = async (fileName: string) => {
    try {
      setBackupStatusMsg('⏳ در حال بازگردانی و بازنویسی دیتابیس کل سایت...');
      const res = await fetch('/api/server-backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setBackupStatusMsg('🎉 بازگردانی کامل با موفقیت انجام شد! در حال راه‌اندازی مجدد پلتفرم...');
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          throw new Error(data.error || 'خطای بازنشانی');
        }
      } else {
        throw new Error('خطا در پاسخ‌دهی سرور');
      }
    } catch (err: any) {
      setBackupStatusMsg(`❌ خطا در بازگردانی: ${err.message}`);
      setTimeout(() => setBackupStatusMsg(''), 5000);
    }
  };

  const deleteAdminBackup = async (fileName: string) => {
    try {
      const res = await fetch(`/api/server-backups/${fileName}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setBackupStatusMsg('🗑️ فایل پشتیبان با موفقیت از روی سرور حذف شد.');
          fetchAdminBackups();
          setTimeout(() => setBackupStatusMsg(''), 4000);
        }
      }
    } catch (err: any) {
      setBackupStatusMsg(`❌ خطا در حذف پشتیبان: ${err.message}`);
      setTimeout(() => setBackupStatusMsg(''), 4000);
    }
  };

  React.useEffect(() => {
    fetchAdminBackups();
  }, []);

  // Helper to determine if we should update a local state from polled backend props.
  // It returns false if the element is currently focused (the user is typing or pasting)
  // or if the local state was modified by the user and differs from the backend prop (user hasn't saved yet).
  const shouldUpdateField = (elementId: string, currentLocalVal: string, propVal: string) => {
    if (typeof document !== 'undefined' && document.activeElement && document.activeElement.id === elementId) {
      return false;
    }
    if (currentLocalVal !== propVal) {
      return false;
    }
    return true;
  };

  // Support Phone state Hook
  const [sPhone, setSPhone] = React.useState(supportPhone || '09120947304');
  const [phoneStatusMsg, setPhoneStatusMsg] = React.useState('');

  // Informational Page contents state hooks
  const [pgAboutUs, setPgAboutUs] = React.useState(pageContents?.aboutUs || '');
  const [pgContactUs, setPgContactUs] = React.useState(pageContents?.contactUs || '');
  const [pgRules, setPgRules] = React.useState(pageContents?.rules || '');
  const [pgDispute, setPgDispute] = React.useState(pageContents?.dispute || '');
  const [pgAppDownloadUrl, setPgAppDownloadUrl] = React.useState(pageContents?.appDownloadUrl || '');
  const [pageStatusMsg, setPageStatusMsg] = React.useState('');

  React.useEffect(() => {
    if (pageContents) {
      setPgAboutUs(prev => shouldUpdateField('admin-pg-about-us', prev, pageContents.aboutUs || '') ? (pageContents.aboutUs || '') : prev);
      setPgContactUs(prev => shouldUpdateField('admin-pg-contact-us', prev, pageContents.contactUs || '') ? (pageContents.contactUs || '') : prev);
      setPgRules(prev => shouldUpdateField('admin-pg-rules', prev, pageContents.rules || '') ? (pageContents.rules || '') : prev);
      setPgDispute(prev => shouldUpdateField('admin-pg-dispute', prev, pageContents.dispute || '') ? (pageContents.dispute || '') : prev);
      setPgAppDownloadUrl(prev => shouldUpdateField('admin-pg-app-download-url', prev, pageContents.appDownloadUrl || '') ? (pageContents.appDownloadUrl || '') : prev);
    }
  }, [pageContents]);

  React.useEffect(() => {
    if (supportPhone) {
      setSPhone(prev => shouldUpdateField('admin-support-phone', prev, supportPhone) ? supportPhone : prev);
    }
  }, [supportPhone]);

  const handleToggleReadFeedback = (fbId: string) => {
    if (!onUpdateUserFeedbacks) return;
    const updated = userFeedbacks.map(f => f.id === fbId ? { ...f, isRead: !f.isRead } : f);
    onUpdateUserFeedbacks(updated);
  };

  const handleDeleteFeedback = (fbId: string) => {
    if (!onUpdateUserFeedbacks) return;
    const updated = userFeedbacks.filter(f => f.id !== fbId);
    onUpdateUserFeedbacks(updated);
  };

  const handleDeleteUserWithCascade = (user: any) => {
    const userName = user.full_name || user.phone || 'کاربر';
    triggerSafeConfirm(
      'حذف کامل کاربر و تمامی سوابق',
      `آیا از حذف دائم کاربر "${userName}" (${user.phone}) اطمینان قطعی دارید؟ تمام سوابق، اشتراک‌ها، سفارش‌ها، سوابق پرداخت و پرونده تکنسین/مشتری به صورت برگشت‌ناپذیر از کل سیستم و پایگاه داده پاک خواهند شد.`,
      async () => {
        try {
          const token = localStorage.getItem('session_user_id') || localStorage.getItem('token') || localStorage.getItem('access_token') || 'us_admin_root';
          const targetId = user.id || user.phone;
          const masterPass = adminPassword || localStorage.getItem('admin_master_password') || localStorage.getItem('ir_admin_password') || '';
          const res = await fetch(`/api/admin/users/${encodeURIComponent(targetId)}`, {
            method: 'DELETE',
            headers: { 
              'Content-Type': 'application/json',
              'X-Session-Token': token,
              'X-User-Id': token,
              'X-Admin-Password': masterPass,
              'X-Admin-Role': 'admin',
              'Authorization': `Bearer ${token}`
            },
            credentials: 'include'
          });
          const data = await res.json().catch(() => ({}));

          // Also trigger technician deletion endpoint to ensure full cascade
          await fetch(`/api/admin/technicians/${encodeURIComponent(targetId)}`, {
            method: 'DELETE',
            headers: { 
              'Content-Type': 'application/json',
              'X-Session-Token': token,
              'X-User-Id': token,
              'X-Admin-Password': masterPass,
              'X-Admin-Role': 'admin',
              'Authorization': `Bearer ${token}`
            },
            credentials: 'include'
          }).catch(() => {});

          if (res.ok && (data.status === 'ok' || data.success)) {
            const rawPhone = String(user.phone || '').trim();
            const phoneNoZero = rawPhone.replace(/^0/, '');
            const phoneWithZero = rawPhone ? (rawPhone.startsWith('0') ? rawPhone : '0' + rawPhone) : '';
            const rawId = String(user.id || '').trim();
            const idNoTech = rawId.replace(/^tech_/, '');
            const idWithTech = rawId.startsWith('tech_') ? rawId : ('tech_' + rawId);

            const isMatchingUser = (u: any) => {
              if (!u) return false;
              const uId = String(u.id || '').trim();
              const uPhone = String(u.phone || '').trim();
              const uCode = String(u.user_code || u.short_id || '').trim();
              if (rawId && (uId === rawId || uId === idNoTech || uId === idWithTech)) return true;
              if (uCode && (uCode === rawId || uCode === idNoTech)) return true;
              if (rawPhone && (uPhone === rawPhone || uPhone === phoneNoZero || uPhone === phoneWithZero)) return true;
              return false;
            };

            const isMatchingTech = (t: any) => {
              if (!t) return false;
              const tId = String(t.id || '').trim();
              const tUserId = String(t.user_id || t.userId || '').trim();
              const tPhone = String(t.phone || '').trim();
              if (rawId && (tId === rawId || tId === idNoTech || tId === idWithTech)) return true;
              if (tUserId && (tUserId === rawId || tUserId === idNoTech)) return true;
              if (rawPhone && (tPhone === rawPhone || tPhone === phoneNoZero || tPhone === phoneWithZero)) return true;
              return false;
            };

            const filteredUsers = (usersList || []).filter(u => !isMatchingUser(u));
            const filteredTechs = (technicians || []).filter(t => !isMatchingTech(t));

            // CRITICAL: Immediately update persistent storage under all possible storage keys
            localStorage.setItem('ir_users', JSON.stringify(filteredUsers));
            localStorage.setItem('ir_users_list', JSON.stringify(filteredUsers));
            localStorage.setItem('ir_techs', JSON.stringify(filteredTechs));

            if (onUpdateUsersList) {
              onUpdateUsersList(filteredUsers);
            }
            if (onUpdateTechniciansList) {
              onUpdateTechniciansList(filteredTechs);
            }
            alert(`کاربر "${userName}" و تمامی سوابق وی با موفقیت از کل سیستم حذف شد.`);
          } else {
            alert(data.error || data.message || 'خطا در حذف کاربر از سرور');
          }
        } catch (err: any) {
          alert(err.message || 'خطا در برقراری ارتباط با سرور');
        }
      }
    );
  };

  // Trust Badges state hooks
  const [b1Link, setB1Link] = React.useState(trustBadges?.badge1Link || '');
  const [b1Img, setB1Img] = React.useState(trustBadges?.badge1Image || '');
  const [b2Link, setB2Link] = React.useState(trustBadges?.badge2Link || '');
  const [b2Img, setB2Img] = React.useState(trustBadges?.badge2Image || '');
  const [badgesStatusMsg, setBadgesStatusMsg] = React.useState('');

  React.useEffect(() => {
    if (trustBadges) {
      setB1Link(prev => shouldUpdateField('admin-b1-link', prev, trustBadges.badge1Link || '') ? (trustBadges.badge1Link || '') : prev);
      setB1Img(prev => shouldUpdateField('admin-b1-img', prev, trustBadges.badge1Image || '') ? (trustBadges.badge1Image || '') : prev);
      setB2Link(prev => shouldUpdateField('admin-b2-link', prev, trustBadges.badge2Link || '') ? (trustBadges.badge2Link || '') : prev);
      setB2Img(prev => shouldUpdateField('admin-b2-img', prev, trustBadges.badge2Image || '') ? (trustBadges.badge2Image || '') : prev);
    }
  }, [trustBadges]);

  // Admin Announcement local state hooks
  const [annTxt, setAnnTxt] = React.useState(adminAnnouncement?.text || '');
  const [annIsActive, setAnnIsActive] = React.useState(adminAnnouncement?.isActive || false);
  const [annStyle, setAnnStyle] = React.useState<'info' | 'warning' | 'success' | 'danger'>(adminAnnouncement?.style || 'info');
  const [annStatusMsg, setAnnStatusMsg] = React.useState('');

  // Global Broadcast Messages System
  const [broadcastsList, setBroadcastsList] = React.useState<BroadcastMessage[]>([]);
  const [broadcastTitle, setBroadcastTitle] = React.useState('');
  const [broadcastContent, setBroadcastContent] = React.useState('');
  const [broadcastTarget, setBroadcastTarget] = React.useState<'all' | 'client' | 'technician'>('all');
  const [broadcastPriority, setBroadcastPriority] = React.useState<'info' | 'warning' | 'urgent'>('info');
  const [broadcastActionType, setBroadcastActionType] = React.useState<'none' | 'upload_docs' | 'settle_commission'>('none');
  const [isSendingBroadcast, setIsSendingBroadcast] = React.useState(false);

  React.useEffect(() => {
    fetch('/api/announcements')
      .then(r => r.json())
      .then(d => {
        const list = d.broadcasts || d.announcements || [];
        if (Array.isArray(list)) setBroadcastsList(list);
      })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    if (adminAnnouncement) {
      setAnnTxt(prev => shouldUpdateField('admin-announcement-text', prev, adminAnnouncement.text || '') ? (adminAnnouncement.text || '') : prev);
      setAnnIsActive(adminAnnouncement.isActive || false);
      setAnnStyle(adminAnnouncement.style || 'info');
    }
  }, [adminAnnouncement]);
  const [isDbRefreshing, setIsDbRefreshing] = React.useState(false);
  const [pendingCodesSearchVal, setPendingCodesSearchVal] = React.useState('');
  const [sparePartsSearchVal, setSparePartsSearchVal] = React.useState('');
  const [approvedCodesSearchVal, setApprovedCodesSearchVal] = React.useState('');
  const [errGroupCategoryFilter, setErrGroupCategoryFilter] = React.useState('');
  const [errGroupBrandFilter, setErrGroupBrandFilter] = React.useState('');
  const [errGroupViewMode, setErrGroupViewMode] = React.useState<'grouped' | 'simple'>('grouped');
  const [expandedErrGroups, setExpandedErrGroups] = React.useState<Record<string, boolean>>({});
  const [bulkEditingGroup, setBulkEditingGroup] = React.useState<{
    key: string;
    category: string;
    brand: string;
    model: string;
    errors: any[];
  } | null>(null);
  const [bulkEditNewCategory, setBulkEditNewCategory] = React.useState('');
  const [bulkEditNewBrand, setBulkEditNewBrand] = React.useState('');
  const [bulkEditNewModel, setBulkEditNewModel] = React.useState('');
  const [purchaseSearch, setPurchaseSearch] = React.useState('');
  const [userSearchVal, setUserSearchVal] = React.useState('');
  const [userRoleFilter, setUserRoleFilter] = React.useState<'client' | 'technician' | 'all'>('all');
  const [subSearchVal, setSubSearchVal] = React.useState('');
  const [paySearchVal, setPaySearchVal] = React.useState('');

  const approvedPurchases = React.useMemo(() => {
    return partPurchases || [];
  }, [partPurchases]);

  const allCombinedUsers = React.useMemo(() => {
    const map = new Map<string, any>();
    
    // 1. Add all from usersList with true database roles
    (usersList || []).forEach((u: any) => {
      if (!u) return;
      const key = String(u.phone || u.id || '').trim();
      if (!key) return;
      const isAdmin = u.phone === '09120947304' || u.role === 'admin' || Boolean(u.is_super_admin);
      const isTech = !isAdmin && (u.role === 'technician' || Boolean(u.is_technician));
      const userRole = isAdmin ? 'admin' : (isTech ? 'technician' : 'client');
      map.set(key, {
        id: u.id,
        full_name: isAdmin ? 'مدیر عالی کدیار۲۴' : (u.full_name || u.fullName || u.name || 'کاربر گرامی'),
        phone: u.phone || '',
        city: isAdmin ? 'مدیریت مرکزی' : (u.city || u.address || u.active_location || 'ثبت نشده'),
        role: userRole,
        is_super_admin: isAdmin,
        created_at: u.created_at || u.createdAt
      });
    });

    // 2. Also merge technicians without corrupting client roles
    (technicians || []).forEach((t: any) => {
      if (!t) return;
      const phoneKey = String(t.phone || '').trim();
      const idKey = String(t.user_id || t.id || '').trim();
      const isAdmin = t.phone === '09120947304' || t.role === 'admin' || Boolean(t.is_super_admin);
      const existing = (phoneKey && map.get(phoneKey)) || (idKey && map.get(idKey));

      if (existing) {
        if (isAdmin) {
          existing.role = 'admin';
          existing.is_super_admin = true;
          existing.full_name = 'مدیر عالی کدیار۲۴';
        }
        if (!existing.city || existing.city === 'ثبت نشده') {
          existing.city = isAdmin ? 'مدیریت مرکزی' : (t.city || t.active_location || 'ثبت نشده');
        }
        if (!existing.full_name || existing.full_name === 'کاربر گرامی') {
          existing.full_name = isAdmin ? 'مدیر عالی کدیار۲۴' : (t.full_name || t.fullName || t.name || 'تکنسین گرامی');
        }
      } else {
        const key = phoneKey || idKey || String(t.id).trim();
        map.set(key, {
          id: t.id,
          full_name: isAdmin ? 'مدیر عالی کدیار۲۴' : (t.full_name || t.fullName || t.name || 'تکنسین گرامی'),
          phone: t.phone || '',
          city: isAdmin ? 'مدیریت مرکزی' : (t.city || t.active_location || 'ثبت نشده'),
          role: isAdmin ? 'admin' : 'technician',
          is_super_admin: isAdmin,
          created_at: t.created_at || t.createdAt
        });
      }
    });

    return Array.from(map.values());
  }, [usersList, technicians]);

  const filteredPurchases = approvedPurchases.filter(p => {
    const query = purchaseSearch.toLowerCase();
    return (
      (p.id && p.id.toLowerCase().includes(query)) ||
      (p.customerName && p.customerName.toLowerCase().includes(query)) ||
      (p.customerPhone && p.customerPhone.includes(query)) ||
      (p.partName && p.partName.toLowerCase().includes(query)) ||
      (p.partCategory && p.partCategory.toLowerCase().includes(query)) ||
      (p.customerAddress && p.customerAddress.toLowerCase().includes(query))
    );
  });

  // Local states for custom configuration additions
  const [newBrandName, setNewBrandName] = React.useState('');
  const [newCategoryName, setNewCategoryName] = React.useState('');
  const [newModelName, setNewModelName] = React.useState('');
  
  const [newCityName, setNewCityName] = React.useState('');
  const [newRegionName, setNewRegionName] = React.useState('');
  const [selectedConfigCity, setSelectedConfigCity] = React.useState('');

  // Unified global configuration search
  const [globalConfigSearch, setGlobalConfigSearch] = React.useState('');

  // Mass Bulk Import
  const [importType, setImportType] = React.useState<'errors' | 'categories' | 'brands' | 'cities'>('errors');
  const [pastedImportData, setPastedImportData] = React.useState('');
  const [importStatus, setImportStatus] = React.useState<{ type: 'idle' | 'success' | 'error'; msg: string }>({ type: 'idle', msg: '' });

  // Quick edit for errors
  const [editingError, setEditingError] = React.useState<ErrorCode | null>(null);

  // Local states for direct error code submission
  const [dirCode, setDirCode] = React.useState('');
  const [dirTitle, setDirTitle] = React.useState('');
  const [dirCategory, setDirCategory] = React.useState('');
  const [dirBrand, setDirBrand] = React.useState('');
  const [dirModel, setDirModel] = React.useState('');
  const [dirReason, setDirReason] = React.useState('');
  const [dirSolution, setDirSolution] = React.useState('');
  const [dirVideoUrl, setDirVideoUrl] = React.useState('');
  const [dirHazard, setDirHazard] = React.useState<'low' | 'medium' | 'high' | 'critical'>('low');
  const [dirIsCommon, setDirIsCommon] = React.useState(false);
  const [directInsertStatus, setDirectInsertStatus] = React.useState<{ type: 'idle' | 'success' | 'warning' | 'error'; msg: string; code?: string; category?: string; brand?: string; model?: string } | null>(null);
  
  const [categoryMode, setCategoryMode] = React.useState<'select' | 'custom'>('select');
  const [brandMode, setBrandMode] = React.useState<'select' | 'custom'>('select');
  const [modelMode, setModelMode] = React.useState<'select' | 'custom'>('select');

  // Common Problems Local States
  const [probTitle, setProbTitle] = React.useState('');
  const [probCategory, setProbCategory] = React.useState('');
  const [probBrand, setProbBrand] = React.useState('');
  const [probCausesRaw, setProbCausesRaw] = React.useState('');
  const [probSolutionsRaw, setProbSolutionsRaw] = React.useState('');
  const [probTagsRaw, setProbTagsRaw] = React.useState('');
  const [probCode, setProbCode] = React.useState('');
  const [probModel, setProbModel] = React.useState('');
  const [probDescription, setProbDescription] = React.useState('');
  const [probPrecautionsRaw, setProbPrecautionsRaw] = React.useState('');
  const [probVideoUrl, setProbVideoUrl] = React.useState('');
  const [probHazardLevel, setProbHazardLevel] = React.useState<'low' | 'medium' | 'high' | 'critical'>('low');
  const [probModelMode, setProbModelMode] = React.useState<'select' | 'custom'>('select');
  const [editingProblemId, setEditingProblemId] = React.useState<string | null>(null);
  const [deletingProblemId, setDeletingProblemId] = React.useState<string | null>(null);
  const [probCategoryMode, setProbCategoryMode] = React.useState<'select' | 'custom'>('select');
  const [probBrandMode, setProbBrandMode] = React.useState<'select' | 'custom'>('select');
  const [probSearchQuery, setProbSearchQuery] = React.useState('');
  const [probImportText, setProbImportText] = React.useState('');
  const [probImportStatus, setProbImportStatus] = React.useState<{ type: 'idle' | 'success' | 'error'; msg: string }>({ type: 'idle', msg: '' });
  const [probFormMessage, setProbFormMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Common Problems Handlers
  const handleResetProblemForm = () => {
    setProbTitle('');
    setProbCategory('');
    setProbBrand('');
    setProbCausesRaw('');
    setProbSolutionsRaw('');
    setProbTagsRaw('');
    setProbCode('');
    setProbModel('');
    setProbDescription('');
    setProbPrecautionsRaw('');
    setProbVideoUrl('');
    setProbHazardLevel('low');
    setEditingProblemId(null);
    setProbFormMessage(null);
  };

  const handleAddProblem = () => {
    if (!probTitle.trim()) {
      setProbFormMessage({ type: 'error', text: 'عنوان مشکل نمی‌تواند خالی باشد.' });
      return;
    }
    const finalCategory = probCategory.trim() || 'عمومی';
    const finalBrand = probBrand.trim() || 'عمومی';
    const finalCauses = probCausesRaw.split('\n').map(c => c.trim()).filter(Boolean);
    const finalSolutions = probSolutionsRaw.split('\n').map(s => s.trim()).filter(Boolean);
    const finalTags = probTagsRaw.split(',').map(t => t.trim()).filter(Boolean);
    const finalPrecautions = probPrecautionsRaw.split('\n').map(p => p.trim()).filter(Boolean);
    const finalVideoUrl = probVideoUrl.trim();

    let updatedList: CommonProblem[] = [...commonProblems];
    
    if (editingProblemId) {
      // Edit
      updatedList = updatedList.map(p => p.id === editingProblemId ? {
        ...p,
        code: probCode.trim(),
        title: probTitle.trim(),
        category: finalCategory,
        brand: finalBrand,
        model: probModel.trim() || 'عمومی',
        description: probDescription.trim(),
        causes: finalCauses,
        steps: finalSolutions, // unified steps matches the solutions textarea
        solutions: finalSolutions,
        precautions: finalPrecautions,
        hazardLevel: probHazardLevel,
        tags: finalTags,
        video_url: finalVideoUrl,
        videoUrl: finalVideoUrl
      } : p);
      setProbFormMessage({ type: 'success', text: `مشکل شایع "${probTitle}" با موفقیت ویرایش گردید.` });
    } else {
      // Add
      const newProb: CommonProblem = {
        id: `prob-${Date.now()}`,
        code: probCode.trim(),
        title: probTitle.trim(),
        category: finalCategory,
        brand: finalBrand,
        model: probModel.trim() || 'عمومی',
        description: probDescription.trim(),
        causes: finalCauses,
        steps: finalSolutions,
        solutions: finalSolutions,
        precautions: finalPrecautions,
        hazardLevel: probHazardLevel,
        tags: finalTags,
        video_url: finalVideoUrl,
        videoUrl: finalVideoUrl,
        views: 0
      };
      updatedList.unshift(newProb);
      setProbFormMessage({ type: 'success', text: `مشکل شایع جدید با عنوان "${probTitle}" ثبت شد.` });
    }

    // Auto-extract and register category and brand to system configuration
    let updatedCats = false, updatedBrands = false;
    const newCategories = [...categoriesList];
    const newBrands = [...brandsList];

    if (finalCategory.trim() && finalCategory.trim() !== 'عمومی' && !newCategories.includes(finalCategory.trim())) {
      newCategories.push(finalCategory.trim());
      updatedCats = true;
    }

    if (finalBrand.trim() && finalBrand.trim() !== 'عمومی' && !newBrands.includes(finalBrand.trim())) {
      newBrands.push(finalBrand.trim());
      updatedBrands = true;
    }

    if (updatedCats) onUpdateCategoriesList(newCategories);
    if (updatedBrands) onUpdateBrandsList(newBrands);

    if (onUpdateCommonProblemsList) {
      onUpdateCommonProblemsList(updatedList);
    }
    
    // Clear form except the feedback message which will clear in 3s
    setTimeout(() => setProbFormMessage(null), 3000);
    setProbTitle('');
    setProbCategory('');
    setProbBrand('');
    setProbCausesRaw('');
    setProbSolutionsRaw('');
    setProbTagsRaw('');
    setProbCode('');
    setProbModel('');
    setProbDescription('');
    setProbPrecautionsRaw('');
    setProbHazardLevel('low');
    setEditingProblemId(null);
  };

  const handleEditProblemClick = (p: CommonProblem) => {
    setEditingProblemId(p.id);
    setProbTitle(p.title);
    setProbCategory(p.category);
    setProbBrand(p.brand);
    setProbCausesRaw(Array.isArray(p.causes) ? p.causes.join('\n') : (p.causes || ''));
    setProbSolutionsRaw(Array.isArray(p.steps || p.solutions) ? (p.steps || p.solutions).join('\n') : '');
    setProbTagsRaw(Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || ''));
    setProbCode(p.code || '');
    setProbModel(p.model || '');
    setProbDescription(p.description || '');
    setProbPrecautionsRaw(Array.isArray(p.precautions) ? p.precautions.join('\n') : (p.precautions || ''));
    setProbVideoUrl(p.video_url || p.videoUrl || '');
    setProbHazardLevel(p.hazardLevel || 'low');
    setProbFormMessage(null);
    
    // Scroll to the problems form smoothly
    const element = document.getElementById('problems-form-top');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleDeleteProblem = async (id: string) => {
    try {
      const token = localStorage.getItem('session_user_id') || '';
      const res = await fetch(`/api/problems/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'X-Session-Token': token }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && (data.status === 'ok' || data.success)) {
        const updatedList = commonProblems.filter(p => p.id !== id);
        if (onUpdateCommonProblemsList) {
          onUpdateCommonProblemsList(updatedList);
        }
      } else {
        alert(data.error || data.message || 'خطا در حذف مشکل شایع از سرور');
      }
    } catch (err: any) {
      alert(err.message || 'خطا در ارتباط با سرور');
    }
  };

  const handleImportProblemsJSON = () => {
    if (!probImportText.trim()) {
      setProbImportStatus({ type: 'error', msg: 'داده‌ای برای درون‌ریزی یافت نشد.' });
      return;
    }
    try {
      const parsed = JSON.parse(probImportText.trim());
      const rawArray = Array.isArray(parsed) ? parsed : [parsed];
      
      const imported: CommonProblem[] = [];
      for (const item of rawArray) {
        if (!item.title) continue;
        const stepsArr = Array.isArray(item.steps) ? item.steps : 
                         (Array.isArray(item.solutions) ? item.solutions : 
                          String(item.steps || item.solutions || '').split('\n').filter(Boolean));
        
        imported.push({
          id: item.id || `prob-imported-${Math.round(Math.random() * 1000000)}`,
          code: String(item.code || '').trim(),
          category: String(item.category || 'عمومی').trim(),
          brand: String(item.brand || 'عمومی').trim(),
          model: String(item.model || 'عمومی').trim(),
          title: String(item.title).trim(),
          description: String(item.description || '').trim(),
          causes: Array.isArray(item.causes) ? item.causes : String(item.causes || '').split('\n').filter(Boolean),
          steps: stepsArr,
          solutions: stepsArr, // keep for compatibility
          precautions: Array.isArray(item.precautions) ? item.precautions : String(item.precautions || '').split('\n').filter(Boolean),
          hazardLevel: (item.hazardLevel === 'critical' || item.hazardLevel === 'high' || item.hazardLevel === 'medium' || item.hazardLevel === 'low') ? item.hazardLevel : 'low',
          tags: Array.isArray(item.tags) ? item.tags : String(item.tags || '').split(',').map(t => t.trim()).filter(Boolean),
          video_url: String(item.video_url || item.videoUrl || '').trim(),
          videoUrl: String(item.video_url || item.videoUrl || '').trim(),
          views: Number(item.views) || 0
        });
      }

      if (imported.length === 0) {
        setProbImportStatus({ type: 'error', msg: 'فرمت داده نامعتبر است یا عنوان وجود ندارد.' });
        return;
      }

      const merged = [...imported, ...commonProblems];
      if (onUpdateCommonProblemsList) {
        onUpdateCommonProblemsList(merged);
      }

      setProbImportStatus({ type: 'success', msg: `تعداد ${imported.length} مشکل شایع جدید با موفقیت به سیستم اضافه گردید.` });
      setProbImportText('');
    } catch (err: any) {
      setProbImportStatus({ type: 'error', msg: `خطا در پارس اطلاعات: ${err.message}` });
    }
  };

  // Real-time matching logic for other categories and same category
  const matchingCodeRefs = React.useMemo(() => {
    if (!dirCode.trim()) return [];
    const searchCode = dirCode.trim().toLowerCase().replace(/[يى]/g, 'ی').replace(/ك/g, 'ک');
    return errorCodes.filter(err => {
      const codeClean = err.code.trim().toLowerCase().replace(/[يى]/g, 'ی').replace(/ك/g, 'ک');
      return codeClean === searchCode || codeClean.includes(searchCode) || searchCode.includes(codeClean);
    });
  }, [dirCode, errorCodes]);

  const matchingInCurrentCategory = React.useMemo(() => {
    if (!dirCategory.trim()) return matchingCodeRefs;
    const catClean = dirCategory.trim().toLowerCase().replace(/[يى]/g, 'ی').replace(/ك/g, 'ک');
    return matchingCodeRefs.filter(err => {
      const errCatClean = err.category.trim().toLowerCase().replace(/[يى]/g, 'ی').replace(/ك/g, 'ک');
      return errCatClean === catClean;
    });
  }, [dirCategory, matchingCodeRefs]);

  const matchingInOtherCategories = React.useMemo(() => {
    if (!dirCategory.trim()) return [];
    const catClean = dirCategory.trim().toLowerCase().replace(/[يى]/g, 'ی').replace(/ك/g, 'ک');
    return matchingCodeRefs.filter(err => {
      const errCatClean = err.category.trim().toLowerCase().replace(/[يى]/g, 'y').replace(/[يى]/g, 'ی').replace(/ك/g, 'ک');
      return errCatClean !== catClean;
    });
  }, [dirCategory, matchingCodeRefs]);

  // local temporary stock adjustments state
  const [editingPartId, setEditingPartId] = React.useState<string | null>(null);
  const [tempPrice, setTempPrice] = React.useState<number>(0);
  const [tempStock, setTempStock] = React.useState<number>(0);

  // Local states for adding a new spare part product
  const [newPartName, setNewPartName] = React.useState('');
  const [newPartDescription, setNewPartDescription] = React.useState('');
  const [newPartPrice, setNewPartPrice] = React.useState<number | ''>('');
  const [newPartPriceError, setNewPartPriceError] = React.useState('');
  const [newPartCategory, setNewPartCategory] = React.useState('');
  const [partCategoryMode, setPartCategoryMode] = React.useState<'select' | 'custom'>('select');
  const [newQuickBrandInput, setNewQuickBrandInput] = React.useState('');
  const [newPartModel, setNewPartModel] = React.useState('');
  const [newPartBrands, setNewPartBrands] = React.useState<string[]>([]);
  const [newPartCompatibleBrands, setNewPartCompatibleBrands] = React.useState('');
  const [newPartStock, setNewPartStock] = React.useState<number | ''>('');
  const [newPartStockError, setNewPartStockError] = React.useState('');
  const [newPartImage, setNewPartImage] = React.useState('');
  const [newPartImageError, setNewPartImageError] = React.useState('');
  const [isAddPartOpen, setIsAddPartOpen] = React.useState(false);

  // Full edit modal states for spare parts
  const [editingFullPart, setEditingFullPart] = React.useState<SparePart | null>(null);
  const [editPartName, setEditPartName] = React.useState('');
  const [editPartCategory, setEditPartCategory] = React.useState('');
  const [editPartCategoryMode, setEditPartCategoryMode] = React.useState<'select' | 'custom'>('select');
  const [editPartModel, setEditPartModel] = React.useState('');
  const [editPartCompatibleBrands, setEditPartCompatibleBrands] = React.useState('');
  const [editPartDescription, setEditPartDescription] = React.useState('');
  const [editPartPrice, setEditPartPrice] = React.useState<number | ''>('');
  const [editPartStock, setEditPartStock] = React.useState<number | ''>('');
  const [editPartImage, setEditPartImage] = React.useState('');

  // Inline edit states for global config
  const [editingBrand, setEditingBrand] = React.useState<string | null>(null);
  const [editingBrandVal, setEditingBrandVal] = React.useState('');

  const [editingCategory, setEditingCategory] = React.useState<string | null>(null);
  const [editingCategoryVal, setEditingCategoryVal] = React.useState('');

  const [editingModel, setEditingModel] = React.useState<string | null>(null);
  const [editingModelVal, setEditingModelVal] = React.useState('');

  const [editingCity, setEditingCity] = React.useState<string | null>(null);
  const [editingCityVal, setEditingCityVal] = React.useState('');

  const [editingRegionCity, setEditingRegionCity] = React.useState<string | null>(null);
  const [editingRegion, setEditingRegion] = React.useState<string | null>(null);
  const [editingRegionVal, setEditingRegionVal] = React.useState('');

  const [adminPassMessage, setAdminPassMessage] = React.useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [brandMessage, setBrandMessage] = React.useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [categoryMessage, setCategoryMessage] = React.useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [modelMessage, setModelMessage] = React.useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [cityMessage, setCityMessage] = React.useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [partMessage, setPartMessage] = React.useState<{ type: 'success' | 'error', text: string } | null>(null);

  // SMS Gateway state integrations
  const [smsProviderInput, setSmsProviderInput] = React.useState(smsSettings?.provider || 'simulated');
  const [smsApiKeyInput, setSmsApiKeyInput] = React.useState(smsSettings?.apiKey || '');
  const [smsLineNumberInput, setSmsLineNumberInput] = React.useState(smsSettings?.lineNumber || '');
  const [smsOtpPatternInput, setSmsOtpPatternInput] = React.useState(smsSettings?.otpPatternCode || '');
  const [smsStatusPatternInput, setSmsStatusPatternInput] = React.useState(smsSettings?.statusNotificationPatternCode || '');
  const [smsEnabledInput, setSmsEnabledInput] = React.useState(smsSettings?.enabled || false);

  // For testing sms dispatch
  const [testPhoneInput, setTestPhoneInput] = React.useState('');
  const [testMessageInput, setTestMessageInput] = React.useState('ارسال موفقیت‌آمیز پیامک از سامانه ب‌نیاز');
  const [testSmsStatus, setTestSmsStatus] = React.useState<{ type: 'idle' | 'loading' | 'success' | 'error', msg: string }>({ type: 'idle', msg: '' });

  React.useEffect(() => {
    if (smsSettings) {
      setSmsProviderInput(prev => shouldUpdateField('admin-sms-provider', prev, smsSettings.provider || 'simulated') ? (smsSettings.provider || 'simulated') : prev);
      setSmsApiKeyInput(prev => shouldUpdateField('admin-sms-api-key', prev, smsSettings.apiKey || '') ? (smsSettings.apiKey || '') : prev);
      setSmsLineNumberInput(prev => shouldUpdateField('admin-sms-line-number', prev, smsSettings.lineNumber || '') ? (smsSettings.lineNumber || '') : prev);
      setSmsOtpPatternInput(prev => shouldUpdateField('admin-sms-otp-pattern', prev, smsSettings.otpPatternCode || '') ? (smsSettings.otpPatternCode || '') : prev);
      setSmsStatusPatternInput(prev => shouldUpdateField('admin-sms-status-pattern', prev, smsSettings.statusNotificationPatternCode || '') ? (smsSettings.statusNotificationPatternCode || '') : prev);
      setSmsEnabledInput(smsSettings.enabled || false);
    }
  }, [smsSettings]);

  const handleSaveSmsSettings = () => {
    if (onUpdateSmsSettings) {
      onUpdateSmsSettings({
        provider: smsProviderInput,
        apiKey: smsApiKeyInput,
        lineNumber: smsLineNumberInput,
        otpPatternCode: smsOtpPatternInput,
        statusNotificationPatternCode: smsStatusPatternInput,
        enabled: smsEnabledInput,
      });
      alert('تنظیمات وب‌سرویس و درگاه پیامک با موفقیت همگام‌سازی شد.');
    }
  };

  const handleTestSmsSend = async () => {
    if (!testPhoneInput) {
      alert('لطفاً شماره موبایل گیرنده را وارد نمایید.');
      return;
    }
    setTestSmsStatus({ type: 'loading', msg: 'درحال برقراری ارتباط با پکیج مخابراتی...' });
    try {
      if (onSendTestSms) {
        await onSendTestSms(testPhoneInput, testMessageInput, 'status');
        setTestSmsStatus({ 
          type: 'success', 
          msg: `پیامک آزمایشی به شماره ${testPhoneInput} با موفقیت ارسال شد و در صف سیستم مرکزی ثبت گردید.`  
        });
      } else {
        throw new Error('روابط ارتباطی با وب‌سرویس قطع است.');
      }
    } catch (e: any) {
      setTestSmsStatus({ type: 'error', msg: `خطا در فرآیند ارسال آزمایشی: ${e.message || e}` });
    }
  };

  // Administrator password configuration states
  const [currentAdminPass, setCurrentAdminPass] = React.useState('');
  const [newAdminPass, setNewAdminPass] = React.useState('');
  const [newAdminPassConfirm, setNewAdminPassConfirm] = React.useState('');

  const handleChangeAdminPass = () => {
    setAdminPassMessage(null);
    const savedAdminPassword = adminPassword || '';
    if (!currentAdminPass) {
      alert('لطفاً کلمه عبور فعلی مدیریت را وارد فرمایید.');
      return;
    }
    if (currentAdminPass !== savedAdminPassword) {
      alert('کلمه عبور فعلی وارد شده نادرست است!');
      return;
    }
    if (!newAdminPass.trim()) {
      alert('لطفاً کلمه عبور جدید را وارد فرمایید.');
      return;
    }
    if (newAdminPass !== newAdminPassConfirm) {
      alert('رمز عبور جدید با تاییدیه آن مطابقت ندارد!');
      return;
    }
    if (onUpdateAdminPassword) {
      onUpdateAdminPassword(newAdminPass.trim());
    } else {
      localStorage.setItem('ir_admin_password', newAdminPass.trim());
    }
    setAdminPassMessage({ type: 'success', text: 'کلمه عبور مدیر ارشد با موفقیت تغییر یافت. کلمه عبور جدید ثبت شد.' });
    alert('کلمه عبور مدیر ارشد با موفقیت تغییر یافت. از این پس برای ورود کلید واژه جدید معتبر خواهد بود.');
    setCurrentAdminPass('');
    setNewAdminPass('');
    setNewAdminPassConfirm('');
  };

  // Manual technician insertion form states
  const [isAddTechOpen, setIsAddTechOpen] = React.useState(false);
  const [newTechName, setNewTechName] = React.useState('');
  const [newTechPhone, setNewTechPhone] = React.useState('');
  const [newTechPhoneError, setNewTechPhoneError] = React.useState('');
  const [newTechPassword, setNewTechPassword] = React.useState('');
  const [newTechSpecialties, setNewTechSpecialties] = React.useState<string[]>([]);
  const [newTechLocation, setNewTechLocation] = React.useState('');
  const [newTechAvatar, setNewTechAvatar] = React.useState('');
  const [newTechAvatarError, setNewTechAvatarError] = React.useState('');
  const [newTechRating, setNewTechRating] = React.useState(5.0);
  const [newTechSatisfactionRate, setNewTechSatisfactionRate] = React.useState(98);

  // Manual technician editing states
  const [editingTechId, setEditingTechId] = React.useState<string | null>(null);
  const [editTechName, setEditTechName] = React.useState('');
  const [editTechPhone, setEditTechPhone] = React.useState('');
  const [editTechPhoneError, setEditTechPhoneError] = React.useState('');
  const [editTechPassword, setEditTechPassword] = React.useState('');
  const [editTechSpecialties, setEditTechSpecialties] = React.useState<string[]>([]);
  const [editTechLocation, setEditTechLocation] = React.useState('');
  const [editTechAvatar, setEditTechAvatar] = React.useState('');
  const [editTechAvatarError, setEditTechAvatarError] = React.useState('');
  const [editTechRating, setEditTechRating] = React.useState(5.0);
  const [editTechSatisfactionRate, setEditTechSatisfactionRate] = React.useState(98);

  // Affiliate Products states
  const [isAddAffiliateOpen, setIsAddAffiliateOpen] = React.useState(false);
  const [newAffiliateTitle, setNewAffiliateTitle] = React.useState('');
  const [newAffiliateCategory, setNewAffiliateCategory] = React.useState('');
  const [affiliateCategoryMode, setAffiliateCategoryMode] = React.useState<'select' | 'custom'>('select');
  const [newAffiliateBrand, setNewAffiliateBrand] = React.useState('');
  const [affiliateBrandMode, setAffiliateBrandMode] = React.useState<'select' | 'custom'>('select');
  const [newAffiliateModel, setNewAffiliateModel] = React.useState('');
  const [newAffiliatePrice, setNewAffiliatePrice] = React.useState(0);
  const [newAffiliateLink, setNewAffiliateLink] = React.useState('');
  const [newAffiliateImage, setNewAffiliateImage] = React.useState('');
  const [newAffiliateCommission, setNewAffiliateCommission] = React.useState(0);

  const [editingAffiliateId, setEditingAffiliateId] = React.useState<string | null>(null);
  const [editAffiliateTitle, setEditAffiliateTitle] = React.useState('');
  const [editAffiliateCategory, setEditAffiliateCategory] = React.useState('');
  const [editAffiliateCategoryMode, setEditAffiliateCategoryMode] = React.useState<'select' | 'custom'>('select');
  const [editAffiliateBrand, setEditAffiliateBrand] = React.useState('');
  const [editAffiliateBrandMode, setEditAffiliateBrandMode] = React.useState<'select' | 'custom'>('select');
  const [editAffiliateModel, setEditAffiliateModel] = React.useState('');
  const [editAffiliatePrice, setEditAffiliatePrice] = React.useState(0);
  const [editAffiliateLink, setEditAffiliateLink] = React.useState('');
  const [editAffiliateImage, setEditAffiliateImage] = React.useState('');
  const [editAffiliateCommission, setEditAffiliateCommission] = React.useState(0);

  const handleTechAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        if (isEdit) {
          setEditTechAvatar(event.target.result as string);
        } else {
          setNewTechAvatar(event.target.result as string);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddNewTech = (e: React.FormEvent) => {
    e.preventDefault();
    setNewTechPhoneError('');
    setNewTechAvatarError('');

    if (!newTechName.trim()) {
      alert('لطفاً نام و نام خانوادگی تکنسین را وارد کنید.');
      return;
    }

    const phoneValidation = validateIranianMobile(newTechPhone);
    if (!phoneValidation.isValid) {
      setNewTechPhoneError(phoneValidation.error || '');
      alert(phoneValidation.error || 'خطا در شماره تلفن همراه تکنسین');
      return;
    }

    if (newTechAvatar.trim()) {
      const urlValidation = validateUrl(newTechAvatar);
      if (!urlValidation.isValid) {
        setNewTechAvatarError(urlValidation.error || '');
        alert(urlValidation.error || 'فرم آدرس عکس آواتار نامعتبر است.');
        return;
      }
    }

    const newTechObj: any = {
      id: `tech_${Date.now()}`,
      name: newTechName.trim(),
      phone: newTechPhone.trim(),
      password: newTechPassword.trim() || '123456',
      specialty: newTechSpecialties.length > 0 ? newTechSpecialties : ['پکیج'],
      rating: newTechRating,
      satisfactionRate: newTechSatisfactionRate,
      completedOrders: 0,
      balance: 0,
      isVerified: true,
      activeLocation: newTechLocation.trim() || 'تهران',
      avatarUrl: newTechAvatar.trim() || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>",
      documents: []
    };

    if (onUpdateTechniciansList) {
      onUpdateTechniciansList([...technicians, newTechObj]);
      alert(`پرونده تکنسین جدید "${newTechName.trim()}" با موفقیت ایجاد و فعال شد!`);
      setNewTechName('');
      setNewTechPhone('');
      setNewTechPhoneError('');
      setNewTechPassword('');
      setNewTechSpecialties([]);
      setNewTechLocation('');
      setNewTechAvatar('');
      setNewTechAvatarError('');
      setNewTechRating(5.0);
      setNewTechSatisfactionRate(98);
      setIsAddTechOpen(false);
    } else {
      alert('خطا: امکان بروزرسانی لیست تکنسین‌ها وجود ندارد (به دلیل عدم دسترسی به دیتابیس همکاران).');
    }
  };

  const handleEditTechSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTechName.trim()) {
      alert('لطفاً نام و نام خانوادگی تکنسین را وارد کنید.');
      return;
    }
    const phoneValidation = validateIranianMobile(editTechPhone);
    if (!phoneValidation.isValid) {
      alert(phoneValidation.error || 'خطا در شماره تلفن همراه تکنسین');
      return;
    }

    if (onUpdateTechniciansList && editingTechId) {
      const updated = technicians.map(t => {
        if (t.id === editingTechId) {
          return {
            ...t,
            name: editTechName.trim(),
            phone: editTechPhone.trim(),
            password: editTechPassword.trim(),
            specialty: editTechSpecialties.length > 0 ? editTechSpecialties : ['پکیج'],
            rating: parseFloat(editTechRating.toString()) || 5.0,
            satisfactionRate: parseInt(editTechSatisfactionRate.toString()) || 98,
            activeLocation: editTechLocation.trim() || 'تهران',
            avatarUrl: editTechAvatar.trim() || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>"
          };
        }
        return t;
      });
      onUpdateTechniciansList(updated);
      alert('اطلاعات پرسنلی و ارزیابی تکنسین با موفقیت بروزرسانی شد!');
      setEditingTechId(null);
    }
  };

  const handleAddAffiliateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCat = newAffiliateCategory.trim();
    const finalBr = newAffiliateBrand.trim();

    if (!finalCat || !finalBr || !newAffiliateModel.trim() || !newAffiliateLink.trim()) {
      alert('لطفاً تمامی فیلدهای الزامی ستاره‌دار (دسته‌بندی، برند، مدل و لینک خرید) را تکمیل نمایید.');
      return;
    }

    const titleVal = newAffiliateTitle.trim() || `${finalBr} ${newAffiliateModel.trim()} - ${finalCat}`;
    const imgVal = newAffiliateImage.trim() || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23f1f5f9'/><text x='50' y='55' font-size='28' text-anchor='middle'>⚙️</text></svg>";

    const newProduct = {
      id: `aff_${Date.now()}`,
      name: titleVal,
      title: titleVal,
      category: finalCat,
      brand: finalBr,
      model: newAffiliateModel.trim(),
      price: Number(newAffiliatePrice) || 0,
      link: newAffiliateLink.trim(),
      purchaseUrl: newAffiliateLink.trim(),
      image: imgVal,
      commission: Number(newAffiliateCommission) || 0,
      description: `قطعه همکار ${titleVal} برای ${finalBr} مدل ${newAffiliateModel.trim()}`,
      created_at: new Date().toISOString()
    };

    // Auto-register new category in system list if not present
    if (finalCat && !categoriesList.includes(finalCat) && onUpdateCategoriesList) {
      onUpdateCategoriesList([...categoriesList, finalCat]);
    }
    // Auto-register new brand in system list if not present
    if (finalBr && !brandsList.includes(finalBr) && onUpdateBrandsList) {
      onUpdateBrandsList([...brandsList, finalBr]);
    }

    if (onUpdateAffiliateProducts) {
      const updated = [...(affiliateProducts || []), newProduct];
      onUpdateAffiliateProducts(updated);
      alert('محصول همکاری در فروش جدید با موفقیت ثبت شد!');
      // Reset form
      setNewAffiliateTitle('');
      setNewAffiliateImage('');
      setNewAffiliateCategory('');
      setAffiliateCategoryMode('select');
      setNewAffiliateBrand('');
      setAffiliateBrandMode('select');
      setNewAffiliateModel('');
      setNewAffiliatePrice(0);
      setNewAffiliateLink('');
      setNewAffiliateCommission(0);
      setIsAddAffiliateOpen(false);
    }
  };

  const handleEditAffiliateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCat = editAffiliateCategory.trim();
    const finalBr = editAffiliateBrand.trim();

    if (!finalCat || !finalBr || !editAffiliateModel.trim() || !editAffiliateLink.trim()) {
      alert('لطفاً تمامی فیلدهای الزامی ستاره‌دار را تکمیل نمایید.');
      return;
    }

    const titleVal = editAffiliateTitle.trim() || `${finalBr} ${editAffiliateModel.trim()} - ${finalCat}`;

    // Auto-register new category in system list if not present
    if (finalCat && !categoriesList.includes(finalCat) && onUpdateCategoriesList) {
      onUpdateCategoriesList([...categoriesList, finalCat]);
    }
    // Auto-register new brand in system list if not present
    if (finalBr && !brandsList.includes(finalBr) && onUpdateBrandsList) {
      onUpdateBrandsList([...brandsList, finalBr]);
    }

    if (onUpdateAffiliateProducts && editingAffiliateId) {
      const updated = (affiliateProducts || []).map(p => {
        if (p.id === editingAffiliateId) {
          return {
            ...p,
            name: titleVal,
            title: titleVal,
            category: finalCat,
            brand: finalBr,
            model: editAffiliateModel.trim(),
            price: Number(editAffiliatePrice) || 0,
            link: editAffiliateLink.trim(),
            purchaseUrl: editAffiliateLink.trim(),
            image: editAffiliateImage.trim() || p.image || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23f1f5f9'/><text x='50' y='55' font-size='28' text-anchor='middle'>⚙️</text></svg>",
            commission: Number(editAffiliateCommission) || 0,
            description: `قطعه همکار ${titleVal} برای ${finalBr} مدل ${editAffiliateModel.trim()}`
          };
        }
        return p;
      });
      onUpdateAffiliateProducts(updated);
      alert('تغییرات محصول همکاری در فروش با موفقیت ذخیره شد!');
      setEditingAffiliateId(null);
    }
  };

  // Dedicated interactive document previewer modal state
  const [previewDoc, setPreviewDoc] = React.useState<{ techName: string; docName: string } | null>(null);

  // Custom visual confirm dialog to work flawlessly in sandboxed iFrames
  const [showConfirmModal, setShowConfirmModal] = React.useState<{
    title: string;
    message: string;
    onConfirm: (typedPassword?: string) => void;
    requiresPasswordVerify?: boolean;
  } | null>(null);

  const [confirmPasswordInput, setConfirmPasswordInput] = React.useState('');
  const [confirmPasswordError, setConfirmPasswordError] = React.useState('');

  const triggerSafeConfirm = (
    title: string,
    message: string,
    onConfirm: (typedPassword?: string) => void,
    requiresPasswordVerify?: boolean
  ) => {
    setConfirmPasswordInput('');
    setConfirmPasswordError('');
    setShowConfirmModal({ title, message, onConfirm, requiresPasswordVerify });
  };

  const handleDeletePart = (id: string) => {
    if (onUpdateSparePartsList) {
      const part = spareParts.find((p) => p.id === id);
      triggerSafeConfirm(
        'حذف محصول فروشگاه',
        `آیا از حذف قطعه/محصول "${part?.name || 'انتخابی'}" از بورس قطعات رجیستر شده اطمینان کامل دارید؟`,
        async () => {
          try {
            const token = localStorage.getItem('session_user_id') || '';
            const res = await fetch(`/api/store/parts/${encodeURIComponent(id)}`, {
              method: 'DELETE',
              headers: { 'X-Session-Token': token }
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && (data.status === 'ok' || data.success)) {
              const filtered = spareParts.filter((p) => p.id !== id);
              onUpdateSparePartsList(filtered);
              alert(`محصول/قطعه "${part?.name || 'انتخابی'}" با موفقیت از دیتابیس بورس قطعات کدیار۲۴ حذف گردید.`);
            } else {
              alert(data.error || data.message || 'خطا در حذف قطعه از سرور');
            }
          } catch (err: any) {
            alert(err.message || 'خطا در ارتباط با سرور');
          }
        }
      );
    }
  };

  const handleAddNewPart = (e: React.FormEvent) => {
    e.preventDefault();
    setNewPartImageError('');
    setNewPartPriceError('');
    setNewPartStockError('');

    if (!newPartName.trim()) {
      alert('لطفاً نام قطعه یدکی را وارد کنید.');
      return;
    }

    const priceNum = Number(newPartPrice);
    if (newPartPrice === '' || isNaN(priceNum) || priceNum < 0) {
      setNewPartPriceError('قیمت کالا باید یک عدد بزرگتر یا مساوی صفر باشد.');
      alert('خطا: قیمت کالا باید یک عدد بزرگتر یا مساوی صفر باشد.');
      return;
    }

    const stockNum = Number(newPartStock);
    if (newPartStock === '' || isNaN(stockNum) || stockNum < 0) {
      setNewPartStockError('موجودی انبار باید یک عدد بزرگتر یا مساوی صفر باشد.');
      alert('خطا: موجودی انبار باید یک عدد بزرگتر یا مساوی صفر باشد.');
      return;
    }

    if (newPartImage.trim()) {
      const urlValidation = validateUrl(newPartImage);
      if (!urlValidation.isValid) {
        setNewPartImageError(urlValidation.error || '');
        alert(urlValidation.error || 'نشانی تصویر قطعه نامعتبر است.');
        return;
      }
    }

    // Fallback image SVG if empty
    let finalImage = newPartImage.trim();
    if (!finalImage) {
      finalImage = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23f1f5f9'/><text x='50' y='55' font-size='28' text-anchor='middle'>⚙️</text></svg>";
    }

    const compBrandsString = newPartCompatibleBrands.trim() || (newPartBrands.length > 0 ? newPartBrands.join('، ') : 'عمومی');
    const compBrandsArray = newPartBrands.length > 0 
      ? newPartBrands 
      : (newPartCompatibleBrands ? newPartCompatibleBrands.split(/[،,]/).map(s => s.trim()).filter(Boolean) : ['عمومی']);

    const finalCategory = newPartCategory.trim() || 'سایر';

    // Auto-register new category in system list if not present
    if (finalCategory && finalCategory !== 'سایر' && !categoriesList.includes(finalCategory) && onUpdateCategoriesList) {
      onUpdateCategoriesList([...categoriesList, finalCategory]);
    }
    // Auto-register any new brands in system list if not present
    const newBrandsToAdd = compBrandsArray.filter(b => b && b !== 'عمومی' && !brandsList.includes(b));
    if (newBrandsToAdd.length > 0 && onUpdateBrandsList) {
      onUpdateBrandsList([...brandsList, ...newBrandsToAdd]);
    }

    const newPartObj: SparePart = {
      id: 'part_' + Date.now(),
      name: newPartName.trim(),
      title: newPartName.trim(),
      device_category: finalCategory,
      category: finalCategory,
      model: newPartModel.trim() || 'همه مدل‌ها',
      device_model: newPartModel.trim() || 'همه مدل‌ها',
      brand: compBrandsArray[0] || 'عمومی',
      compatible_brands: compBrandsString,
      compatibility: compBrandsArray,
      compatible_models: compBrandsArray,
      short_description: newPartDescription.trim() || `قطعه اورجینال ${newPartName.trim()}`,
      description: newPartDescription.trim() || `قطعه اورجینال ${newPartName.trim()}`,
      technical_description: newPartDescription.trim() || `قطعه اورجینال ${newPartName.trim()}`,
      price: priceNum,
      stock: stockNum,
      image: finalImage,
      image_url: finalImage
    };

    if (onUpdateSparePartsList) {
      onUpdateSparePartsList([...spareParts, newPartObj]);
    }

    // Sync with backend API
    const token = localStorage.getItem('session_user_id') || localStorage.getItem('token') || '';
    fetch('/api/store/parts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-Token': token },
      body: JSON.stringify(newPartObj)
    }).catch(e => console.error("Error creating part:", e));

    setPartMessage({ type: 'success', text: `محصول قطعه یدکی "${newPartName.trim()}" با موفقیت ذخیره شد.` });
    alert(`قطعه فنی جدید "${newPartName.trim()}" با موفقیت ثبت نهایی شد و در انبار محصولات در دسترس قرار گرفت.`);
    // Reset form
    setNewPartName('');
    setNewPartDescription('');
    setNewPartPrice('');
    setNewPartPriceError('');
    setNewPartCategory('');
    setNewPartModel('');
    setNewPartBrands([]);
    setNewPartCompatibleBrands('');
    setNewPartStock('');
    setNewPartStockError('');
    setNewPartImage('');
    setNewPartImageError('');
    setIsAddPartOpen(false);
  };

  // platform stats
  const totalInvoiced = orders
    .filter((o) => o.status === 'completed' && o.estimatedCost)
    .reduce((sum, o) => sum + (o.estimatedCost || 0), 0);

  // Platform takes 15% commission
  const platformEarning = totalInvoiced * 0.15;

  // Dynamic distribution of sold parts and performed services based on real category data
  const categoryDistribution = React.useMemo(() => {
    const catMap: Record<string, { orders: number; purchases: number; total: number }> = {};

    const baseCats = ['پکیج', 'کولر گازی', 'یخچال', 'لباسشویی', 'ظرفشویی'];

    // Helper to map category variations to canonical names
    const normalizeCat = (rawCat?: string): string => {
      if (!rawCat) return 'سایر';
      const clean = String(rawCat).trim();
      for (const b of baseCats) {
        if (clean.includes(b) || b.includes(clean)) {
          return b;
        }
      }
      return clean;
    };

    // Initialize base categories
    baseCats.forEach(cat => {
      catMap[cat] = { orders: 0, purchases: 0, total: 0 };
    });

    // 1. Service Repair Orders (خدمات تعمیر)
    (orders || []).forEach(o => {
      if (o.category) {
        const cat = normalizeCat(o.category);
        if (!catMap[cat]) catMap[cat] = { orders: 0, purchases: 0, total: 0 };
        catMap[cat].orders += 1;
        catMap[cat].total += 1;
      }
    });

    // 2. Error Codes / Technical Knowledge Base (عیب‌یابی / کدهای خطا)
    // Only count if no repair orders or along with them to represent active knowledge services
    const errorCodesList = (errorCodes || []);
    errorCodesList.forEach(ec => {
      if (ec.category) {
        const cat = normalizeCat(ec.category);
        if (!catMap[cat]) catMap[cat] = { orders: 0, purchases: 0, total: 0 };
        catMap[cat].orders += 1;
        catMap[cat].total += 1;
      }
    });

    // 3. Purchased/Sold Parts (سفارشات/خرید قطعات)
    (partPurchases || []).forEach(p => {
      const pCat = p.partCategory || (p as any).category;
      if (pCat) {
        const cat = normalizeCat(pCat);
        if (!catMap[cat]) catMap[cat] = { orders: 0, purchases: 0, total: 0 };
        catMap[cat].purchases += 1;
        catMap[cat].total += 1;
      }
    });

    // 4. Inventory Spare Parts (قطعات موجود در انبار/انبارداری)
    (spareParts || []).forEach(sp => {
      if (sp.category) {
        const cat = normalizeCat(sp.category);
        if (!catMap[cat]) catMap[cat] = { orders: 0, purchases: 0, total: 0 };
        const qty = typeof sp.stock === 'number' && sp.stock > 0 ? sp.stock : 1;
        catMap[cat].purchases += qty;
        catMap[cat].total += qty;
      }
    });

    const totalSum = Object.values(catMap).reduce((sum, item) => sum + item.total, 0);

    const sortedList = Object.entries(catMap)
      .map(([catName, stats]) => ({
        category: catName,
        orders: stats.orders,
        purchases: stats.purchases,
        total: stats.total,
        percentage: totalSum > 0 ? Math.round((stats.total / totalSum) * 100) : 0
      }))
      .filter(item => item.total > 0)
      .sort((a, b) => b.total - a.total);

    return { list: sortedList, totalSum };
  }, [categoriesList, orders, partPurchases, spareParts, errorCodes]);

  const pendingErrors = errorCodes.filter((err) => !err.isApproved);
  const approvedErrors = errorCodes.filter((err) => err.isApproved);

  const filteredPendingErrors = React.useMemo(() => {
    const query = pendingCodesSearchVal.trim().toLowerCase();
    if (!query) return pendingErrors;
    return pendingErrors.filter(err =>
      (err.code || '').toLowerCase().includes(query) ||
      (err.brand || '').toLowerCase().includes(query) ||
      (err.category || '').toLowerCase().includes(query) ||
      (err.model || '').toLowerCase().includes(query) ||
      (err.title || '').toLowerCase().includes(query) ||
      (err.description || '').toLowerCase().includes(query) ||
      (err.updatedBy || '').toLowerCase().includes(query)
    );
  }, [pendingCodesSearchVal, pendingErrors]);

  const filteredSpareParts = React.useMemo(() => {
    const query = sparePartsSearchVal.trim().toLowerCase();
    if (!query) return spareParts;
    return spareParts.filter(p =>
      (p.name || '').toLowerCase().includes(query) ||
      (p.category || '').toLowerCase().includes(query) ||
      (p.description || '').toLowerCase().includes(query) ||
      (Array.isArray(p.compatibility) && p.compatibility.some(c => (c || '').toLowerCase().includes(query)))
    );
  }, [sparePartsSearchVal, spareParts]);

  const filteredApprovedErrors = React.useMemo(() => {
    const query = approvedCodesSearchVal.trim().toLowerCase();
    if (!query) return approvedErrors;
    return approvedErrors.filter(err => 
      (err.code || '').toLowerCase().includes(query) ||
      (err.brand || '').toLowerCase().includes(query) ||
      (err.category || '').toLowerCase().includes(query) ||
      (err.title || '').toLowerCase().includes(query) ||
      (err.description || '').toLowerCase().includes(query)
    );
  }, [approvedCodesSearchVal, approvedErrors]);

  const uniqueErrCategories = React.useMemo(() => {
    return Array.from(new Set(approvedErrors.map(e => e.category).filter(Boolean)));
  }, [approvedErrors]);

  const uniqueErrBrands = React.useMemo(() => {
    return Array.from(new Set(approvedErrors.map(e => e.brand).filter(Boolean)));
  }, [approvedErrors]);

  const groupedApprovedErrors = React.useMemo(() => {
    let filtered = filteredApprovedErrors;
    
    if (errGroupCategoryFilter) {
      filtered = filtered.filter(err => err.category === errGroupCategoryFilter);
    }
    
    if (errGroupBrandFilter) {
      filtered = filtered.filter(err => err.brand === errGroupBrandFilter);
    }

    const groups: Record<string, { category: string; brand: string; model: string; errors: any[] }> = {};
    filtered.forEach(err => {
      const cat = err.category || 'سایر';
      const brand = err.brand || 'سایر';
      const model = err.model || 'عمومی';
      const key = `${cat} | ${brand} | ${model}`;
      if (!groups[key]) {
        groups[key] = {
          category: cat,
          brand: brand,
          model: model,
          errors: []
        };
      }
      groups[key].errors.push(err);
    });

    return Object.entries(groups).map(([key, value]) => ({
      key,
      ...value
    })).sort((a, b) => {
      const catComp = a.category.localeCompare(b.category, 'fa');
      if (catComp !== 0) return catComp;
      const brandComp = a.brand.localeCompare(b.brand, 'fa');
      if (brandComp !== 0) return brandComp;
      return a.model.localeCompare(b.model, 'fa');
    });
  }, [filteredApprovedErrors, errGroupCategoryFilter, errGroupBrandFilter]);

  const activeJobsCount = orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled').length;

  // Let's compute matched configurations for the unified search to prevent clutter:
  const matchedCategories = React.useMemo(() => {
    const query = globalConfigSearch.trim().toLowerCase();
    if (!query) return categoriesList;
    return categoriesList.filter(cat => cat.toLowerCase().includes(query));
  }, [globalConfigSearch, categoriesList]);

  const matchedBrands = React.useMemo(() => {
    const query = globalConfigSearch.trim().toLowerCase();
    if (!query) return brandsList;
    return brandsList.filter(brand => brand.toLowerCase().includes(query));
  }, [globalConfigSearch, brandsList]);

  const matchedModels = React.useMemo(() => {
    const query = globalConfigSearch.trim().toLowerCase();
    if (!query) return modelsList;
    return modelsList.filter(model => model.toLowerCase().includes(query));
  }, [globalConfigSearch, modelsList]);

  const matchedCitiesAndRegions = React.useMemo(() => {
    const query = globalConfigSearch.trim().toLowerCase();
    if (!query) {
      const results: Array<{ cityName: string; regionName?: string }> = [];
      citiesList?.forEach(city => {
        if (!city?.name) return;
        results.push({ cityName: city.name });
        city.regions?.forEach(reg => {
          results.push({ cityName: city.name, regionName: reg });
        });
      });
      return results;
    }
    
    const results: Array<{ cityName: string; regionName?: string }> = [];
    citiesList?.forEach(city => {
      if (!city?.name) return;
      if (city.name.toLowerCase().includes(query)) {
        results.push({ cityName: city.name });
      }
      city.regions?.forEach(reg => {
        if (city.name.toLowerCase().includes(query) || reg.toLowerCase().includes(query)) {
          results.push({ cityName: city.name, regionName: reg });
        }
      });
    });
    return results;
  }, [globalConfigSearch, citiesList]);

  const matchedErrors = React.useMemo(() => {
    const query = globalConfigSearch.trim().toLowerCase();
    if (!query) return errorCodes;
    return errorCodes.filter(err => 
      err.code.toLowerCase().includes(query) ||
      err.title.toLowerCase().includes(query) ||
      err.category.toLowerCase().includes(query) ||
      err.brand.toLowerCase().includes(query) ||
      (err.model && err.model.toLowerCase().includes(query)) ||
      (err.description && err.description.toLowerCase().includes(query)) ||
      err.causes.some(c => c.toLowerCase().includes(query)) ||
      err.steps.some(s => s.toLowerCase().includes(query))
    );
  }, [globalConfigSearch, errorCodes]);

  const matchedTechnicians = React.useMemo(() => {
    const query = globalConfigSearch.trim().toLowerCase();
    if (!query) return technicians;
    return technicians.filter(t => 
      t.name.toLowerCase().includes(query) ||
      t.phone.toLowerCase().includes(query) ||
      (t.activeLocation && t.activeLocation.toLowerCase().includes(query)) ||
      t.specialty.some(s => s.toLowerCase().includes(query))
    );
  }, [globalConfigSearch, technicians]);

  const matchedSpareParts = React.useMemo(() => {
    const query = globalConfigSearch.trim().toLowerCase();
    if (!query) return spareParts;
    return (spareParts || []).filter(p => 
      (p.name || '').toLowerCase().includes(query) ||
      (p.description || '').toLowerCase().includes(query) ||
      (p.category || '').toLowerCase().includes(query) ||
      (Array.isArray(p.compatibility) && p.compatibility.some(c => (c || '').toLowerCase().includes(query)))
    );
  }, [globalConfigSearch, spareParts]);

  const smartRecommendedBrands = React.useMemo(() => {
    if (!dirCategory) return brandsList;
    const related = errorCodes.filter(err => err.category === dirCategory).map(err => err.brand);
    const uniq = Array.from(new Set(related)).filter(Boolean);
    const others = brandsList.filter(b => !uniq.includes(b));
    return [...uniq, ...others];
  }, [dirCategory, brandsList, errorCodes]);

  const smartRecommendedModels = React.useMemo(() => {
    if (!dirCategory && !dirBrand) return modelsList;
    const related = errorCodes
      .filter(err => (!dirCategory || err.category === dirCategory) && (!dirBrand || err.brand === dirBrand))
      .map(err => err.model ? err.model.split('/').map(m => m.trim()) : [])
      .flat();
    const uniq = Array.from(new Set(related)).filter(Boolean);
    const others = modelsList.filter(m => !uniq.includes(m));
    return [...uniq, ...others];
  }, [dirCategory, dirBrand, modelsList, errorCodes]);

  const handleStartEditPart = (p: SparePart) => {
    setEditingPartId(p.id);
    setTempPrice(p.price);
    setTempStock(p.stock);
  };

  const handleSavePartChanges = (id: string) => {
    onUpdatePartStock(id, tempStock, tempPrice);
    setEditingPartId(null);
    alert('موجودی و قیمت قطعه با موفقیت در بانک اطلاعاتی بروزرسانی شد.');
  };

  const handleOpenEditFullPart = (p: SparePart) => {
    setEditingFullPart(p);
    setEditPartName(p.name || p.title || '');
    const cat = p.device_category || p.category || '';
    setEditPartCategory(cat);
    setEditPartCategoryMode(cat && !categoriesList.includes(cat) ? 'custom' : 'select');
    setEditPartModel(p.model || p.device_model || '');
    const cb = p.compatible_brands || (Array.isArray(p.compatibility) ? p.compatibility.join('، ') : (p.brand || ''));
    setEditPartCompatibleBrands(cb);
    setEditPartDescription(p.short_description || p.description || p.technical_description || '');
    setEditPartPrice(p.price !== undefined ? p.price : '');
    setEditPartStock(p.stock !== undefined ? p.stock : '');
    setEditPartImage(p.image || p.image_url || '');
  };

  const handleSaveFullPartChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFullPart) return;

    if (!editPartName.trim()) {
      alert('وارد کردن نام قطعه الزامی است.');
      return;
    }

    const priceNum = Number(editPartPrice);
    if (editPartPrice === '' || isNaN(priceNum) || priceNum < 0) {
      alert('قیمت قطعه باید یک عدد معتبر و بزرگتر یا مساوی صفر باشد.');
      return;
    }

    const stockNum = Number(editPartStock);
    if (editPartStock === '' || isNaN(stockNum) || stockNum < 0) {
      alert('موجودی انبار باید یک عدد معتبر و بزرگتر یا مساوی صفر باشد.');
      return;
    }

    const compBrandsString = editPartCompatibleBrands.trim() || 'عمومی';
    const compBrandsArray = compBrandsString.split(/[،,]/).map(s => s.trim()).filter(Boolean);
    const finalCategory = editPartCategory.trim() || 'سایر';

    // Auto-register new category in system list if not present
    if (finalCategory && finalCategory !== 'سایر' && !categoriesList.includes(finalCategory) && onUpdateCategoriesList) {
      onUpdateCategoriesList([...categoriesList, finalCategory]);
    }
    // Auto-register any new brands in system list if not present
    const newBrandsToAdd = compBrandsArray.filter(b => b && b !== 'عمومی' && !brandsList.includes(b));
    if (newBrandsToAdd.length > 0 && onUpdateBrandsList) {
      onUpdateBrandsList([...brandsList, ...newBrandsToAdd]);
    }

    const updatedPart: SparePart = {
      ...editingFullPart,
      name: editPartName.trim(),
      title: editPartName.trim(),
      device_category: finalCategory,
      category: finalCategory,
      model: editPartModel.trim() || 'همه مدل‌ها',
      device_model: editPartModel.trim() || 'همه مدل‌ها',
      compatible_brands: compBrandsString,
      compatibility: compBrandsArray,
      compatible_models: compBrandsArray,
      brand: compBrandsArray[0] || 'عمومی',
      short_description: editPartDescription.trim(),
      description: editPartDescription.trim(),
      technical_description: editPartDescription.trim(),
      price: priceNum,
      stock: stockNum,
      image: editPartImage.trim() || editingFullPart.image || '',
      image_url: editPartImage.trim() || editingFullPart.image_url || ''
    };

    const updatedList = spareParts.map(p => p.id === editingFullPart.id ? updatedPart : p);
    if (onUpdateSparePartsList) {
      onUpdateSparePartsList(updatedList);
    }

    try {
      const token = localStorage.getItem('session_user_id') || localStorage.getItem('token') || '';
      await fetch(`/api/store/parts/${encodeURIComponent(editingFullPart.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Session-Token': token },
        body: JSON.stringify(updatedPart)
      });
    } catch (err) {
      console.error("Error updating part on server:", err);
    }

    setEditingFullPart(null);
    alert(`مشخصات قطعه "${updatedPart.name}" با موفقیت بروزرسانی شد.`);
  };

  const handleAddBrand = () => {
    if (!newBrandName.trim()) return;
    if (brandsList.includes(newBrandName.trim())) {
      alert('این برند از قبل در سیستم موجود است.');
      return;
    }
    onUpdateBrandsList([...brandsList, newBrandName.trim()]);
    setBrandMessage({ type: 'success', text: `برند جدید "${newBrandName.trim()}" اضافه شد.` });
    alert(`برند جدید "${newBrandName.trim()}" با موفقیت به بانک اطلاعات و پیکربندی برندها الحاق گردید.`);
    setNewBrandName('');
  };

  const handleRemoveBrand = (br: string) => {
    triggerSafeConfirm(
      'حذف برند سیستم',
      `آیا از حذف برند "${br}" از اطلاعات پایه اطمینان دارید؟ کدهای خطای مربوطه ممکن است یتیم شوند.`,
      () => {
        onUpdateBrandsList(brandsList.filter(b => b !== br));
        setBrandMessage({ type: 'success', text: `برند "${br}" حذف شد.` });
        alert(`برند "${br}" با موفقیت از سیستم حذف گردید.`);
      }
    );
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    if (categoriesList.includes(newCategoryName.trim())) {
      alert('این دسته‌بندی از قبل در سیستم موجود است.');
      return;
    }
    onUpdateCategoriesList([...categoriesList, newCategoryName.trim()]);
    setCategoryMessage({ type: 'success', text: `دسته‌بندی جدید "${newCategoryName.trim()}" ایجاد شد.` });
    alert(`دسته‌بندی دستگاه جدید "${newCategoryName.trim()}" با موفقیت به پیکربندی لوازم خانگی اضافه شد.`);
    setNewCategoryName('');
  };

  const handleRemoveCategory = (cat: string) => {
    triggerSafeConfirm(
      'حذف دسته‌بندی سیستم',
      `آیا از حذف کامل دسته‌بندی "${cat}" از اطلاعات پایه اطمینان دارید؟`,
      () => {
        onUpdateCategoriesList(categoriesList.filter(c => c !== cat));
        setCategoryMessage({ type: 'success', text: `دسته‌بندی "${cat}" با موفقیت حذف شد.` });
        alert(`دسته‌بندی "${cat}" با موفقیت از سیستم حذف گردید.`);
      }
    );
  };

  const handleAddCity = () => {
    if (!newCityName.trim()) return;
    if (citiesList.some(c => c.name === newCityName.trim())) {
      alert('این شهر از قبل در سیستم موجود است.');
      return;
    }
    const updated = [...citiesList, { name: newCityName.trim(), regions: [] }];
    onUpdateCitiesList(updated);
    setCityMessage({ type: 'success', text: `شهر "${newCityName.trim()}" به شهرهای تحت پوشش اضافه شد.` });
    alert(`شهر جدید "${newCityName.trim()}" با موفقیت ارتقا یافته و به عنوان محدوده پوشش خدمات ثبت شد.`);
    setSelectedConfigCity(newCityName.trim());
    setNewCityName('');
  };

  const handleRemoveCity = (cityName: string) => {
    triggerSafeConfirm(
      'حذف موقعیت شهری',
      `آیا از حذف شهر "${cityName}" با کلیه محلات مربوطه مطمئن هستید؟ با این کار حوزه‌های فعالیت تکنسین‌ها کوچک‌تر می‌شود.`,
      () => {
        onUpdateCitiesList(citiesList.filter(c => c.name !== cityName));
        if (selectedConfigCity === cityName) setSelectedConfigCity('');
        setCityMessage({ type: 'success', text: `موقعیت شهر "${cityName}" حذف شد.` });
        alert(`شهر "${cityName}" و کل مناطق آن با موفقیت حذف و از سیستم خدمات تفکیکی سراسری برداشته شد.`);
      }
    );
  };

  const handleAddRegion = () => {
    if (!selectedConfigCity || !newRegionName.trim()) return;
    const targetCity = citiesList.find(c => c.name === selectedConfigCity);
    if (!targetCity) return;
    if (targetCity.regions.includes(newRegionName.trim())) {
      alert('این محله از قبل در شهر انتخابی موجود است.');
      return;
    }
    const updated = citiesList.map(c => {
      if (c.name === selectedConfigCity) {
        return { ...c, regions: [...c.regions, newRegionName.trim()] };
      }
      return c;
    });
    onUpdateCitiesList(updated);
    setCityMessage({ type: 'success', text: `منطقه "${newRegionName.trim()}" برای شهر "${selectedConfigCity}" ثبت شد.` });
    alert(`منطقه جدید "${newRegionName.trim()}" با موفقیت در زیرمجموعه‌ی محله‌های فعال شهر "${selectedConfigCity}" رجیستر شد.`);
    setNewRegionName('');
  };

  const handleRemoveRegion = (cityName: string, region: string) => {
    triggerSafeConfirm(
      'حذف محله از شهر',
      `آیا از حذف محله "${region}" از شهر "${cityName}" اطمینان دارید؟ کاربران و تکنسین‌های این منطقه ممکن است تحت تاثیر قرار گیرند.`,
      () => {
        const updated = citiesList.map(c => {
          if (c.name === cityName) {
            return { ...c, regions: c.regions.filter(r => r !== region) };
          }
          return c;
        });
        onUpdateCitiesList(updated);
        setCityMessage({ type: 'success', text: `محله "${region}" از شهر "${cityName}" برداشته شد.` });
        alert(`منطقه/محله "${region}" با موفقیت از پوشش شهر الکترونیکی خدمات حذف گردید.`);
      }
    );
  };

  const handleAddModel = () => {
    if (!newModelName.trim()) return;
    if (modelsList.includes(newModelName.trim())) {
      alert('این مدل از قبل در سیستم موجود است.');
      return;
    }
    onUpdateModelsList([...modelsList, newModelName.trim()]);
    setModelMessage({ type: 'success', text: `دستگاه مدل "${newModelName.trim()}" به لیست مدل‌ها افزوده شد.` });
    alert(`تیپ/مدل دستگاه جدید "${newModelName.trim()}" با موفقیت تعریف گردید.`);
    setNewModelName('');
  };

  const handleRemoveModel = (mod: string) => {
    triggerSafeConfirm(
      'حذف مدل دستگاه',
      `آیا از حذف مدل "${mod}" از اطلاعات پایه تکنسین‌ها و کاربران مأموریت مطمئن هستید؟`,
      () => {
        onUpdateModelsList(modelsList.filter(m => m !== mod));
        setModelMessage({ type: 'success', text: `مدل دستگاه "${mod}" ملغی شد.` });
        alert(`دستگاه مدل "${mod}" با موفقیت غیرفعال و از لیست سیستم کلان حذف گردید.`);
      }
    );
  };

  const handleRenameBrand = (oldVal: string, newVal: string) => {
    if (!newVal.trim() || oldVal === newVal.trim()) {
      setEditingBrand(null);
      return;
    }
    if (brandsList.includes(newVal.trim())) {
      alert('این شرکت/برند از قبل در سیستم موجود است.');
      return;
    }
    const updated = brandsList.map(b => b === oldVal ? newVal.trim() : b);
    onUpdateBrandsList(updated);
    setBrandMessage({ type: 'success', text: `برند "${oldVal}" به "${newVal.trim()}" تغییر نام داد.` });
    alert(`برند انتخابی با موفقیت از عنوان قدیمی "${oldVal}" به نام نوین "${newVal.trim()}" ویرایش شد.`);
    setEditingBrand(null);
  };

  const handleRenameCategory = (oldVal: string, newVal: string) => {
    if (!newVal.trim() || oldVal === newVal.trim()) {
      setEditingCategory(null);
      return;
    }
    if (categoriesList.includes(newVal.trim())) {
      alert('این دسته‌بندی از قبل در سیستم موجود است.');
      return;
    }
    const updated = categoriesList.map(c => c === oldVal ? newVal.trim() : c);
    onUpdateCategoriesList(updated);
    setCategoryMessage({ type: 'success', text: `دسته‌بندی "${oldVal}" به "${newVal.trim()}" ویرایش شد.` });
    alert(`دسته‌بندی هدف با موفقیت از عنوان قدیمی "${oldVal}" به نام نوین "${newVal.trim()}" تجدید عنوان یافت.`);
    setEditingCategory(null);
  };

  const handleRenameModel = (oldVal: string, newVal: string) => {
    if (!newVal.trim() || oldVal === newVal.trim()) {
      setEditingModel(null);
      return;
    }
    if (modelsList.includes(newVal.trim())) {
      alert('این مدل از قبل در سیستم موجود است.');
      return;
    }
    const updated = modelsList.map(m => m === oldVal ? newVal.trim() : m);
    onUpdateModelsList(updated);
    setModelMessage({ type: 'success', text: `مدل "${oldVal}" به "${newVal.trim()}" بازنویسی شد.` });
    alert(`مدل انتخابی دستگاه با موفقیت از عنوان قبلی "${oldVal}" به نام جدید "${newVal.trim()}" ویراست شد.`);
    setEditingModel(null);
  };

  const handleRenameCity = (oldVal: string, newVal: string) => {
    if (!newVal.trim() || oldVal === newVal.trim()) {
      setEditingCity(null);
      return;
    }
    if (citiesList.some(c => c.name === newVal.trim())) {
      alert('این شهر از قبل در سیستم موجود است.');
      return;
    }
    const updated = citiesList.map(c => {
      if (c.name === oldVal) {
        return { ...c, name: newVal.trim() };
      }
      return c;
    });
    onUpdateCitiesList(updated);
    setCityMessage({ type: 'success', text: `نام شهر "${oldVal}" به "${newVal.trim()}" تغییر نام یافت.` });
    alert(`نام پایگاه شهری با موفقیت از عنوان قبلی "${oldVal}" به عنوان ترجیحی "${newVal.trim()}" تصحیح گردید.`);
    if (selectedConfigCity === oldVal) setSelectedConfigCity(newVal.trim());
    setEditingCity(null);
  };

  const handleRenameRegionField = (cityName: string, oldVal: string, newVal: string) => {
    if (!newVal.trim() || oldVal === newVal.trim()) {
      setEditingRegion(null);
      setEditingRegionCity(null);
      return;
    }
    const targetCity = citiesList.find(c => c.name === cityName);
    if (targetCity && targetCity.regions.includes(newVal.trim())) {
      alert('این محله از قبل در این شهر با همین نویسه موجود است.');
      return;
    }
    const updated = citiesList.map(c => {
      if (c.name === cityName) {
        return {
          ...c,
          regions: c.regions.map(r => r === oldVal ? newVal.trim() : r)
        };
      }
      return c;
    });
    onUpdateCitiesList(updated);
    setEditingRegion(null);
    setEditingRegionCity(null);
  };

  const handleAutofillInsertForm = (cat?: string, brand?: string, model?: string) => {
    if (cat) setDirCategory(cat);
    if (brand) setDirBrand(brand);
    if (model) setDirModel(model);
    
    const formElement = document.getElementById('direct-error-insert-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSaveQuickEditError = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingError) return;

    const cleanStr = (s: string) => {
      if (!s) return '';
      return s
        .trim()
        .toLowerCase()
        .replace(/[يى]/g, 'ی')
        .replace(/ك/g, 'ک')
        .replace(/\s+/g, ' ');
    };

    const cleanModel = (m: string) => {
      const clean = cleanStr(m);
      if (!clean || clean === 'عمومی' || clean === 'عمومي' || clean === 'کل مدل‌ها' || clean === 'کل مدلها' || clean === 'كل مدلها' || clean === 'همه' || clean === 'همه مدل‌ها' || clean === 'همه مدل ها' || clean === 'general') {
        return 'عمومی';
      }
      return clean;
    };

    const newCodeClean = cleanStr(editingError.code);
    const newCatClean = cleanStr(editingError.category);
    const newBrandClean = cleanStr(editingError.brand);
    const newModelClean = cleanModel(editingError.model || 'عمومی');

    const isDuplicate = errorCodes.some(err => {
      if (err.id === editingError.id) return false; // skip self
      const codeClean = cleanStr(err.code);
      const catClean = cleanStr(err.category);
      const brandClean = cleanStr(err.brand);
      const modelClean = cleanModel(err.model || 'عمومی');
      return codeClean === newCodeClean && catClean === newCatClean && brandClean === newBrandClean && modelClean === newModelClean;
    });

    if (isDuplicate) {
      alert(`⚠️ خطای تکراری: کُد خطای تغییر یافته "${editingError.code}" برای دستگاه "${editingError.category}"، برند "${editingError.brand}" و مدل "${editingError.model || 'عمومی'}" قبلاً در ردیف دیگری از سامانه ثبت شده است. ذخیره‌سازی تایید نشد.`);
      return;
    }

    const harmonizedEdited = harmonizeErrorCode(editingError);
    const updated = errorCodes.map(err => err.id === editingError.id ? harmonizedEdited : err);
    onUpdateErrorCodesList(updated);

    // Auto-extract brand, category, and model to system configuration if they are updated
    let updatedCats = false, updatedBrands = false, updatedModels = false;
    const newCategories = [...categoriesList];
    const newBrands = [...brandsList];
    const newModels = [...modelsList];

    if (editingError.category && !newCategories.includes(editingError.category.trim())) {
      newCategories.push(editingError.category.trim());
      updatedCats = true;
    }
    if (editingError.brand && !newBrands.includes(editingError.brand.trim())) {
      newBrands.push(editingError.brand.trim());
      updatedBrands = true;
    }
    if (editingError.model && editingError.model !== 'عمومی' && editingError.model !== 'کل مدل‌ها') {
      const sm = editingError.model.trim();
      if (!newModels.includes(sm)) {
        newModels.push(sm);
        updatedModels = true;
      }
    }

    if (updatedCats) onUpdateCategoriesList(newCategories);
    if (updatedBrands) onUpdateBrandsList(newBrands);
    if (updatedModels) onUpdateModelsList(newModels);

    setEditingError(null);
    alert('تغییرات کد خطا با موفقیت بصورت آنی ذخیره شد.');
  };

  const handleAddDirectErrorCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirIsCommon && !dirCode) {
      setDirectInsertStatus({
        type: 'warning',
        msg: 'لطفاً کُد خطا را وارد نمایید.'
      });
      return;
    }
    if (!dirCategory || !dirBrand || !dirModel) {
      setDirectInsertStatus({
        type: 'warning',
        msg: 'لطفاً فیلدهای الزامی نوع دستگاه، برند و مدل را تکمیل نمایید.'
      });
      return;
    }

    const cleanStr = (s: string) => {
      if (!s) return '';
      return s
        .trim()
        .toLowerCase()
        .replace(/[يى]/g, 'ی')
        .replace(/ك/g, 'ک')
        .replace(/\s+/g, ' ');
    };

    const cleanModel = (m: string) => {
      const clean = cleanStr(m);
      if (!clean || clean === 'عمومی' || clean === 'عمومي' || clean === 'کل مدل‌ها' || clean === 'کل مدلها' || clean === 'كل مدلها' || clean === 'همه' || clean === 'همه مدل‌ها' || clean === 'همه مدل ها' || clean === 'general') {
        return 'عمومی';
      }
      return clean;
    };

    const newCodeClean = cleanStr(dirIsCommon ? 'مشکل شایع' : dirCode);
    const newCatClean = cleanStr(dirCategory);
    const newBrandClean = cleanStr(dirBrand);
    const newModelClean = cleanModel(dirModel || 'عمومی');

    if (dirIsCommon) {
      // 1. Common Problem Insertion
      const newProb: CommonProblem = {
        id: `prob_dir_${Date.now()}`,
        code: 'مشکل شایع',
        category: dirCategory,
        brand: dirBrand,
        model: newModelClean,
        title: dirTitle || `مشکل شایع ${dirCategory} ${dirBrand}`,
        description: dirReason || dirTitle || 'بررسی و رفع مشکل فنی',
        causes: dirReason ? [dirReason] : ['علل فیزیکی عمومی'],
        steps: dirSolution ? [dirSolution] : ['سرویس و راهکار تخصصی'],
        precautions: ['نکات ایمنی پایه لوازم خانگی رعایت گردد.'],
        hazardLevel: dirHazard,
        tags: ['مشکل شایع'],
        views: 0,
        solutions: dirSolution ? [dirSolution] : ['سرویس و راهکار تخصصی']
      };

      // Auto-extract and register category, brand, and model to system configuration
      let updatedCats = false, updatedBrands = false, updatedMod = false;
      const newCategories = [...categoriesList];
      const newBrands = [...brandsList];
      const newModels = [...modelsList];

      if (dirCategory.trim() && !newCategories.includes(dirCategory.trim())) {
        newCategories.push(dirCategory.trim());
        updatedCats = true;
      }

      if (dirBrand.trim() && !newBrands.includes(dirBrand.trim())) {
        newBrands.push(dirBrand.trim());
        updatedBrands = true;
      }

      if (dirModel.trim() && dirModel !== 'کل مدل‌ها') {
        const m = dirModel.trim();
        if (!newModels.includes(m)) {
          newModels.push(m);
          updatedMod = true;
        }
      }

      if (updatedCats) onUpdateCategoriesList(newCategories);
      if (updatedBrands) onUpdateBrandsList(newBrands);
      if (updatedMod) onUpdateModelsList(newModels);

      if (onUpdateCommonProblemsList) {
        onUpdateCommonProblemsList([newProb, ...commonProblems]);
      }

      setDirectInsertStatus({
        type: 'success',
        msg: `🎉 موفقیت‌آمیز: مشکل شایع با موفقیت در بخش فوت‌وفن و مشکلات شایع ثبت گردید!`,
        category: dirCategory,
        brand: dirBrand,
        model: dirModel || 'کل مدل‌ها'
      });

      alert(`🎉 موفقیت‌آمیز:\nمشکل شایع "${dirTitle || dirCategory}" مربوط به برند "${dirBrand}" با موفقیت ثبت و به بخش مشکلات شایع اضافه شد.`);

      setDirCode('');
      setDirTitle('');
      setDirModel('');
      setDirReason('');
      setDirSolution('');
      setDirVideoUrl('');
      setDirIsCommon(false);

      const element = document.getElementById('direct-error-insert-form');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    // 2. Regular Error Code Insertion
    const isDuplicate = errorCodes.some(err => {
      const codeClean = cleanStr(err.code);
      const catClean = cleanStr(err.category);
      const brandClean = cleanStr(err.brand);
      const modelClean = cleanModel(err.model || 'عمومی');
      return codeClean === newCodeClean && catClean === newCatClean && brandClean === newBrandClean && modelClean === newModelClean;
    });

    if (isDuplicate) {
      setDirectInsertStatus({
        type: 'error',
        msg: `🚫 خطا: این کُد خطا برای مشخصات وارد شده تکراری است و هم‌اکنون در سیستم موجود است!`,
        code: dirCode,
        category: dirCategory,
        brand: dirBrand,
        model: dirModel || 'عمومی'
      });
      // Smooth scroll to form container so they see it
      const element = document.getElementById('direct-error-insert-form');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    const newErr = harmonizeErrorCode({
      id: `err_dir_${Date.now()}`,
      code: dirCode,
      title: dirTitle || `بررسی خطای ${dirCode}`,
      category: dirCategory,
      brand: dirBrand,
      model: dirModel,
      description: dirReason || 'عدم ثبت علت بوجود آمدن خطا',
      causes: dirReason ? [dirReason] : ['عدم ثبت علت فیزیکی'],
      steps: dirSolution ? [dirSolution] : ['مراجعه به تکنسین مجاز سرویس'],
      precautions: ['نکات ایمنی پایه لوازم خانگی رعایت گردد.'],
      hazardLevel: dirHazard,
      isApproved: true,
      video_url: dirVideoUrl
    });
    
    // Auto-extract and register category, brand, and model to system configuration
    let updatedCats = false, updatedBrands = false, updatedMod = false;
    const newCategories = [...categoriesList];
    const newBrands = [...brandsList];
    const newModels = [...modelsList];

    if (dirCategory.trim() && !newCategories.includes(dirCategory.trim())) {
      newCategories.push(dirCategory.trim());
      updatedCats = true;
    }

    if (dirBrand.trim() && !newBrands.includes(dirBrand.trim())) {
      newBrands.push(dirBrand.trim());
      updatedBrands = true;
    }

    if (dirModel.trim() && dirModel !== 'کل مدل‌ها') {
      const m = dirModel.trim();
      if (!newModels.includes(m)) {
        newModels.push(m);
        updatedMod = true;
      }
    }

    if (updatedCats) onUpdateCategoriesList(newCategories);
    if (updatedBrands) onUpdateBrandsList(newBrands);
    if (updatedMod) onUpdateModelsList(newModels);

    onUpdateErrorCodesList([...errorCodes, newErr]);
    
    setDirectInsertStatus({
      type: 'success',
      msg: `🎉 موفقیت‌آمیز: کُد خطا با موفقیت مستقیماً ایجاد و ثبت نهایی شد!`,
      code: dirCode,
      category: dirCategory,
      brand: dirBrand,
      model: dirModel || 'کل مدل‌ها'
    });

    alert(`کد خطا "${dirCode}" مربوط به برند "${dirBrand}" با موفقیت ایجاد و ذخیره شد.`);

    setDirCode('');
    setDirTitle('');
    setDirModel('');
    setDirReason('');
    setDirSolution('');
    setDirVideoUrl('');

    const element = document.getElementById('direct-error-insert-form');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const processBulkImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedImportData.trim()) {
      setImportStatus({ type: 'error', msg: 'لطفاً ابتدا متنی درج یا فایلی بارگذاری کنید.' });
      return;
    }

    const cleanStr = (s: string) => {
      if (!s) return '';
      return s
        .trim()
        .toLowerCase()
        .replace(/[يى]/g, 'ی')
        .replace(/ك/g, 'ک')
        .replace(/\s+/g, ' ');
    };

    const cleanModel = (m: string) => {
      const clean = cleanStr(m);
      if (!clean || clean === 'عمومی' || clean === 'عمومي' || clean === 'کل مدل‌ها' || clean === 'کل مدلها' || clean === 'كل مدلها' || clean === 'همه' || clean === 'همه مدل‌ها' || clean === 'همه مدل ها' || clean === 'general') {
        return 'عمومی';
      }
      return clean;
    };

    const checkIsCommonProblem = (item: {
      code?: string;
      isCommonProblem?: boolean;
      tags?: string[];
    }) => {
      if (item.isCommonProblem) return true;
      const code = cleanStr(item.code || '');
      if (!code || code === 'مشکل شایع' || code === 'مشکلات شایع' || code === 'عیب شایع' || code === 'diy' || code === 'common_problem') {
        return true;
      }
      const tagList = item.tags || [];
      const hasCommonTag = tagList.some(t => {
        const ct = cleanStr(t);
        return ct.includes('شایع') || ct.includes('common_problem') || ct.includes('مشکل شایع') || ct.includes('diy');
      });
      return hasCommonTag;
    };

    const KEY_MAPS = {
      code: ['error_code', 'code', 'aror', 'ارور', 'کد', 'کد خطا', 'کد_خطا', 'کدخطا', 'error', 'err', 'e'],
      title: ['title', 'error_title', 'عنوان', 'شرح', 'نام خطا', 'نام_خطا', 'نام', 'عنوان_خطا', 'عنوان خطا'],
      category: ['category', 'device_type', 'نوع دستگاه', 'دستگاه', 'نوع_دستگاه', 'دسته‌بندی', 'دسته‌بندي', 'دسته', 'device', 'type'],
      brand: ['brand', 'برند', 'سازنده'],
      model: ['model', 'مدل', 'مدل‌ها', 'مدلها', 'مدل ها'],
      description: ['description', 'details', 'توضیحات', 'توضیح', 'شرح_جزئیات', 'شرح جزئیات', 'شرح'],
      causes: ['causes', 'cause', 'دلایل', 'علت', 'علت_خطا', 'علت ها', 'علتها', 'علت خطای ثبتی'],
      steps: ['steps', 'solutions', 'solution', 'راهکارها', 'راه حل', 'روش_حل', 'روش حل', 'اقدامات'],
      precautions: ['precautions', 'safety', 'اقدامات_ایمنی', 'نکات_ایمنی', 'نکات ایمنی', 'ایمنی'],
      hazardLevel: ['hazardlevel', 'hazard_level', 'hazard', 'سطح_خطر', 'سطح خطر', 'خطر', 'ریسک', 'درجه خطر', 'درجه_خطر', 'درجه‌خطر', 'درجه‌خطرناکی']
    };

    const getFieldWithFallback = (obj: any, keys: string[], defaultVal = '') => {
      for (const k of keys) {
        if (obj[k] !== undefined && obj[k] !== null) return obj[k];
        const cleanK = k.toLowerCase().replace(/_/g, '').replace(/\s+/g, '');
        for (const actualK of Object.keys(obj)) {
          const cleanActualK = actualK.toLowerCase().replace(/_/g, '').replace(/\s+/g, '');
          if (cleanK === cleanActualK) {
            return obj[actualK];
          }
        }
      }
      return defaultVal;
    };

    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if ((char === ',' || char === ';' || char === '\t') && !inQuotes) {
          result.push(current.trim().replace(/^["']|["']$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^["']|["']$/g, ''));
      return result;
    };

    try {
      const text = pastedImportData.trim();
      let importedCount = 0;
      let correctionsMade: string[] = [];

      if (text.startsWith('[') || text.startsWith('{')) {
        const parsed = JSON.parse(text);
        const array = Array.isArray(parsed) ? parsed : [parsed];

        if (importType === 'errors') {
          const isProbablyCities = array.some(item => (item.regions && Array.isArray(item.regions)) || (item.name && !item.code && !item.error_code && !item.error_title));
          if (isProbablyCities) {
            setImportStatus({
              type: 'error',
              msg: 'درخواست به دلیل ناسازگاری ساختار رد شد: این فایل حاوی اطلاعات موقعیت و شهرها است و به دلیل عدم همخوانی با طرح دیتابیس کدهای خطا، امکان ثبت آن در بخش خطاهای تعمیرگاهی وجود ندارد.'
            });
            return;
          }

          const newErrors = [...errorCodes];
          const newProblems = [...commonProblems];

          array.forEach((item, index) => {
            const finalCode = getFieldWithFallback(item, KEY_MAPS.code);
            const finalTitle = getFieldWithFallback(item, KEY_MAPS.title) || `کد خطا ${finalCode}`;
            const finalCategory = getFieldWithFallback(item, KEY_MAPS.category);
            const finalBrand = getFieldWithFallback(item, KEY_MAPS.brand);
            const finalModel = getFieldWithFallback(item, KEY_MAPS.model) || 'عمومی';
            const finalDesc = getFieldWithFallback(item, KEY_MAPS.description) || finalTitle || 'ثبت شده از طریق واردات انبوه';

            const isItemCommon = checkIsCommonProblem({
              code: finalCode ? String(finalCode) : '',
              isCommonProblem: !!item.isCommonProblem,
              tags: Array.isArray(item.tags) ? item.tags.map(String) : (item.tag ? [String(item.tag)] : [])
            });

            if (isItemCommon) {
              if (!finalCategory || !finalBrand) {
                const missingFields = [];
                if (!finalCategory) missingFields.push('دسته‌بندی (category / device_type / نوع دستگاه)');
                if (!finalBrand) missingFields.push('برند (brand / برند)');
                
                correctionsMade.push(`ردیف ${index + 1}: فاقد فیلدهای الزامی برای مشکل شایع: ${missingFields.join('، ')} (رد شد)`);
                return;
              }
            } else {
              if (!finalCode || !finalCategory || !finalBrand) {
                const missingFields = [];
                if (!finalCode) missingFields.push('کد خطا (code / error_code / ارور)');
                if (!finalCategory) missingFields.push('دسته‌بندی (category / device_type / نوع دستگاه)');
                if (!finalBrand) missingFields.push('برند (brand / برند)');
                
                correctionsMade.push(`ردیف ${index + 1}: فاقد فیلدهای الزامی: ${missingFields.join('، ')} (رد شد)`);
                return;
              }
            }

            const tCodeClean = cleanStr(String(finalCode));
            const tCatClean = cleanStr(String(finalCategory));
            const tBrandClean = cleanStr(String(finalBrand));
            const tModelClean = cleanModel(String(finalModel));

            const rawCauses = getFieldWithFallback(item, KEY_MAPS.causes);
            const finalCauses = Array.isArray(rawCauses) 
              ? rawCauses.map(String) 
              : rawCauses 
                ? String(rawCauses).split(/[،,;\n|]/).map(s => s.trim()).filter(Boolean) 
                : [finalDesc];

            const rawSteps = getFieldWithFallback(item, KEY_MAPS.steps);
            const finalSteps = Array.isArray(rawSteps)
              ? rawSteps.map(String)
              : rawSteps
                ? String(rawSteps).split(/[،,;\n|]/).map(s => s.trim()).filter(Boolean)
                : ['مراجعه به سرویس‌کار مجاز.'];

            const rawSafety = getFieldWithFallback(item, KEY_MAPS.precautions);
            const finalPrecautions = Array.isArray(rawSafety)
              ? rawSafety.map(String)
              : rawSafety
                ? String(rawSafety).split(/[،,;\n|]/).map(s => s.trim()).filter(Boolean)
                : ['نکات ایمنی رعایت گردد.'];

            const rawHazard = cleanStr(String(getFieldWithFallback(item, KEY_MAPS.hazardLevel) || 'low'));
            const finalHazard = (['low', 'medium', 'high', 'critical'].includes(rawHazard))
              ? rawHazard as 'low' | 'medium' | 'high' | 'critical'
              : 'low';

            if (isItemCommon) {
              const isDuplicateProb = newProblems.some(p => {
                return cleanStr(p.category) === tCatClean && cleanStr(p.brand) === tBrandClean && cleanModel(p.model || 'عمومی') === tModelClean && cleanStr(p.title) === cleanStr(String(finalTitle));
              });

              if (isDuplicateProb) {
                correctionsMade.push(`ردیف ${index + 1}: مشکل شایع با عنوان "${finalTitle}" تکراری تشخیص داده شد و رد گردید.`);
                return;
              }

              newProblems.push({
                id: item.id || `prob_import_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                code: 'مشکل شایع',
                category: String(finalCategory),
                brand: String(finalBrand),
                model: tModelClean,
                title: String(finalTitle),
                description: String(finalDesc),
                causes: finalCauses,
                steps: finalSteps,
                precautions: finalPrecautions,
                hazardLevel: finalHazard,
                tags: Array.isArray(item.tags) ? item.tags.map(String) : ['مشکل شایع'],
                views: Number(item.views || 0),
                solutions: finalSteps
              });

              correctionsMade.push(`ردیف ${index + 1}: به علت ساختار بدون کُد خطا، به عنوان «مشکل شایع» ثبت نهایی شد.`);
            } else {
              const isDuplicateImport = newErrors.some(err => {
                const codeClean = cleanStr(err.code);
                const catClean = cleanStr(err.category);
                const brandClean = cleanStr(err.brand);
                const modelClean = cleanModel(err.model || 'عمومی');
                return codeClean === tCodeClean && catClean === tCatClean && brandClean === tBrandClean && modelClean === tModelClean;
              });

              if (isDuplicateImport) {
                correctionsMade.push(`ردیف ${index + 1}: کُد خطای "${finalCode}" به صورت تکراری تشخیص داده شد و رد گردید.`);
                return;
              }

              newErrors.push(harmonizeErrorCode({
                id: item.id || `err_import_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                code: String(finalCode),
                title: String(finalTitle),
                category: String(finalCategory),
                brand: String(finalBrand),
                model: tModelClean,
                description: String(finalDesc),
                causes: finalCauses,
                steps: finalSteps,
                precautions: finalPrecautions,
                hazardLevel: finalHazard,
                toolsNeeded: Array.isArray(item.toolsNeeded) ? item.toolsNeeded.map(String) : [],
                relatedParts: Array.isArray(item.relatedParts) ? item.relatedParts.map(String) : [],
                views: Number(item.views || 0),
                isApproved: true
              }));
            }

            importedCount++;
          });

          if (importedCount > 0) {
            onUpdateErrorCodesList(newErrors);
            if (onUpdateCommonProblemsList) {
              onUpdateCommonProblemsList(newProblems);
            }

            // Cascade newly imported categories/brands/models
            const newCategories = [...categoriesList];
            const newBrands = [...brandsList];
            const newModels = [...modelsList];
            let updatedCats = false, updatedBrands = false, updatedModels = false;

            const checkAndAddMetaData = (cat: string, bnd: string, mdl: string) => {
              const c = cat ? cat.trim() : '';
              const b = bnd ? bnd.trim() : '';
              const m = mdl ? mdl.trim() : '';
              if (c && !newCategories.includes(c)) {
                newCategories.push(c);
                updatedCats = true;
              }
              if (b && !newBrands.includes(b)) {
                newBrands.push(b);
                updatedBrands = true;
              }
              if (m && m !== 'عمومی' && m !== 'کل مدل‌ها' && !newModels.includes(m)) {
                newModels.push(m);
                updatedModels = true;
              }
            };

            const importedErrors = newErrors.slice(errorCodes.length);
            importedErrors.forEach(err => checkAndAddMetaData(err.category, err.brand, err.model || 'عمومی'));

            const importedProblems = newProblems.slice(commonProblems.length);
            importedProblems.forEach(prob => checkAndAddMetaData(prob.category, prob.brand, prob.model || 'عمومی'));

            if (updatedCats) onUpdateCategoriesList(newCategories);
            if (updatedBrands) onUpdateBrandsList(newBrands);
            if (updatedModels) onUpdateModelsList(newModels);

            let summaryMsg = `رکوردهای کدهای خطا و مشکلات شایع (${importedCount} مورد) با موفقیت در دیتابیس ثبت گردید.`;
            if (correctionsMade.length > 0) {
              summaryMsg += `\n\nگزارش ممیزی خودکار:\n` + correctionsMade.slice(0, 10).join('\n') + (correctionsMade.length > 10 ? '\n...' : '');
            }
            setImportStatus({ type: 'success', msg: summaryMsg });
          } else {
            setImportStatus({
              type: 'error',
              msg: 'هیچ رکورد معتبری برای درون‌ریزی یافت نشد. فیلدهای الزامی (کد، عنوان، برند، دسته‌بندی) ناقص هستند.'
            });
          }
        } else if (importType === 'categories') {
          const names = array.map(item => typeof item === 'object' ? item.name || item.title || item.category : String(item)).filter(Boolean);
          const uniq = Array.from(new Set(names));
          importedCount = uniq.length;
          onUpdateCategoriesList(uniq);
        } else if (importType === 'brands') {
          const names = array.map(item => typeof item === 'object' ? item.name || item.title || item.brand : String(item)).filter(Boolean);
          const uniq = Array.from(new Set(names));
          importedCount = uniq.length;
          onUpdateBrandsList(uniq);
        } else if (importType === 'cities') {
          const newCities: { name: string; regions: string[] }[] = [];
          array.forEach(item => {
            if (typeof item === 'object' && item.name) {
              const existing = newCities.find(c => c.name.toLowerCase() === item.name.toLowerCase());
              const regList = Array.isArray(item.regions) ? item.regions : [];
              if (existing) {
                existing.regions = Array.from(new Set([...existing.regions, ...regList]));
              } else {
                newCities.push({ name: item.name, regions: regList });
              }
              importedCount++;
            } else if (typeof item === 'string') {
              if (!newCities.some(c => c.name.toLowerCase() === item.toLowerCase())) {
                newCities.push({ name: item, regions: [] });
                importedCount++;
              }
            }
          });
          onUpdateCitiesList(newCities);
        }
      } else {
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        
        if (importType === 'errors') {
          const firstCols = parseCSVLine(lines[0]);
          
          const isHeader = firstCols.some(col => {
            const norm = cleanStr(col).replace(/_/g, '').replace(/\s+/g, '');
            return [
              'code', 'errorcode', 'aror', 'ارور', 'کد', 'کدخطا', 'e', 'error', 'err',
              'title', 'errortitle', 'عنوان', 'شرح', 'نامخطا',
              'category', 'devicetype', 'نوعدستگاه', 'دستگاه', 'دستهبندی', 'دسته',
              'brand', 'برند', 'سازنده', 'model', 'مدل', 'مدلها'
            ].includes(norm);
          });

          let headers: string[] = [];
          let startIdx = 0;
          if (isHeader) {
            headers = firstCols;
            startIdx = 1;
          } else {
            headers = ['code', 'category', 'brand', 'model', 'title', 'description', 'causes', 'steps', 'precautions', 'hazardLevel'];
            startIdx = 0;
          }

          const newErrors = [...errorCodes];
          const newProblems = [...commonProblems];

          for (let i = startIdx; i < lines.length; i++) {
            const cols = parseCSVLine(lines[i]);
            if (cols.length === 0 || (cols.length === 1 && !cols[0])) continue;

            const rowObj: any = {};
            headers.forEach((h, index) => {
              rowObj[h] = cols[index] || '';
            });

            if (!isHeader) {
              rowObj['code'] = cols[0] || '';
              rowObj['category'] = cols[1] || '';
              rowObj['brand'] = cols[2] || '';
              rowObj['model'] = cols[3] || '';
              rowObj['title'] = cols[4] || '';
              rowObj['description'] = cols[5] || '';
              rowObj['causes'] = cols[6] || '';
              rowObj['steps'] = cols[7] || '';
              rowObj['precautions'] = cols[8] || '';
              rowObj['hazardLevel'] = cols[9] || 'medium';
            }

            const finalCode = getFieldWithFallback(rowObj, KEY_MAPS.code);
            const finalTitle = getFieldWithFallback(rowObj, KEY_MAPS.title) || `شرح کد خطای ${finalCode}`;
            const finalCategory = getFieldWithFallback(rowObj, KEY_MAPS.category);
            const finalBrand = getFieldWithFallback(rowObj, KEY_MAPS.brand);
            const finalModel = getFieldWithFallback(rowObj, KEY_MAPS.model) || 'عمومی';
            const finalDesc = getFieldWithFallback(rowObj, KEY_MAPS.description) || finalTitle || 'ثبت شده از طریق واردات انبوه';

            const isItemCommon = checkIsCommonProblem({
              code: finalCode ? String(finalCode) : '',
              isCommonProblem: false, // Not explicitly flaggable in plain CSV unless via tag or code
              tags: []
            });

            if (isItemCommon) {
              if (!finalCategory || !finalBrand) {
                correctionsMade.push(`سطر ${i + 1}: فاقد فیلدهای الزامی دسته‌بندی یا برند برای مشکل شایع (رد شد)`);
                continue;
              }
            } else {
              if (!finalCode || !finalCategory || !finalBrand) {
                correctionsMade.push(`سطر ${i + 1}: فاقد فیلدهای الزامی کد خطا، دسته‌بندی یا برند (رد شد)`);
                continue;
              }
            }

            const tCodeClean = cleanStr(String(finalCode));
            const tCatClean = cleanStr(String(finalCategory));
            const tBrandClean = cleanStr(String(finalBrand));
            const tModelClean = cleanModel(String(finalModel));

            const rawCauses = getFieldWithFallback(rowObj, KEY_MAPS.causes);
            const finalCauses = Array.isArray(rawCauses)
               ? rawCauses.map(String)
               : rawCauses
                 ? String(rawCauses).split(/[،,;\n|]/).map(s => s.trim()).filter(Boolean)
                 : [String(finalDesc)];

            const rawSteps = getFieldWithFallback(rowObj, KEY_MAPS.steps);
            const finalSteps = Array.isArray(rawSteps)
               ? rawSteps.map(String)
               : rawSteps
                 ? String(rawSteps).split(/[،,;\n|]/).map(s => s.trim()).filter(Boolean)
                 : ['مراجعه به سرویس‌کار مجاز.'];

            const rawSafety = getFieldWithFallback(rowObj, KEY_MAPS.precautions);
            const finalPrecautions = Array.isArray(rawSafety)
               ? rawSafety.map(String)
               : rawSafety
                 ? String(rawSafety).split(/[،,;\n|]/).map(s => s.trim()).filter(Boolean)
                 : ['نکات ایمنی رعایت گردد.'];

            const rawHazard = cleanStr(String(getFieldWithFallback(rowObj, KEY_MAPS.hazardLevel) || 'low'));
            const finalHazard = (['low', 'medium', 'high', 'critical'].includes(rawHazard))
              ? rawHazard as 'low' | 'medium' | 'high' | 'critical'
              : 'low';

            if (isItemCommon) {
              const isDuplicateProb = newProblems.some(p => {
                return cleanStr(p.category) === tCatClean && cleanStr(p.brand) === tBrandClean && cleanModel(p.model || 'عمومی') === tModelClean && cleanStr(p.title) === cleanStr(String(finalTitle));
              });

              if (isDuplicateProb) {
                correctionsMade.push(`سطر ${i + 1}: مشکل شایع تکراری رد شد.`);
                continue;
              }

              newProblems.push({
                id: `prob_import_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                code: 'مشکل شایع',
                category: String(finalCategory),
                brand: String(finalBrand),
                model: tModelClean,
                title: String(finalTitle),
                description: String(finalDesc),
                causes: finalCauses.length > 0 ? finalCauses : [String(finalDesc)],
                steps: finalSteps.length > 0 ? finalSteps : ['مراجعه به سرویس‌کار مجاز.'],
                precautions: finalPrecautions.length > 0 ? finalPrecautions : ['نکات ایمنی رعایت گردد.'],
                hazardLevel: finalHazard,
                tags: ['مشکل شایع'],
                views: 0,
                solutions: finalSteps.length > 0 ? finalSteps : ['مراجعه به سرویس‌کار مجاز.']
              });

              correctionsMade.push(`سطر ${i + 1}: به دلیل ساختار بدون کد خطا به عنوان «مشکل شایع» درون‌ریزی شد.`);
            } else {
              const isDuplicateImport = newErrors.some(err => {
                const codeClean = cleanStr(err.code);
                const catClean = cleanStr(err.category);
                const brandClean = cleanStr(err.brand);
                const modelClean = cleanModel(err.model || 'عمومی');
                return codeClean === tCodeClean && catClean === tCatClean && brandClean === tBrandClean && modelClean === tModelClean;
              });

              if (isDuplicateImport) {
                correctionsMade.push(`سطر ${i + 1}: کد خطای "${finalCode}" برای ${finalCategory} ${finalBrand} (${tModelClean}) تکراری تشخیص داده شد و رد گردید.`);
                continue;
              }

              newErrors.push({
                id: `err_import_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                code: String(finalCode),
                title: String(finalTitle),
                category: String(finalCategory),
                brand: String(finalBrand),
                model: tModelClean,
                description: String(finalDesc),
                causes: finalCauses.length > 0 ? finalCauses : [String(finalDesc)],
                steps: finalSteps.length > 0 ? finalSteps : ['مراجعه به سرویس‌کار مجاز.'],
                precautions: finalPrecautions.length > 0 ? finalPrecautions : ['نکات ایمنی رعایت گردد.'],
                hazardLevel: finalHazard,
                hazardDescription: finalHazard === 'low' ? 'خطر خاصی وجود ندارد.' : 'با احتیاط کامل کار کنید.',
                toolsNeeded: [],
                relatedParts: [],
                views: 0,
                isApproved: true
              });
            }

            importedCount++;
          }

          if (importedCount > 0) {
            onUpdateErrorCodesList(newErrors);
            if (onUpdateCommonProblemsList) {
              onUpdateCommonProblemsList(newProblems);
            }

            // Cascade newly imported lists - preserve existing configurations and append new ones as requested
            const newCategories = [...categoriesList];
            const newBrands = [...brandsList];
            const newModels = [...modelsList];
            let updatedCats = false, updatedBrands = false, updatedModels = false;

            const checkAndAddMetaData = (cat: string, bnd: string, mdl: string) => {
              const c = cat ? cat.trim() : '';
              const b = bnd ? bnd.trim() : '';
              const m = mdl ? mdl.trim() : '';
              if (c && !newCategories.includes(c)) {
                newCategories.push(c);
                updatedCats = true;
              }
              if (b && !newBrands.includes(b)) {
                newBrands.push(b);
                updatedBrands = true;
              }
              if (m && m !== 'عمومی' && m !== 'کل مدل‌ها' && !newModels.includes(m)) {
                newModels.push(m);
                updatedModels = true;
              }
            };

            const importedErrors = newErrors.slice(errorCodes.length);
            importedErrors.forEach(err => checkAndAddMetaData(err.category, err.brand, err.model || 'عمومی'));

            const importedProblems = newProblems.slice(commonProblems.length);
            importedProblems.forEach(prob => checkAndAddMetaData(prob.category, prob.brand, prob.model || 'عمومی'));

            if (updatedCats) onUpdateCategoriesList(newCategories);
            if (updatedBrands) onUpdateBrandsList(newBrands);
            if (updatedModels) onUpdateModelsList(newModels);

            let summaryMsg = `رکوردهای کدهای خطا و مشکلات شایع (${importedCount} مورد) با موفقیت در دیتابیس ثبت گردید.`;
            if (correctionsMade.length > 0) {
              summaryMsg += `\n\nگزارش ممیزی خودکار:\n` + correctionsMade.slice(0, 10).join('\n') + (correctionsMade.length > 10 ? '\n...' : '');
            }
            setImportStatus({ type: 'success', msg: summaryMsg });
          } else {
            throw new Error('فرمت ستون‌های فایل CSV نامعتبر است یا کدهای خطا همگی تکراری تشخیص داده شدند.');
          }
        } else if (importType === 'categories') {
          const names = lines.map(line => line.replace(/^["']|["']$/g, '').trim()).filter(Boolean);
          const uniq = Array.from(new Set(names));
          importedCount = uniq.length;
          onUpdateCategoriesList(uniq);
        } else if (importType === 'brands') {
          const names = lines.map(line => line.replace(/^["']|["']$/g, '').trim()).filter(Boolean);
          const uniq = Array.from(new Set(names));
          importedCount = uniq.length;
          onUpdateBrandsList(uniq);
        } else if (importType === 'cities') {
          const newCities: { name: string; regions: string[] }[] = [];
          lines.forEach(line => {
            const cols = line.split(/[,;]/).map(c => c.trim().replace(/^["']|["']$/g, ''));
            const cityName = cols[0];
            if (cityName) {
              const existing = newCities.find(c => c.name.toLowerCase() === cityName.toLowerCase());
              const regList = cols.slice(1).filter(Boolean);
              if (existing) {
                existing.regions = Array.from(new Set([...existing.regions, ...regList]));
              } else {
                newCities.push({ name: cityName, regions: regList });
              }
              importedCount++;
            }
          });
          onUpdateCitiesList(newCities);
        }
      }

      setPastedImportData('');
    } catch (err: any) {
      setImportStatus({ type: 'error', msg: `خطا در پردازش اطلاعات: ${err.message}` });
    }
  };

  return (
    <div className="space-y-6">
      {/* Platform Title */}
      <div className="bg-slate-900 rounded-2xl p-5 sm:p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm sm:text-base font-bold">پنل مدیریت یکپارچه کدیار۲۴</h2>
          </div>
          <p className="text-[11px] text-slate-350">نظارت بر تخصیص هوشمند، مالیه کمیسیون‌ها، ممیزی کدهای خطا و اصالت قطعات انبار مرکزی</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <div className="bg-white/10 px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-450 animate-ping"></span>
            <span>سرور مرکزی: ایمن و آنلاین ۲۴ساعته</span>
          </div>
          {onGoToHome && (
            <button
              onClick={onGoToHome}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-1.5 text-xs font-bold shadow-md cursor-pointer transition-all flex items-center gap-1.5 active:scale-95 duration-150"
              title="مشاهده صفحه اصلی"
            >
              <Search className="w-3.5 h-3.5" />
              <span>مشاهده صفحه اصلی</span>
            </button>
          )}
          {onForceRefreshDatabase && (
            <button
              onClick={async () => {
                if (isDbRefreshing) return;
                setIsDbRefreshing(true);
                try {
                  await onForceRefreshDatabase();
                } catch (e) {}
                setTimeout(() => setIsDbRefreshing(false), 900);
              }}
              className="bg-slate-850 hover:bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-1.5 text-xs font-bold shadow-md cursor-pointer transition-all flex items-center gap-1.5 active:scale-95 duration-150"
              title="به‌روزرسانی کل پایگاه داده"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isDbRefreshing ? 'animate-spin' : ''}`} />
              <span>{isDbRefreshing ? 'یافتن اطلاعات...' : 'بروزرسانی داده‌ها (Sync)'}</span>
            </button>
          )}
          {onLogout && (
            <button
              onClick={onLogout}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl px-4 py-1.5 text-xs font-bold shadow-md cursor-pointer transition-all flex items-center gap-1.5 active:scale-95 duration-150"
              title="خروج ایمن از پنل مدیریت"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>خروج از مدیریت</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4 mb-2">
        {[
          { id: 'metrics', label: 'داشبورد و آمار مالی', icon: <BarChart3 className="w-4 h-4" /> },
          { id: 'orders', label: `مدیریت تعمیرات (${orders.length})`, icon: <PenTool className="w-4 h-4" /> },
          { id: 'errors', label: `ممیزی کدهای خطا (${pendingErrors.length})`, icon: <FileCheck className="w-4 h-4" /> },
          { id: 'techs', label: `تایید هویت تکنسین‌ها (${technicians.length})`, icon: <Users className="w-4 h-4" /> },
          { id: 'stocks', label: `انبار و قیمت قطعات (${spareParts.length})`, icon: <Layers className="w-4 h-4" /> },
          { id: 'purchases', label: `سوابق خرید قطعات (${approvedPurchases.length})`, icon: <ShoppingBag className="w-4 h-4" /> },
          { id: 'users', label: `کاربران (${allCombinedUsers.length})`, icon: <User className="w-4 h-4" /> },
          { id: 'subscriptions', label: `اشتراک‌ها (${subscriptionsList.length})`, icon: <FileText className="w-4 h-4" /> },
          { id: 'payments', label: `پرداخت‌ها (${paymentsList.length})`, icon: <DollarSign className="w-4 h-4" /> },
          { id: 'affiliate', label: `همکاری در فروش (${affiliateProducts.length})`, icon: <ShoppingBag className="w-4 h-4" /> },
          { id: 'featured_categories', label: 'دسته‌بندی‌های پیشنهادی و تکنسین برتر', icon: <Layers className="w-4 h-4" /> },
          { id: 'broadcasts', label: '📢 پیام همگانی و اعلان فوری', icon: <Megaphone className="w-4 h-4 text-amber-500" /> },
          { id: 'config', label: `اطلاعات پایه و پورتال (${(categoriesList?.length || 0) + (brandsList?.length || 0) + (modelsList?.length || 0) + (citiesList?.length || 0)})`, icon: <Settings className="w-4 h-4" /> },
          { id: 'messages', label: `پیام‌ها و نظرات (${userFeedbacks?.length || 0})`, icon: <MessageSquare className="w-4 h-4" /> },
          { id: 'techdocs', label: 'مستندات فنی (TechDocs)', icon: <FileText className="w-4 h-4" /> },
          { id: 'activitylogs', label: 'لاگ فعالیت و امنیت (Audit)', icon: <Activity className="w-4 h-4" /> },
          { id: 'backups', label: 'پشتیبان‌گیری (Backups)', icon: <Database className="w-4 h-4" /> },
          { id: 'system_errors', label: 'جدول خطاهای سیستم (Telemetry)', icon: <AlertTriangle className="w-4 h-4" /> },
          { id: 'tickets', label: 'تیکت‌های پشتیبانی (Tickets)', icon: <MessageSquare className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            id={`admin-tab-${tab.id}`}
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-2 text-xs font-black rounded-xl transition-all duration-150 cursor-pointer flex items-center gap-1.5 border whitespace-nowrap active:scale-[97%] select-none ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white text-slate-650 border-slate-200 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === 'metrics' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Card stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-220/60 p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">مجموع درآمدهای کل</span>
                <span className="font-bold text-slate-800 text-lg font-mono">{(totalInvoiced).toLocaleString('fa-IR')}</span>
                <span className="text-[10px] text-slate-500 mr-1">تومان</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-220/60 p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">سهم کمیسیون پلتفرم (۱۵٪)</span>
                <span className="font-bold text-blue-600 text-lg font-mono">{(platformEarning).toLocaleString('fa-IR')}</span>
                <span className="text-[10px] text-blue-500 mr-1">تومان</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-650 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-220/60 p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">سفارشات تعمیر در جریان</span>
                <span className="font-bold text-slate-800 text-lg font-mono">{activeJobsCount}</span>
                <span className="text-[10.5px] text-slate-500 mr-1">مورد فعال</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-650 flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-220/60 p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">کدهای خطای تایید شده</span>
                <span className="font-bold text-slate-800 text-lg font-mono">{approvedErrors.length}</span>
                <span className="text-[10.5px] text-slate-500 mr-1">کد خطا علمی</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Quick instructions panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 text-right font-sans">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-xs">توزیع واقعی قطعات و خدمات بر اساس دسته‌بندی</h3>
                <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2.5 py-0.5 rounded-md">
                  مجموع: {categoryDistribution.totalSum.toLocaleString('fa-IR')} مورد
                </span>
              </div>

              <div className="space-y-3 pt-1">
                {categoryDistribution.list.length > 0 ? (
                  categoryDistribution.list.slice(0, 6).map((item, idx) => {
                    const colors = [
                      'bg-blue-600',
                      'bg-emerald-600',
                      'bg-amber-500',
                      'bg-purple-600',
                      'bg-rose-500',
                      'bg-indigo-600'
                    ];
                    const barColor = colors[idx % colors.length];
                    return (
                      <div key={item.category} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-800 font-extrabold">
                            {item.category}
                            <span className="text-[10px] text-slate-500 font-normal mr-1.5">
                              ({item.orders.toLocaleString('fa-IR')} خدمت | {item.purchases.toLocaleString('fa-IR')} قطعه)
                            </span>
                          </span>
                          <span className="font-extrabold font-mono text-slate-900">{item.percentage.toLocaleString('fa-IR')}٪</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-2xl overflow-hidden">
                          <div
                            className={`${barColor} h-full rounded-2xl transition-all duration-300`}
                            style={{ width: `${Math.max(item.percentage, 4)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4 font-bold">
                    هنوز داده‌ای برای این دسته‌بندی ثبت نشده است.
                  </p>
                )}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-205 rounded-2xl p-5 flex flex-col justify-between font-sans">
              <div className="space-y-2 text-xs">
                <span className="bg-slate-900 text-white rounded px-2 py-0.5 text-[9px] font-bold">راهنمای کسب درآمد پلتفرم</span>
                <p className="text-slate-700 leading-relaxed">
                  کمیسیون کدیار۲۴ به میزان ۱۵ درصد از فاکتورهای خدمات تکنسین‌ها به طور خودکار کسر می‌گردد. همچنین با فروش مجزای قطعات از انبار مرکزی، حاشیه سود ۳۰ درصدی کالا برای صندوق مدیر ثبت می‌شود.
                </p>
                <p className="text-slate-400 text-[10px]">سیستم با استفاده از کدهای رهگیری هوشمند، تراکنش‌های شتاب را با تسویه هفتگی پایا انجام می‌دهد.</p>
              </div>
              <div className="text-xs font-bold text-blue-600 mt-4">
                تراز کلی بهینه پلتفرم: مثبت و فاقد کسری بدهی
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="bg-white rounded-2xl border border-slate-205 overflow-hidden animate-in fade-in duration-150">
          <div className="p-4 bg-slate-50 border-b border-slate-150 text-xs font-bold text-slate-700">
            لیست جامع تمامی تعمیرات ثبت‌شده
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 uppercase text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-4">کد سفارش</th>
                  <th className="p-4">مشخصات متقاضی</th>
                  <th className="p-4">نوع دستگاه / برند</th>
                  <th className="p-4">زمان مراجعه پیشنهادی</th>
                  <th className="p-4">تکنسین متصدی</th>
                  <th className="p-4">وضعیت فرآیند</th>
                  <th className="p-4">اقدام</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-105">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-mono font-bold text-slate-800">{ord.id}</td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-900">{ord.customerName}</div>
                      <div className="text-slate-400 text-[10px] font-mono mt-0.5">{ord.customerPhone} | {ord.region}</div>
                    </td>
                    <td className="p-4">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                        {ord.category} ({ord.brand})
                      </span>
                      {ord.errorCode && <span className="mr-1 inline-block text-rose-600 font-mono font-bold text-[10.5px]">خطای {ord.errorCode}</span>}
                    </td>
                    <td className="p-4 text-slate-600 font-medium">{ord.date} ({ord.timeSlot})</td>
                    <td className="p-4">
                      {ord.technicianName ? (
                        <span className="text-slate-800 font-semibold text-xs">{ord.technicianName}</span>
                      ) : (
                        <span className="text-amber-600 font-bold text-[10px] animate-pulse">⏰ در انتظار پذیرش</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-sm ${
                        ord.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : ord.status === 'cancelled'
                          ? 'bg-rose-100 text-rose-850'
                          : ord.status === 'repairing'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-blue-50 text-blue-700'
                      }`}>
                        {ord.status === 'registered' && 'ثبت اولیه'}
                        {ord.status === 'waiting' && 'در انتظار تکنسین'}
                        {ord.status === 'accepted' && 'پذیرش شده'}
                        {ord.status === 'enroute' && 'در مسیر هماهنگی'}
                        {ord.status === 'repairing' && 'بررسی عیب یابی'}
                        {ord.status === 'needs_part' && 'در انتظار سفارش قطعه'}
                        {ord.status === 'completed' && 'انجام شد'}
                        {ord.status === 'cancelled' && 'لغو شد'}
                      </span>
                    </td>
                    <td className="p-4">
                      {ord.status !== 'completed' && ord.status !== 'cancelled' ? (
                        <button
                          id={`admin-cancel-${ord.id}`}
                          onClick={() => {
                            triggerSafeConfirm(
                              'لغو مأموریت فنی',
                              'آیا مطمئن هستید که می‌خواهید به عنوان ناظر کل این سفارش را لغو کنید؟ پیامک عذرخواهی برای مشتری ارسال خواهد شد.',
                              () => onAdminCancelOrder(ord.id)
                            );
                          }}
                          className="bg-rose-100 text-rose-700 hover:bg-rose-600 hover:text-white px-2.5 py-1 rounded-lg text-[10.5px] font-bold border border-rose-200 transition-all cursor-pointer"
                        >
                          لغو سفارش
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[10px]">پایان یافته</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'errors' && (
        <div className="space-y-4 animate-in fade-in duration-150 text-right">
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-xs text-blue-900 flex items-start gap-2">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <div>
              <strong>صف ممیزی کدهای خطا:</strong> کدهایی که توسط تکنسین‌های میدانی از سراسر ایران کشف و راهنمای تعمیر آن‌ها نوشته شده است در این صف منتظر تایید است. تایید شما این کدهای خطا را به لیست جستجو سراسری متصل می‌کند. کدهای خطای فعال یا منتشرشده قبلی نیز از بخش دوم همین صفحه قابل مشاهده و حذف درصورت لزوم هستند.
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-205 overflow-hidden shadow-xs">
            <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-right">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-slate-800">
                  ⚡ صف ممیزی کدهای خطا ({pendingErrors.length} مورد در انتظار)
                </span>
                {filteredPendingErrors.length !== pendingErrors.length && (
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                    نتیجه فیلتر: {filteredPendingErrors.length} مورد
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 sm:w-64">
                  <input
                    type="text"
                    value={pendingCodesSearchVal}
                    onChange={(e) => setPendingCodesSearchVal(e.target.value)}
                    placeholder="جستجو بر اساس کد، برند، دستگاه یا تکنسین..."
                    className="w-full bg-white border border-slate-200 text-[10.5px] pr-8 pl-3 py-1.5 rounded-xl font-medium outline-none focus:border-blue-500 text-right"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                </div>

                {filteredPendingErrors.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerSafeConfirm(
                        'تایید و انتشار دسته‌جمعی',
                        `آیا از تایید و انتشار همزمان تمام ${filteredPendingErrors.length} کد خطای نمایش‌داده‌شده اطمینان کامل دارید؟`,
                        () => {
                          if (onBulkApproveErrorCodes) {
                            onBulkApproveErrorCodes(filteredPendingErrors.map(err => err.id));
                          } else {
                            filteredPendingErrors.forEach(err => onApproveErrorCode(err.id));
                          }
                        }
                      );
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10.5px] px-3 py-1.5 rounded-xl shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>تایید دسته‌جمعی همه ({filteredPendingErrors.length})</span>
                  </button>
                )}
              </div>
            </div>

            {pendingErrors.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <AlertTriangle className="w-10 h-10 text-slate-200 mx-auto mb-2 stroke-[1.2]" />
                <p className="text-xs font-bold text-slate-600">هیچ کد خطای جدیدی منتظر ممیزی شما نیست.</p>
                <p className="text-[10px] text-slate-400 mt-0.5">تکنسین‌ها می‌توانند از پنل خود کدهای عیب‌یابی جدیدی پیشنهاد دهند.</p>
              </div>
            ) : filteredPendingErrors.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <p className="text-xs font-bold text-slate-500">هیچ کد خطایی با عبارت «{pendingCodesSearchVal}» یافت نشد.</p>
                <button
                  onClick={() => setPendingCodesSearchVal('')}
                  className="text-[10px] text-blue-600 underline font-bold mt-1 cursor-pointer"
                >
                  پاکسازی فیلتر جستجو
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredPendingErrors.map((err) => (
                  <div key={err.id} className="p-3 sm:p-3.5 hover:bg-slate-50/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-right">
                    
                    {/* Details Column */}
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="bg-blue-600 text-white font-mono font-black text-xs px-2 py-0.5 rounded-md shadow-2xs">
                          کد: {err.code}
                        </span>
                        <span className="bg-slate-100 border border-slate-200 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          برند: {err.brand}
                        </span>
                        <span className="bg-slate-100 border border-slate-200 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          دسته: {err.category}
                        </span>
                        {err.model && (
                          <span className="text-slate-500 text-[10px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                            مدل: {err.model}
                          </span>
                        )}
                        <span className="text-[9.5px] text-slate-400 mr-auto font-sans">
                          تکنسین: <strong className="text-slate-700">{err.updatedBy || 'مستعار'}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-slate-900 text-xs sm:text-[13px]">{err.title}</h4>
                      </div>
                      
                      {err.description && (
                        <p className="text-slate-600 text-[11px] leading-snug line-clamp-1">{err.description}</p>
                      )}

                      {/* Collapsible Steps details */}
                      <details className="group/steps text-[10.5px]">
                        <summary className="text-blue-600 hover:text-blue-800 font-bold cursor-pointer text-[10px] inline-flex items-center gap-1 select-none py-0.5">
                          <span>📖 مشاهده دستورالعمل رفع عیب گام‌به‌گام</span>
                          <span className="group-open/steps:rotate-180 transition-transform">▼</span>
                        </summary>
                        <div className="mt-2 border border-slate-200/80 bg-slate-50/80 rounded-xl p-3 text-[10.5px] text-slate-700 space-y-1.5 font-sans leading-relaxed">
                          {err.steps && err.steps[0] && (
                            <div><strong className="text-blue-900">گام اول:</strong> {err.steps[0]}</div>
                          )}
                          {err.steps && err.steps[1] && (
                            <div><strong className="text-blue-900">گام دوم:</strong> {err.steps[1]}</div>
                          )}
                          {err.precautions && err.precautions[0] && (
                            <div className="text-amber-800 bg-amber-50 p-1.5 rounded-lg border border-amber-100">
                              <strong>احتیاط‌های واجب:</strong> {err.precautions[0]}
                            </div>
                          )}
                        </div>
                      </details>
                    </div>

                    {/* Action Buttons Column */}
                    <div className="flex items-center gap-1.5 flex-wrap justify-end flex-shrink-0 self-end md:self-center">
                      <button
                        type="button"
                        onClick={() => setEditingError(err)}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10.5px] font-bold py-1 px-2.5 rounded-xl border border-blue-200 transition-all cursor-pointer flex items-center gap-1"
                      >
                        ✏️ اصلاح
                      </button>

                      <button
                        type="button"
                        id={`reject-err-${err.id}`}
                        onClick={() => {
                          triggerSafeConfirm(
                            'رد پیشنهاد عیب‌یابی',
                            `آیا از رد کردن پیشنهاد کد خطای "${err.code}" به عنوان مدیر سیستم اطمینان کامل دارید؟ این پیشنهاد کلاً حذف خواهد شد.`,
                            () => onRejectErrorCode(err.id)
                          );
                        }}
                        className="bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-700 text-[10.5px] font-bold py-1 px-2.5 rounded-xl border border-rose-200 transition-all cursor-pointer"
                      >
                        رد عیب‌یابی
                      </button>

                      <button
                        type="button"
                        id={`approve-err-${err.id}`}
                        onClick={() => onApproveErrorCode(err.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] font-extrabold py-1 px-3 rounded-xl shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>تایید و انتشار</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 1.5) Direct Insert Error Code Form inside Errors Tab (Collapsible, closed by default) */}
          <div className="bg-white rounded-2xl border border-slate-205 shadow-sm overflow-hidden text-right">
            <details className="group" open={false}>
              <summary className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/80 font-bold text-xs text-slate-800 cursor-pointer selection:bg-transparent transition-all">
                <div className="flex items-center gap-2 justify-start">
                  <span className="text-base">➕</span>
                  <span className="font-extrabold text-slate-800">درج مستقیم کد خطای جدید سراسری (ثبت مستقیم در دیتابیس)</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[8.5px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-extrabold font-mono">QUICK INSERT</span>
                  <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                </div>
              </summary>

              <div className="p-5 border-t border-slate-100 bg-slate-50/30 space-y-5 text-right">
                <p className="text-[10px] text-slate-450 leading-relaxed -mt-1">
                  از این بخش می‌توانید بدون نیاز به ارسال پیشنهاد تکنسین، مستقیماً کدهای خطای جدید را به بانک داده کدیار۲۴ اضافه کنید. همزمان با ثبت، نوع دستگاه، برند و مدل به لیست‌های سیستم افزوده می‌شوند.
                </p>

                {/* Dynamic Status Alert Banner */}
                {directInsertStatus && (
                  <div 
                    className={`p-4 rounded-xl text-xs font-bold leading-relaxed text-right border relative flex flex-col gap-2.5 transition-all shadow-xs ${
                      directInsertStatus.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' :
                      directInsertStatus.type === 'error' ? 'bg-rose-50 text-rose-900 border-rose-200' : 
                      'bg-amber-50 text-amber-900 border-amber-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {directInsertStatus.type === 'success' ? '✓' : directInsertStatus.type === 'error' ? '🚫' : '⚠️'}
                        </span>
                        <span className="font-extrabold text-[12px]">{directInsertStatus.msg}</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setDirectInsertStatus(null)}
                        className="text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 p-1 rounded-lg text-[10px] w-5 h-5 flex items-center justify-center border border-slate-200 shadow-2xs"
                      >
                        ✕
                      </button>
                    </div>

                    {directInsertStatus.code && (
                      <div className="bg-white/70 p-3 rounded-lg border border-slate-100 space-y-1.5 text-[10.5px]">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-slate-700">
                          <div>
                            <span className="text-slate-400 font-bold">کد خطا:</span>{' '}
                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-black">{directInsertStatus.code}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold">دستگاه:</span>{' '}
                            <span className="text-slate-900 font-bold">{directInsertStatus.category}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold">برند:</span>{' '}
                            <span className="text-slate-900 font-bold">{directInsertStatus.brand}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold">مدل:</span>{' '}
                            <span className="text-slate-900 font-bold">{directInsertStatus.model}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <form onSubmit={handleAddDirectErrorCode} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    {/* Error Code */}
                    <div>
                      <label className="block text-slate-700 text-[10px] font-bold mb-1">کد خطا (مانند: E01, F1) *</label>
                      <input
                        required
                        type="text"
                        value={dirCode}
                        onChange={(e) => setDirCode(e.target.value)}
                        placeholder="مانند: E01, F3"
                        className="w-full bg-white border border-slate-200 text-xs px-3 py-2 rounded-xl outline-none focus:border-blue-500 font-bold text-left font-mono text-slate-800"
                      />
                    </div>

                    {/* Error title */}
                    <div>
                      <label className="block text-slate-700 text-[10px] font-bold mb-1">عنوان فنی / توصیف عیب *</label>
                      <input
                        required
                        type="text"
                        value={dirTitle}
                        onChange={(e) => setDirTitle(e.target.value)}
                        placeholder="مانند: خطای عدم تخلیه آب"
                        className="w-full bg-white border border-slate-200 text-xs px-3 py-2 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-800"
                      />
                    </div>

                    {/* Category */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-slate-700 text-[10px] font-bold">نوع دستگاه *</label>
                        <button
                          type="button"
                          onClick={() => {
                            setCategoryMode(categoryMode === 'select' ? 'custom' : 'select');
                            setDirCategory('');
                          }}
                          className="text-[9px] text-blue-600 hover:text-blue-800 font-bold"
                        >
                          {categoryMode === 'select' ? '➕ جدید' : '📋 لیست'}
                        </button>
                      </div>
                      {categoryMode === 'select' ? (
                        <select
                          value={dirCategory}
                          onChange={(e) => setDirCategory(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-xs p-2 rounded-xl outline-none font-bold text-slate-800 cursor-pointer text-right"
                          required
                        >
                          <option value="">-- انتخاب دستگاه --</option>
                          {categoriesList.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          required
                          type="text"
                          value={dirCategory}
                          onChange={(e) => setDirCategory(e.target.value)}
                          placeholder="مانند: ماشین لباسشویی"
                          className="w-full bg-white border border-slate-200 text-xs px-3 py-2 rounded-xl outline-none focus:border-blue-500 font-bold text-right text-slate-800"
                        />
                      )}
                    </div>

                    {/* Brand */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-slate-700 text-[10px] font-bold">برند *</label>
                        <button
                          type="button"
                          onClick={() => {
                            setBrandMode(brandMode === 'select' ? 'custom' : 'select');
                            setDirBrand('');
                          }}
                          className="text-[9px] text-blue-600 hover:text-blue-800 font-bold"
                        >
                          {brandMode === 'select' ? '➕ جدید' : '📋 لیست'}
                        </button>
                      </div>
                      {brandMode === 'select' ? (
                        <select
                          value={dirBrand}
                          onChange={(e) => setDirBrand(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-xs p-2 rounded-xl outline-none font-bold text-slate-800 cursor-pointer text-right"
                          required
                        >
                          <option value="">-- انتخاب برند --</option>
                          {brandsList.map(br => (
                            <option key={br} value={br}>{br}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          required
                          type="text"
                          value={dirBrand}
                          onChange={(e) => setDirBrand(e.target.value)}
                          placeholder="مانند: اسنوا"
                          className="w-full bg-white border border-slate-200 text-xs px-3 py-2 rounded-xl outline-none focus:border-blue-500 font-bold text-right text-slate-800"
                        />
                      )}
                    </div>

                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    
                    {/* Model */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-slate-700 text-[10px] font-bold">مدل‌های مشمول *</label>
                        <button
                          type="button"
                          onClick={() => {
                            setModelMode(modelMode === 'select' ? 'custom' : 'select');
                            setDirModel('');
                          }}
                          className="text-[9px] text-blue-600 hover:text-blue-800 font-bold"
                        >
                          {modelMode === 'select' ? '➕ جدید' : '📋 لیست'}
                        </button>
                      </div>
                      {modelMode === 'select' ? (
                        <select
                          value={dirModel}
                          onChange={(e) => setDirModel(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-xs p-2 rounded-xl outline-none font-bold text-slate-800 cursor-pointer text-right"
                          required
                        >
                          <option value="">-- انتخاب مدل --</option>
                          <option value="عمومی">عمومی (کل مدل‌ها)</option>
                          {modelsList.map(md => (
                            <option key={md} value={md}>{md}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          required
                          type="text"
                          value={dirModel}
                          onChange={(e) => setDirModel(e.target.value)}
                          placeholder="تایپ مدل جدید (مانند: عمومی، یا مدل خاص)"
                          className="w-full bg-white border border-slate-200 text-xs px-3 py-2 rounded-xl outline-none focus:border-blue-500 font-bold text-right text-slate-800"
                        />
                      )}
                    </div>

                    {/* Hazard */}
                    <div>
                      <label className="block text-slate-700 text-[10px] font-bold mb-1">درجه خطر احتمالی عیب</label>
                      <select
                        value={dirHazard}
                        onChange={(e) => setDirHazard(e.target.value as any)}
                        className="w-full bg-white border border-slate-200 text-xs p-2 rounded-xl outline-none font-bold text-slate-800 cursor-pointer text-right"
                      >
                        <option value="low">کم خطر - بی‌خطر</option>
                        <option value="medium">متوسط - نیاز به احتیاط</option>
                        <option value="high">خطر بالا - قطع گاز/برق</option>
                        <option value="critical">بحرانی - خطر انفجار/برق‌گرفتگی شدید</option>
                      </select>
                    </div>

                    {/* Causes */}
                    <div>
                      <label className="block text-slate-700 text-[10px] font-bold mb-1">علت بروز خرابی</label>
                      <input
                        type="text"
                        value={dirReason}
                        onChange={(e) => setDirReason(e.target.value)}
                        placeholder="مانند: انسداد فیلتر تخلیه یا سوختن مگنترون"
                        className="w-full bg-white border border-slate-200 text-xs px-3 py-2 rounded-xl outline-none focus:border-blue-500 font-bold text-right text-slate-800"
                      />
                    </div>

                  </div>

                  <div>
                    <label className="block text-slate-700 text-[10px] font-bold mb-1">راهکار و راهنمای تفصیلی عیب‌یابی گام‌به‌گام *</label>
                    <textarea
                      required
                      rows={3}
                      value={dirSolution}
                      onChange={(e) => setDirSolution(e.target.value)}
                      placeholder="مراحل گام‌به‌گام رفع عیب را در اینجا بنویسید..."
                      className="w-full bg-white border border-slate-200 text-xs p-3 rounded-xl outline-none focus:border-blue-500 font-bold text-right text-slate-800 leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 text-[10px] font-bold mb-1">لینک ویدیو آموزشی (آپارات، یوتیوب یا لینک مستقیم - اختیاری)</label>
                    <input
                      type="text"
                      value={dirVideoUrl}
                      onChange={(e) => setDirVideoUrl(e.target.value)}
                      placeholder="مانند: https://aparat.com/v/XXXXX"
                      className="w-full bg-white border border-slate-200 text-xs px-3 py-2 rounded-xl outline-none focus:border-blue-500 font-mono text-left"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-6 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>💾 ثبت کد خطا در دیتابیس سراسری</span>
                    </button>
                  </div>
                </form>
              </div>
            </details>
          </div>


          {/* 2) Approved/Active system errors */}
          <div className="bg-white rounded-2xl border border-slate-205 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-150 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-right">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-700 block">🗂️ مدیریت پیشرفته کدهای خطای پلتفرم ({approvedErrors.length})</span>
                  <p className="text-[10px] text-slate-400">کدهای خطای تاییدشده را به صورت گروهی بر اساس دستگاه، برند و مدل یا تکی مدیریت، ویرایش و حذف کنید.</p>
                </div>

                <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
                  <button
                    type="button"
                    onClick={() => setErrGroupViewMode('grouped')}
                    className={`px-3 py-1.5 text-[10.5px] font-bold rounded-xl transition-all cursor-pointer ${
                      errGroupViewMode === 'grouped'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    🗂️ نمای دسته‌بندی شده (پیشرفته)
                  </button>
                  <button
                    type="button"
                    onClick={() => setErrGroupViewMode('simple')}
                    className={`px-3 py-1.5 text-[10.5px] font-bold rounded-xl transition-all cursor-pointer ${
                      errGroupViewMode === 'simple'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    📋 نمای لیست ساده
                  </button>

                  {errGroupViewMode === 'grouped' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const newMap: Record<string, boolean> = {};
                          groupedApprovedErrors.forEach(g => { newMap[g.key] = false; });
                          setExpandedErrGroups(newMap);
                        }}
                        className="px-2.5 py-1.5 text-[10px] font-bold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                        title="بستن همه دسته‌ها"
                      >
                        📁 بستن همه
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const newMap: Record<string, boolean> = {};
                          groupedApprovedErrors.forEach(g => { newMap[g.key] = true; });
                          setExpandedErrGroups(newMap);
                        }}
                        className="px-2.5 py-1.5 text-[10px] font-bold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                        title="باز کردن همه دسته‌ها"
                      >
                        📂 باز کردن همه
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Advanced Filter Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-right">
                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="جستجو در متن کد، برند یا عنوان..."
                    id="admin-approved-codes-search"
                    className="w-full bg-white border border-slate-200 text-[10.5px] pr-8 pl-3 py-2 rounded-xl text-right font-medium outline-none focus:border-slate-400"
                    onChange={(e) => setApprovedCodesSearchVal(e.target.value)}
                    value={approvedCodesSearchVal}
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                </div>

                {/* Category Filter */}
                <div>
                  <select
                    className="w-full bg-white border border-slate-200 text-[10.5px] px-3 py-2 rounded-xl text-right font-bold outline-none focus:border-slate-400"
                    value={errGroupCategoryFilter}
                    onChange={(e) => setErrGroupCategoryFilter(e.target.value)}
                  >
                    <option value="">📂 تمامی دسته‌بندی‌ها (دستگاه‌ها)</option>
                    {uniqueErrCategories.map(cat => (
                      <option key={cat} value={cat}>🔧 {cat}</option>
                    ))}
                  </select>
                </div>

                {/* Brand Filter */}
                <div>
                  <select
                    className="w-full bg-white border border-slate-200 text-[10.5px] px-3 py-2 rounded-xl text-right font-bold outline-none focus:border-slate-400"
                    value={errGroupBrandFilter}
                    onChange={(e) => setErrGroupBrandFilter(e.target.value)}
                  >
                    <option value="">🏷️ تمامی برندها</option>
                    {uniqueErrBrands.map(br => (
                      <option key={br} value={br}>⭐ {br}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* View Mode Logic */}
            {errGroupViewMode === 'grouped' ? (
              // Grouped Accordion View
              <div className="p-4 space-y-3 bg-slate-50/50 max-h-[600px] overflow-y-auto">
                {groupedApprovedErrors.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    هیچ گروه عیب‌یابی منطبق بر فیلتر یا جستجوی فعلی یافت نشد.
                  </div>
                ) : (
                  groupedApprovedErrors.map((group) => {
                    const isExpanded = expandedErrGroups[group.key] ?? false; // closed by default
                    return (
                      <div key={group.key} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                        {/* Group Header */}
                        <div className="p-4 bg-slate-50/80 hover:bg-slate-100/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 transition-all select-none">
                          <div 
                            className="flex items-center gap-2 cursor-pointer flex-1 text-right"
                            onClick={() => setExpandedErrGroups(prev => ({ ...prev, [group.key]: !isExpanded }))}
                          >
                            <span className="text-slate-400 text-xs shrink-0 font-mono">
                              {isExpanded ? '▼' : '◀'}
                            </span>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="bg-blue-100 text-blue-800 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                                {group.category}
                              </span>
                              <span className="bg-amber-100 text-amber-800 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                                برند: {group.brand}
                              </span>
                              <span className="text-slate-600 text-[11px] font-bold">
                                مدل: {group.model}
                              </span>
                            </div>
                            <span className="bg-slate-200 text-slate-700 text-[9px] px-2 py-0.5 rounded-md font-extrabold mr-auto">
                              {group.errors.length} کد خطا
                            </span>
                          </div>

                          {/* Group Bulk Actions */}
                          <div className="flex items-center gap-1.5 self-end sm:self-auto">
                            <button
                              type="button"
                              onClick={() => {
                                setBulkEditingGroup(group);
                                setBulkEditNewCategory(group.category);
                                setBulkEditNewBrand(group.brand);
                                setBulkEditNewModel(group.model);
                              }}
                              className="bg-sky-50 hover:bg-sky-500 hover:text-white text-sky-700 text-[10px] font-extrabold py-1 px-2.5 rounded-lg border border-sky-200 transition-all cursor-pointer flex items-center gap-1"
                            >
                              <span>✏️ ویرایش یکجای کل گروه</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                triggerSafeConfirm(
                                  'حذف گروهی کدهای خطا',
                                  `آیا از حذف دائم و کامل تمام ${group.errors.length} کد خطای موجود در گروه "${group.category} - ${group.brand} - ${group.model}" به صورت یکجا اطمینان دارید؟ استفاده از این کدهای خطا در پلتفرم به طور کامل متوقف خواهد شد.`,
                                  async () => {
                                    try {
                                      const idsToDel = group.errors.map(e => e.id);
                                      const token = localStorage.getItem('session_user_id') || '';
                                      const results = await Promise.all(
                                        idsToDel.map(id =>
                                          fetch(`/api/error-codes/${encodeURIComponent(id)}`, {
                                            method: 'DELETE',
                                            headers: { 'X-Session-Token': token }
                                          })
                                        )
                                      );
                                      const allOk = results.every(r => r.ok);
                                      if (allOk) {
                                        const updated = errorCodes.filter(e => !idsToDel.includes(e.id));
                                        onUpdateErrorCodesList(updated);
                                        alert(`تعداد ${group.errors.length} کد خطا با موفقیت حذف گردید.`);
                                      } else {
                                        alert('خطا در حذف برخی کدهای خطا از سرور');
                                      }
                                    } catch (err: any) {
                                      alert(err.message || 'خطا در ارتباط با سرور');
                                    }
                                  }
                                );
                              }}
                              className="bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 text-[10px] font-extrabold py-1 px-2.5 rounded-lg border border-rose-200 transition-all cursor-pointer flex items-center gap-1"
                            >
                              <span>🗑️ حذف یکجای گروه</span>
                            </button>
                          </div>
                        </div>

                        {/* Group Errors list */}
                        {isExpanded && (
                          <div className="divide-y divide-slate-100 p-2 bg-white">
                            {group.errors.map((err) => (
                              <div key={err.id} className="p-3 hover:bg-slate-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-right">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="bg-slate-900 text-white font-mono font-bold text-[10px] px-1.5 py-0.2 rounded">
                                      {err.code}
                                    </span>
                                    <h5 className="font-bold text-slate-800 text-xs">{err.title}</h5>
                                  </div>
                                  <p className="text-slate-500 text-[10px] leading-relaxed line-clamp-1 max-w-xl">{err.description}</p>
                                </div>

                                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                                  <button
                                    type="button"
                                    onClick={() => setEditingError(err)}
                                    className="bg-slate-50 hover:bg-slate-100 text-slate-700 text-[9px] font-bold py-1 px-2 rounded-lg border border-slate-200 transition-all cursor-pointer"
                                  >
                                    ویرایش مشخصات
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      triggerSafeConfirm(
                                        'حذف قطعی کد خطا',
                                        `آیا از حذف دائم کد خطای "${err.code}" متعلق به برند "${err.brand}" اطمینان دارید؟`,
                                        () => onRejectErrorCode(err.id)
                                      );
                                    }}
                                    className="bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 text-[9px] font-bold py-1 px-2 rounded-lg border border-rose-200 transition-all cursor-pointer"
                                  >
                                    حذف
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              // Simple Flat List View (Original layout)
              <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                {filteredApprovedErrors.length === 0 ? (
                  <div className="py-8 text-center text-slate-450 text-xs">
                    هیچ کد خطایی با معیار جستجوی شما مطابقت ندارد.
                  </div>
                ) : (
                  filteredApprovedErrors.map((err) => (
                    <div key={err.id} className="p-4 hover:bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1 text-right">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="bg-slate-900 text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded-sm">
                            کد: {err.code}
                          </span>
                          <span className="bg-slate-100 text-slate-700 text-[9px] px-2 py-0.5 rounded-sm font-bold">
                            برند: {err.brand}
                          </span>
                          <span className="bg-slate-100 text-slate-700 text-[9px] px-2 py-0.5 rounded-sm font-bold">
                            دسته: {err.category}
                          </span>
                          {err.model && <span className="text-slate-450 text-[9px]">سازگاری: {err.model}</span>}
                        </div>
                        <h4 className="font-bold text-slate-800 text-xs">{err.title}</h4>
                        <p className="text-slate-500 text-[10.5px] line-clamp-2 max-w-2xl leading-normal">{err.description}</p>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setEditingError(err)}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold py-1 px-3 rounded-xl border border-emerald-200 transition-all cursor-pointer"
                        >
                          اصلاح مشخصات
                        </button>
                        <button
                          type="button"
                          id={`delete-approved-err-${err.id}`}
                          onClick={() => {
                            triggerSafeConfirm(
                              'حذف قطعی کد خطا',
                              `آیا از حذف دائم و کامل کد خطای "${err.code}" متعلق به برند "${err.brand}" اطمینان دارید؟ استفاده از این کد در عیب‌یابی‌ها مسدود خواهد شد.`,
                              () => onRejectErrorCode(err.id)
                            );
                          }}
                          className="bg-red-50 hover:bg-red-600 hover:text-white text-red-700 text-[10px] font-black py-1.5 px-3 rounded-xl border border-red-200 transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف دائم</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'techs' && (
        <div className="bg-white rounded-2xl border border-slate-205 overflow-hidden animate-in fade-in duration-150 text-right">
          <div className="p-4 bg-slate-50 border-b border-slate-150 text-xs font-bold text-slate-705 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span>تایید هویت دو مرحله‌ای و راستی‌آزمایی صلاحیت تکنسین‌ها</span>
            <button
              onClick={() => setIsAddTechOpen(!isAddTechOpen)}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 transition-all text-right"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddTechOpen ? 'بستن فرم درج' : 'افزودن تکنسین جدید'}</span>
            </button>
          </div>

          {isAddTechOpen && (
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <form onSubmit={handleAddNewTech} className="bg-slate-900 text-slate-100 rounded-2xl p-4 sm:p-5 border border-slate-850 shadow-lg text-right space-y-4">
                <div className="border-b border-slate-800 pb-2.5 mb-2 flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-blue-400 font-extrabold">NEW PERSONNEL REGISTRATION</span>
                  <h4 className="text-xs font-extrabold text-white">درج و ایجاد فوری پرونده تکنسین جدید</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-bold">
                  <div>
                    <label className="block text-slate-300 text-[10.5px] font-bold mb-1">نام و نام خانوادگی تکنسین *</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: رضا کریمی"
                      value={newTechName}
                      onChange={(e) => setNewTechName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-blue-500 outline-none text-right"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 text-[10.5px] font-bold mb-1">شماره تلفن همراه *</label>
                    <input
                      type="tel"
                      required
                      placeholder="مثال: 09121112233"
                      value={newTechPhone}
                      onChange={(e) => {
                        const sanitized = sanitizePhoneInput(e.target.value);
                        setNewTechPhone(sanitized);
                        if (sanitized) {
                          const check = validateIranianMobile(sanitized);
                          setNewTechPhoneError(check.isValid ? '' : (check.error || ''));
                        } else {
                          setNewTechPhoneError('وارد کردن شماره موبایل الزامی است.');
                        }
                      }}
                      maxLength={11}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white text-center font-mono focus:border-blue-500 outline-none"
                    />
                    {newTechPhoneError && (
                      <p className="text-red-400 text-[10px] mt-1 text-right font-medium">{newTechPhoneError}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-300 text-[10.5px] font-bold mb-1">رمز عبور ورود به پنل</label>
                    <input
                      type="text"
                      placeholder="پیش‌فرض: 123456"
                      value={newTechPassword}
                      onChange={(e) => setNewTechPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white text-center font-mono focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-bold">
                  <div>
                    <label className="block text-slate-300 text-[10.5px] font-bold mb-1">محدوده اصلی فعالیت</label>
                    <input
                      type="text"
                      placeholder="مثال: تهران، منطقه ۲"
                      value={newTechLocation}
                      onChange={(e) => setNewTechLocation(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-blue-500 outline-none text-right"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 text-[10.5px] font-bold mb-1">آدرس عکس پرسنلی (آواتار)</label>
                    <input
                      type="url"
                      placeholder="مثال: https://images.unsplash.com..."
                      value={newTechAvatar}
                      onChange={(e) => {
                        setNewTechAvatar(e.target.value);
                        if (e.target.value.trim()) {
                          const check = validateUrl(e.target.value);
                          setNewTechAvatarError(check.isValid ? '' : (check.error || ''));
                        } else {
                          setNewTechAvatarError('');
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white text-left font-mono focus:border-blue-500 outline-none"
                    />
                    {newTechAvatarError && (
                      <p className="text-red-400 text-[10px] mt-1 text-right font-medium">{newTechAvatarError}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-300 text-[10.5px] font-bold mb-1">تخصص‌های تعمیراتی (با کاما جدا کنید) *</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: پکیج، کولرگازی، یخچال"
                      onChange={(e) => {
                        const arr = e.target.value.split('،').map(x => x.trim()).filter(Boolean);
                        setNewTechSpecialties(arr);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-blue-500 outline-none text-right"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 text-[10.5px] font-bold mb-1">بارگذاری عکس پرسنلی (آواتار)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleTechAvatarUpload(e, false)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white file:bg-slate-800 file:text-white file:border-none file:px-2 file:py-1 file:rounded file:cursor-pointer cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 text-[10.5px] font-bold mb-1">امتیاز پیش‌فرض (Rating - از ۵.۰)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1.0"
                      max="5.0"
                      value={newTechRating}
                      onChange={(e) => setNewTechRating(Number(e.target.value) || 5.0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white text-center font-mono focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 text-[10.5px] font-bold mb-1">میزان رضایت پیش‌فرض (از ۱۰۰٪)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={newTechSatisfactionRate}
                      onChange={(e) => setNewTechSatisfactionRate(Number(e.target.value) || 98)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white text-center font-mono focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6 py-2.5 text-xs font-bold shadow-md cursor-pointer transition-all"
                  >
                    ثبت نهایی اطلاعات پرسنلی تکنسین
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-5 bg-slate-50">
            {technicians.map((t) => (
              <div key={t.id} className="bg-white border border-slate-200 hover:border-slate-300 rounded-3xl p-5 flex flex-col gap-4 shadow-3xs transition-all duration-150 justify-between text-right">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <img
                      src={t.avatarUrl || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>"}
                      alt={t.name}
                      className="w-12 h-12 rounded-full object-cover border border-slate-100 flex-shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-800 text-sm sm:text-xs">{t.name}</span>
                        {t.status === 'vacation' ? (
                          <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-bold px-2 py-0.5 rounded-sm flex items-center gap-1 animate-pulse">
                            ☕ در مرخصی (عدم پذیرش سفارش)
                          </span>
                        ) : t.status === 'suspended' || t.status === 'blocked' ? (
                          <span className="bg-rose-100 text-rose-800 text-[9px] font-bold px-1.5 py-0.5 rounded-sm">⛔ معلق / متوقف موقت</span>
                        ) : t.isVerified ? (
                          <span className="bg-emerald-50 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded-sm">✓ آماده‌به‌کار و تایید صلاحیت</span>
                        ) : t.status === 'pending' || !t.isVerified ? (
                          <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[9px] font-bold px-1.5 py-0.5 rounded-sm">⏳ در انتظار تایید مدیریت</span>
                        ) : (
                          <span className="bg-red-50 text-red-800 text-[9px] font-bold px-1.5 py-0.5 rounded-sm">معلق / متوقف موقت</span>
                        )}
                      </div>
                      <p className="text-slate-400 text-[10px] mt-1">تخصص تعمیرات: {(Array.isArray(t.specialty) ? t.specialty : [t.specialty]).filter(Boolean).join('، ')}</p>
                      <div className="text-[9.5px] text-slate-500 mt-1">محدوده اصلی سرویس: {t.activeLocation} | شماره موبایل: {t.phone}</div>
                      
                      {/* Password and Credentials visibility for the administrator */}
                      <div className="mt-2 text-[10px] bg-slate-100 p-2 rounded-xl flex items-center justify-between text-slate-700 max-w-sm border border-slate-200">
                        <div className="flex items-center gap-1.5 font-bold">
                          <Key className="w-3.5 h-3.5 text-blue-600" />
                          <span>موبایل: <span className="font-mono text-[11px] text-slate-800">{t.phone}</span></span>
                          <span className="mx-1 text-slate-300">|</span>
                          <span>رمز عبور ورود: <span className="font-mono text-xs bg-white px-2 py-0.5 rounded border border-slate-300 text-blue-700">{t.password || '123456'}</span></span>
                        </div>
                      </div>

                      {t.documents && t.documents.length > 0 && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] text-slate-500 font-bold">مدارک ارسالی جهت احراز صلاحیت:</span>
                          {t.documents.map((doc: any, dIdx: number) => {
                            let docName = typeof doc === 'string' ? doc : (doc.name || doc.title || 'مدرک فنی');
                            let docUrl = typeof doc === 'string' ? (doc.startsWith('http') || doc.startsWith('/uploads/') || doc.startsWith('data:') ? doc : '') : (doc.url || doc.fileUrl || doc.fileData || '');
                            try {
                              if (typeof doc === 'string' && doc.startsWith('{')) {
                                const parsed = JSON.parse(doc);
                                docName = parsed.name || parsed.title || 'مدرک بدون نام';
                                docUrl = parsed.url || parsed.fileUrl || parsed.fileData || docUrl;
                              }
                            } catch (e) {}

                            const payloadToPreview = docUrl ? (typeof doc === 'object' ? JSON.stringify(doc) : docUrl) : (typeof doc === 'object' ? JSON.stringify(doc) : doc);
                            return (
                              <button
                                key={dIdx}
                                type="button"
                                onClick={() => setPreviewDoc({ techName: t.name, docName: payloadToPreview })}
                                className="bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 hover:border-blue-300 border border-slate-200 text-[10px] px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                                title="کلیک جهت مشاهده کامل سند یا تصویر مدرک"
                              >
                                <FileText className="w-3.5 h-3.5 text-current" />
                                <span>{docName}</span>
                                <span className="text-[8px] opacity-75 mr-0.5">(مشاهده سند 🔎)</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {t.document_images && (Array.isArray(t.document_images) ? t.document_images.length > 0 : true) && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="text-[10px] text-slate-500 font-bold">تصاویر مدارک آپلود شده:</span>
                          {(Array.isArray(t.document_images) ? t.document_images : [t.document_images]).map((img: any, iIdx: number) => {
                            const src = typeof img === 'string' ? img : (img && (img.url || img.fileUrl || img.data || img.src)) || '';
                            if (!src || !(src.startsWith('data:') || src.startsWith('http') || src.startsWith('/'))) return null;
                            return (
                              <button
                                key={iIdx}
                                type="button"
                                onClick={() => setPreviewDoc({ techName: t.name, docName: src })}
                                className="p-0 border-0 bg-transparent cursor-pointer"
                                title="کلیک برای مشاهده تصویر کامل مدرک"
                              >
                                <img src={src} alt="مدرک تکنسین" className="w-16 h-16 object-cover rounded-lg border border-slate-300 hover:scale-105 transition-transform shadow-sm" />
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 self-end sm:self-start">
                    {/* Direct impersonation/login to technician panel for Manager */}
                    {onLoginAsTechnician && (
                      <button
                        onClick={() => onLoginAsTechnician(t.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 px-3.5 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 w-full justify-center sm:w-auto"
                        title="ورود و کنترل کامل پنل این شخص"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>ورود مستقیم به پنل متخصص</span>
                      </button>
                    )}

                    {t.isVerified ? (
                      <button
                        id={`suspend-tech-${t.id}`}
                        onClick={() => onVerifyTechnician(t.id, false)}
                        className="bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white text-xs font-bold py-1.5 px-3 rounded-xl border border-rose-200 transition-all cursor-pointer w-full text-center sm:w-auto"
                      >
                        تعلیق همکاری
                      </button>
                    ) : (
                      <button
                        id={`verify-tech-${t.id}`}
                        onClick={() => onVerifyTechnician(t.id, true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 px-4 rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer w-full justify-center sm:w-auto"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>تایید و فعالسازی مجاز</span>
                      </button>
                    )}

                    {t.isVerified && t.status === 'vacation' && (
                      <span className="text-xs font-bold py-1.5 px-3 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 flex items-center justify-center gap-1 w-full sm:w-auto cursor-default" title="تکنسین از طریق پنل شخصی خود در حالت مرخصی قرار گرفته است">
                        <span>☕ تکنسین در مرخصی است</span>
                      </span>
                    )}

                    {onUpdateTechniciansList && (
                      <button
                        onClick={() => {
                          setEditingTechId(t.id);
                          setEditTechName(t.name);
                          setEditTechPhone(t.phone);
                          setEditTechPassword(t.password || '123456');
                          setEditTechSpecialties(t.specialty || []);
                          setEditTechLocation(t.activeLocation || 'تهران');
                          setEditTechAvatar(t.avatarUrl || '');
                          setEditTechRating(t.rating || 5.0);
                          setEditTechSatisfactionRate(t.satisfactionRate || 98);
                        }}
                        className="bg-amber-50 hover:bg-amber-600 text-amber-700 hover:text-white border border-amber-200 hover:border-amber-600 text-xs font-bold py-1.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer w-full sm:w-auto mt-1 animate-pulse"
                        title="ویرایش اطلاعات پرسنلی و ارزیابی تکنسین"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>ویرایش پرونده و ارزیابی</span>
                      </button>
                    )}

                    {onUpdateTechniciansList && (
                      <button
                        onClick={() => {
                          triggerSafeConfirm(
                            'حذف دائم پرونده تکنسین',
                            `آیا از حذف کامل پرونده تکنسین "${t.name}" از شبکه سراسری کدیار۲۴ اطمینان قطعی دارید؟ مأموریت‌های همکار مسدود و اطلاعات وی پاک خواهد شد.`,
                            async () => {
                              try {
                                const token = localStorage.getItem('session_user_id') || localStorage.getItem('token') || localStorage.getItem('access_token') || 'us_admin_root';
                                const masterPass = adminPassword || localStorage.getItem('admin_master_password') || localStorage.getItem('ir_admin_password') || '';
                                const res = await fetch(`/api/admin/technicians/${encodeURIComponent(t.id)}`, {
                                  method: 'DELETE',
                                  headers: { 
                                    'Content-Type': 'application/json',
                                    'X-Session-Token': token,
                                    'X-User-Id': token,
                                    'X-Admin-Password': masterPass,
                                    'X-Admin-Role': 'admin',
                                    'Authorization': `Bearer ${token}`
                                  },
                                  credentials: 'include'
                                });
                                const data = await res.json().catch(() => ({}));
                                if (res.ok && (data.status === 'ok' || data.success)) {
                                  const rawPhone = String(t.phone || '').trim();
                                  const phoneNoZero = rawPhone.replace(/^0/, '');
                                  const phoneWithZero = rawPhone ? (rawPhone.startsWith('0') ? rawPhone : '0' + rawPhone) : '';
                                  const rawId = String(t.id || '').trim();
                                  const idNoTech = rawId.replace(/^tech_/, '');
                                  const idWithTech = rawId.startsWith('tech_') ? rawId : ('tech_' + rawId);

                                  const filtered = (technicians || []).filter(tech => {
                                    const techId = String(tech.id || '').trim();
                                    const techUserId = String(tech.user_id || tech.userId || '').trim();
                                    const techPhone = String(tech.phone || '').trim();
                                    if (rawId && (techId === rawId || techId === idNoTech || techId === idWithTech)) return false;
                                    if (techUserId && (techUserId === rawId || techUserId === idNoTech)) return false;
                                    if (rawPhone && (techPhone === rawPhone || techPhone === phoneNoZero || techPhone === phoneWithZero)) return false;
                                    return true;
                                  });

                                  const filteredUsers = (usersList || []).filter(u => {
                                    const uId = String(u.id || '').trim();
                                    const uPhone = String(u.phone || '').trim();
                                    if (rawId && (uId === rawId || uId === idNoTech || uId === idWithTech)) return false;
                                    if (rawPhone && (uPhone === rawPhone || uPhone === phoneNoZero || uPhone === phoneWithZero)) return false;
                                    return true;
                                  });

                                  localStorage.setItem('ir_techs', JSON.stringify(filtered));
                                  localStorage.setItem('ir_users', JSON.stringify(filteredUsers));
                                  localStorage.setItem('ir_users_list', JSON.stringify(filteredUsers));

                                  onUpdateTechniciansList(filtered);
                                  if (onUpdateUsersList) {
                                    onUpdateUsersList(filteredUsers);
                                  }
                                  alert(`پرونده همکاری تکنسین "${t.name}" با موفقیت برای همیشه حذف و پرونده وی مسدود گردید.`);
                                } else {
                                  alert(data.error || data.message || 'خطا در حذف پرونده تکنسین از سرور');
                                }
                              } catch (err: any) {
                                alert(err.message || 'خطا در ارتباط با سرور');
                              }
                            }
                          );
                        }}
                        className="bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 hover:border-red-600 text-xs font-bold py-1.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer w-full sm:w-auto mt-1"
                        title="حذف حساب کاربری تکنسین"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف کامل تکنسین</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Detailed Activities List - See all actions of this technician */}
                {(() => {
                  const techOrders = orders.filter(o => o.technicianId === t.id);
                  return (
                    <div className="bg-slate-50/70 hover:bg-slate-50 rounded-xl p-3 border border-slate-200/50">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center text-[10px] font-extrabold text-slate-700 mb-2 pb-1 border-b border-dashed border-slate-200 gap-1">
                        <span className="flex items-center gap-1 text-slate-850">
                          <Activity className="w-3.5 h-3.5 text-emerald-650" />
                          <span>سوابق و مأموریت‌های صحرایی تکنسین ({techOrders.length} مورد ارجاعی)</span>
                        </span>
                        <span className="text-blue-700">کل سهم انباشته مهارتی تکنسین: {(t.wallet_balance ?? t.balance ?? 0).toLocaleString('fa-IR')} تومان</span>
                      </div>
                      
                      {techOrders.length === 0 ? (
                        <p className="text-[9.5px] text-slate-400 font-medium">تاکنون مأموریتی از جانب پلتفرم به این تکنسین واگذار نگردیده است.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                          {techOrders.map(order => (
                            <div key={order.id} className="flex justify-between items-start text-[9.5px] bg-white p-2 rounded-xl border border-slate-100 hover:border-slate-200 transition-all gap-2">
                              <div className="space-y-0.5">
                                <div className="font-bold text-slate-800">
                                  سفارش {order.customerName} <span className="font-mono text-slate-400 text-[8px]">({order.id})</span>
                                </div>
                                <div className="text-slate-500 font-semibold text-[8px]">
                                  برند: {order.brand} - کد عیب: {order.errorCode}
                                </div>
                                <div className="text-slate-400 text-[8px]">
                                  موقعیّت: {order.city}، {order.region}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                <span className="text-slate-500 font-bold font-mono text-[8.5px]">{order.date}</span>
                                <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold ${
                                  order.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' :
                                  order.status === 'cancelled' ? 'bg-rose-50 text-rose-700 border border-rose-150' :
                                  'bg-amber-50 text-amber-700 border border-amber-150'
                                }`}>
                                  {order.status === 'completed' ? 'تکمیل شده' :
                                   order.status === 'cancelled' ? 'لغو شده' :
                                   order.status === 'repairing' ? 'درحال تعمیر' :
                                   order.status === 'enroute' ? 'در مسیر' :
                                   order.status === 'accepted' ? 'پذیرفته شده' : 'معلق'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>

          {/* Edit Technician Profile Modal */}
          {editingTechId && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100 text-right">
              <div className="bg-slate-900 text-slate-100 rounded-3xl p-5 border border-slate-800 shadow-2xl max-w-2xl w-full space-y-4">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <button 
                    onClick={() => setEditingTechId(null)}
                    className="text-slate-400 hover:text-white text-xs font-bold bg-slate-800 px-3 py-1.5 rounded-xl cursor-pointer"
                  >
                    انصراف
                  </button>
                  <h4 className="text-xs font-extrabold text-white">ویرایش پرونده پرسنلی و ارزیابی تکنسین</h4>
                </div>

                <form onSubmit={handleEditTechSubmit} className="space-y-4 text-xs font-bold">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 text-[10.5px] font-bold mb-1">نام و نام خانوادگی تکنسین *</label>
                      <input
                        type="text"
                        required
                        value={editTechName}
                        onChange={(e) => setEditTechName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-blue-500 outline-none text-right"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 text-[10.5px] font-bold mb-1">تلفن همراه تکنسین *</label>
                      <input
                        type="text"
                        required
                        value={editTechPhone}
                        onChange={(e) => setEditTechPhone(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-blue-500 outline-none text-left font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 text-[10.5px] font-bold mb-1">رمز عبور ورود به پنل تکنسین *</label>
                      <input
                        type="text"
                        required
                        value={editTechPassword}
                        onChange={(e) => setEditTechPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-blue-500 outline-none text-left font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 text-[10.5px] font-bold mb-1">محدوده سرویس‌دهی تکنسین *</label>
                      <input
                        type="text"
                        required
                        value={editTechLocation}
                        onChange={(e) => setEditTechLocation(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-blue-500 outline-none text-right"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 text-[10.5px] font-bold mb-1">تخصص‌های مهارتی (با کاما جدا کنید) *</label>
                      <input
                        type="text"
                        required
                        value={(Array.isArray(editTechSpecialties) ? editTechSpecialties : []).join('، ')}
                        onChange={(e) => {
                          const arr = e.target.value.split('،').map(x => x.trim()).filter(Boolean);
                          setEditTechSpecialties(arr);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-blue-500 outline-none text-right"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 text-[10.5px] font-bold mb-1">بارگذاری عکس جدید پرسنلی</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleTechAvatarUpload(e, true)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white file:bg-slate-850 file:text-white file:border-none file:px-2 file:py-1 file:rounded file:cursor-pointer cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-1">
                      <label className="block text-slate-300 text-[10.5px] font-bold mb-1">امتیاز ارزیابی (Rating - از ۵.0)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="1.0"
                        max="5.0"
                        value={editTechRating}
                        onChange={(e) => setEditTechRating(parseFloat(e.target.value) || 5.0)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white text-center font-mono focus:border-blue-500 outline-none"
                      />
                    </div>

                    <div className="sm:col-span-1">
                      <label className="block text-slate-300 text-[10.5px] font-bold mb-1">میزان رضایت ارزیابی (از ۱۰۰٪)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editTechSatisfactionRate}
                        onChange={(e) => setEditTechSatisfactionRate(parseInt(e.target.value) || 98)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white text-center font-mono focus:border-blue-500 outline-none"
                      />
                    </div>

                    <div className="sm:col-span-1 flex flex-col justify-end">
                      {editTechAvatar && (
                        <div className="flex items-center gap-2 bg-slate-950/40 p-1.5 rounded-xl border border-slate-800">
                          <img src={editTechAvatar} className="w-8 h-8 rounded-full object-cover" alt="پیش نمایش" />
                          <span className="text-[10px] text-slate-400">عکس لود شده</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6 py-2.5 text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95"
                    >
                      ثبت و اعمال فوری تغییرات پرونده
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'stocks' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          
          {/* Header Action Control Bar */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-right">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">مدیریت بورس قطعات و انبار کالا (فروشگاه همکاران)</h3>
              <p className="text-[11px] text-slate-400 mt-1">امکان تعریف انواع قطعه یدکی، موجودی‌گیری، ارزش‌گذاری مالی و حذف محصولات ثبت‌شده از پایگاه داده فدرال</p>
            </div>
            
            <button
              onClick={() => setIsAddPartOpen(!isAddPartOpen)}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-2.5 text-xs font-bold shadow-md cursor-pointer flex items-center gap-2 transition-all self-stretch sm:self-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              <span>{isAddPartOpen ? 'انصراف' : 'افزودن محصول جدید'}</span>
            </button>
          </div>

          {/* Collapsible Add New Product Form */}
          {isAddPartOpen && (
            <div className="bg-slate-900 text-slate-100 rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-xl space-y-4 text-right animate-in slide-in-from-top duration-200">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono tracking-wider text-blue-400 font-extrabold">NEW SPARE PART REGISTERED SYSTEM</span>
                <h4 className="text-xs font-extrabold text-white">افزودن قطعه جدید به انبار و بورس قطعات یدکی</h4>
              </div>

              <form onSubmit={handleAddNewPart} className="space-y-4 text-xs font-bold text-slate-350">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-350 text-[10px] font-extrabold mb-1">نام قطعه یدکی *</label>
                    <input
                      type="text"
                      required
                      value={newPartName}
                      onChange={(e) => setNewPartName(e.target.value)}
                      placeholder="مانند: پمپ هیدرو کلیک پکیج دیواری"
                      className="w-full bg-white border border-slate-300 text-slate-900 placeholder-slate-400 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none text-right focus:border-blue-500 transition-all font-sans"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <button
                        type="button"
                        onClick={() => {
                          setPartCategoryMode(partCategoryMode === 'select' ? 'custom' : 'select');
                        }}
                        className="text-[9.5px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 transition-colors"
                      >
                        {partCategoryMode === 'select' ? '➕ تایپ دسته‌بندی جدید' : '📋 انتخاب از لیست دسته‌بندی‌ها'}
                      </button>
                      <label className="block text-slate-350 text-[10px] font-extrabold">دسته‌بندی دستگاه (device_category) *</label>
                    </div>
                    {partCategoryMode === 'select' ? (
                      <select
                        required
                        value={newPartCategory}
                        onChange={(e) => {
                          if (e.target.value === '__custom__') {
                            setPartCategoryMode('custom');
                            setNewPartCategory('');
                          } else {
                            setNewPartCategory(e.target.value);
                          }
                        }}
                        className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none text-right focus:border-blue-500 transition-all font-sans cursor-pointer"
                      >
                        <option value="">انتخاب دسته‌بندی...</option>
                        {categoriesList.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                        <option value="__custom__" className="text-blue-600 font-extrabold">➕ تایپ دسته‌بندی جدید (مانند آبگرمکن)...</option>
                      </select>
                    ) : (
                      <div className="relative">
                        <input
                          type="text"
                          required
                          list="device-categories-list"
                          value={newPartCategory}
                          onChange={(e) => setNewPartCategory(e.target.value)}
                          placeholder="مانند: آبگرمکن، پکیج دیواری، کولر گازی..."
                          className="w-full bg-white border border-blue-400 ring-2 ring-blue-500/20 text-slate-900 placeholder-slate-400 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none text-right focus:border-blue-600 transition-all font-sans"
                          autoFocus
                        />
                        <datalist id="device-categories-list">
                          {categoriesList.map((cat) => (
                            <option key={cat} value={cat} />
                          ))}
                          <option value="آبگرمکن" />
                          <option value="پکیج دیواری" />
                          <option value="کولر گازی" />
                          <option value="ماشین لباسشویی" />
                          <option value="یخچال و فریزر" />
                          <option value="ماشین ظرفشویی" />
                        </datalist>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-350 text-[10px] font-extrabold mb-1">مدل دستگاه (model)</label>
                    <input
                      type="text"
                      value={newPartModel}
                      onChange={(e) => setNewPartModel(e.target.value)}
                      placeholder="مانند: ورونا، پرلا ۲۴، کالدا ونزیا"
                      className="w-full bg-white border border-slate-300 text-slate-900 placeholder-slate-400 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none text-right focus:border-blue-500 transition-all font-sans"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-350 text-[10px] font-extrabold mb-1">قیمت کالا (تومان) *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={newPartPrice}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setNewPartPrice('');
                          setNewPartPriceError('وارد کردن قیمت کالا الزامی است.');
                        } else {
                          const num = Number(val);
                          setNewPartPrice(num);
                          if (num < 0) {
                            setNewPartPriceError('قیمت کالا نمی‌تواند منفی باشد.');
                          } else {
                            setNewPartPriceError('');
                          }
                        }
                      }}
                      placeholder="مانند: ۵۵۰۰۰۰"
                      className="w-full bg-white border border-slate-300 text-slate-900 placeholder-slate-400 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none text-center focus:border-blue-500 transition-all font-mono"
                    />
                    {newPartPriceError && (
                      <p className="text-red-400 text-[10px] mt-1 text-right font-medium">{newPartPriceError}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-350 text-[10px] font-extrabold mb-1">موجودی اولیه در انبار *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={newPartStock}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setNewPartStock('');
                          setNewPartStockError('وارد کردن موجودی اولیه الزامی است.');
                        } else {
                          const num = Number(val);
                          setNewPartStock(num);
                          if (num < 0) {
                            setNewPartStockError('موجودی انبار نمی‌تواند منفی باشد.');
                          } else {
                            setNewPartStockError('');
                          }
                        }
                      }}
                      placeholder="مثال: ۱۵"
                      className="w-full bg-white border border-slate-300 text-slate-900 placeholder-slate-400 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none text-center focus:border-blue-500 transition-all font-mono"
                    />
                    {newPartStockError && (
                      <p className="text-red-400 text-[10px] mt-1 text-right font-medium">{newPartStockError}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-350 text-[10px] font-extrabold mb-1">آدرس آیکون یا تصویر کالا (اختیاری)</label>
                    <input
                      type="url"
                      value={newPartImage}
                      onChange={(e) => {
                        setNewPartImage(e.target.value);
                        if (e.target.value.trim()) {
                          const check = validateUrl(e.target.value);
                          setNewPartImageError(check.isValid ? '' : (check.error || ''));
                        } else {
                          setNewPartImageError('');
                        }
                      }}
                      placeholder="لینک تصویر مستقیم یا رها کنید تا خودکار قرار گیرد"
                      className="w-full bg-white border border-slate-300 text-slate-900 placeholder-slate-400 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none text-left focus:border-blue-500 transition-all font-mono"
                    />
                    {newPartImageError && (
                      <p className="text-red-400 text-[10px] mt-1 text-right font-medium">{newPartImageError}</p>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-400 text-[10px]">روی برندها کلیک کنید، در کادر بنویسید، یا برند جدید اضافه کنید</span>
                    <label className="block text-slate-350 text-[10px] font-extrabold">برندهای سازگار (compatible_brands)</label>
                  </div>
                  <input
                    type="text"
                    value={newPartCompatibleBrands}
                    onChange={(e) => setNewPartCompatibleBrands(e.target.value)}
                    placeholder="مانند: بوتان، ایران رادیاتور، پلار، لورچ"
                    className="w-full bg-white border border-slate-300 text-slate-900 placeholder-slate-400 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none text-right focus:border-blue-500 transition-all font-sans mb-2"
                  />
                  
                  {/* Quick Add Custom Brand */}
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={newQuickBrandInput}
                      onChange={(e) => setNewQuickBrandInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const br = newQuickBrandInput.trim();
                          if (br) {
                            const currentSelected = newPartCompatibleBrands.split(/[،,]/).map(s => s.trim()).filter(Boolean);
                            if (!currentSelected.includes(br)) {
                              const updated = [...currentSelected, br];
                              setNewPartCompatibleBrands(updated.join('، '));
                              setNewPartBrands(updated);
                            }
                            if (!brandsList.includes(br) && onUpdateBrandsList) {
                              onUpdateBrandsList([...brandsList, br]);
                            }
                            setNewQuickBrandInput('');
                          }
                        }
                      }}
                      placeholder="افزودن برند جدید (مانند: بوتان، پلار، لورچ)..."
                      className="bg-slate-800 border border-slate-700 text-white placeholder-slate-400 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none text-right flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const br = newQuickBrandInput.trim();
                        if (br) {
                          const currentSelected = newPartCompatibleBrands.split(/[،,]/).map(s => s.trim()).filter(Boolean);
                          if (!currentSelected.includes(br)) {
                            const updated = [...currentSelected, br];
                            setNewPartCompatibleBrands(updated.join('، '));
                            setNewPartBrands(updated);
                          }
                          if (!brandsList.includes(br) && onUpdateBrandsList) {
                            onUpdateBrandsList([...brandsList, br]);
                          }
                          setNewQuickBrandInput('');
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3.5 py-1.5 text-xs font-bold cursor-pointer transition-all shrink-0"
                    >
                      + افزودن برند
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 bg-slate-950 p-2.5 rounded-xl border border-slate-800 max-h-36 overflow-y-auto">
                    {brandsList.map((brand) => {
                      const currentSelected = newPartCompatibleBrands.split(/[،,]/).map(s => s.trim()).filter(Boolean);
                      const isSelected = currentSelected.includes(brand);
                      return (
                        <button
                          key={brand}
                          type="button"
                          onClick={() => {
                            let updated: string[];
                            if (isSelected) {
                              updated = currentSelected.filter(b => b !== brand);
                            } else {
                              updated = [...currentSelected, brand];
                            }
                            setNewPartCompatibleBrands(updated.join('، '));
                            setNewPartBrands(updated);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white border border-blue-500 shadow-xs'
                              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white hover:border-slate-600'
                          }`}
                        >
                          {brand}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-350 text-[10px] font-extrabold mb-1">توضیحات کوتاه فنی (short_description)</label>
                  <textarea
                    rows={2}
                    value={newPartDescription}
                    onChange={(e) => setNewPartDescription(e.target.value)}
                    placeholder="مانند: ساخت ایتالیا، ۳ سرعته، سیم‌پیچ ۱۰۰٪ مسی با ضمانت اصالت..."
                    className="w-full bg-white border border-slate-300 text-slate-900 placeholder-slate-400 rounded-xl p-3 text-xs font-bold outline-none text-right focus:border-blue-500 transition-all font-sans"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-800">
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-8 py-2.5 text-xs font-extrabold shadow-md active:scale-95 cursor-pointer transition-all"
                  >
                    ثبت نهایی محصول در بورس انبار
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddPartOpen(false)}
                    className="bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl px-5 py-2.5 text-xs font-extrabold cursor-pointer transition-all"
                  >
                    انصراف
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Edit Full Spare Part Modal */}
          {editingFullPart && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 text-right animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-blue-600 font-extrabold">EDIT SPARE PART</span>
                  <h4 className="text-sm font-extrabold text-slate-900">ویرایش اطلاعات قطعه یدکی</h4>
                </div>

                <form onSubmit={handleSaveFullPartChanges} className="space-y-4 text-xs font-bold text-slate-700">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 text-[10px] font-extrabold mb-1">نام قطعه یدکی *</label>
                      <input
                        type="text"
                        required
                        value={editPartName}
                        onChange={(e) => setEditPartName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-250 text-slate-900 rounded-xl px-3 py-2 text-xs font-bold outline-none text-right focus:border-blue-500 focus:bg-white transition-all font-sans"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditPartCategoryMode(editPartCategoryMode === 'select' ? 'custom' : 'select');
                          }}
                          className="text-[9.5px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 transition-colors"
                        >
                          {editPartCategoryMode === 'select' ? '➕ تایپ دسته‌بندی جدید' : '📋 انتخاب از لیست'}
                        </button>
                        <label className="block text-slate-600 text-[10px] font-extrabold">دسته‌بندی دستگاه (device_category) *</label>
                      </div>
                      {editPartCategoryMode === 'select' ? (
                        <select
                          required
                          value={editPartCategory}
                          onChange={(e) => {
                            if (e.target.value === '__custom__') {
                              setEditPartCategoryMode('custom');
                              setEditPartCategory('');
                            } else {
                              setEditPartCategory(e.target.value);
                            }
                          }}
                          className="w-full bg-slate-50 border border-slate-250 text-slate-900 rounded-xl px-3 py-2 text-xs font-bold outline-none text-right focus:border-blue-500 focus:bg-white transition-all font-sans cursor-pointer"
                        >
                          <option value="">انتخاب دسته‌بندی...</option>
                          {categoriesList.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                          <option value="__custom__" className="text-blue-600 font-extrabold">➕ تایپ دسته‌بندی جدید (مانند آبگرمکن)...</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          required
                          list="edit-device-categories-list"
                          value={editPartCategory}
                          onChange={(e) => setEditPartCategory(e.target.value)}
                          placeholder="مانند: آبگرمکن، پکیج دیواری، کولر گازی..."
                          className="w-full bg-slate-50 border border-blue-400 ring-2 ring-blue-500/20 text-slate-900 rounded-xl px-3 py-2 text-xs font-bold outline-none text-right focus:border-blue-600 focus:bg-white transition-all font-sans"
                          autoFocus
                        />
                      )}
                      <datalist id="edit-device-categories-list">
                        {categoriesList.map((cat) => (
                          <option key={cat} value={cat} />
                        ))}
                        <option value="آبگرمکن" />
                        <option value="پکیج دیواری" />
                        <option value="کولر گازی" />
                        <option value="ماشین لباسشویی" />
                        <option value="یخچال و فریزر" />
                        <option value="ماشین ظرفشویی" />
                      </datalist>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 text-[10px] font-extrabold mb-1">مدل دستگاه (model)</label>
                      <input
                        type="text"
                        value={editPartModel}
                        onChange={(e) => setEditPartModel(e.target.value)}
                        placeholder="مانند: ورونا، پرلا ۲۴..."
                        className="w-full bg-slate-50 border border-slate-250 text-slate-900 rounded-xl px-3 py-2 text-xs font-bold outline-none text-right focus:border-blue-500 focus:bg-white transition-all font-sans"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 text-[10px] font-extrabold mb-1">برندهای سازگار (compatible_brands)</label>
                      <input
                        type="text"
                        value={editPartCompatibleBrands}
                        onChange={(e) => setEditPartCompatibleBrands(e.target.value)}
                        placeholder="مانند: بوتان، ایران رادیاتور"
                        className="w-full bg-slate-50 border border-slate-250 text-slate-900 rounded-xl px-3 py-2 text-xs font-bold outline-none text-right focus:border-blue-500 focus:bg-white transition-all font-sans"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-600 text-[10px] font-extrabold mb-1">قیمت کالا (تومان) *</label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={editPartPrice}
                        onChange={(e) => setEditPartPrice(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-250 text-slate-900 rounded-xl px-3 py-2 text-xs font-bold outline-none text-center focus:border-blue-500 focus:bg-white transition-all font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 text-[10px] font-extrabold mb-1">موجودی انبار *</label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={editPartStock}
                        onChange={(e) => setEditPartStock(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-250 text-slate-900 rounded-xl px-3 py-2 text-xs font-bold outline-none text-center focus:border-blue-500 focus:bg-white transition-all font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 text-[10px] font-extrabold mb-1">آدرس تصویر کالا</label>
                      <input
                        type="url"
                        value={editPartImage}
                        onChange={(e) => setEditPartImage(e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-slate-50 border border-slate-250 text-slate-900 rounded-xl px-3 py-2 text-xs font-medium outline-none text-left focus:border-blue-500 focus:bg-white transition-all font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 text-[10px] font-extrabold mb-1">توضیحات کوتاه فنی (short_description)</label>
                    <textarea
                      rows={3}
                      value={editPartDescription}
                      onChange={(e) => setEditPartDescription(e.target.value)}
                      placeholder="ساخت ایتالیا، ۳ سرعته، سیم‌پیچ ۱۰۰٪ مسی..."
                      className="w-full bg-slate-50 border border-slate-250 text-slate-900 rounded-xl p-3 text-xs font-medium outline-none text-right focus:border-blue-500 focus:bg-white transition-all font-sans"
                    />
                  </div>

                  <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                    <button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6 py-2.5 text-xs font-extrabold shadow-md cursor-pointer transition-all active:scale-95"
                    >
                      ذخیره تغییرات قطعه
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingFullPart(null)}
                      className="bg-slate-150 hover:bg-slate-200 text-slate-700 rounded-xl px-5 py-2.5 text-xs font-extrabold cursor-pointer transition-all"
                    >
                      انصراف
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* List of Products / Spare Parts */}
          <div className="bg-white rounded-3xl border border-slate-205 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-right">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-slate-800">
                  📦 لیست کل قطعات یدکی جاری انبار مرکزی ({spareParts.length} کالا)
                </span>
                {filteredSpareParts.length !== spareParts.length && (
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full font-bold">
                    نتیجه جستجو: {filteredSpareParts.length} کالا
                  </span>
                )}
              </div>

              <div className="relative sm:w-72">
                <input
                  type="text"
                  value={sparePartsSearchVal}
                  onChange={(e) => setSparePartsSearchVal(e.target.value)}
                  placeholder="جستجوی فوری در انبار (نام کالا، دسته‌بندی، سازگاری)..."
                  className="w-full bg-white border border-slate-200 text-[10.5px] pr-8 pl-3 py-1.5 rounded-xl text-right font-medium outline-none focus:border-blue-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {spareParts.length === 0 ? (
              <div className="p-10 text-center text-slate-450 text-xs font-bold space-y-2">
                <p>هیچ قطعه یا محصولی در بورس قطعات تعریف نشده است.</p>
                <p className="text-[10px] text-slate-400 font-normal">جهت ایجاد قطعه از دکمه «افزودن محصول جدید» کمک بگیرید.</p>
              </div>
            ) : filteredSpareParts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-bold space-y-2">
                <p>هیچ قطعه‌ای در انبار با عبارت «{sparePartsSearchVal}» یافت نشد.</p>
                <button
                  type="button"
                  onClick={() => setSparePartsSearchVal('')}
                  className="text-[10px] text-blue-600 underline font-bold cursor-pointer"
                >
                  نمایش مجدد تمام قطعات انبار
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 p-5 bg-slate-50">
                {filteredSpareParts.map((p) => {
                  const compStr = p.compatible_brands || (Array.isArray(p.compatibility) ? p.compatibility.join('، ') : (p.brand || ''));
                  const shortDesc = p.short_description || p.description || p.technical_description || '';
                  const devCat = p.device_category || p.category || 'عمومی';
                  const modelName = p.model || p.device_model || '';

                  return (
                    <div key={p.id} className="bg-white border border-slate-200 hover:border-slate-300 rounded-3xl p-5 flex flex-col justify-between gap-4 text-right shadow-3xs transition-all duration-150">
                      <div className="flex items-start gap-3">
                        <img
                          src={p.image || p.image_url || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23f1f5f9'/><text x='50' y='55' font-size='28' text-anchor='middle'>⚙️</text></svg>"}
                          alt={p.name}
                          className="w-14 h-14 rounded-2xl object-cover bg-slate-50 border border-slate-100 flex-shrink-0 mt-0.5"
                        />
                        <div className="space-y-1 w-full">
                          <h4 className="font-extrabold text-slate-900 text-xs">{p.name || p.title}</h4>
                          <div className="text-[10px] text-slate-500 flex flex-wrap gap-x-2 gap-y-0.5 font-medium">
                            <span>دسته‌بندی: <strong className="text-slate-700">{devCat}</strong></span>
                            {modelName && <span>| مدل: <strong className="text-slate-700">{modelName}</strong></span>}
                          </div>
                          {compStr && (
                            <p className="text-[9.5px] text-blue-600 font-bold">
                              سازگار با: <span className="text-slate-700 font-normal">{compStr}</span>
                            </p>
                          )}
                          {shortDesc && (
                            <p className="text-slate-500 text-[9.5px] font-normal leading-relaxed text-right line-clamp-2 mt-1">
                              {shortDesc}
                            </p>
                          )}
                          <div className="flex items-center gap-3 pt-1.5 text-[10px]">
                            <span className="text-slate-600 font-bold">قیمت: <strong className="text-emerald-700 font-mono font-extrabold">{p.price.toLocaleString('fa-IR')}</strong> ت</span>
                            <span className="text-slate-300">|</span>
                            <span className={p.stock > 5 ? 'text-emerald-600 font-extrabold' : 'text-rose-500 font-bold'}>موجودی: {p.stock} عدد</span>
                          </div>
                        </div>
                      </div>

                      {editingPartId === p.id ? (
                        <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-start">
                          <div className="flex gap-2 text-right">
                            <div className="w-24">
                              <label className="text-[9px] text-slate-400 block mb-0.5 font-bold">قیمت (تومان)</label>
                              <input
                                type="number"
                                value={tempPrice}
                                onChange={(e) => setTempPrice(Number(e.target.value))}
                                className="bg-white border border-slate-250 p-1 rounded-lg text-xs w-full font-mono text-center"
                              />
                            </div>
                            <div className="w-16">
                              <label className="text-[9px] text-slate-400 block mb-0.5 font-bold">موجودی</label>
                              <input
                                type="number"
                                value={tempStock}
                                onChange={(e) => setTempStock(Number(e.target.value))}
                                className="bg-white border border-slate-250 p-1 rounded-lg text-xs w-full font-mono text-center"
                              />
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => handleSavePartChanges(p.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded p-1.5 text-xs font-bold cursor-pointer transition-all"
                              title="ذخیره تغییرات مستقیم"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => setEditingPartId(null)}
                              className="bg-slate-300 text-slate-600 rounded p-1.5 text-xs cursor-pointer transition-all"
                              title="انصراف"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end border-t border-slate-100 pt-3">
                          <button
                            id={`edit-full-${p.id}`}
                            onClick={() => handleOpenEditFullPart(p)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10.5px] font-extrabold py-1.5 px-3 rounded-xl border border-blue-200 transition-all cursor-pointer"
                          >
                            ویرایش قطعه
                          </button>
                          <button
                            id={`edit-stock-${p.id}`}
                            onClick={() => handleStartEditPart(p)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10.5px] font-extrabold py-1.5 px-3 rounded-xl border border-slate-200 transition-all cursor-pointer"
                          >
                            قیمت و انبار
                          </button>
                          <button
                            onClick={() => handleDeletePart(p.id)}
                            className="p-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100 hover:text-rose-700 transition-all cursor-pointer"
                            title="حذف قطعه از پایگاه داده فروشگاه"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'purchases' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-150 rounded-2xl p-4 text-xs text-teal-950 leading-relaxed flex items-start gap-2.5">
            <ShoppingBag className="w-5.5 h-5.5 text-teal-600 flex-shrink-0 mt-0.5 animate-bounce" />
            <div className="space-y-1 text-right">
              <h4 className="font-extrabold text-[13px] text-teal-900">سوابق خرید آنلاین قطعات یدکی توسط مشتریان (دیتابیس سراسری)</h4>
              <p>در این بخش کلیه تراکنش‌ها و سفارشات مستقیم قطعات یدکی ثبت شده توسط مشتریان در دیتابیس برای استفاده‌های بعدی بایگانی شده است. شما به عنوان مدیر کل می‌توانید سوابق خرید را با توجه به نام مشتری، شماره تلفن، یا نام قطعه جستجو کرده و وضعیت مرسوله‌ها را به «ارسال شده» یا «تحویل شده» تغییر دهید.</p>
            </div>
          </div>

          {/* Quick Metrics for purchases */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 text-right shadow-xs">
              <span className="text-[10px] text-slate-500 font-bold block mb-1">تعداد کل سفارشات تایید شده</span>
              <span className="font-black text-xl text-slate-900 font-sans">{approvedPurchases.length}</span>
              <span className="text-[10px] text-teal-600 block mt-1">سفارشات قطعات تایید شده توسط مدیر</span>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 text-right shadow-xs">
              <span className="text-[10px] text-slate-500 font-bold block mb-1">مجموع مبالغ قطعات تایید شده</span>
              <span className="font-black text-xl text-emerald-600 font-sans">
                {approvedPurchases.reduce((sum, p) => sum + (p.price || 0), 0).toLocaleString('fa-IR')} <span className="text-xs font-bold text-slate-500">تومان</span>
              </span>
              <span className="text-[10px] text-slate-400 block mt-1">مبالغ تایید و واریز شده</span>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 text-right shadow-xs">
              <span className="text-[10px] text-slate-500 font-bold block mb-1">در حال آماده‌سازی و ارسال</span>
              <span className="font-black text-xl text-amber-500 font-sans">
                {approvedPurchases.filter(p => p.status === 'confirmed').length}
              </span>
              <span className="text-[10px] text-amber-600 block mt-1">مرسوله‌های تایید شده آماده صدور کد رهگیری</span>
            </div>
          </div>

          {/* Filter & Live Search Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4 shadow-xs">
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 جستجو بر اساس نام مـشتری، شماره همراه، کدرهگیری خرید، یا نام قطعه..."
                className="w-full bg-slate-50 text-right text-xs rounded-xl p-3.5 pr-10 border border-slate-200 outline-none focus:border-blue-500 focus:bg-white text-slate-800 font-bold transition-all"
                value={purchaseSearch}
                onChange={(e) => setPurchaseSearch(e.target.value)}
              />
              <span className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-slate-400 text-xs">
                🔍
              </span>
            </div>

            {/* Purchases List view */}
            {filteredPurchases.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-bold">هیچ سابقه خریدی مطابق با جستجوی شما یافت نشد.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-150">
                <table className="w-full text-right text-xs border-collapse" dir="rtl">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-slate-600 font-extrabold">
                      <th className="p-3.5 text-right font-black">کد سفارش</th>
                      <th className="p-3.5 text-right font-black">تاریخ ثبت</th>
                      <th className="p-3.5 text-right font-black">مشخصات خریدار (نقش)</th>
                      <th className="p-3.5 text-right font-black">قطعه خریداری شده</th>
                      <th className="p-3.5 text-right font-black">مبلغ پرداختی</th>
                      <th className="p-3.5 text-right font-black">آدرس ارسال مرسوله</th>
                      <th className="p-3.5 text-right font-black">کد رهگیری پستی</th>
                      <th className="p-3.5 text-right font-black">وضعیت ارسال</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredPurchases.map((purchase, pIdx) => {
                      const isTech = purchase.customerRole === 'technician' || technicians.some(t => t.phone === purchase.customerPhone);
                      return (
                        <tr key={`purchase_${purchase.id}_${pIdx}`} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5 font-bold text-slate-900 font-mono tracking-wider">
                            {purchase.id}
                          </td>
                          <td className="p-3.5 text-slate-600 font-sans">
                            {purchase.date}
                          </td>
                          <td className="p-3.5">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-800 text-[11.5px]">{purchase.customerName}</span>
                                <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold ${
                                  isTech ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {isTech ? 'تکنسین' : 'مشتری'}
                                </span>
                              </div>
                              <span className="font-mono text-slate-500 text-[10.5px] block">{purchase.customerPhone}</span>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-900 block">{purchase.partName}</span>
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md inline-block font-bold">
                                {purchase.partCategory}
                              </span>
                            </div>
                          </td>
                          <td className="p-3.5 font-extrabold text-blue-600 font-sans">
                            {(purchase.price || 0).toLocaleString('fa-IR')} تومان
                          </td>
                          <td className="p-3.5 text-slate-600 leading-relaxed text-[10.5px] max-w-xs truncate" title={purchase.customerAddress}>
                            {purchase.customerAddress}
                          </td>
                          <td className="p-3.5">
                            <div className="space-y-1">
                              <span className="font-mono text-[11px] font-bold text-indigo-700 block select-all">
                                {purchase.postalTrackingCode || purchase.trackNumber || 'ثبت نشده'}
                              </span>
                              <button
                                onClick={() => {
                                  setPostalTrackModalItem(purchase);
                                  setPostalTrackInput(purchase.postalTrackingCode || purchase.trackNumber || '');
                                }}
                                className="text-[9.5px] font-bold text-indigo-600 hover:text-indigo-800 underline bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md transition-all cursor-pointer"
                              >
                                ✏️ ثبت / ویرایش کد پستی
                              </button>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <select
                              value={purchase.status}
                              onChange={async (e) => {
                                const newStatus = e.target.value as 'pending' | 'pending_payment' | 'confirmed' | 'shipped' | 'delivered' | 'rejected';
                                if ((newStatus === 'shipped' || newStatus === 'delivered') && (purchase.status === 'pending' || purchase.status === 'pending_payment')) {
                                  const targetPart = spareParts.find(sp => sp.id === purchase.partId);
                                  if (targetPart && targetPart.stock > 0 && onUpdatePartStock) {
                                    onUpdatePartStock(targetPart.id, Math.max(0, targetPart.stock - 1), targetPart.price);
                                  }
                                }
                                const updated = partPurchases.map(p => p.id === purchase.id ? { ...p, status: newStatus } : p);
                                if (onUpdatePartPurchases) {
                                  onUpdatePartPurchases(updated);
                                }
                                try {
                                  const token = localStorage.getItem('session_user_id') || '';
                                  await fetch('/api/part-orders/update-status', {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'X-Session-Token': token
                                    },
                                    body: JSON.stringify({ orderId: purchase.id, status: newStatus })
                                  });
                                } catch (err) {
                                  console.warn('Update order status error:', err);
                                }
                              }}
                              className={`p-1.5 text-[10px] font-black rounded-lg border outline-none cursor-pointer transition-all ${
                                purchase.status === 'delivered' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                                purchase.status === 'shipped' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                purchase.status === 'confirmed' ? 'bg-teal-50 border-teal-200 text-teal-700' :
                                purchase.status === 'rejected' ? 'bg-rose-50 border-rose-200 text-rose-700' :
                                'bg-amber-50 border-amber-200 text-amber-700'
                              }`}
                            >
                              <option value="pending">⏳ در انتظار تایید و بررسی مدیر</option>
                              <option value="confirmed">📦 تایید شده - آماده ارسال</option>
                              <option value="shipped">🚚 ارسال شده به پست</option>
                              <option value="delivered">✅ تحویل داده شده</option>
                              <option value="rejected">❌ رد شده توسط مدیر</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm text-right">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 font-sans">مدیریت کل کاربران سیستم</h3>
                <p className="text-[11px] text-slate-500 mt-1">لیست کامل کلیه کاربران ثبت‌نامی اعم از تکنسین‌ها و مشتریان</p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
                <div className="flex bg-slate-100 p-1 rounded-xl text-[11px] font-bold self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setUserRoleFilter('all')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${userRoleFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    همه ({allCombinedUsers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserRoleFilter('client')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${userRoleFilter === 'client' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    مشتریان ({allCombinedUsers.filter(u => u.role !== 'technician' && u.role !== 'admin').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserRoleFilter('technician')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${userRoleFilter === 'technician' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    تکنسین‌ها ({allCombinedUsers.filter(u => u.role === 'technician').length})
                  </button>
                </div>
                <div className="w-full sm:w-64 relative">
                  <input
                    type="text"
                    placeholder="جستجو نام، شماره یا شهر..."
                    value={userSearchVal}
                    onChange={(e) => setUserSearchVal(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2 rounded-xl outline-none focus:bg-white focus:border-blue-500 font-bold transition-all text-right"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            {allCombinedUsers.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                کاربری در دیتابیس ثبت نشده است.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-150 text-slate-700 bg-slate-50/50">
                      <th className="py-3 px-4 font-extrabold">ردیف</th>
                      <th className="py-3 px-4 font-extrabold">نام کامل</th>
                      <th className="py-3 px-4 font-extrabold">شماره همراه</th>
                      <th className="py-3 px-4 font-extrabold">شهر</th>
                      <th className="py-3 px-4 font-extrabold">نوع کاربر</th>
                      <th className="py-3 px-4 font-extrabold">تاریخ عضویت</th>
                      <th className="py-3 px-4 font-extrabold text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allCombinedUsers
                      .filter((u: any) => {
                        if (userRoleFilter === 'client') return u.role !== 'technician' && u.role !== 'admin';
                        if (userRoleFilter === 'technician') return u.role === 'technician';
                        return true;
                      })
                      .filter((u: any) => {
                        const q = userSearchVal.toLowerCase().trim();
                        if (!q) return true;
                        return (
                          (u.full_name || '').toLowerCase().includes(q) ||
                          (u.phone || '').includes(q) ||
                          (u.city || '').toLowerCase().includes(q)
                        );
                      })
                      .map((u: any, uIdx: number) => {
                        return (
                          <tr key={`user_${u.id}_${uIdx}`} className="hover:bg-slate-50/40 transition-colors">
                            <td className="py-3 px-4 font-mono text-slate-500">{uIdx + 1}</td>
                            <td className="py-3 px-4 font-bold text-slate-800">{u.full_name || 'کاربر گرامی'}</td>
                            <td className="py-3 px-4 font-mono font-bold text-slate-700">{u.phone}</td>
                            <td className="py-3 px-4 font-bold text-slate-600">{u.city || 'ثبت نشده'}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                                u.role === 'admin' || u.is_super_admin
                                  ? 'bg-red-50 text-red-600 border border-red-100'
                                  : u.role === 'technician'
                                  ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                  : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                              }`}>
                                {u.is_super_admin || u.role === 'admin' ? 'مدیر سیستم' : u.role === 'technician' ? 'تکنسین فنی' : 'مشتری'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-500 font-mono">
                              {u.created_at ? new Date(u.created_at).toLocaleDateString('fa-IR') : 'ثبت‌شده'}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {!(u.is_super_admin || u.role === 'admin' || u.phone === '09120947304') && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUserWithCascade(u)}
                                  className="p-1.5 text-rose-600 hover:text-white hover:bg-rose-600 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1 text-[10px] font-bold border border-rose-200 shadow-2xs active:scale-95"
                                  title="حذف کامل کاربر و تمام سوابق از همه جا"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>حذف کامل</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'subscriptions' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm text-right space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 font-sans">مدیریت اشتراک‌های ویژه</h3>
                <p className="text-[11px] text-slate-500 mt-1">لیست کل اشتراک‌های فعال یا منقضی شده صادر شده برای کاربران و تکنسین‌ها</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setManualSubModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <span>+ افزودن / فعال‌سازی دستی اشتراک</span>
                </button>
                <div className="w-full sm:w-64 relative">
                  <input
                    type="text"
                    placeholder="جستجو بر اساس شناسه یا شماره..."
                    value={subSearchVal}
                    onChange={(e) => setSubSearchVal(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-205 text-xs px-3.5 py-2.5 rounded-xl outline-none focus:bg-white focus:border-blue-500 font-bold transition-all text-right"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            {/* Subscriptions Role and Status Filter Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold">
                <span className="text-slate-500 text-[11px] pl-1">نقش کاربر:</span>
                <button
                  type="button"
                  onClick={() => setSubRoleFilter('all')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    subRoleFilter === 'all' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  همه ({allCombinedUsers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSubRoleFilter('client')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    subRoleFilter === 'client' ? 'bg-blue-600 text-white shadow-xs' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  مشتریان ({allCombinedUsers.filter(u => !u.is_super_admin && u.role !== 'admin' && u.role !== 'technician').length})
                </button>
                <button
                  type="button"
                  onClick={() => setSubRoleFilter('technician')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    subRoleFilter === 'technician' ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  تکنسین‌ها ({allCombinedUsers.filter(u => u.role === 'technician').length})
                </button>
                <button
                  type="button"
                  onClick={() => setSubRoleFilter('admin')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    subRoleFilter === 'admin' ? 'bg-purple-600 text-white shadow-xs' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                  }`}
                >
                  مدیران ({allCombinedUsers.filter(u => u.role === 'admin' || u.is_super_admin).length})
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-bold">
                <span className="text-slate-500 text-[11px] pl-1">وضعیت اشتراک:</span>
                <button
                  type="button"
                  onClick={() => setSubStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-[11px] ${
                    subStatusFilter === 'all' ? 'bg-slate-800 text-white font-extrabold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  کل کاربران
                </button>
                <button
                  type="button"
                  onClick={() => setSubStatusFilter('active')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-[11px] ${
                    subStatusFilter === 'active' ? 'bg-emerald-600 text-white font-extrabold' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  دارای اشتراک فعال
                </button>
                <button
                  type="button"
                  onClick={() => setSubStatusFilter('expired')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-[11px] ${
                    subStatusFilter === 'expired' ? 'bg-rose-600 text-white font-extrabold' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  منقضی شده
                </button>
                <button
                  type="button"
                  onClick={() => setSubStatusFilter('none')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-[11px] ${
                    subStatusFilter === 'none' ? 'bg-slate-600 text-white font-extrabold' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  بدون اشتراک
                </button>
              </div>
            </div>

            {allCombinedUsers.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                کاربری در سیستم ثبت نشده است.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-150 text-slate-700 bg-slate-50/50">
                      <th className="py-3 px-4 font-extrabold">کاربر (شناسه / نام / نقش دیتابیس)</th>
                      <th className="py-3 px-4 font-extrabold">شماره تماس</th>
                      <th className="py-3 px-4 font-extrabold">شناسه اشتراک</th>
                      <th className="py-3 px-4 font-extrabold">پلن اشتراک</th>
                      <th className="py-3 px-4 font-extrabold">تاریخ شروع</th>
                      <th className="py-3 px-4 font-extrabold">تاریخ انقضا</th>
                      <th className="py-3 px-4 font-extrabold">مهلت باقیمانده</th>
                      <th className="py-3 px-4 font-extrabold">وضعیت اشتراک</th>
                      <th className="py-3 px-4 font-extrabold text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allCombinedUsers
                      .filter(user => {
                        // ۱. نقش کاربر مستقیماً از رکورد اصلی users گرفته می‌شود
                        const userRole = (user.role === 'admin' || user.is_super_admin) ? 'admin' : (user.role === 'technician' ? 'technician' : 'client');
                        if (subRoleFilter !== 'all' && userRole !== subRoleFilter) return false;

                        // ۲. پیوند اشتراک بر اساس user_id واقعی
                        const userSubs = subscriptionsList.filter(s => 
                          String(s.user_id) === String(user.id) ||
                          (user.phone && (String(s.user_phone) === String(user.phone) || String(s.phone) === String(user.phone)))
                        );
                        
                        // مرتب‌سازی بر اساس تازه‌ترین اشتراک
                        const latestSub = userSubs.length > 0
                          ? [...userSubs].sort((a, b) => {
                              const da = new Date(a.expiry_date || a.end_date || a.created_at || 0).getTime();
                              const db = new Date(b.expiry_date || b.end_date || b.created_at || 0).getTime();
                              return db - da;
                            })[0]
                          : null;

                        const now = new Date();
                        const rawExp = latestSub ? (latestSub.expiry_date || latestSub.end_date) : null;
                        const expDate = rawExp ? new Date(rawExp) : null;
                        const hasActiveSub = latestSub && latestSub.status === 'active' && expDate && expDate > now;
                        const hasExpiredSub = latestSub && (!hasActiveSub);

                        if (subStatusFilter === 'active' && !hasActiveSub) return false;
                        if (subStatusFilter === 'expired' && !hasExpiredSub) return false;
                        if (subStatusFilter === 'none' && latestSub) return false;

                        const q = subSearchVal.toLowerCase().trim();
                        if (!q) return true;

                        const userName = user.full_name || '';
                        const userPhone = user.phone || '';
                        const userId = String(user.id || '');
                        const subId = latestSub ? String(latestSub.id || '') : '';
                        const planName = latestSub ? String(latestSub.plan_name || latestSub.plan_id || '') : '';

                        return (
                          userId.toLowerCase().includes(q) ||
                          userName.toLowerCase().includes(q) ||
                          userPhone.toLowerCase().includes(q) ||
                          subId.toLowerCase().includes(q) ||
                          planName.toLowerCase().includes(q)
                        );
                      })
                      .map((user: any, uIdx: number) => {
                        // استخراج نقش واقعی از کاربران
                        const userRole = (user.role === 'admin' || user.is_super_admin) ? 'admin' : (user.role === 'technician' ? 'technician' : 'client');
                        const roleLabel = userRole === 'admin' ? 'مدیر سیستم' : (userRole === 'technician' ? 'تکنسین فنی' : 'مشتری');
                        const roleBadgeClass = userRole === 'admin' ? 'bg-purple-100 text-purple-800' : (userRole === 'technician' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800');

                        // استخراج اشتراک مرتبط بر اساس user_id واقعی
                        const userSubs = subscriptionsList.filter(s => 
                          String(s.user_id) === String(user.id) ||
                          (user.phone && (String(s.user_phone) === String(user.phone) || String(s.phone) === String(user.phone)))
                        );
                        const latestSub = userSubs.length > 0
                          ? [...userSubs].sort((a, b) => {
                              const da = new Date(a.expiry_date || a.end_date || a.created_at || 0).getTime();
                              const db = new Date(b.expiry_date || b.end_date || b.created_at || 0).getTime();
                              return db - da;
                            })[0]
                          : null;

                        const now = new Date();
                        const rawExp = latestSub ? (latestSub.expiry_date || latestSub.end_date) : null;
                        const expDate = rawExp ? new Date(rawExp) : null;
                        const isExpired = !latestSub || latestSub.status !== 'active' || (expDate && expDate <= now);
                        const diffDays = expDate ? Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 3600 * 24)) : 0;
                        const startDateVal = latestSub ? (latestSub.start_date || latestSub.startDate || latestSub.created_at) : null;

                        return (
                          <tr key={`user_sub_${user.id}_${uIdx}`} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-slate-900 text-[12px]">{user.full_name || 'کاربر کدیار'}</span>
                                  <span className={`text-[9px] px-2 py-0.5 rounded-md font-extrabold ${roleBadgeClass}`}>
                                    {roleLabel}
                                  </span>
                                </div>
                                <span className="font-mono text-slate-400 text-[10px] block" title="شناسه یکتای دیتابیس (user_id)">
                                  ID: {user.id}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-600 text-[11px] font-bold">
                              {user.phone || '---'}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                              {latestSub ? latestSub.id : <span className="text-slate-300">بدون اشتراک</span>}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-800">
                              {!latestSub ? (
                                <span className="text-slate-400 font-normal text-[11px]">طرحی فعال نیست</span>
                              ) : latestSub.plan_name === '1_month' || latestSub.plan_id === '1_month' ? (
                                'اشتراک ۱ ماهه کدهای خطا'
                              ) : latestSub.plan_name === '3_month' || latestSub.plan_id === '3_month' ? (
                                'اشتراک ۳ ماهه کدهای خطا'
                              ) : latestSub.plan_name === '6_month' || latestSub.plan_id === '6_month' ? (
                                'اشتراک ۶ ماهه کدهای خطا'
                              ) : latestSub.plan_name === '12_month' || latestSub.plan_id === '12_month' ? (
                                'اشتراک ۱۲ ماهه کدهای خطا'
                              ) : latestSub.plan_name === 'permanent' || latestSub.plan_id === 'permanent' ? (
                                'اشتراک دائمی همکار / مدیریت'
                              ) : (
                                latestSub.plan_name || latestSub.planName || latestSub.plan_id || 'اشتراک ویژه'
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                              {startDateVal ? new Date(startDateVal).toLocaleDateString('fa-IR') : '---'}
                            </td>
                            <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                              {rawExp ? new Date(rawExp).toLocaleDateString('fa-IR') : '---'}
                            </td>
                            <td className="py-3 px-4 font-mono font-bold">
                              {!latestSub ? (
                                <span className="text-slate-300 font-normal">---</span>
                              ) : isExpired ? (
                                <span className="text-rose-500 font-extrabold">۰ روز (پایان‌یافته)</span>
                              ) : (
                                <span className="text-emerald-600 font-extrabold">{diffDays > 3000 ? 'دائمی' : `${diffDays} روز`}</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {!latestSub ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                  فاقد اشتراک
                                </span>
                              ) : isExpired ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-600 border border-rose-100">
                                  منقضی شده
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                  فعال
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setManualSubUserId(String(user.id));
                                  setManualSubUserSearch(user.phone || user.full_name || '');
                                  setManualSubModalOpen(true);
                                }}
                                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-xl text-[10.5px] font-extrabold transition-all cursor-pointer whitespace-nowrap active:scale-95"
                              >
                                {latestSub && !isExpired ? 'تمدید اشتراک' : '+ اعطای اشتراک'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Manual Subscription Modal */}
          {manualSubModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100 text-right">
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xl max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setManualSubModalOpen(false);
                      setManualSubUserId('');
                      setManualSubUserSearch('');
                    }}
                    className="text-slate-400 hover:text-slate-700 text-xs font-bold p-1 rounded-lg hover:bg-slate-100 cursor-pointer transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">افزودن / فعال‌سازی دستی اشتراک ویژه</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">ثبت یا تمدید اشتراک برای مشتریان یا تکنسین‌ها توسط مدیریت</p>
                  </div>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const cleanId = (manualSubUserId || manualSubUserSearch).trim();
                    if (!cleanId) {
                      alert('لطفاً کاربر، شماره همراه یا شناسه کاربر را انتخاب یا وارد نمایید.');
                      return;
                    }

                    // Check if selected user already has an active subscription
                    const targetUser = allCombinedUsers.find((u: any) =>
                      String(u.phone) === cleanId ||
                      String(u.id) === cleanId ||
                      (manualSubUserSearch && (u.full_name || '').includes(manualSubUserSearch.trim()))
                    );

                    const targetPhone = targetUser?.phone || (cleanId.startsWith('09') ? cleanId : '');
                    const targetId = targetUser?.id || cleanId;

                    const nowTime = new Date().getTime();
                    const existingActiveSub = (subscriptionsList || []).find((s: any) => {
                      const sPhone = String(s.user_phone || s.userPhone || s.phone || '');
                      const sId = String(s.user_id || s.userId || '');
                      const matchesPhone = targetPhone && sPhone && sPhone === String(targetPhone);
                      const matchesId = targetId && sId && sId === String(targetId);
                      if (!matchesPhone && !matchesId) return false;
                      const end = s.end_date || s.expiry_date;
                      return (s.is_active || s.is_premium || s.status === 'active') && end && new Date(end).getTime() > nowTime;
                    });

                    // User has existing subscription, will be smoothly extended/renewed

                    setSubmittingManualSub(true);
                    try {
                      let days = 30;
                      if (manualSubPlan === '3_month') days = 90;
                      else if (manualSubPlan === '6_month') days = 180;
                      else if (manualSubPlan === '12_month') days = 365;
                      else if (manualSubPlan === 'permanent') days = 36500;
                      else if (manualSubPlan === 'custom' && manualSubCustomDays > 0) days = Number(manualSubCustomDays);

                      if (onManualAddSubscription) {
                        await onManualAddSubscription(cleanId, manualSubPlan, days);
                      } else {
                        const token = localStorage.getItem('session_user_id') || '';
                        await fetch('/api/subscriptions/manual-add', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'X-Session-Token': token
                          },
                          body: JSON.stringify({ userId: cleanId, planId: manualSubPlan, durationDays: days })
                        });
                      }
                      if (onForceRefreshDatabase) {
                        await onForceRefreshDatabase();
                      }
                      setManualSubModalOpen(false);
                      setManualSubUserId('');
                      setManualSubUserSearch('');
                      setManualSubPlan('1_month');
                    } catch (err: any) {
                      alert('خطا در ثبت اشتراک: ' + (err?.message || 'نامشخص'));
                    } finally {
                      setSubmittingManualSub(false);
                    }
                  }}
                  className="space-y-4 text-xs font-bold"
                >
                  {/* Select or Search User */}
                  <div className="space-y-1.5">
                    <label className="block text-slate-700 text-[11px] font-extrabold">
                      انتخاب کاربر / تکنسین یا وارد کردن شماره همراه:
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="جستجو بر اساس نام یا شماره همراه..."
                        value={manualSubUserSearch}
                        onChange={(e) => {
                          setManualSubUserSearch(e.target.value);
                          setManualSubUserId(e.target.value);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl outline-none focus:bg-white focus:border-blue-500 font-bold transition-all text-right"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>

                    {/* Quick user selection list */}
                    <div className="max-h-36 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-50 bg-slate-50/50 p-1">
                      {allCombinedUsers
                        .filter((u: any) => !u.is_super_admin && u.role !== 'admin' && u.phone !== '09120947304')
                        .filter((u: any) => {
                          const q = manualSubUserSearch.toLowerCase().trim();
                          if (!q) return true;
                          return (
                            (u.full_name || '').toLowerCase().includes(q) ||
                            (u.phone || '').includes(q)
                          );
                        })
                        .slice(0, 10)
                        .map((u: any) => {
                          const isSelected = manualSubUserId === u.id || manualSubUserId === u.phone;
                          return (
                            <button
                              key={`select_user_${u.id}`}
                              type="button"
                              onClick={() => {
                                setManualSubUserId(String(u.id || u.phone));
                                setManualSubUserSearch(`${u.full_name || 'کاربر'} (${u.phone || u.id})`);
                              }}
                              className={`w-full text-right p-2 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer ${
                                isSelected ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'hover:bg-white text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${u.role === 'technician' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                <span className="font-bold">{u.full_name || 'کاربر گرامی'}</span>
                                <span className="text-[10px] text-slate-400 font-mono">({u.phone})</span>
                              </div>
                              <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold bg-slate-200 text-slate-600">
                                {u.role === 'technician' ? 'تکنسین' : 'مشتری'}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  {/* Plan Selection */}
                  <div className="space-y-1.5">
                    <label className="block text-slate-700 text-[11px] font-extrabold">
                      نوع و مدت پلن اشتراک:
                    </label>
                    <select
                      value={manualSubPlan}
                      onChange={(e) => setManualSubPlan(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl outline-none focus:bg-white focus:border-blue-500 font-bold transition-all text-right cursor-pointer"
                    >
                      <option value="1_month">اشتراک ۱ ماهه کدهای خطا (۳۰ روز)</option>
                      <option value="3_month">اشتراک ۳ ماهه کدهای خطا (۹۰ روز)</option>
                      <option value="6_month">اشتراک ۶ ماهه کدهای خطا (۱۸۰ روز)</option>
                      <option value="12_month">اشتراک ۱۲ ماهه کدهای خطا (۳۶۵ روز)</option>
                      <option value="permanent">اشتراک دائمی همکار / مدیریت (نامحدود)</option>
                      <option value="custom">تعداد روز دلخواه و سفارشی</option>
                    </select>
                  </div>

                  {manualSubPlan === 'custom' && (
                    <div className="space-y-1.5">
                      <label className="block text-slate-700 text-[11px] font-extrabold">
                        تعداد روزهای اعتبار اشتراک:
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="3650"
                        value={manualSubCustomDays}
                        onChange={(e) => setManualSubCustomDays(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl outline-none focus:bg-white focus:border-blue-500 font-bold font-mono transition-all text-right"
                        placeholder="مثلاً: 45"
                      />
                    </div>
                  )}

                  {/* Submit buttons */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setManualSubModalOpen(false);
                        setManualSubUserId('');
                        setManualSubUserSearch('');
                      }}
                      className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
                    >
                      انصراف
                    </button>
                    <button
                      type="submit"
                      disabled={submittingManualSub}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-extrabold shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {submittingManualSub ? 'در حال فعال‌سازی...' : 'فعال‌سازی آنی اشتراک'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm text-right space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 font-sans">مدیریت تراکنش‌های پرداخت</h3>
                <p className="text-[11px] text-slate-500 mt-1">مدیریت و تایید فیش‌های کارت‌به‌کارت و تراکنش‌های درگاه بانکی</p>
              </div>
              <div className="w-full sm:w-72 relative">
                <input
                  type="text"
                  placeholder="جستجو بر اساس شناسه یا کد ارجاع..."
                  value={paySearchVal}
                  onChange={(e) => setPaySearchVal(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-205 text-xs px-3.5 py-2.5 rounded-xl outline-none focus:bg-white focus:border-blue-500 font-bold transition-all text-right"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Payments Filters Bar */}
            <div className="flex flex-wrap items-center gap-3 text-xs font-bold pt-1">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-[11px]">نقش:</span>
                <button
                  onClick={() => setPayRoleFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    payRoleFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  همه
                </button>
                <button
                  onClick={() => setPayRoleFilter('client')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    payRoleFilter === 'client' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  مشتری
                </button>
                <button
                  onClick={() => setPayRoleFilter('technician')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    payRoleFilter === 'technician' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  تکنسین
                </button>
              </div>

              <div className="h-4 w-px bg-slate-200 mx-1" />

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-[11px]">نوع:</span>
                <button
                  onClick={() => setPayTypeFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    payTypeFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  همه
                </button>
                <button
                  onClick={() => setPayTypeFilter('subscription')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    payTypeFilter === 'subscription' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  }`}
                >
                  اشتراک ویژه
                </button>
                <button
                  onClick={() => setPayTypeFilter('part_purchase')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    payTypeFilter === 'part_purchase' ? 'bg-teal-600 text-white' : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
                  }`}
                >
                  خرید قطعه
                </button>
                <button
                  onClick={() => setPayTypeFilter('wallet_recharge')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    payTypeFilter === 'wallet_recharge' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  شارژ کیف پول تکنسین
                </button>
                <button
                  onClick={() => setPayTypeFilter('commission')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    payTypeFilter === 'commission' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  تسویه کمیسیون ۱۵٪
                </button>
              </div>

              <div className="h-4 w-px bg-slate-200 mx-1" />

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-[11px]">وضعیت:</span>
                <button
                  onClick={() => setPayStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    payStatusFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  همه
                </button>
                <button
                  onClick={() => setPayStatusFilter('pending')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    payStatusFilter === 'pending' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  در انتظار تایید
                </button>
                <button
                  onClick={() => setPayStatusFilter('completed')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    payStatusFilter === 'completed' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  موفق
                </button>
                <button
                  onClick={() => setPayStatusFilter('failed')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    payStatusFilter === 'failed' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  ناموفق
                </button>
              </div>
            </div>

            {paymentsList.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
                تراکنشی در دیتابیس ثبت نشده است.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-150 text-slate-700 bg-slate-50/50">
                      <th className="py-3 px-4 font-extrabold whitespace-nowrap text-right">شناسه تراکنش</th>
                      <th className="py-3 px-4 font-extrabold whitespace-nowrap text-right">کاربر (نام / نقش)</th>
                      <th className="py-3 px-4 font-extrabold whitespace-nowrap text-right">مبلغ (تومان)</th>
                      <th className="py-3 px-4 font-extrabold whitespace-nowrap text-right">درگاه پرداخت</th>
                      <th className="py-3 px-4 font-extrabold whitespace-nowrap text-right">نوع تراکنش / بابت</th>
                      <th className="py-3 px-4 font-extrabold whitespace-nowrap text-right">کد ارجاع بانکی (Reference)</th>
                      <th className="py-3 px-4 font-extrabold whitespace-nowrap text-right">واریزکننده/فیش</th>
                      <th className="py-3 px-4 font-extrabold whitespace-nowrap text-right">وضعیت پرداخت</th>
                      <th className="py-3 px-4 font-extrabold whitespace-nowrap text-right">تاریخ تراکنش</th>
                      <th className="py-3 px-4 font-extrabold text-center min-w-[240px] whitespace-nowrap">عملیات ممیزی</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paymentsList
                      .filter(p => {
                        const q = paySearchVal.toLowerCase();
                        const matchesSearch = (p.id || '').toLowerCase().includes(q) || (p.ref_id || '').toLowerCase().includes(q) || (p.user_id || '').toLowerCase().includes(q) || (p.user_phone || '').includes(q) || (p.user_name || '').toLowerCase().includes(q);
                        if (!matchesSearch) return false;

                        const userObj = usersList.find((u: any) => String(u.id) === String(p.user_id) || String(u.phone) === String(p.user_phone || p.user_id)) ||
                                        technicians.find((t: any) => String(t.id) === String(p.user_id) || String(t.phone) === String(p.user_phone || p.user_id));
                        const isTech = p.user_role === 'technician' || (userObj ? (userObj.role === 'technician' || userObj.isVerified !== undefined) : false);

                        if (payRoleFilter === 'client' && isTech) return false;
                        if (payRoleFilter === 'technician' && !isTech) return false;

                        const isWalletRecharge = p.type === 'wallet_recharge' || p.related_type === 'wallet_recharge' || p.related_id === 'wallet_recharge' || String(p.ref_code || '').startsWith('WAL-');
                        const isCommission = !isWalletRecharge && (p.type === 'commission' || p.related_type === 'commission' || p.related_id === 'commission_settlement' || String(p.ref_code || '').startsWith('COM-'));
                        const isPart = !isCommission && !isWalletRecharge && (p.type === 'part_purchase' || p.related_type === 'part_purchase' || !!p.partId);
                        const isSub = !isCommission && !isPart && !isWalletRecharge;

                        if (payTypeFilter === 'wallet_recharge' && !isWalletRecharge) return false;
                        if (payTypeFilter === 'subscription' && !isSub) return false;
                        if (payTypeFilter === 'part_purchase' && !isPart) return false;
                        if (payTypeFilter === 'commission' && !isCommission) return false;

                        if (payStatusFilter === 'pending' && !(p.status === 'pending' || p.status === 'pending_payment')) return false;
                        if (payStatusFilter === 'completed' && p.status !== 'completed') return false;
                        if (payStatusFilter === 'failed' && !(p.status === 'failed' || p.status === 'rejected')) return false;

                        return true;
                      })
                      .map((p: any, pIdx: number) => {
                        const userObj = usersList.find((u: any) => String(u.id) === String(p.user_id) || String(u.phone) === String(p.user_phone || p.user_id)) ||
                                        technicians.find((t: any) => String(t.id) === String(p.user_id) || String(t.phone) === String(p.user_phone || p.user_id));
                        const userName = p.user_name || (userObj ? (userObj.full_name || userObj.name) : 'کاربر');
                        const userPhone = p.user_phone || (userObj ? userObj.phone : p.user_id);
                        const isTech = p.user_role === 'technician' || (userObj ? (userObj.role === 'technician' || userObj.isVerified !== undefined) : false);

                        return (
                          <tr key={`pay_${p.id}_${pIdx}`} className="hover:bg-slate-50/40 transition-colors">
                            <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">{p.id}</td>
                            <td className="py-3 px-4">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-800 text-[11.5px]">{userName}</span>
                                  <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold ${
                                    isTech ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {isTech ? 'تکنسین' : 'مشتری'}
                                  </span>
                                </div>
                                <span className="font-mono text-slate-500 text-[10.5px] block">{userPhone}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-bold text-blue-600 font-mono whitespace-nowrap">{(p.amount || 0).toLocaleString('fa-IR')} تومان</td>
                            <td className="py-3 px-4 text-slate-700 font-bold whitespace-nowrap">
                              <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold">
                                {p.gateway === 'zarinpal' ? 'زرین‌پال' : p.gateway === 'admin_manual' ? 'دستی ادمین' : 'کارت به کارت'}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-bold whitespace-nowrap">
                              {p.type === 'wallet_recharge' || p.related_type === 'wallet_recharge' || p.related_id === 'wallet_recharge' || String(p.ref_code || '').startsWith('WAL-') ? (
                                <span className="px-2 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-[10px] font-extrabold inline-flex items-center gap-1">
                                  💳 شارژ کیف پول تکنسین (کارت به کارت ملت)
                                </span>
                              ) : p.type === 'commission' || p.related_type === 'commission' || p.related_id === 'commission_settlement' || String(p.ref_code || '').startsWith('COM-') ? (
                                <span className="px-2 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-lg text-[10px] font-extrabold inline-flex items-center gap-1">
                                  💰 تسویه کمیسیون ۱۵٪ کدیار۲۴
                                </span>
                              ) : p.type === 'part_purchase' || p.related_type === 'part_purchase' || p.partId ? (
                                <span className="px-2 py-1 bg-amber-50 text-amber-800 border border-amber-200/80 rounded-lg text-[10px] font-extrabold inline-flex items-center gap-1">
                                  🔧 خرید قطعه: {p.partName || p.part_name || p.partId || 'قطعه یدکی'}
                                </span>
                              ) : (
                                <span className="px-2 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200/80 rounded-lg text-[10px] font-extrabold inline-flex items-center gap-1">
                                  ⭐ خرید اشتراک کد خطا {p.plan ? `(${p.plan === '1_month' ? '۱ ماهه' : p.plan === '3_month' ? '۳ ماهه' : p.plan === '6_month' ? '۶ ماهه' : p.plan === '12_month' ? '۱۲ ماهه' : p.plan})` : ''}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-slate-600 whitespace-nowrap select-all">{p.ref_id || p.ref_code || p.tracking_code || '---'}</td>
                            <td className="py-3 px-4 text-slate-700 font-bold whitespace-nowrap">
                              {p.card_number || p.cardNumber || p.cardHolder || p.card_holder || p.tracking_code ? (
                                <span className="text-[10px] text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg font-mono">
                                  {p.card_number || p.cardNumber || p.cardHolder || p.card_holder || p.tracking_code}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[10px]">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-[10px] font-extrabold ${
                                p.status === 'completed'
                                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                  : p.status === 'failed' || p.status === 'rejected'
                                  ? 'bg-red-50 text-red-600 border border-red-100'
                                  : 'bg-amber-50 text-amber-600 border border-amber-100'
                              }`}>
                                {p.status === 'completed' ? 'موفق' : p.status === 'failed' || p.status === 'rejected' ? 'ناموفق / رد شد' : 'در انتظار تایید ادمین'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-550 font-mono whitespace-nowrap">
                              {p.created_at ? new Date(p.created_at).toLocaleDateString('fa-IR') : '---'}
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              {p.status === 'pending' || p.status === 'pending_payment' ? (
                                <div className="flex gap-2.5 justify-center items-center my-0.5">
                                  <button
                                    onClick={() => onApprovePayment && onApprovePayment(p.id)}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10.5px] font-extrabold tracking-tight transition-all duration-200 cursor-pointer shadow-xs whitespace-nowrap flex items-center justify-center gap-1 active:scale-95"
                                  >
                                    <span>
                                      {p.type === 'wallet_recharge' || p.related_type === 'wallet_recharge' || p.related_id === 'wallet_recharge' || String(p.ref_code || '').startsWith('WAL-')
                                        ? 'تایید شارژ کیف پول و افزایش موجودی'
                                        : p.type === 'commission' || p.related_type === 'commission' || p.related_id === 'commission_settlement'
                                        ? 'تایید کمیسیون و فعال‌سازی تکنسین'
                                        : p.type === 'part_purchase' || p.related_type === 'part_purchase' || p.partId
                                        ? 'تایید و ثبت ارسال قطعه'
                                        : 'تایید و فعال‌سازی اشتراک'}
                                    </span>
                                  </button>
                                  <button
                                    onClick={() => onRejectPayment && onRejectPayment(p.id)}
                                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10.5px] font-extrabold tracking-tight transition-all duration-200 cursor-pointer shadow-xs whitespace-nowrap flex items-center justify-center gap-1 active:scale-95"
                                  >
                                    <span>رد و ابطال فیش</span>
                                  </button>
                                </div>
                              ) : p.status === 'completed' || p.status === 'confirmed' ? (
                              <span className="text-emerald-600 font-extrabold text-[11px] block py-1">
                                {p.type === 'wallet_recharge' || p.related_type === 'wallet_recharge' || p.related_id === 'wallet_recharge' || String(p.ref_code || '').startsWith('WAL-')
                                  ? '✓ شارژ کیف پول تایید و اعمال شد'
                                  : p.type === 'commission' || p.related_type === 'commission' || p.related_id === 'commission_settlement'
                                  ? '✓ کمیسیون تایید و تکنسین فعال شد'
                                  : p.type === 'part_purchase' || p.related_type === 'part_purchase' || p.partId
                                  ? '✓ پرداخت تایید شد (آماده ارسال)'
                                  : '✓ تکمیل و فعال‌سازی اشتراک'}
                              </span>
                            ) : p.status === 'failed' || p.status === 'rejected' ? (
                              <span className="text-rose-500 font-bold text-[11px] block py-1">لغو شده / رد شده</span>
                            ) : (
                              <span className="text-amber-600 font-bold text-[10px] block py-1">در انتظار بررسی مدیریت</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="space-y-6 animate-in fade-in duration-200 text-right font-sans">
          
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-150 rounded-2xl p-4 text-xs text-indigo-950 leading-relaxed flex items-start gap-2.5">
            <MessageSquare className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-1 text-right">
              <h4 className="font-extrabold text-[13px] text-indigo-900">صندوق ابراز نظرات، پیشنهادها و شکایات کاربران و تکنسین‌ها</h4>
              <p>مکاتبات ارسال شده از بخش «تماس با ما» فوتر سایت، مستقیماً به این صندوق ممیزی وارد می‌شوند. شما می‌توانید نظرات را مطالعه کنید، نوع پیام‌ها را تفکیک کنید و سوابق را آرشیو یا حذف نمایید.</p>
            </div>
          </div>

          {/* Metrics summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 text-right flex items-center justify-between shadow-3xs">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold block">کل پیام‌های واصله</span>
                <strong className="text-xl font-black text-slate-800 font-mono">{userFeedbacks?.length || 0}</strong>
              </div>
              <Inbox className="w-8 h-8 text-indigo-500/80 bg-indigo-50 p-1.5 rounded-xl" />
            </div>
            
            <div className="bg-white border border-slate-200 rounded-2xl p-4 text-right flex items-center justify-between shadow-3xs">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold block">پیام‌های خوانده‌نشده</span>
                <strong className="text-xl font-black text-amber-600 font-mono">
                  {userFeedbacks?.filter(f => !f.isRead).length || 0}
                </strong>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 text-right flex items-center justify-between shadow-3xs">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold block">شکایات ثبتی بخش حل اختلاف</span>
                <strong className="text-xl font-black text-rose-600 font-mono">
                  {userFeedbacks?.filter(f => f.subject?.includes('شکایت')).length || 0}
                </strong>
              </div>
              <AlertTriangle className="w-8 h-8 text-rose-500/80 bg-rose-50 p-1.5 rounded-xl animate-pulse" />
            </div>
          </div>

          {/* Interactive grid filter search */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 text-right space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 justify-start w-full sm:w-auto">
                <Search className="w-4 h-4 text-slate-400" />
                <h3 className="font-extrabold text-xs text-slate-800">لیست پیام‌ها و پیشنهادهای دریافتی</h3>
              </div>
              
              {/* Reset database style clean button for state sync test */}
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  onClick={() => {
                    if (onUpdateUserFeedbacks) {
                      // Seed custom message to demonstrate if empty
                      const seedFb = [
                        ...userFeedbacks,
                        {
                          id: `fb_test_${Date.now()}`,
                          name: 'کاربر آزمایشی نمونه',
                          phone: '۰۹۳۰۰۰۰۰۰۰۰',
                          role: 'user',
                          subject: 'پیشنهاد بهبود',
                          message: 'بررسی صحت عملکرد همگام‌سازی، سرعت لود مطالب و خوانایی مطلوب کدهای ارور بر روی مانیتورها بی‌نظیر است.',
                          submittedAt: '۱۴۰۵/۰۳/۱۷ ۱۰:۳۰',
                          isRead: false
                        }
                      ];
                      onUpdateUserFeedbacks(seedFb);
                    }
                  }}
                  className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 rounded-lg px-2.5 py-1 text-[10px] font-bold cursor-pointer transition-all active:scale-95"
                >
                  ➕ ایجاد پیام آزمایشی مدیریت
                </button>
              </div>
            </div>

            {userFeedbacks?.length === 0 ? (
              <div className="p-12 text-center text-slate-450 text-xs font-bold bg-slate-50 rounded-2xl flex flex-col items-center justify-center gap-2 border border-dashed border-slate-200">
                <Inbox className="w-10 h-10 text-slate-305" />
                <span>هیچ پیامی در صندوق ممیزی یافت نشد.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                {userFeedbacks?.map((f) => (
                  <div 
                    key={f.id} 
                    className={`border rounded-2xl p-4 transition-all duration-200 text-right ${
                      f.isRead 
                        ? 'bg-slate-50/50 border-slate-200 text-slate-600' 
                        : 'bg-white border-indigo-200 shadow-xs ring-1 ring-indigo-100/30 text-slate-850'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 pb-2.5 mb-2.5">
                      <div className="flex items-center gap-2.5 justify-start">
                        <span className={`w-2.5 h-2.5 rounded-full ${f.isRead ? 'bg-slate-300' : 'bg-indigo-600 animate-pulse'}`} />
                        <span className="font-extrabold text-[12px]">{f.name}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">({f.role === 'technician' ? '🔧 همکار تکنسین' : '👤 متقاضی آزاد'})</span>
                        <a href={`tel:${f.phone}`} className="text-[10.5px] text-blue-600 hover:underline font-mono font-bold tracking-wider">{f.phone}</a>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-405 font-mono">{f.submittedAt}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black ${
                          f.subject?.includes('شکایت') 
                            ? 'bg-rose-50 text-rose-700 border border-rose-100'
                            : f.subject?.includes('همکاری')
                            ? 'bg-purple-10s0 text-purple-800 border border-purple-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}>
                          {f.subject || 'گزارش عمومی'}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-sans mb-3 text-right">
                      {f.message}
                    </p>

                    <div className="flex justify-end items-center gap-2 border-t border-slate-100/60 pt-2.5">
                      <button
                        type="button"
                        onClick={() => handleToggleReadFeedback(f.id)}
                        className={`px-3 py-1 text-[10.5px] font-black rounded-lg transition-all cursor-pointer border ${
                          f.isRead 
                            ? 'bg-slate-100 hover:bg-slate-205 text-slate-650 border-slate-205' 
                            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-100'
                        }`}
                      >
                        {f.isRead ? '🔴 علامتگذاری به عنوان خوانده نشده' : '✓ علامتگذاری به عنوان خوانده شده'}
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => handleDeleteFeedback(f.id)}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-150 rounded-lg px-2.5 py-1 text-[10.5px] font-bold cursor-pointer transition-all flex items-center justify-center gap-1 active:scale-95"
                        title="حذف دائمی پیام"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>منقضی و حذف کردن</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------- GLOBAL BROADCASTS TAB ---------------- */}
      {activeTab === 'broadcasts' && (
        <div className="space-y-6 animate-in fade-in duration-200 text-right font-sans" dir="rtl">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                  <Megaphone className="w-8 h-8 text-white animate-bounce" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black">📢 ارسال پیام همگانی و اعلان فوری به کل کاربران و تکنسین‌ها</h3>
                  <p className="text-xs sm:text-sm text-amber-100 mt-1 leading-relaxed">
                    هر پیامی که در این بخش ثبت کنید، به محض ورود مشتریان یا تکنسین‌ها به سایت یا اپلیکیشن کدیار، بلافاصله به صورت یک پنجره اعلان (Pop-up) تمام‌صفحه به آنها نشان داده می‌شود.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Form to send new broadcast */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-slate-900">ایجاد پیام جدید و انتشار سراسری</h4>
                <p className="text-xs text-slate-500">مشخصات پیام، مخاطبین هدف و اولویت نمایش را تعیین کنید</p>
              </div>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!broadcastTitle.trim() || !broadcastContent.trim()) {
                  alert('لطفاً عنوان و متن پیام را وارد کنید');
                  return;
                }
                setIsSendingBroadcast(true);
                try {
                  const newMsg: BroadcastMessage = {
                    id: 'bc_' + Date.now(),
                    title: broadcastTitle.trim(),
                    message: broadcastContent.trim(),
                    targetRole: broadcastTarget,
                    priority: broadcastPriority,
                    actionType: broadcastActionType,
                    created_at: new Date().toISOString(),
                    isActive: true
                  };
                  const updated = [newMsg, ...broadcastsList];
                  const token = localStorage.getItem('access_token') || localStorage.getItem('session_user_id') || localStorage.getItem('token') || '';
                  const res = await fetch('/api/admin/broadcasts', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`,
                      'X-Session-Token': token
                    },
                    body: JSON.stringify({ broadcasts: updated })
                  });
                  if (res.ok) {
                    setBroadcastsList(updated);
                    setBroadcastTitle('');
                    setBroadcastContent('');
                    setBroadcastActionType('none');
                    // Broadcast local events so any open tabs immediately wake up
                    window.dispatchEvent(new CustomEvent('user_login_completed'));
                    window.dispatchEvent(new CustomEvent('storage'));
                    alert('پیام با موفقیت ثبت شد و بلافاصله روی صفحه کاربران و تکنسین‌های هدف باز خواهد شد.');
                  } else {
                    const errData = await res.json().catch(() => ({}));
                    alert(errData.message || 'خطا در ذخیره پیام در سرور');
                  }
                } catch (err) {
                  alert('خطای شبکه در برقراری ارتباط');
                } finally {
                  setIsSendingBroadcast(false);
                }
              }}
              className="space-y-4 bg-slate-50 p-5 sm:p-6 rounded-2xl border border-slate-200"
            >
              {/* Quick Template Selector */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-2">
                <span className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
                  <span>⚡ قالب‌های آماده پیام و دستورات فوری مدیر:</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBroadcastTitle('الزام بارگذاری فوری مدارک هویتی و پروانه فنی');
                      setBroadcastContent('همکار گرامی، طبق ابلاغیه مدیریت کدیار۲۴، دریافت و پذیرش سفارشات در اپلیکیشن مشروط به تکمیل پرونده است. لطفاً فوراً مدارک هویتی و گواهی مهارت خود را در بخش پرونده بارگذاری فرمایید.');
                      setBroadcastTarget('technician');
                      setBroadcastPriority('urgent');
                      setBroadcastActionType('upload_docs');
                    }}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>📂 قالب بارگذاری مدارک تکنسین (فوری + دکمه آپلود)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBroadcastTitle('هشدار لزوم تسویه کمیسیون و فعال‌سازی مجدد سفارش‌ها');
                      setBroadcastContent('همکار گرامی، با توجه به وجود بدهی کمیسیون از سفارشات قبلی، جهت بازگشایی پنل و تخصیص سفارش‌های کاری جدید در منطقه شما، لطفاً نسبت به تسویه کمیسیون اقدام فرمایید.');
                      setBroadcastTarget('technician');
                      setBroadcastPriority('urgent');
                      setBroadcastActionType('settle_commission');
                    }}
                    className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>💳 قالب تسویه کمیسیون تکنسین</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-black text-slate-700 mb-1.5">عنوان پیام / هشدار *</label>
                  <input
                    type="text"
                    value={broadcastTitle}
                    onChange={e => setBroadcastTitle(e.target.value)}
                    placeholder="مثال: لزوم بارگذاری فوری مدارک فنی و کارت ملی"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-amber-500 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">مخاطبان و گیرندگان پیام *</label>
                  <select
                    value={broadcastTarget}
                    onChange={e => setBroadcastTarget(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-amber-500 font-bold"
                  >
                    <option value="technician">🔧 فقط تکنسین‌ها (روی اپلیکیشن و پنل تکنسین‌ها)</option>
                    <option value="client">👤 فقط مشتریان (روی پنل مشتریان)</option>
                    <option value="all">👥 همه کاربران و تکنسین‌ها (سراسری)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">
                    {broadcastTarget === 'technician' 
                      ? '🔒 پیام فقط روی حساب تکنسین‌ها باز می‌شود و به بازدیدکنندگان عادی نشان داده نمی‌شود.' 
                      : broadcastTarget === 'client'
                      ? '👤 پیام فقط به مشتریان نمایش داده می‌شود.'
                      : '📢 به همه کاربران و تکنسین‌ها نمایش داده خواهد شد.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">نوع دکمه اقدام پیام:</label>
                  <select
                    value={broadcastActionType}
                    onChange={e => setBroadcastActionType(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-amber-500 font-bold"
                  >
                    <option value="none">💬 پیام متنی استاندارد (دکمه متوجه شدم)</option>
                    <option value="upload_docs">📂 دکمه ورود مستقیم به بخش آپلود مدارک و پرونده</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">متن کامل پیام که باید جلوی چشم کاربر باز شود *</label>
                <textarea
                  rows={4}
                  value={broadcastContent}
                  onChange={e => setBroadcastContent(e.target.value)}
                  placeholder="متن کامل اطلاعیه، درخواست بارگذاری مدارک، تخفیفات یا هشدارهای مهم را اینجا بنویسید..."
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-800 outline-none focus:border-amber-500 font-medium leading-relaxed"
                  required
                />
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-slate-200/60">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">اولویت نمایش:</span>
                  {(['info', 'warning', 'urgent'] as const).map(p => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setBroadcastPriority(p)}
                      className={`text-[11px] px-3 py-1.5 rounded-xl border font-black transition-all cursor-pointer ${
                        broadcastPriority === p
                          ? p === 'urgent' ? 'bg-rose-600 text-white border-rose-600 shadow-xs' : p === 'warning' ? 'bg-amber-500 text-white border-amber-500 shadow-xs' : 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-250 hover:bg-slate-100'
                      }`}
                    >
                      {p === 'urgent' ? '🔴 فوری و قفل‌کننده (قرمز)' : p === 'warning' ? '🟡 هشدار (زرد)' : '🔵 اطلاع‌رسانی (آبی)'}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={isSendingBroadcast}
                  className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white text-xs font-black px-6 py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  <Megaphone className="w-4 h-4" />
                  <span>{isSendingBroadcast ? 'در حال ثبت در سرور...' : '🚀 انتشار و ارسال فوری پیام'}</span>
                </button>
              </div>
            </form>

            {/* Existing Broadcasts List */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                <span>📋 پیام‌های فعال ثبت شده</span>
                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-mono">{broadcastsList.length} پیام</span>
              </h4>

              {broadcastsList.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-xs text-slate-500 space-y-1">
                  <Megaphone className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-700">هنوز هیچ پیام همگانی یا فوری در سامانه ثبت نشده است.</p>
                  <p className="text-[11px] text-slate-400">با استفاده از فرم بالا می‌توانید اولین پیام خود را منتشر کنید.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {broadcastsList.map(msg => (
                    <div key={msg.id} className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-3xs">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-md ${
                            msg.priority === 'urgent' ? 'bg-rose-100 text-rose-700 border border-rose-200' : msg.priority === 'warning' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-blue-100 text-blue-700 border border-blue-200'
                          }`}>
                            {msg.priority === 'urgent' ? '🔴 فوری' : msg.priority === 'warning' ? '🟡 هشدار' : '🔵 عادی'}
                          </span>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                            مخاطب: {msg.targetRole === 'all' ? 'همه کاربران' : msg.targetRole === 'technician' ? 'فقط تکنسین‌ها' : 'فقط مشتریان'}
                          </span>
                          <h5 className="text-xs sm:text-sm font-black text-slate-900">{msg.title}</h5>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed max-w-2xl whitespace-pre-line">{msg.message}</p>
                        <span className="text-[10px] text-slate-400 font-mono block">تاریخ ثبت: {new Date(msg.created_at).toLocaleDateString('fa-IR')}</span>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm('آیا از حذف این پیام اعلان اطمینان دارید؟')) return;
                          const filtered = broadcastsList.filter(b => b.id !== msg.id);
                          setBroadcastsList(filtered);
                          const token = localStorage.getItem('access_token') || localStorage.getItem('session_user_id') || localStorage.getItem('token') || '';
                          await fetch('/api/admin/broadcasts', {
                            method: 'POST',
                            headers: { 
                              'Content-Type': 'application/json', 
                              'Authorization': `Bearer ${token}`,
                              'X-Session-Token': token 
                            },
                            body: JSON.stringify({ broadcasts: filtered })
                          });
                          alert('پیام با موفقیت حذف شد.');
                        }}
                        className="text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 text-[11px] font-black px-3.5 py-2 rounded-xl border border-rose-200 transition-all cursor-pointer whitespace-nowrap self-end sm:self-auto flex items-center gap-1 active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف پیام</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'techdocs' && (() => {
        // Group error codes by device to find unique Category + Brand + Model combinations
        const uniqueDevices: any[] = [];
        const deviceKeys = new Set();
        errorCodes.forEach((err: any) => {
          if (!err.category || !err.brand || !err.model) return;
          const key = `${err.category.trim()}_${err.brand.trim()}_${err.model.trim()}`;
          if (!deviceKeys.has(key)) {
            deviceKeys.add(key);
            uniqueDevices.push({
              id: err.id, // using the error code ID as a proxy for the device
              category: err.category,
              brand: err.brand,
              model: err.model
            });
          }
        });

        const filteredDevices = uniqueDevices.filter((dev: any) => {
          const search = techDocsSearchQuery.toLowerCase().trim();
          if (!search) return true;
          return (
            dev.category.toLowerCase().includes(search) ||
            dev.brand.toLowerCase().includes(search) ||
            dev.model.toLowerCase().includes(search)
          );
        });

        return (
          <div className="space-y-6 animate-in fade-in duration-200 text-right font-sans">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-150 rounded-2xl p-4 text-xs text-amber-950 leading-relaxed flex items-start gap-2.5">
              <FileText className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5 animate-pulse" />
              <div className="space-y-1 text-right">
                <h4 className="font-extrabold text-[13px] text-amber-900">سامانه متمرکز مدیریت مستندات فنی، نقشه‌های سیم‌کشی و دیتاشیت‌ها (TechDocs)</h4>
                <p>در این بخش، شما به عنوان مدیر کدیار۲۴ می‌توانید دفترچه‌های راهنمای کارگاهی، نقشه‌های مدار الکترونیکی، شماتیک‌ها و کاتالوگ‌های فنی پیوست‌شده به هر تیپ دستگاه را ممیزی کنید. تکنسین‌ها به این بخش دسترسی مستقیم ندارند و هر سندی برای انتشار عمومی در بخش جستجو باید از فیلتر تایید شما عبور کند.</p>
              </div>
            </div>

            {techDocsStatusMsg && (
              <div className="bg-blue-50 border-2 border-blue-200 text-blue-900 font-bold p-4 rounded-xl text-xs animate-pulse text-right">
                {techDocsStatusMsg}
              </div>
            )}

            {selectedDeviceForDocs ? (
              // DEVICE DOCUMENTS DETAIL MANAGER VIEW
              <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 text-right space-y-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-150 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 justify-start">
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-0.5 rounded-lg">
                        {selectedDeviceForDocs.category}
                      </span>
                      <h3 className="font-black text-sm text-slate-800">
                        {selectedDeviceForDocs.brand} - {selectedDeviceForDocs.model}
                      </h3>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">مدیریت فایل‌های فنی اختصاصی پیوست‌شده به این دستگاه</p>
                  </div>
                  
                  <button
                    onClick={() => setSelectedDeviceForDocs(null)}
                    className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl px-4 py-2 text-xs font-bold cursor-pointer transition-all active:scale-95"
                  >
                    بازگشت به لیست دستگاه‌ها ↩
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* LEFT COLUMN: ADD NEW DOCUMENT FORM */}
                  <div className="lg:col-span-4 bg-slate-50 border border-slate-150 rounded-2xl p-4 sm:p-5 space-y-4">
                    <h4 className="font-extrabold text-xs text-slate-800 border-b border-slate-200 pb-2">➕ بارگذاری و ثبت سند جدید برای این تیپ</h4>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 block">عنوان دقیق سند فنی (فارسی یا انگلیسی)</label>
                      <input
                        type="text"
                        value={newDocTitleInput}
                        onChange={(e) => setNewDocTitleInput(e.target.value)}
                        placeholder="مثال: نقشه مداری برد اصلی پکیج بوتان"
                        className="w-full bg-white border border-slate-250 text-xs px-3 py-2 rounded-xl outline-none focus:border-amber-500 font-bold text-right"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 block">نوع سند فنی</label>
                      <select
                        value={newDocTypeInput}
                        onChange={(e) => setNewDocTypeInput(e.target.value)}
                        className="w-full bg-white border border-slate-250 text-xs px-3 py-2 rounded-xl outline-none focus:border-amber-500 font-bold text-right cursor-pointer"
                      >
                        <option value="Service Manual">Service Manual (راهنمای کارگاهی سرویس)</option>
                        <option value="Wiring Diagram">Wiring Diagram (نقشه اتصالات سیم‌کشی)</option>
                        <option value="Schematic">Schematic (شماتیک فنی برد)</option>
                        <option value="Exploded View">Exploded View (نقشه انفجاری قطعات)</option>
                        <option value="Datasheet (PDF)">Datasheet (دیتاشیت قطعات اصلی)</option>
                        <option value="PCB Layout">PCB Layout (طرح برد اصلی)</option>
                        <option value="Catalog">Catalog (کاتالوگ یا دفترچه مشتری)</option>
                      </select>
                    </div>

                    {/* Method Selector */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 block">روش بارگذاری سند</label>
                      <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/60 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setUploadMethod('file')}
                          className={`py-1.5 text-[9.5px] font-black rounded-lg transition-all cursor-pointer ${
                            uploadMethod === 'file'
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'text-slate-700 hover:bg-slate-300/40'
                          }`}
                        >
                          📥 آپلود مستقیم فایل
                        </button>
                        <button
                          type="button"
                          onClick={() => setUploadMethod('link')}
                          className={`py-1.5 text-[9.5px] font-black rounded-lg transition-all cursor-pointer ${
                            uploadMethod === 'link'
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'text-slate-700 hover:bg-slate-300/40'
                          }`}
                        >
                          🔗 لینک مستقیم دانلود
                        </button>
                      </div>
                    </div>

                    {uploadMethod === 'file' ? (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 block">انتخاب فایل سند فنی (حداکثر ۵۰ مگابایت)</label>
                        <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-4 text-center bg-white hover:bg-amber-50/20 hover:border-amber-400 transition-all cursor-pointer group">
                          <input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.zip"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          <div className="space-y-1.5">
                            <Upload className="w-5 h-5 text-slate-400 group-hover:text-amber-500 mx-auto transition-colors" />
                            <p className="text-[10.5px] font-extrabold text-slate-700 leading-tight">
                              {uploadedFileName ? `📂 فایل: ${uploadedFileName}` : 'کلیک کنید یا فایل را بکشید اینجا'}
                            </p>
                            <p className="text-[8.5px] text-slate-400">فرمت‌ها: PDF، عکس (PNG, JPG) یا ZIP</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block">لینک مستقیم دانلود فایل (مثال: آدرس هاست دانلود شما)</label>
                        <input
                          type="text"
                          value={externalUrlInput}
                          onChange={(e) => setExternalUrlInput(e.target.value)}
                          placeholder="https://kodyar24.ir/docs/butan-model1-wiring.pdf"
                          className="w-full bg-white border border-slate-250 text-xs px-3 py-2 rounded-xl outline-none focus:border-amber-500 font-medium text-left font-mono"
                          dir="ltr"
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 block">حجم تقریبی فایل (جهت نمایش به کاربر)</label>
                      <input
                        type="text"
                        value={newDocSizeInput}
                        onChange={(e) => setNewDocSizeInput(e.target.value)}
                        placeholder="مثال: 3.2 MB"
                        className="w-full bg-white border border-slate-250 text-xs px-3 py-2 rounded-xl outline-none focus:border-amber-500 font-bold text-right font-mono"
                      />
                    </div>

                    <button
                      onClick={handleAddTechDoc}
                      disabled={isSavingDoc}
                      className={`w-full bg-amber-500 hover:bg-amber-600 border border-amber-600 text-white rounded-xl py-2.5 text-xs font-black cursor-pointer shadow-md transition-all active:scale-95 text-center block mt-2 ${
                        isSavingDoc ? 'opacity-60 cursor-not-allowed animate-pulse' : ''
                      }`}
                    >
                      {isSavingDoc ? 'در حال آپلود و ذخیره‌سازی...' : 'ثبت و انتشار رسمی سند فنی'}
                    </button>
                  </div>

                  {/* RIGHT COLUMN: CURRENT DOCUMENTS LIST */}
                  <div className="lg:col-span-8 space-y-4">
                    <h4 className="font-extrabold text-xs text-slate-800">اسناد فنی تعریف شده ({deviceDocsList.length} سند)</h4>
                    
                    {deviceDocsLoading ? (
                      <div className="py-12 text-center text-slate-500 text-xs font-bold animate-pulse">
                        در حال برقراری ارتباط زنده با سرور و فراخوانی اسناد فنی...
                      </div>
                    ) : deviceDocsError ? (
                      <div className="bg-rose-50 border border-rose-150 p-4 rounded-xl text-rose-800 text-xs font-bold text-right">
                        ⚠️ {deviceDocsError}
                      </div>
                    ) : deviceDocsList.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs font-bold bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        هیچ سند فنی اختصاصی برای این مدل هنوز آپلود نشده است.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                        {deviceDocsList.map((doc: any) => {
                          if (editingDocId === doc.id) {
                            return (
                              <div
                                key={doc.id}
                                className="bg-amber-50/40 border-2 border-amber-300 rounded-2xl p-4 space-y-3 text-right"
                              >
                                <div className="text-xs font-black text-amber-900 border-b border-amber-200 pb-1.5 flex items-center justify-between">
                                  <span>✍️ ویرایش اطلاعات سند فنی</span>
                                  <span className="bg-amber-100 px-2 py-0.5 rounded text-[10px] font-bold">{doc.type}</span>
                                </div>
                                
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-600 block">عنوان دقیق سند فنی</label>
                                  <input
                                    type="text"
                                    value={editingDocTitle}
                                    onChange={(e) => setEditingDocTitle(e.target.value)}
                                    className="w-full bg-white border border-slate-300 text-xs px-3 py-1.5 rounded-xl outline-none font-bold text-right"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-600 block">نوع سند</label>
                                    <select
                                      value={editingDocType}
                                      onChange={(e) => setEditingDocType(e.target.value)}
                                      className="w-full bg-white border border-slate-300 text-xs px-3 py-1.5 rounded-xl outline-none font-bold text-right"
                                    >
                                      <option value="Service Manual">Service Manual (راهنمای کارگاهی)</option>
                                      <option value="Wiring Diagram">Wiring Diagram (نقشه سیم‌کشی)</option>
                                      <option value="Schematic">Schematic (شماتیک فنی برد)</option>
                                      <option value="Exploded View">Exploded View (نقشه انفجاری)</option>
                                      <option value="Datasheet (PDF)">Datasheet (دیتاشیت قطعات)</option>
                                      <option value="PCB Layout">PCB Layout (طرح برد اصلی)</option>
                                      <option value="Catalog">Catalog (کاتالوگ یا دفترچه)</option>
                                    </select>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-600 block">حجم فایل</label>
                                    <input
                                      type="text"
                                      value={editingDocSize}
                                      onChange={(e) => setEditingDocSize(e.target.value)}
                                      className="w-full bg-white border border-slate-300 text-xs px-3 py-1.5 rounded-xl outline-none font-bold text-right ltr"
                                    />
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-600 block">لینک مستقیم فایل</label>
                                  <input
                                    type="text"
                                    value={editingDocUrl}
                                    onChange={(e) => setEditingDocUrl(e.target.value)}
                                    className="w-full bg-white border border-slate-300 text-xs px-3 py-1.5 rounded-xl outline-none font-medium text-left ltr font-mono"
                                  />
                                </div>

                                <div className="flex justify-end gap-2 pt-1 border-t border-amber-200/60">
                                  <button
                                    onClick={handleCancelEditDoc}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black rounded-lg px-3 py-1.5 cursor-pointer transition-all"
                                  >
                                    انصراف
                                  </button>
                                  <button
                                    onClick={handleSaveEditDoc}
                                    className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black rounded-lg px-4 py-1.5 cursor-pointer transition-all shadow-sm"
                                  >
                                    ذخیره تغییرات
                                  </button>
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div
                              key={doc.id}
                              className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-4 transition-all hover:bg-slate-50"
                            >
                              <div className="space-y-1 flex-1 min-w-0 text-right">
                                <div className="flex items-center gap-2">
                                  <span className="bg-slate-100 text-slate-700 text-[9px] font-black px-2 py-0.5 rounded-md">
                                    {doc.type}
                                  </span>
                                  {doc.isDefault ? (
                                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[8px] px-1.5 py-0.5 rounded-md font-bold">
                                      سند سیستمی هوشمند
                                    </span>
                                  ) : (
                                    <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[8px] px-1.5 py-0.5 rounded-md font-bold">
                                      سند ثبت‌شده ادمین
                                    </span>
                                  )}
                                </div>
                                <h5 className="font-extrabold text-xs text-slate-850 truncate">{doc.title}</h5>
                                <div className="flex items-center gap-3 text-[10px] text-slate-450 font-medium">
                                  <span>حجم: <span className="font-mono">{doc.fileSize}</span></span>
                                  <span>•</span>
                                  <span>ثبت: <span className="font-mono">{doc.uploadedAt}</span></span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {!doc.isDefault && (
                                  <button
                                    onClick={() => handleStartEditDoc(doc)}
                                    className="bg-amber-50 hover:bg-amber-100 border border-amber-150 text-amber-750 rounded-xl p-2.5 text-xs font-bold cursor-pointer transition-all active:scale-95"
                                    title="ویرایش اطلاعات سند"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                )}
                                {!doc.isDefault ? (
                                  <button
                                    onClick={() => handleDeleteTechDoc(doc.id)}
                                    className="bg-rose-50 hover:bg-rose-100 border border-rose-150 text-rose-700 rounded-xl p-2.5 text-xs font-bold cursor-pointer transition-all active:scale-95"
                                    title="حذف دائمی سند"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-1.5 rounded-xl">
                                    غیرقابل حذف
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // DEVICES GRID LIST
              <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 text-right space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2 justify-start w-full sm:w-auto">
                    <Search className="w-4 h-4 text-slate-400" />
                    <h3 className="font-extrabold text-xs text-slate-800">لیست کل تیپ‌های دستگاه فعال در سایت</h3>
                  </div>

                  <input
                    type="text"
                    value={techDocsSearchQuery}
                    onChange={(e) => setTechDocsSearchQuery(e.target.value)}
                    placeholder="جستجو در دسته‌ها، برندها یا مدل‌ها..."
                    className="w-full sm:w-72 bg-slate-50 border border-slate-200 text-xs px-3 py-2 rounded-xl outline-none focus:border-amber-500 font-bold text-right transition-all"
                  />
                </div>

                {filteredDevices.length === 0 ? (
                  <div className="p-12 text-center text-slate-450 text-xs font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    دستگاهی یافت نشد. برای پیوست سند فنی باید ابتدا یک کد خطای متناظر با برند و مدل ثبت شده باشد.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredDevices.map((dev: any, index: number) => (
                      <div
                        key={index}
                        className="border border-slate-200 bg-slate-50/50 rounded-2xl p-4 flex flex-col justify-between gap-3 hover:border-amber-400 transition-all hover:bg-white"
                      >
                        <div className="space-y-1.5 text-right">
                          <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-2 py-0.5 rounded-md inline-block">
                            {dev.category}
                          </span>
                          <h4 className="font-extrabold text-xs text-slate-800">{dev.brand}</h4>
                          <p className="text-[10px] text-slate-500 font-mono">مدل: {dev.model}</p>
                        </div>

                        <div className="border-t border-slate-100/80 pt-3 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-bold">وضعیت: آماده ممیزی</span>
                          
                          <button
                            onClick={() => setSelectedDeviceForDocs(dev)}
                            className="bg-amber-500 hover:bg-amber-600 border border-amber-600 text-white rounded-xl px-3.5 py-1.5 text-[11px] font-extrabold cursor-pointer transition-all active:scale-95"
                          >
                            مدیریت مستندات فنی و دیتاشیت‌ها
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {activeTab === 'activitylogs' && (
        <div className="space-y-6 animate-in fade-in duration-200 text-right font-sans">
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-150 rounded-2xl p-4 text-xs text-blue-950 leading-relaxed flex items-start gap-2.5">
            <Activity className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-right">
              <h4 className="font-extrabold text-[13px] text-blue-900">گزارش فعالیت‌ها و دسترسی‌های کاربران سیستم (Audit Logs)</h4>
              <p>این بخش مسئول ردیابی و ذخیره تاریخچه کامل فعالیت‌های حساس کاربران، ادمین‌ها و تکنسین‌ها به صورت زنده است. در پایین می‌توانید گزارش کاربری و مالی را استخراج نمایید.</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-800">خروجی فرمت‌های نظارتی صنف (صادرات داده)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-slate-100 rounded-2xl p-4 space-y-3 bg-slate-50/50">
                <span className="text-xs font-extrabold text-slate-700 block">دانلود فایل اکسل گزارشات صنف (Excel/CSV UTF-8)</span>
                <p className="text-[11px] text-slate-500">لیست جامع تمامی سفارشات فعال و بایگانی‌شده تعمیرات لوازم خانگی به همراه مشخصات مشتریان.</p>
                <div className="flex gap-2 justify-start">
                  <a
                    href="/api/admin/export/excel?type=orders"
                    target="_blank"
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-sm"
                  >
                    <FileText className="w-4 h-4" />
                    <span>اکسپورت سفارشات تعمیرات</span>
                  </a>
                  <a
                    href="/api/admin/export/excel?type=users"
                    target="_blank"
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-sm"
                  >
                    <Users className="w-4 h-4" />
                    <span>لیست کاربران</span>
                  </a>
                </div>
              </div>

              <div className="border border-slate-100 rounded-2xl p-4 space-y-3 bg-slate-50/50">
                <span className="text-xs font-extrabold text-slate-700 block">چاپ مستقیم فایل PDF و گزارشات چاپی (HTML/PDF)</span>
                <p className="text-[11px] text-slate-500">طرح‌بندی استاندارد چاپی با فونت‌های اصلاح شده فارسی و جداول با وضوح بالا برای تحویل به مراجع نظارتی.</p>
                <div className="flex gap-2 justify-start">
                  <a
                    href="/api/admin/export/pdf?type=orders"
                    target="_blank"
                    className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-sm"
                  >
                    <FileText className="w-4 h-4" />
                    <span>چاپ فاکتورها و سفارشات</span>
                  </a>
                  <a
                    href="/api/admin/export/pdf?type=users"
                    target="_blank"
                    className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-sm"
                  >
                    <Users className="w-4 h-4" />
                    <span>چاپ کاربران سیستم</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-800">لیست زنده لاگ فعالیت‌ها</h3>
            {activityLogsLoading ? (
              <div className="text-center py-12 text-xs text-slate-500">در حال دریافت تاریخچه فعالیت‌ها...</div>
            ) : activityLogsList.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400">تاکنون فعالیتی در پایگاه ثبت نگردیده است.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                      <th className="p-3 text-right">کاربر</th>
                      <th className="p-3 text-right">عملیات</th>
                      <th className="p-3 text-right">آدرس IP</th>
                      <th className="p-3 text-right">تاریخ و ساعت</th>
                      <th className="p-3 text-right">جزئیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activityLogsList.map((log: any) => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-slate-700 text-right">{log.userId === 'admin' ? 'مدیر ارشد' : log.userId}</td>
                        <td className="p-3 text-right"><span className="bg-blue-50 text-blue-700 font-extrabold px-2 py-0.5 rounded-md text-[10px]">{log.action}</span></td>
                        <td className="p-3 font-mono text-slate-500 text-right">{log.ip}</td>
                        <td className="p-3 text-slate-500 text-right">{new Date(log.created_at).toLocaleDateString('fa-IR', {hour:'2-digit', minute:'2-digit'})}</td>
                        <td className="p-3 text-slate-650 max-w-xs truncate text-right" title={log.details}>{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'backups' && (
        <div className="space-y-6 animate-in fade-in duration-200 text-right font-sans">
          
          {/* Header Hero Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white border border-indigo-800/60 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-2">
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider inline-block">
                  مرکز یکپارچه فرماندهی پایگاه داده کدیار۲۴
                </span>
                <h3 className="text-xl sm:text-2xl font-black flex items-center gap-2.5">
                  <Database className="w-7 h-7 text-amber-400" />
                  <span>پشتیبان‌گیری، بازگردانی و ایستگاه درون‌ریزی کل داده‌های سایت</span>
                </h3>
                <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                  مدیریت کامل و متمرکز تمام نسخه‌های پشتیبان دیتابیس شامل اطلاعات هویتی مشتریان، حساب‌های تکنسین‌ها، سفارشات تعمیرات، تراکنش‌های مالی، کدهای خطا، قطعات انبار و تنظیمات پلتفرم.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={fetchAdminBackups}
                  className="bg-white/10 hover:bg-white/20 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl border border-white/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingBackups ? 'animate-spin' : ''}`} />
                  <span>بروزرسانی لیست</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const fullBackup = {
                      exportedAt: new Date().toISOString(),
                      version: "2.0",
                      app: "kodyar24",
                      stats: {
                        errorCodesCount: errorCodes?.length || 0,
                        usersCount: usersList?.length || 0,
                        techniciansCount: technicians?.length || 0,
                        ordersCount: orders?.length || 0,
                      },
                      errorCodes,
                      technicians,
                      usersList,
                      orders,
                      spareParts,
                      commonProblems,
                      partPurchases,
                      subscriptionsList,
                      paymentsList,
                      categoriesList,
                      brandsList,
                      modelsList,
                      citiesList,
                      categoryConfig,
                      affiliateProducts,
                      smsSettings,
                      pageContents,
                      trustBadges,
                      supportPhone,
                      adminAnnouncement
                    };
                    const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `kodyar24_FULL_DATABASE_BACKUP_${new Date().toISOString().slice(0,10)}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    setBackupStatusMsg('✅ بکاپ کامل تمام داده‌های سایت (مشتریان، تکنسین‌ها، ارورها و...) با موفقیت دانلود شد.');
                    setTimeout(() => setBackupStatusMsg(''), 6000);
                  }}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4 rotate-180" />
                  <span>دانلود فوری فایل JSON کل سایت</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-indigo-800/50">
              <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                <span className="text-[10px] text-slate-400 font-bold block">مشتریان و تکنسین‌ها</span>
                <span className="text-sm font-black text-amber-300 font-mono">
                  {(usersList?.length || 0) + (technicians?.length || 0)} نفر
                </span>
              </div>
              <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                <span className="text-[10px] text-slate-400 font-bold block">کدهای خطا و عیب‌یابی</span>
                <span className="text-sm font-black text-emerald-300 font-mono">
                  {(errorCodes?.length || 0).toLocaleString('fa-IR')} مورد
                </span>
              </div>
              <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                <span className="text-[10px] text-slate-400 font-bold block">سفارشات و مأموریت‌ها</span>
                <span className="text-sm font-black text-sky-300 font-mono">
                  {(orders?.length || 0).toLocaleString('fa-IR')} سفارش
                </span>
              </div>
              <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                <span className="text-[10px] text-slate-400 font-bold block">نسخه‌های ذخیره هاست</span>
                <span className="text-sm font-black text-indigo-300 font-mono">
                  {adminServerBackups.length} نسخه
                </span>
              </div>
            </div>
          </div>

          {/* Status Message Banner */}
          {backupStatusMsg && (
            <div className="p-4 bg-amber-50 border-2 border-amber-300 text-amber-950 text-xs font-black rounded-2xl text-center shadow-xs animate-pulse font-sans flex items-center justify-center gap-2">
              <Info className="w-4 h-4 text-amber-600" />
              <span>{backupStatusMsg}</span>
            </div>
          )}

          {/* SECTION 1: SERVER SNAPSHOTS & HOST BACKUPS */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-600" />
                  <span>۱. مرکز نسخه پشتیبان خودکار و دستی روی هاست سرور (Host Snapshots)</span>
                </h4>
                <p className="text-xs text-slate-500">
                  سیستم به طور خودکار هر ۲ ساعت یک‌بار دیتابیس را روی هاست فشرده و ذخیره می‌کند. همچنین می‌توانید دستی بکاپ بسازید.
                </p>
              </div>
              <button
                type="button"
                onClick={createAdminBackup}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-2 shrink-0"
              >
                <RefreshCw className="w-4 h-4" />
                <span>➕ ایجاد فوری بکاپ جدید روی هاست</span>
              </button>
            </div>

            {/* List of server backups */}
            <div className="space-y-3">
              <h5 className="font-extrabold text-xs text-slate-800">📋 نسخه‌های فیزیکی ذخیره شده در هاست ({adminServerBackups.length} نسخه)</h5>
              <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100 bg-slate-50/50">
                {adminServerBackups.map((bk) => (
                  <div key={bk.fileName || bk.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white transition-colors">
                    <div className="space-y-1 text-right">
                      <span className="font-black text-xs text-slate-800 block">🗓️ نسخه پشتیبان: {bk.formattedDate || bk.fileName}</span>
                      <span className="text-[10px] text-slate-500 font-mono block">فایل: {bk.fileName} | حجم: {bk.dataSizeKB} KB</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`/api/server-backups/download/${encodeURIComponent(bk.fileName)}`}
                        download
                        className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                        title="دانلود این فایل بکاپ"
                      >
                        <Upload className="w-3.5 h-3.5 rotate-180" />
                        <span>دانلود</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => {
                          triggerSafeConfirm(
                            'بازگردانی دیتابیس به این نسخه',
                            `آیا از بازگردانی کامل داده‌های سایت به نسخه مورخ "${bk.formattedDate || bk.fileName}" اطمینان دارید؟ تمامی اطلاعات شامل تکنسین‌ها، کاربران و سفارشات به همان تاریخ برمی‌گردند.`,
                            () => restoreAdminBackup(bk.fileName)
                          );
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black px-4 py-2 rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>🔄 بازیابی این نسخه</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          triggerSafeConfirm(
                            'حذف نسخه پشتیبان',
                            `آیا از حذف دائم فایل بکاپ "${bk.fileName}" از روی هاست سرور اطمینان دارید؟`,
                            () => deleteAdminBackup(bk.fileName)
                          );
                        }}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold p-2 rounded-xl border border-rose-200 transition-all cursor-pointer"
                        title="حذف فایل"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {adminServerBackups.length === 0 && (
                  <div className="text-center py-10 text-xs text-slate-400 font-bold">
                    ☁️ هیچ نسخه پشتیبان فیزیکی روی هاست سرور یافت نشد. جهت امنیت اطلاعات، همین حالا اولین بکاپ را ایجاد کنید.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: MANUAL JSON BACKUP EXPORT & IMPORT (Customers, Techs, Orders & All) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                <span>۲. خروجی گرفتن و بازیابی دستی کل دیتابیس (فایل JSON)</span>
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                ذخیره فایل کامل دیتابیس روی سیستم شخصی خود یا بازیابی کامل سایت با آپلود فایل بکاپ قبلی.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Export JSON Card */}
              <div className="bg-blue-50/40 border border-blue-100 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="bg-blue-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-md inline-block">
                    خروجی به رایانه (Full Export)
                  </span>
                  <h5 className="font-extrabold text-xs text-slate-900">دانلود پشتیبان شامل کل اطلاعات مشتریان، تکنسین‌ها و کدهای خطا</h5>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    با کلیک روی این دکمه، یک فایل کامل <code className="font-mono text-blue-700 bg-white px-1 py-0.5 rounded border border-blue-200">.json</code> دانلود می‌شود که دقیقاً شامل تمام جداول دیتابیس کدیار۲۴ است.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const fullBackup = {
                      exportedAt: new Date().toISOString(),
                      version: "2.0",
                      app: "kodyar24",
                      stats: {
                        errorCodesCount: errorCodes?.length || 0,
                        usersCount: usersList?.length || 0,
                        techniciansCount: technicians?.length || 0,
                        ordersCount: orders?.length || 0,
                      },
                      errorCodes,
                      technicians,
                      usersList,
                      orders,
                      spareParts,
                      commonProblems,
                      partPurchases,
                      subscriptionsList,
                      paymentsList,
                      categoriesList,
                      brandsList,
                      modelsList,
                      citiesList,
                      categoryConfig,
                      affiliateProducts,
                      smsSettings,
                      pageContents,
                      trustBadges,
                      supportPhone,
                      adminAnnouncement
                    };
                    const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `kodyar24_FULL_DATABASE_BACKUP_${new Date().toISOString().slice(0,10)}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    setBackupStatusMsg('✅ فایل پشتیبان جامع روی سیستم شما بارگیری شد.');
                    setTimeout(() => setBackupStatusMsg(''), 6000);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4 rotate-180" />
                  <span>دانلود پشتیبان کامل پایگاه داده (.json)</span>
                </button>
              </div>

              {/* Restore from Uploaded JSON Card */}
              <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="bg-indigo-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-md inline-block">
                    بازگردانی از کامپیوتر (Full Restore)
                  </span>
                  <h5 className="font-extrabold text-xs text-slate-900">آپلود و جایگزینی کامل دیتابیس سایت از فایل JSON</h5>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    فایل بکاپ دانلود شده قبلی را انتخاب کنید تا کل اطلاعات سایت (کاربران، تکنسین‌ها، ارورها و سفارشات) به طور کامل بازنویسی گردند.
                  </p>
                </div>

                <div className="space-y-2">
                  <input
                    id="full-json-restore-input"
                    type="file"
                    accept=".json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      const reader = new FileReader();
                      reader.onload = async (evt) => {
                        const content = evt.target?.result;
                        if (typeof content !== 'string') return;
                        try {
                          const parsed = JSON.parse(content);
                          triggerSafeConfirm(
                            'بازنویسی کامل پایگاه داده',
                            `آیا از بازنویسی کامل دیتابیس سایت با فایل "${file.name}" مطمئن هستید؟ تمام اطلاعات موجود جایگزین داده‌های داخل این فایل می‌شوند.`,
                            async () => {
                              setBackupStatusMsg('⏳ در حال ارسال داده‌های بکاپ به سرور و اعمال روی دیتابیس...');
                              const res = await fetch('/api/server-backups/upload-restore', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(parsed)
                              });
                              const data = await res.json();
                              if (res.ok && data.success) {
                                setBackupStatusMsg('🎉 دیتابیس با موفقیت کامل با فایل بکاپ شما بازنویسی گردید! در حال بارگذاری مجدد...');
                                setTimeout(() => window.location.reload(), 2000);
                              } else {
                                setBackupStatusMsg(`❌ خطا در بازگردانی: ${data.error || 'عملیات شکست خورد'}`);
                              }
                            }
                          );
                        } catch (err: any) {
                          setBackupStatusMsg(`❌ فایل JSON انتخابی معتبر نیست: ${err.message}`);
                        }
                      };
                      reader.readAsText(file);
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById('full-json-restore-input')?.click()}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>انتخاب فایل بکاپ JSON و بازگردانی سایت</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: DATABASE FILES IMPORT STATION (SQL & FORMATTED JSON) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <span>۳. ایستگاه درون‌ریزی فایل‌های پایگاه داده (SQL / JSON مرجع)</span>
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                درون‌ریزی ساختار دیتابیس، بارگذاری کدهای خطا یا اجرای اسکریپت‌های SQL.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sub-card 1: Import migration.sql */}
              <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 space-y-3 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-black text-emerald-950 block mb-1">⚡ درون‌ریزی فایل ساختار مهاجرت (migration.sql)</span>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    اجرای فایل مهاجرت دیتابیس سرور شامل ساختار پایه‌ای تمامی جداول کاربران، تکنسین‌ها، تنظیمات عمومی سیستم، فاکتورهای مالی، سفارشات و حساب‌های مدیریتی پیش‌فرض.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setBackupStatusMsg('⏳ در حال درون‌ریزی فایل مهاجرت migration.sql ...');
                      const res = await fetch('/api/server-backups/import-sql', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fromFile: 'migration.sql' })
                      });
                      const data = await res.json();
                      if (res.ok && data.success) {
                        setBackupStatusMsg(`✅ با موفقیت انجام شد: ${data.message}`);
                        setTimeout(() => window.location.reload(), 1500);
                      } else {
                        setBackupStatusMsg(`❌ خطا: ${data.error || 'عملیات شکست خورد'}`);
                      }
                    } catch (err: any) {
                      setBackupStatusMsg(`❌ خطا در ارتباط با سرور: ${err.message}`);
                    }
                    setTimeout(() => setBackupStatusMsg(''), 8000);
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2.5 text-[11px] font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Database className="w-4 h-4" />
                  <span>شروع درون‌ریزی فایل migration.sql</span>
                </button>
              </div>

              {/* Sub-card 2: Import error_codes_formatted.json */}
              <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/20 space-y-3 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-black text-blue-950 block mb-1">📊 بارگذاری کامل مرجع سراسری عیب‌یابی (۶,۵۰۰+ خطای لوازم خانگی)</span>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    بارگذاری و درون‌ریزی آنی آرشیو طلایی کدهای عیب‌یابی پکیج، کولر گازی، یخچال، لباسشویی و ظرفشویی از روی فایل سیستم سرور کدیار۲۴.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setBackupStatusMsg('⏳ در حال بارگذاری و تحلیل فایل عظیم مرجع کدهای خطا...');
                      const res = await fetch('/api/server-backups/import-formatted-json', { method: 'POST' });
                      const data = await res.json();
                      if (res.ok && data.success) {
                        setBackupStatusMsg(`✅ با موفقیت انجام شد: ${data.message}`);
                        setTimeout(() => window.location.reload(), 1500);
                      } else {
                        setBackupStatusMsg(`❌ خطا: ${data.error || 'عملیات شکست خورد'}`);
                      }
                    } catch (err: any) {
                      setBackupStatusMsg(`❌ خطا در ارتباط با سرور: ${err.message}`);
                    }
                    setTimeout(() => setBackupStatusMsg(''), 8000);
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2.5 text-[11px] font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <FileText className="w-4 h-4" />
                  <span>درون‌ریزی کدهای عیب‌یابی</span>
                </button>
              </div>
            </div>

            {/* Custom SQL Executer */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
              <span className="text-xs font-black text-slate-800 block">📂 بارگذاری و اجرای فایل SQL دلخواه از روی دستگاه شما</span>
              <p className="text-[10px] text-slate-500">
                می‌توانید هر فایل اس‌کیوال با پسوند <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-indigo-700">.sql</code> را انتخاب کرده تا کدهای آن مستقیماً روی پایگاه داده اجرا گردند.
              </p>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <input
                  id="custom-sql-upload-input"
                  type="file"
                  accept=".sql"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    
                    const reader = new FileReader();
                    reader.onload = async (evt) => {
                      const sqlText = evt.target?.result;
                      if (typeof sqlText !== 'string') return;
                      
                      try {
                        setBackupStatusMsg(`⏳ در حال ارسال و اجرای فایل SQL "${file.name}" روی سرور...`);
                        const res = await fetch('/api/server-backups/import-sql', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ sqlContent: sqlText })
                        });
                        const data = await res.json();
                        if (res.ok && data.success) {
                          setBackupStatusMsg(`✅ فایل با موفقیت اجرا شد: ${data.message}`);
                          setTimeout(() => window.location.reload(), 2000);
                        } else {
                          setBackupStatusMsg(`❌ خطا در اجرای اسکریپت: ${data.error || 'عملیات شکست خورد'}`);
                        }
                      } catch (err: any) {
                        setBackupStatusMsg(`❌ خطا در ارتباط: ${err.message}`);
                      }
                      setTimeout(() => setBackupStatusMsg(''), 8000);
                    };
                    reader.readAsText(file);
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('custom-sql-upload-input')?.click()}
                  className="bg-slate-800 hover:bg-slate-900 text-white rounded-xl px-5 py-2.5 text-[11px] font-extrabold transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Upload className="w-4 h-4" />
                  <span>انتخاب و اجرای فایل SQL سفارشی</span>
                </button>
                <span className="text-[10px] text-slate-400 font-sans self-center">پشتیبانی از دستورات CREATE, DROP, INSERT, UPDATE, SET</span>
              </div>
            </div>
          </div>

          {/* SECTION 4: BULK DATA IMPORT WIZARD (CSV/Excel/JSON) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-600" />
                <span>۴. سامانه درون‌ریزی گروهی داده‌ها (اکسل، CSV و JSON)</span>
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                وارد کردن دسته جمعی کدهای خطا، دسته‌بندی‌ها، برندها یا شهرها از طریق کپی کردن یا بارگذاری فایل CSV/JSON.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-extrabold text-slate-700 block mb-1">نوع محتوای وارداتی را مشخص کنید:</label>
                  <select
                    value={importType}
                    onChange={(e) => setImportType(e.target.value as any)}
                    className="bg-slate-50 border border-slate-200 p-2.5 w-full text-xs rounded-xl font-bold cursor-pointer text-right outline-none focus:border-blue-500"
                  >
                    <option value="errors">📂 پرونده کامل کدهای خطای فنی (Error Codes)</option>
                    <option value="categories">🏷️ دسته‌بندی لوازم و نوع دستگاه‌ها</option>
                    <option value="brands">🏭 شرکت‌های سازنده و برندها</option>
                    <option value="cities">📍 شهرها به همراه محلات (فرمت CSV: شهر,محله۱,محله۲)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-extrabold text-slate-700 block mb-1">بارگذاری فایل از دیسک (.json, .csv):</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept=".json,.csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const text = event.target?.result as string;
                            if (text) {
                              setPastedImportData(text);
                              setImportStatus({ type: 'idle', msg: `فایل "${file.name}" بارگذاری شد. جهت ثبت، روی دکمه شروع پردازش کلیک کنید.` });
                            }
                          };
                          reader.readAsText(file);
                        }
                      }}
                      className="hidden"
                      id="bulk-file-uploader-backups-tab"
                    />
                    <label
                      htmlFor="bulk-file-uploader-backups-tab"
                      className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs py-2.5 px-4 rounded-xl border border-slate-300 transition-all font-bold cursor-pointer inline-block"
                    >
                      📂 انتخاب فایل از رایانه
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-extrabold text-slate-700 block mb-1">داده‌های کپی شده از اکسل/متن را در کادر زیر بچسبانید:</label>
                <textarea
                  rows={4}
                  value={pastedImportData}
                  onChange={(e) => setPastedImportData(e.target.value)}
                  placeholder={
                    importType === 'errors' 
                      ? 'فرمت نمونه JSON: [{"code": "E1", "title": "خطای ترمیستور", "category": "پکیج", "brand": "Valtro", "model": "B5-C2", "description": "نقص در مدار آبگرم"}]'
                      : 'داده‌ها را خط به خط وارد کنید.'
                  }
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-[11px] font-mono text-right outline-none focus:border-blue-500"
                />
              </div>

              {importStatus.msg && (
                <div className={`p-3 rounded-xl text-xs font-bold leading-relaxed text-right border ${
                  importStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-250' :
                  importStatus.type === 'error' ? 'bg-rose-50 text-rose-800 border-rose-250' : 'bg-blue-50 text-blue-800 border-blue-250 font-sans'
                }`}>
                  {importStatus.type === 'success' ? '✓ ' : importStatus.type === 'error' ? '✕ ' : 'ℹ️ '}
                  {importStatus.msg}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={processBulkImport}
                  className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-8 py-3 text-xs font-black shadow-md transition-all cursor-pointer"
                >
                  شروع پردازش و ادغام با دیتابیس کدیار۲۴
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 5: SAFE DATA WIPING & CLEANING OPERATIONS */}
          <div className="bg-white border border-rose-200 shadow-sm rounded-3xl p-6 space-y-4">
            <div className="border-b border-rose-100 pb-3">
              <h4 className="font-extrabold text-sm text-rose-950 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" />
                <span>۵. پاکسازی و صفر کردن کدهای خطا و عیب‌یابی</span>
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                صفر کردن کدهای خطای موجود جهت بارگذاری دیتابیس جدید. توجه: حساب مشتریان، تکنسین‌ها و سفارشات کاملاً دست‌نخورده باقی می‌مانند.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-rose-50/50 p-4 rounded-2xl border border-rose-100">
              <div className="text-right space-y-1">
                <span className="text-xs font-black text-rose-950 block">محدوده پاکسازی: فقط کدهای خطا و مشکلات متداول</span>
                <span className="text-[10px] text-slate-500 block">اطلاعات هویتی تکنسین‌ها، مشتریان، خریدهای انبار و سفارشات کاملاً حفظ می‌شوند.</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!onResetDatabase) return;
                  triggerSafeConfirm(
                    'پاکسازی کدهای خطا و عیب‌یابی',
                    'کلیه کدهای خطای ثبت شده دائم حذف خواهند شد. اطلاعات تکنسین‌ها، مشتریان و سفارشات حفظ می‌شوند. آیا مطمئن هستید؟ جهت تایید رمز عبور مدیریت الزامی است.',
                    () => onResetDatabase(),
                    true
                  );
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl px-6 py-2.5 text-xs font-extrabold transition-all cursor-pointer shadow-xs flex items-center gap-1.5 shrink-0"
              >
                <Trash2 className="w-4 h-4" />
                <span>پاکسازی ارورها و ریست عیب‌یابی</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {activeTab === 'system_errors' && (
        <div className="space-y-6 animate-in fade-in duration-200 text-right font-sans">
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-150 rounded-2xl p-4 text-xs text-red-950 leading-relaxed flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-right">
              <h4 className="font-extrabold text-[13px] text-red-900">جدول ردیابی خطاهای نرم‌افزاری و تلمتری کرش (error_logs Table Analyzer)</h4>
              <p>این جدول به صورت کاملاً خودکار کرش‌های مربوط به مرورگر کاربران، خطاهای سرور و خطاهای دیتابیس را به همراه Stack Trace ذخیره می‌کند تا توسعه‌دهندگان بتوانند بلافاصله مشکلات سیستم را برطرف کنند.</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-800">کدهای خطای ثبت شده (React & Express Runtime)</h3>
            {systemErrorsLoading ? (
              <div className="text-center py-12 text-xs text-slate-500">در حال بارگذاری لیست خطاها...</div>
            ) : systemErrorsList.length === 0 ? (
              <div className="text-center py-12 text-xs text-emerald-650 font-bold bg-emerald-50 rounded-2xl border border-emerald-100 p-4">بسیار عالی! هیچ خطای نرم‌افزاری گزارش نشده و وضعیت سیستم کاملاً پایدار (Healthy) است.</div>
            ) : (
              <div className="space-y-4">
                {systemErrorsList.map((err: any) => (
                  <div key={err.id} className="p-4 border border-red-100 bg-red-50/20 rounded-2xl space-y-2 text-right">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-red-105/10 pb-2">
                      <span className="text-xs font-black text-red-700 text-right block">{err.errorMessage}</span>
                      <span className="text-[10px] text-slate-400 font-mono text-left block">{err.created_at ? new Date(err.created_at).toLocaleString('fa-IR') : ''}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500">
                      <span className="text-right">کاربر: <strong className="text-slate-700">{err.userId}</strong></span>
                      <span className="text-left">صفحه: <strong className="text-slate-700 font-mono">{err.url}</strong></span>
                    </div>
                    {err.stack_trace && (
                      <pre className="w-full bg-slate-900 text-slate-200 text-[9px] p-3 rounded-xl overflow-x-auto text-left font-mono max-h-28 whitespace-pre-wrap">
                        {err.stack_trace}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'tickets' && (
        <div className="space-y-6 animate-in fade-in duration-200 text-right font-sans">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-150 rounded-2xl p-4 text-xs text-indigo-950 leading-relaxed flex items-start gap-2.5">
            <MessageSquare className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-right">
              <h4 className="font-extrabold text-[13px] text-blue-900">سامانه پشتیبانی و تیکت‌های کاربران کدیار۲۴</h4>
              <p>این مرکز ارتباط هوشمند به کاربران و مشتریان اجازه می‌دهد تیکت‌های فنی یا مالی باز کنند. شما به عنوان پشتیبان می‌توانید مکالمات فعال را پیگیری کنید، به سؤالات تخصصی پاسخ دهید و وضعیت تیکت‌ها را مدیریت نمایید.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tickets List Section */}
            <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-800">لیست تیکت‌ها</h3>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                  {adminTicketsList.length} تیکت
                </span>
              </div>

              {/* Status Filter */}
              <div className="flex flex-wrap gap-1">
                {(['all', 'open', 'pending', 'resolved', 'closed'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setAdminTicketFilter(st)}
                    className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                      adminTicketFilter === st
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {st === 'all' ? 'همه' : st === 'open' ? 'باز' : st === 'pending' ? 'پاسخ داده شده' : st === 'resolved' ? 'حل شده' : 'بسته شده'}
                  </button>
                ))}
              </div>

              {/* Scrollable list */}
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {adminTicketsLoading ? (
                  <div className="text-center py-10 text-xs text-slate-400">در حال دریافت تیکت‌ها...</div>
                ) : adminTicketsList.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">هیچ تیکتی وجود ندارد.</div>
                ) : (
                  adminTicketsList
                    .filter(t => {
                      if (adminTicketFilter === 'all') return true;
                      if (adminTicketFilter === 'pending') return t.status === 'pending' || t.status === 'answered';
                      if (adminTicketFilter === 'open') return t.status === 'open' || !t.status;
                      return t.status === adminTicketFilter;
                    })
                    .map((tk: any) => {
                      const updatedDateStr = tk.updatedAt || tk.updated_at || tk.createdAt || tk.created_at;
                      let formattedDate = '—';
                      try {
                        if (updatedDateStr) {
                          const d = new Date(updatedDateStr);
                          if (!isNaN(d.getTime())) formattedDate = d.toLocaleDateString('fa-IR');
                        }
                      } catch {}

                      return (
                        <div
                          key={tk.id}
                          onClick={() => setActiveAdminTicketId(tk.id)}
                          className={`p-3 border rounded-xl cursor-pointer text-right transition-all ${
                            activeAdminTicketId === tk.id
                              ? 'border-blue-500 bg-blue-50/25'
                              : 'border-slate-100 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-slate-800 line-clamp-1">{tk.title || tk.subject}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-extrabold ${
                              tk.status === 'closed'
                                ? 'bg-slate-100 text-slate-500'
                                : tk.status === 'resolved'
                                  ? 'bg-emerald-50 text-emerald-800'
                                  : (tk.status === 'pending' || tk.status === 'answered')
                                    ? 'bg-blue-50 text-blue-800'
                                    : 'bg-amber-50 text-amber-850'
                            }`}>
                              {tk.status === 'closed' ? 'بسته شده' : tk.status === 'resolved' ? 'حل شده' : (tk.status === 'pending' || tk.status === 'answered') ? 'پاسخ داده شده' : 'در انتظار بررسی'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-2 flex justify-between items-center">
                            <span>بخش: {tk.category === 'technical' ? 'فنی' : tk.category === 'wallet' ? 'مالی کیف پول' : 'عمومی'}</span>
                            <span>اولویت: {tk.priority === 'high' ? '🔴 فوری' : tk.priority === 'medium' ? '🟡 متوسط' : '🟢 معمولی'}</span>
                          </div>
                          <div className="text-[9px] text-slate-400 mt-1 flex justify-between items-center border-t border-slate-50 pt-1.5 font-mono">
                            <span>کاربر: {tk.userName} ({tk.userPhone})</span>
                            <span>{formattedDate}</span>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            {/* Conversation/Thread Area */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-5 text-right flex flex-col justify-between min-h-[450px]">
              {(() => {
                const activeTicket = adminTicketsList.find(t => String(t.id) === String(activeAdminTicketId));
                if (!activeTicket) {
                  return (
                    <div className="m-auto text-center space-y-2">
                      <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs text-slate-400">یک تیکت را برای مشاهده گفتگو و ارسال پاسخ انتخاب کنید.</p>
                    </div>
                  );
                }

                const ticketCreatedStr = activeTicket.createdAt || activeTicket.created_at;
                const ticketUpdatedStr = activeTicket.updatedAt || activeTicket.updated_at || ticketCreatedStr;
                let formattedCreated = '—';
                let formattedUpdated = '—';
                try {
                  if (ticketCreatedStr) {
                    const d1 = new Date(ticketCreatedStr);
                    if (!isNaN(d1.getTime())) formattedCreated = d1.toLocaleString('fa-IR');
                  }
                  if (ticketUpdatedStr) {
                    const d2 = new Date(ticketUpdatedStr);
                    if (!isNaN(d2.getTime())) formattedUpdated = d2.toLocaleString('fa-IR');
                  }
                } catch {}

                return (
                  <div className="flex flex-col h-full justify-between gap-4">
                    {/* Header */}
                    <div className="border-b border-slate-100 pb-3 flex justify-between items-start flex-wrap gap-2">
                      <div className="space-y-1">
                        <span className="text-xs bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded-full font-bold font-mono">تیکت #{activeTicket.id?.substring(0, 8)}</span>
                        <h4 className="font-extrabold text-sm text-slate-800 mt-1">{activeTicket.title || activeTicket.subject}</h4>
                        <p className="text-[10px] text-slate-400">کاربر: {activeTicket.userName} ({activeTicket.userPhone}) | آخرین بروزرسانی: {formattedUpdated}</p>
                      </div>

                      {/* Status Action controls */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10.5px] text-slate-500 font-bold ml-1">تغییر وضعیت:</span>
                        {(['open', 'resolved', 'closed'] as const).map((st) => (
                          <button
                            key={st}
                            onClick={() => handleAdminChangeStatus(activeTicket.id, st)}
                            className={`px-2.5 py-1 text-[9.5px] font-black rounded-lg transition-all cursor-pointer ${
                              activeTicket.status === st || (st === 'open' && (activeTicket.status === 'open' || !activeTicket.status))
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {st === 'open' ? 'بررسی مجدد' : st === 'resolved' ? 'حل شده' : 'بستن تیکت'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Messages Scrollbox */}
                    <div className="flex-1 space-y-3 overflow-y-auto max-h-[300px] text-xs p-2 bg-slate-50 rounded-2xl border border-slate-100">
                      {/* Initial description card */}
                      <div className="p-3 bg-blue-50/70 border border-blue-100/50 rounded-2xl space-y-1">
                        <div className="flex justify-between items-center text-[10px] text-blue-800 font-bold font-mono">
                          <span>شروع کننده گفتگو ({activeTicket.userName})</span>
                          <span>{formattedCreated}</span>
                        </div>
                        <p className="text-slate-800 leading-relaxed text-[11px] whitespace-pre-wrap">{activeTicket.description || activeTicket.message}</p>
                      </div>

                      {/* Messages Thread list */}
                      {activeTicket.messages && activeTicket.messages.map((m: any, mIdx: number) => {
                        const isStaff = m.sender === 'staff' || m.sender_type === 'admin' || m.senderRole === 'admin';
                        let msgDateFormatted = '—';
                        try {
                          const md = m.createdAt || m.created_at;
                          if (md) {
                            const d = new Date(md);
                            if (!isNaN(d.getTime())) msgDateFormatted = d.toLocaleString('fa-IR');
                          }
                        } catch {}

                        return (
                          <div
                            key={m.id || `msg_${mIdx}_${m.createdAt || ''}`}
                            className={`p-3 rounded-2xl max-w-[85%] space-y-1 transition-all ${
                              isStaff
                                ? 'bg-indigo-600 text-white mr-auto border-l-4 border-indigo-500 rounded-tl-none'
                                : 'bg-white text-slate-800 ml-auto border border-slate-150 rounded-tr-none'
                            }`}
                          >
                            <div className={`flex justify-between items-center text-[9px] font-black ${
                              isStaff ? 'text-indigo-200' : 'text-slate-400'
                            }`}>
                              <span>{m.senderName || (isStaff ? 'پشتیبان سیستم' : activeTicket.userName)} ({isStaff ? 'پشتیبان سیستم' : 'مشتری'})</span>
                              <span className="font-mono">{msgDateFormatted}</span>
                            </div>
                            <p className="leading-relaxed text-[10.5px] whitespace-pre-wrap">{m.text || m.message}</p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Quick message feedback status */}
                    {adminTicketStatusMsg && (
                      <p className="text-xs text-right animate-pulse transition-all font-bold text-emerald-650">{adminTicketStatusMsg}</p>
                    )}

                    {/* Reply Form */}
                    <form onSubmit={handleAdminSendReply} className="border-t border-slate-100 pt-3 space-y-2.5">
                      <div className="flex gap-2">
                        <textarea
                          required
                          rows={2}
                          value={adminReplyInput}
                          onChange={(e) => setAdminReplyInput(e.target.value)}
                          placeholder="پاسخ یا نظر فنی خود را برای کاربر ارسال نمایید..."
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:bg-white focus:border-indigo-500 transition-all resize-none"
                        />
                        <button
                          type="submit"
                          disabled={submittingAdminReply}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer disabled:bg-slate-300"
                        >
                          {submittingAdminReply ? 'در حال ارسال...' : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>ارسال</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'affiliate' && (
        <div className="bg-white rounded-2xl border border-slate-205 overflow-hidden p-5 animate-in fade-in duration-150 text-right space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">سامانه همکاری در فروش قطعات (Affiliate Products)</h3>
              <p className="text-slate-500 text-[11px] mt-1">
                مدیریت محصولات فروشگاه‌های همکار کدیار۲۴ جهت معرفی قطعات، لوازم جانبی و کسب درآمد از کمیسیون فروش.
              </p>
            </div>
            <button
              onClick={() => setIsAddAffiliateOpen(!isAddAffiliateOpen)}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2.5 text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 transition-all text-right active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{isAddAffiliateOpen ? 'بستن فرم ثبت' : 'افزودن محصول همکار'}</span>
            </button>
          </div>

          {isAddAffiliateOpen && (
            <form onSubmit={handleAddAffiliateProduct} className="bg-slate-900 text-slate-100 rounded-2xl p-5 border border-slate-850 shadow-lg space-y-4">
              <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono tracking-wider text-blue-400 font-extrabold font-mono">NEW FILE DATA ENTRY</span>
                <h4 className="text-xs font-extrabold text-white">ثبت محصول همکاری در فروش جدید</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold">
                <div>
                  <label className="block text-slate-300 text-[10.5px] font-bold mb-1">نام قطعه / عنوان کالا *</label>
                  <input
                    type="text"
                    required
                    placeholder="مانند: پمپ هیدرو کلیک پکیج، سنسور NTC، برد کنترل"
                    value={newAffiliateTitle}
                    onChange={(e) => setNewAffiliateTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-blue-500 outline-none text-right font-sans"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 text-[10.5px] font-bold mb-1">آدرس آیکون یا تصویر کالا (اختیاری)</label>
                  <input
                    type="url"
                    placeholder="لینک تصویر کالا یا رها کنید تا پیشفرض قرار گیرد"
                    value={newAffiliateImage}
                    onChange={(e) => setNewAffiliateImage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-blue-500 outline-none text-left font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-bold">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAffiliateCategoryMode(affiliateCategoryMode === 'select' ? 'custom' : 'select');
                      }}
                      className="text-[9.5px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 transition-colors"
                    >
                      {affiliateCategoryMode === 'select' ? '➕ تایپ دسته‌بندی جدید' : '📋 انتخاب از لیست'}
                    </button>
                    <label className="block text-slate-300 text-[10.5px] font-bold">دسته‌بندی محصول *</label>
                  </div>
                  {affiliateCategoryMode === 'select' ? (
                    <select
                      required
                      value={newAffiliateCategory}
                      onChange={(e) => {
                        if (e.target.value === '__custom__') {
                          setAffiliateCategoryMode('custom');
                          setNewAffiliateCategory('');
                        } else {
                          setNewAffiliateCategory(e.target.value);
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-blue-500 outline-none text-right cursor-pointer"
                    >
                      <option value="">انتخاب دسته‌بندی...</option>
                      {categoriesList.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="__custom__" className="text-blue-400 font-extrabold">➕ تایپ دسته‌بندی جدید (مانند آبگرمکن)...</option>
                    </select>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        required
                        list="affiliate-add-categories-list"
                        placeholder="مانند: آبگرمکن، پکیج دیواری..."
                        value={newAffiliateCategory}
                        onChange={(e) => setNewAffiliateCategory(e.target.value)}
                        className="w-full bg-slate-950 border border-blue-500 ring-1 ring-blue-500/30 rounded-xl p-2.5 text-xs text-white focus:border-blue-400 outline-none text-right font-sans"
                        autoFocus
                      />
                      <datalist id="affiliate-add-categories-list">
                        {categoriesList.map((cat) => (
                          <option key={cat} value={cat} />
                        ))}
                        <option value="آبگرمکن" />
                        <option value="پکیج دیواری" />
                        <option value="کولر گازی" />
                        <option value="ماشین لباسشویی" />
                        <option value="یخچال و فریزر" />
                        <option value="ماشین ظرفشویی" />
                      </datalist>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAffiliateBrandMode(affiliateBrandMode === 'select' ? 'custom' : 'select');
                      }}
                      className="text-[9.5px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 transition-colors"
                    >
                      {affiliateBrandMode === 'select' ? '➕ تایپ برند جدید' : '📋 انتخاب از لیست'}
                    </button>
                    <label className="block text-slate-300 text-[10.5px] font-bold">برند دستگاه *</label>
                  </div>
                  {affiliateBrandMode === 'select' ? (
                    <select
                      required
                      value={newAffiliateBrand}
                      onChange={(e) => {
                        if (e.target.value === '__custom__') {
                          setAffiliateBrandMode('custom');
                          setNewAffiliateBrand('');
                        } else {
                          setNewAffiliateBrand(e.target.value);
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-blue-500 outline-none text-right cursor-pointer"
                    >
                      <option value="">انتخاب برند...</option>
                      {brandsList.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                      <option value="__custom__" className="text-blue-400 font-extrabold">➕ تایپ برند جدید (مانند بوتان، پلار)...</option>
                    </select>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        required
                        list="affiliate-add-brands-list"
                        placeholder="مانند: بوتان، پلار، لورچ..."
                        value={newAffiliateBrand}
                        onChange={(e) => setNewAffiliateBrand(e.target.value)}
                        className="w-full bg-slate-950 border border-blue-500 ring-1 ring-blue-500/30 rounded-xl p-2.5 text-xs text-white focus:border-blue-400 outline-none text-right font-sans"
                        autoFocus
                      />
                      <datalist id="affiliate-add-brands-list">
                        {brandsList.map((b) => (
                          <option key={b} value={b} />
                        ))}
                        <option value="بوتان" />
                        <option value="پلار" />
                        <option value="ایران رادیاتور" />
                        <option value="لورچ" />
                        <option value="آزمایش" />
                      </datalist>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-slate-300 text-[10.5px] font-bold mb-1">مدل دستگاه *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: ورونا، پرلا ۲۴، B3115 یا عمومی"
                    value={newAffiliateModel}
                    onChange={(e) => setNewAffiliateModel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-blue-500 outline-none text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-bold">
                <div>
                  <label className="block text-slate-300 text-[10.5px] font-bold mb-1">قیمت محصول (تومان)</label>
                  <input
                    type="number"
                    placeholder="مثال: 450000"
                    value={newAffiliatePrice || ''}
                    onChange={(e) => setNewAffiliatePrice(Number(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white text-center font-mono focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 text-[10.5px] font-bold mb-1">درصد کمیسیون فروش (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="مثال: 10"
                    value={newAffiliateCommission || ''}
                    onChange={(e) => setNewAffiliateCommission(Number(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white text-center font-mono focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 text-[10.5px] font-bold mb-1">لینک خرید همکاری (Affiliate Link) *</label>
                  <input
                    type="url"
                    required
                    placeholder="https://partnerstore.com/product/123"
                    value={newAffiliateLink}
                    onChange={(e) => setNewAffiliateLink(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white text-left font-mono focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6 py-2.5 text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95"
                >
                  ثبت قطعه همکاری در فروش
                </button>
              </div>
            </form>
          )}

          {/* Edit Affiliate Product Modal */}
          {editingAffiliateId && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
              <div className="bg-slate-900 text-slate-100 rounded-3xl p-5 border border-slate-800 shadow-2xl max-w-2xl w-full text-right space-y-4">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <button 
                    onClick={() => setEditingAffiliateId(null)}
                    className="text-slate-400 hover:text-white text-xs font-bold bg-slate-800 px-3 py-1.5 rounded-xl"
                  >
                    انصراف
                  </button>
                  <h4 className="text-xs font-extrabold text-white">ویرایش محصول همکاری در فروش</h4>
                </div>

                <form onSubmit={handleEditAffiliateProduct} className="space-y-4 text-xs font-bold">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 text-[10.5px] font-bold mb-1">نام قطعه / عنوان کالا *</label>
                      <input
                        type="text"
                        required
                        value={editAffiliateTitle}
                        onChange={(e) => setEditAffiliateTitle(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-blue-500 outline-none text-right font-sans"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 text-[10.5px] font-bold mb-1">آدرس آیکون یا تصویر کالا (اختیاری)</label>
                      <input
                        type="url"
                        value={editAffiliateImage}
                        onChange={(e) => setEditAffiliateImage(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-blue-500 outline-none text-left font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditAffiliateCategoryMode(editAffiliateCategoryMode === 'select' ? 'custom' : 'select');
                          }}
                          className="text-[9.5px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 transition-colors"
                        >
                          {editAffiliateCategoryMode === 'select' ? '➕ تایپ دسته‌بندی جدید' : '📋 انتخاب از لیست'}
                        </button>
                        <label className="block text-slate-300 text-[10.5px] font-bold">دسته‌بندی محصول *</label>
                      </div>
                      {editAffiliateCategoryMode === 'select' ? (
                        <select
                          required
                          value={editAffiliateCategory}
                          onChange={(e) => {
                            if (e.target.value === '__custom__') {
                              setEditAffiliateCategoryMode('custom');
                              setEditAffiliateCategory('');
                            } else {
                              setEditAffiliateCategory(e.target.value);
                            }
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-blue-500 outline-none text-right cursor-pointer"
                        >
                          <option value="">انتخاب دسته‌بندی...</option>
                          {categoriesList.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                          <option value="__custom__" className="text-blue-400 font-extrabold">➕ تایپ دسته‌بندی جدید (مانند آبگرمکن)...</option>
                        </select>
                      ) : (
                        <div className="relative">
                          <input
                            type="text"
                            required
                            list="affiliate-edit-categories-list"
                            placeholder="مانند: آبگرمکن، پکیج دیواری..."
                            value={editAffiliateCategory}
                            onChange={(e) => setEditAffiliateCategory(e.target.value)}
                            className="w-full bg-slate-950 border border-blue-500 ring-1 ring-blue-500/30 rounded-xl p-2.5 text-xs text-white focus:border-blue-400 outline-none text-right font-sans"
                            autoFocus
                          />
                          <datalist id="affiliate-edit-categories-list">
                            {categoriesList.map((cat) => (
                              <option key={cat} value={cat} />
                            ))}
                            <option value="آبگرمکن" />
                            <option value="پکیج دیواری" />
                            <option value="کولر گازی" />
                            <option value="ماشین لباسشویی" />
                            <option value="یخچال و فریزر" />
                            <option value="ماشین ظرفشویی" />
                          </datalist>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditAffiliateBrandMode(editAffiliateBrandMode === 'select' ? 'custom' : 'select');
                          }}
                          className="text-[9.5px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 transition-colors"
                        >
                          {editAffiliateBrandMode === 'select' ? '➕ تایپ برند جدید' : '📋 انتخاب از لیست'}
                        </button>
                        <label className="block text-slate-300 text-[10.5px] font-bold">برند دستگاه *</label>
                      </div>
                      {editAffiliateBrandMode === 'select' ? (
                        <select
                          required
                          value={editAffiliateBrand}
                          onChange={(e) => {
                            if (e.target.value === '__custom__') {
                              setEditAffiliateBrandMode('custom');
                              setEditAffiliateBrand('');
                            } else {
                              setEditAffiliateBrand(e.target.value);
                            }
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-blue-500 outline-none text-right cursor-pointer"
                        >
                          <option value="">انتخاب برند...</option>
                          {brandsList.map(b => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                          <option value="__custom__" className="text-blue-400 font-extrabold">➕ تایپ برند جدید (مانند بوتان، پلار)...</option>
                        </select>
                      ) : (
                        <div className="relative">
                          <input
                            type="text"
                            required
                            list="affiliate-edit-brands-list"
                            placeholder="مانند: بوتان، پلار، لورچ..."
                            value={editAffiliateBrand}
                            onChange={(e) => setEditAffiliateBrand(e.target.value)}
                            className="w-full bg-slate-950 border border-blue-500 ring-1 ring-blue-500/30 rounded-xl p-2.5 text-xs text-white focus:border-blue-400 outline-none text-right font-sans"
                            autoFocus
                          />
                          <datalist id="affiliate-edit-brands-list">
                            {brandsList.map((b) => (
                              <option key={b} value={b} />
                            ))}
                            <option value="بوتان" />
                            <option value="پلار" />
                            <option value="ایران رادیاتور" />
                            <option value="لورچ" />
                            <option value="آزمایش" />
                          </datalist>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-slate-300 text-[10.5px] font-bold mb-1">مدل دستگاه *</label>
                      <input
                        type="text"
                        required
                        value={editAffiliateModel}
                        onChange={(e) => setEditAffiliateModel(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-blue-500 outline-none text-right"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-slate-300 text-[10.5px] font-bold mb-1">قیمت محصول (تومان)</label>
                      <input
                        type="number"
                        value={editAffiliatePrice || ''}
                        onChange={(e) => setEditAffiliatePrice(Number(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white text-center font-mono focus:border-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 text-[10.5px] font-bold mb-1">درصد کمیسیون فروش (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editAffiliateCommission || ''}
                        onChange={(e) => setEditAffiliateCommission(Number(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white text-center font-mono focus:border-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 text-[10.5px] font-bold mb-1">لینک خرید همکاری *</label>
                      <input
                        type="url"
                        required
                        value={editAffiliateLink}
                        onChange={(e) => setEditAffiliateLink(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white text-left font-mono focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6 py-2.5 text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95"
                    >
                      ذخیره تغییرات محصول
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Affiliate Products Table */}
          {(!affiliateProducts || affiliateProducts.length === 0) ? (
            <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-xs font-bold">هیچ محصول همکاری در فروش ثبت نشده است.</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-3xs">
              <table className="w-full text-right text-xs font-bold text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-800 text-[11px] font-black">
                  <tr>
                    <th className="p-3">ردیف</th>
                    <th className="p-3">نام قطعه / کالا</th>
                    <th className="p-3">دسته‌بندی</th>
                    <th className="p-3">برند و مدل</th>
                    <th className="p-3">قیمت قطعه</th>
                    <th className="p-3">درصد کمیسیون</th>
                    <th className="p-3">لینک خرید</th>
                    <th className="p-3 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {affiliateProducts.map((p, index) => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="p-3 text-slate-400 font-mono">{index + 1}</td>
                      <td className="p-3 font-extrabold text-slate-900">
                        <div className="flex items-center gap-2">
                          <img
                            src={p.image || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23f1f5f9'/><text x='50' y='55' font-size='28' text-anchor='middle'>⚙️</text></svg>"}
                            alt={p.name || p.title || p.brand}
                            className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-100"
                          />
                          <span>{p.name || p.title || `${p.brand} ${p.model}`}</span>
                        </div>
                      </td>
                      <td className="p-3 text-blue-700">{p.category}</td>
                      <td className="p-3 text-slate-800">{p.brand} | {p.model}</td>
                      <td className="p-3 text-emerald-700 font-mono">{p.price ? `${p.price.toLocaleString('fa-IR')} تومان` : 'نامشخص'}</td>
                      <td className="p-3 text-amber-600 font-mono">%{p.commission || 0}</td>
                      <td className="p-3">
                        <a
                          href={p.link || p.purchaseUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1 font-mono text-[11px]"
                        >
                          مشاهده لینک خرید ↗
                        </a>
                      </td>
                      <td className="p-3 text-center flex justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingAffiliateId(p.id);
                            setEditAffiliateTitle(p.title || p.name || '');
                            setEditAffiliateImage(p.image || '');
                            setEditAffiliateCategory(p.category);
                            setEditAffiliateCategoryMode(categoriesList.includes(p.category) ? 'select' : 'custom');
                            setEditAffiliateBrand(p.brand);
                            setEditAffiliateBrandMode(brandsList.includes(p.brand) ? 'select' : 'custom');
                            setEditAffiliateModel(p.model);
                            setEditAffiliatePrice(p.price || 0);
                            setEditAffiliateLink(p.link || p.purchaseUrl || '');
                            setEditAffiliateCommission(p.commission || 0);
                          }}
                          className="bg-amber-50 hover:bg-amber-600 text-amber-700 hover:text-white px-2.5 py-1 rounded-lg border border-amber-200 transition-all cursor-pointer text-[10px]"
                        >
                          ویرایش
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`آیا از حذف محصول همکاری در فروش "${p.name || p.title || p.brand + ' ' + p.model}" اطمینان دارید؟`)) {
                              if (onUpdateAffiliateProducts) {
                                const filtered = affiliateProducts.filter(x => x.id !== p.id);
                                onUpdateAffiliateProducts(filtered);
                              }
                            }
                          }}
                          className="bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white px-2.5 py-1 rounded-lg border border-rose-200 transition-all cursor-pointer text-[10px]"
                        >
                          حذف
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'featured_categories' && (
        <div className="bg-white rounded-2xl border border-slate-205 overflow-hidden p-5 animate-in fade-in duration-150 text-right space-y-6">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800">مدیریت دسته‌بندی‌های پیشنهادی و تکنسین برتر</h3>
            <p className="text-slate-500 text-[11px] mt-1">
              در این بخش می‌توانید اولویت نمایش دسته‌بندی‌ها در اپلیکیشن اندروید را تنظیم کرده و تکنسین برتر (توصیه‌کننده اصلی) هر دسته را مشخص کنید.
            </p>
          </div>

          <div className="border border-slate-150 rounded-2xl overflow-hidden">
            <div className="p-3 bg-slate-50 text-xs font-bold text-slate-700 grid grid-cols-12 gap-2 border-b border-slate-150 text-right">
              <div className="col-span-1 text-center">اولویت</div>
              <div className="col-span-3">نام دسته‌بندی پیشنهادی</div>
              <div className="col-span-5">تکنسین برتر (توصیه‌کننده اصلی)</div>
              <div className="col-span-3 text-center">جابجایی و ترتیب</div>
            </div>

            <div className="divide-y divide-slate-100">
              {categoriesList.map((cat, index) => {
                const currentConfig = categoryConfig?.[cat] || {};
                const currentTopTechId = currentConfig.topTechId || '';

                return (
                  <div key={cat} className="p-3 grid grid-cols-12 gap-2 items-center text-xs font-bold text-slate-800 hover:bg-slate-50/50">
                    <div className="col-span-1 text-center font-mono bg-slate-100 rounded-lg py-1">{index + 1}</div>
                    <div className="col-span-3 font-extrabold text-blue-700">{cat}</div>
                    <div className="col-span-5">
                      <select
                        value={currentTopTechId}
                        onChange={(e) => {
                          const updatedConfig = {
                            ...(categoryConfig || {}),
                            [cat]: {
                              ...(categoryConfig?.[cat] || {}),
                              topTechId: e.target.value
                            }
                          };
                          onUpdateCategoryConfig(updatedConfig);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-700 focus:border-blue-500 outline-none cursor-pointer"
                      >
                        <option value="">بدون تکنسین برتر (انتخاب خودکار سیستم)</option>
                        {technicians.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} (امتیاز: {t.rating} | رضایت: {t.satisfactionRate || 98}%)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3 flex justify-center gap-1">
                      <button
                        disabled={index === 0}
                        onClick={() => {
                          const newList = [...categoriesList];
                          const temp = newList[index];
                          newList[index] = newList[index - 1];
                          newList[index - 1] = temp;
                          if (onUpdateCategoriesList) {
                            onUpdateCategoriesList(newList);
                          }
                        }}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer transition-all"
                        title="انتقال به بالا"
                      >
                        <ChevronUp className="w-4 h-4 text-slate-650" />
                      </button>
                      <button
                        disabled={index === categoriesList.length - 1}
                        onClick={() => {
                          const newList = [...categoriesList];
                          const temp = newList[index];
                          newList[index] = newList[index + 1];
                          newList[index + 1] = temp;
                          if (onUpdateCategoriesList) {
                            onUpdateCategoriesList(newList);
                          }
                        }}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer transition-all"
                        title="انتقال به پایین"
                      >
                        <ChevronDown className="w-4 h-4 text-slate-650" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <AdminConfigSection 
        activeTab={activeTab}
        categoriesList={categoriesList}
        brandsList={brandsList}
        modelsList={modelsList}
        citiesList={citiesList}
        errorCodes={errorCodes}
        commonProblems={commonProblems}
        spareParts={spareParts}
        categoryConfig={categoryConfig}
        onUpdateCategoriesList={onUpdateCategoriesList}
        onUpdateBrandsList={onUpdateBrandsList}
        onUpdateModelsList={onUpdateModelsList}
        onUpdateCitiesList={onUpdateCitiesList}
        onUpdateCategoryConfig={onUpdateCategoryConfig}
        onUpdateErrorCodesList={onUpdateErrorCodesList}
        onRejectErrorCode={onRejectErrorCode}
        pageContents={pageContents}
        onUpdatePageContents={onUpdatePageContents}
        trustBadges={trustBadges}
        onUpdateTrustBadges={onUpdateTrustBadges}
        supportPhone={supportPhone}
        onUpdateSupportPhone={onUpdateSupportPhone}
      />

      {/* MODAL: Edit Error Code Full 10-Field Form */}
      {editingError && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full p-5 sm:p-6 text-right max-h-[92vh] overflow-y-auto flex flex-col space-y-4 font-sans">
            {/* Header */}
            <div className="border-b border-slate-100 pb-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-black text-slate-900">
                    ویرایش مشخصات تخصصی کد خطا ({editingError.code || 'بدون کد'})
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    دستگاه: {editingError.category || 'نامشخص'} | برند: {editingError.brand || 'عمومی'} | مدل: {editingError.model || 'عمومی'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingError(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                title="بستن پنجره"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveQuickEditError} className="space-y-4">
              {/* Row 1: Code, Category, Brand, Model */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* 1. Code */}
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                    ۱. کد خطا <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingError.code || ''}
                    onChange={(e) => setEditingError({ ...editingError, code: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-blue-700 outline-none focus:bg-white focus:border-blue-500 transition"
                    placeholder="مثال: E01 یا F20"
                  />
                </div>

                {/* 2. Category */}
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                    ۲. نوع دستگاه (دسته) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="modal-cat-list"
                    value={editingError.category || ''}
                    onChange={(e) => setEditingError({ ...editingError, category: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-500 transition"
                    placeholder="مثال: پکیج دیواری"
                  />
                  <datalist id="modal-cat-list">
                    {categoriesList.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                {/* 3. Brand */}
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                    ۳. برند تجاری <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="modal-brand-list"
                    value={editingError.brand || ''}
                    onChange={(e) => setEditingError({ ...editingError, brand: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-500 transition"
                    placeholder="مثال: بوتان یا بوش"
                  />
                  <datalist id="modal-brand-list">
                    {brandsList.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>

                {/* 4. Model */}
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                    ۴. مدل دستگاه
                  </label>
                  <input
                    type="text"
                    value={editingError.model || ''}
                    onChange={(e) => setEditingError({ ...editingError, model: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-500 transition"
                    placeholder="عمومی یا مدل دقیق"
                  />
                </div>
              </div>

              {/* Row 2: Title / Short Meaning */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                  ۵. عنوان عیب و مفهوم مختصر خطا <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingError.title || editingError.error_title || ''}
                  onChange={(e) => setEditingError({ ...editingError, title: e.target.value, error_title: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-500 transition"
                  placeholder="مثال: عدم تشکیل یا تشخیص شعله (روشن نشدن پکیج)"
                />
              </div>

              {/* Row 3: Description */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                  ۶. شرح کامل و توضیحات فنی خطا
                </label>
                <textarea
                  rows={2}
                  value={editingError.description || ''}
                  onChange={(e) => setEditingError({ ...editingError, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-500 transition leading-relaxed"
                  placeholder="توضیحات تفصیلی در مورد نحوه رخ دادن ارور و رفتار دستگاه..."
                />
              </div>

              {/* Row 4: Possible Causes & Solutions in 2 Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 7. Causes */}
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                    ۷. علت‌های احتمالی بروز خطا (هر علت در یک خط)
                  </label>
                  <textarea
                    rows={4}
                    value={
                      Array.isArray(editingError.possible_causes)
                        ? editingError.possible_causes.join('\n')
                        : Array.isArray(editingError.causes)
                        ? editingError.causes.join('\n')
                        : typeof editingError.possible_causes === 'string'
                        ? editingError.possible_causes
                        : typeof editingError.cause === 'string'
                        ? editingError.cause
                        : ''
                    }
                    onChange={(e) => {
                      const lines = e.target.value.split('\n');
                      setEditingError({
                        ...editingError,
                        possible_causes: lines,
                        causes: lines,
                        cause: e.target.value
                      });
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-500 transition leading-relaxed font-mono"
                    placeholder="افت فشار گاز ورودی&#10;خرابی الکترود یون و جرقه&#10;سوختن بوبین شیر گاز"
                  />
                </div>

                {/* 8. Solutions & Steps */}
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                    ۸. مراحل رفع عیب و راه‌حل‌ها (هر مرحله در یک خط)
                  </label>
                  <textarea
                    rows={4}
                    value={
                      Array.isArray(editingError.steps)
                        ? editingError.steps.join('\n')
                        : Array.isArray(editingError.solutions)
                        ? editingError.solutions.join('\n')
                        : typeof editingError.solution === 'string'
                        ? editingError.solution
                        : typeof editingError.solutions === 'string'
                        ? editingError.solutions
                        : ''
                    }
                    onChange={(e) => {
                      const lines = e.target.value.split('\n');
                      setEditingError({
                        ...editingError,
                        steps: lines,
                        solutions: lines,
                        solution: e.target.value
                      });
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-500 transition leading-relaxed font-mono"
                    placeholder="شیر اصلی گاز را چک کنید.&#10;فاصله الکترود جرقه تا مشعل را تنظیم کنید (۳ میلی‌متر).&#10;برد الکترونیک را عیب‌یابی نمایید."
                  />
                </div>
              </div>

              {/* Row 5: Related Parts & Hazard Level */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {/* 9. Related Parts */}
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                    ۹. قطعات یدکی مرتبط (جدا شده با ویرگول)
                  </label>
                  <input
                    type="text"
                    value={
                      Array.isArray(editingError.relatedParts)
                        ? editingError.relatedParts.join('، ')
                        : typeof editingError.relatedParts === 'string'
                        ? editingError.relatedParts
                        : ''
                    }
                    onChange={(e) => {
                      const parts = e.target.value.split(/[,،]/).map((p) => p.trim()).filter(Boolean);
                      setEditingError({ ...editingError, relatedParts: parts });
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-500 transition"
                    placeholder="الکترود یون، شیر برقی گاز، برد اصلی"
                  />
                </div>

                {/* 10. Hazard Level */}
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                    ۱۰. سطح خطر و حساسیت ایمنی
                  </label>
                  <select
                    value={editingError.hazardLevel || editingError.hazard_level || 'medium'}
                    onChange={(e) => setEditingError({ ...editingError, hazardLevel: e.target.value, hazard_level: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-500 transition"
                  >
                    <option value="low">کم (ایمن برای کاربر عادی)</option>
                    <option value="medium">متوسط (احتیاط عمومی)</option>
                    <option value="high">بالا (نیازمند تکنسین متخصص)</option>
                    <option value="critical">بحرانی و اضطراری (خطر نشت گاز/برق‌گرفتگی)</option>
                  </select>
                </div>

                {/* Technician Required Checkbox */}
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="modal-tech-req"
                    checked={Boolean(editingError.technician_required ?? true)}
                    onChange={(e) => setEditingError({ ...editingError, technician_required: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <label htmlFor="modal-tech-req" className="text-xs font-bold text-slate-700 cursor-pointer">
                    نیاز به حضور تکنسین مجاز
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingError(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
                >
                  انصراف و بستن
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>ذخیره تغییرات و اعمال در دیتابیس</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SAFE CONFIRMATION DIALOG MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 text-right flex flex-col space-y-4 font-sans">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-black text-slate-900 truncate">
                  {showConfirmModal.title}
                </h4>
                <p className="text-[11px] text-rose-600 font-bold mt-0.5">عملیات قطعی و حساس مدیریتی</p>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                title="بستن"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {showConfirmModal.message}
            </p>

            {showConfirmModal.requiresPasswordVerify && (
              <div className="space-y-1.5 pt-1">
                <label className="block text-[11px] font-extrabold text-slate-700">
                  کلمه عبور مدیریت جهت تأیید قطعی:
                </label>
                <input
                  type="password"
                  value={confirmPasswordInput}
                  onChange={(e) => {
                    setConfirmPasswordInput(e.target.value);
                    setConfirmPasswordError('');
                  }}
                  placeholder="رمز مدیریت..."
                  className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl outline-none text-right font-mono focus:border-rose-500 focus:bg-white"
                />
                {confirmPasswordError && (
                  <p className="text-[11px] text-rose-600 font-bold">{confirmPasswordError}</p>
                )}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowConfirmModal(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
              >
                انصراف و لغو
              </button>
              <button
                type="button"
                onClick={() => {
                  if (showConfirmModal.requiresPasswordVerify) {
                    if (!confirmPasswordInput.trim()) {
                      setConfirmPasswordError('لطفاً رمز مدیریت را وارد کنید.');
                      return;
                    }
                    if (adminPassword && confirmPasswordInput !== adminPassword) {
                      setConfirmPasswordError('رمز مدیریت وارد شده نادرست است.');
                      return;
                    }
                  }
                  const action = showConfirmModal.onConfirm;
                  const enteredPass = confirmPasswordInput;
                  setShowConfirmModal(null);
                  if (action) action(enteredPass);
                }}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>تأیید و اجرای عملیات</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
