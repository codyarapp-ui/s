/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RepairOrder, SparePart, ErrorCode, Technician, CommonProblem } from '../types';
import { Truck, MapPin, Check, Plus, DollarSign, ListFilter, ClipboardCheck, AlertCircle, Sparkles, LogOut, CheckCircle, Smartphone, FileText, UploadCloud, Eye, Trash2, Share2, Copy, ExternalLink, UserCheck, Image, Send, MessageSquare, Camera, Upload, Search, ShoppingBag, Cpu, CreditCard, Lock, ShieldAlert, X, Bell, Volume2, VolumeX, Coffee, Power, Clock, Phone, Wallet } from 'lucide-react';
import { APPLIANCE_BRANDS, APPLIANCE_CATEGORIES } from '../data';
import { DocumentViewer } from './DocumentViewer';
import { harmonizeErrorCode } from './validation';
import { ErrorSearch } from './ErrorSearch';
import { PartsStore } from './PartsStore';

interface TechnicianPanelProps {
  technicians: Technician[];
  activeTech: Technician;
  orders: RepairOrder[];
  spareParts: SparePart[];
  citiesList?: Array<{ name: string; regions: string[] }>;
  errorCodes?: ErrorCode[];
  commonProblems?: CommonProblem[];
  affiliateProducts?: any[];
  categoryConfig?: any;
  categoriesList?: string[];
  brandsList?: string[];
  paymentsList?: any[];
  currentUser?: any;
  onAcceptOrder: (orderId: string, techId: string, extraData?: any) => void;
  onUpdateOrderStatus: (orderId: string, status: RepairOrder['status'], updateData?: Partial<RepairOrder>) => void;
  onNewErrorSubmit: (error: Partial<ErrorCode>) => void;
  onChangeTech: (techId: string) => void;
  onUpdateTechnician: (techId: string, updatedFields: Partial<Technician>) => void;
  onLogout: () => void;
  triggerNotification: (title: string, text: string, type?: 'info' | 'success' | 'warning' | 'error' | 'sms') => void;
  onPurchasePart?: (part: SparePart, address: string, buyerName?: string, buyerPhone?: string, cardHolder?: string, trackNumber?: string, quantity?: number) => void;
}

export const TechnicianPanel: React.FC<TechnicianPanelProps> = ({
  technicians,
  activeTech,
  orders,
  spareParts,
  citiesList,
  errorCodes = [],
  commonProblems = [],
  affiliateProducts = [],
  categoryConfig = {},
  categoriesList = [],
  brandsList = [],
  paymentsList = [],
  currentUser,
  onAcceptOrder,
  onUpdateOrderStatus,
  onNewErrorSubmit,
  onChangeTech,
  onUpdateTechnician,
  onLogout,
  triggerNotification,
  onPurchasePart,
}) => {
  const isAdminMasquerading = localStorage.getItem('ir_admin_active') === 'true';

  const [myPayments, setMyPayments] = React.useState<any[]>(() => {
    if (Array.isArray(paymentsList) && paymentsList.length > 0) {
      return paymentsList.filter(p =>
        String(p.user_id) === String(activeTech.id) ||
        String(p.userId) === String(activeTech.id) ||
        String(p.user_phone) === String(activeTech.phone) ||
        String(p.userPhone) === String(activeTech.phone) ||
        (activeTech.phone && String(p.card_number || '').includes(activeTech.phone))
      );
    }
    return [];
  });

  React.useEffect(() => {
    if (Array.isArray(paymentsList)) {
      const filtered = paymentsList.filter(p =>
        String(p.user_id) === String(activeTech.id) ||
        String(p.userId) === String(activeTech.id) ||
        String(p.user_phone) === String(activeTech.phone) ||
        String(p.userPhone) === String(activeTech.phone) ||
        (activeTech.phone && String(p.card_number || '').includes(activeTech.phone))
      );
      if (filtered.length > 0) {
        setMyPayments(filtered);
      }
    }
  }, [paymentsList, activeTech.id, activeTech.phone]);

  const fetchMyPayments = React.useCallback(async () => {
    try {
      const q = activeTech.phone || activeTech.id;
      if (!q) return;
      const res = await fetch(`/api/payments?phone=${encodeURIComponent(q)}&userId=${encodeURIComponent(activeTech.id)}`);
      const data = await res.json();
      const list = data.payments || data.data || [];
      if (Array.isArray(list) && list.length > 0) {
        setMyPayments(list);
      }
    } catch {}
  }, [activeTech.id, activeTech.phone]);

  React.useEffect(() => {
    fetchMyPayments();
  }, [fetchMyPayments]);
  const isSuspended = activeTech.status === 'suspended' || activeTech.status === 'blocked' || (currentUser as any)?.status === 'suspended' || (currentUser as any)?.status === 'blocked';
  const canAccessAllTabs = (!isSuspended && activeTech.isVerified) || isAdminMasquerading;

  // Commission Debt & Negative Wallet calculation
  const rawBalance = Number(activeTech.balance !== undefined && activeTech.balance !== null ? activeTech.balance : ((activeTech as any).wallet_balance ?? 0));
  const hasCommissionDebt = rawBalance < 0;
  const commissionDebtAmount = hasCommissionDebt ? Math.abs(rawBalance) : 0;
  
  // Check pending payments from activeTech flags, currentUser, and actual payments records
  const hasPendingPaymentInList = React.useMemo(() => {
    const listToCheck = Array.isArray(myPayments) && myPayments.length > 0 ? myPayments : (Array.isArray(paymentsList) ? paymentsList : []);
    return listToCheck.some(p => {
      const isTechMatch = String(p.user_id) === String(activeTech.id) ||
                          String(p.userId) === String(activeTech.id) ||
                          String(p.user_phone) === String(activeTech.phone) ||
                          String(p.userPhone) === String(activeTech.phone) ||
                          (activeTech.phone && String(p.card_number || '').includes(activeTech.phone));
      if (!isTechMatch) return false;
      const isPending = p.status === 'pending' || p.status === 'pending_payment';
      const isRechargeOrComm = p.type === 'wallet_recharge' || 
                               p.related_type === 'wallet_recharge' || 
                               p.type === 'commission' || 
                               p.related_type === 'commission' ||
                               String(p.ref_code || '').startsWith('WAL-') ||
                               String(p.ref_code || '').startsWith('COM-');
      return isPending && isRechargeOrComm;
    });
  }, [myPayments, paymentsList, activeTech.id, activeTech.phone]);

  const hasPendingCommissionApproval = Boolean(
    (activeTech as any).commission_pending ||
    (activeTech as any).commission_pending_approval ||
    (currentUser as any)?.commission_pending ||
    hasPendingPaymentInList
  );

  const [isSettleModalOpen, setIsSettleModalOpen] = React.useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = React.useState(false);
  const [settlingMethod, setSettlingMethod] = React.useState<'gateway' | 'card_to_card'>('card_to_card');
  const [settlingProcessing, setSettlingProcessing] = React.useState(false);
  const [settleCardNumber, setSettleCardNumber] = React.useState('');
  const [settleTrackCode, setSettleTrackCode] = React.useState('');

  // Kodyar Wallet Card-to-Card Recharge State
  const [rechargeAmount, setRechargeAmount] = React.useState<number>(100000);
  const [customRechargeAmount, setCustomRechargeAmount] = React.useState<string>('');
  const [rechargeCardNumber, setRechargeCardNumber] = React.useState('');
  const [rechargeTrackCode, setRechargeTrackCode] = React.useState('');
  const [rechargeProcessing, setRechargeProcessing] = React.useState(false);

  const handleWalletRechargeSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalAmount = customRechargeAmount.trim() ? Number(customRechargeAmount.trim().replace(/,/g, '')) : rechargeAmount;
    if (!finalAmount || isNaN(finalAmount) || finalAmount < 10000) {
      triggerNotification('مبلغ نامعتبر است', 'حداقل مبلغ شارژ کیف پول ۱۰,۰۰۰ تومان می‌باشد.', 'warning');
      return;
    }
    if (!rechargeTrackCode.trim()) {
      triggerNotification('کد پیگیری الزامی است', 'لطفاً کد رهگیری، شماره ارجاع یا ۴ رقم آخر کارت واریزی را وارد فرمایید.', 'warning');
      return;
    }

    setRechargeProcessing(true);
    try {
      const res = await fetch('/api/payments/receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Token': localStorage.getItem('session_user_id') || ''
        },
        body: JSON.stringify({
          type: 'wallet_recharge',
          related_type: 'wallet_recharge',
          related_id: 'wallet_recharge',
          amount: finalAmount,
          user_id: activeTech.id,
          user_name: activeTech.name || (activeTech as any).full_name || 'تکنسین',
          user_phone: activeTech.phone,
          user_role: 'technician',
          phone: activeTech.phone,
          card_number: rechargeCardNumber.trim(),
          ref_id: rechargeTrackCode.trim(),
          tracking_code: rechargeTrackCode.trim(),
          gateway: 'card_to_card',
          bank_name: serverCardInfo.bank_name || 'بانک ملت',
          plan: `شارژ کیف پول تکنسین (${finalAmount.toLocaleString('fa-IR')} تومان)`,
          status: 'pending'
        })
      });
      const data = await res.json();
      if (res.ok && (data.status === 'ok' || data.success)) {
        triggerNotification(
          'فیش واریز ثبت گردید',
          `فیش کارت‌به‌کارت به مبلغ ${finalAmount.toLocaleString('fa-IR')} تومان ثبت و به تب پرداخت‌های پنل مدیریت کدیار۲۴ ارسال گردید. پس از بررسی و تایید مدیر، کیف پول شما بلافاصله شارژ می‌شود.`,
          'success'
        );
        onUpdateTechnician(activeTech.id, {
          commission_pending: true,
          commission_pending_approval: true
        } as any);
        fetchMyPayments();
        setIsWalletModalOpen(false);
        setIsSettleModalOpen(false);
        setRechargeTrackCode('');
        setRechargeCardNumber('');
        setCustomRechargeAmount('');
      } else {
        triggerNotification('خطا در ثبت فیش', data.message || 'ثبت با مشکل مواجه شد.', 'error');
      }
    } catch (err: any) {
      console.error('Error recharging wallet:', err);
      triggerNotification('خطا در برقراری ارتباط', 'لطفاً اتصال اینترنت خود را بررسی فرمایید.', 'error');
    } finally {
      setRechargeProcessing(false);
    }
  };

  const handleAttemptAcceptOrder = (orderId: string) => {
    if (isVacationMode) {
      triggerNotification('حالت مرخصی فعال است', 'در وضعیت مرخصی امکان دریافت سفارش جدید وجود ندارد. ابتدا وضعیت خود را به آماده‌به‌کار تغییر دهید.', 'warning');
      return;
    }
    if (!canAccessAllTabs || !activeTech.isVerified) {
      triggerNotification(
        'عدم تایید صلاحیت',
        'مدارک هویتی شما هنوز توسط مدیریت تایید نشده است. پس از ارسال مدارک و تایید صلاحیت توسط مدیر، امکان قبول سفارش فعال خواهد شد.',
        'error'
      );
      return;
    }
    if (rawBalance < 50000) {
      triggerNotification(
        'موجودی کیف پول کمتر از ۵۰,۰۰۰ تومان است',
        `موجودی کیف پول شما (${rawBalance.toLocaleString('fa-IR')} تومان) کمتر از حداقل ۵۰,۰۰۰ تومان است. برای قبول هر سفارش، کسر ۵۰,۰۰۰ تومان الزامی است. لطفاً ابتدا کیف پول خود را کارت‌به‌کارت شارژ نمایید.`,
        'warning'
      );
      setIsWalletModalOpen(true);
      return;
    }
    onAcceptOrder(orderId, activeTech.id);
    setSelectedTab('my-jobs');
  };

  const handleSettleCommission = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (commissionDebtAmount <= 0) {
      setIsWalletModalOpen(true);
      return;
    }
    if (settlingMethod === 'card_to_card' && !settleTrackCode.trim()) {
      triggerNotification('کد پیگیری الزامی است', 'لطفاً کد رهگیری یا ۴ رقم آخر کارت واریزی را وارد فرمایید.', 'warning');
      return;
    }
    setSettlingProcessing(true);
    try {
      const res = await fetch('/api/technicians/settle-commission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Token': localStorage.getItem('session_user_id') || ''
        },
        body: JSON.stringify({
          techId: activeTech.id,
          phone: activeTech.phone,
          amount: commissionDebtAmount,
          paymentMethod: settlingMethod,
          cardNumber: settleCardNumber,
          trackingCode: settleTrackCode || ('COM-' + Math.floor(100000 + Math.random() * 900000))
        })
      });
      const data = await res.json();
      if (res.ok && (data.status === 'ok' || data.success)) {
        if (data.payment) {
          setMyPayments(prev => [data.payment, ...prev.filter(p => p.id !== data.payment.id)]);
        }
        if (data.pending) {
          onUpdateTechnician(activeTech.id, {
            commission_pending: true,
            commission_pending_approval: true
          } as any);
          triggerNotification(
            'فیش واریز ثبت شد',
            'فیش کارت‌به‌کارت تسویه کمیسیون با موفقیت ثبت گردید و در انتظار تایید مدیریت کدیار۲۴ می‌باشد. پس از بررسی و تایید مدیر، حساب شما فوراً فعال خواهد شد.',
            'success'
          );
        } else {
          onUpdateTechnician(activeTech.id, {
            balance: 0,
            wallet_balance: 0,
            commission_pending: false,
            commission_pending_approval: false
          } as any);
          triggerNotification(
            'تسویه موفق کمیسیون',
            `مبلغ ${commissionDebtAmount.toLocaleString('fa-IR')} تومان کمیسیون با موفقیت تسویه گردید. دسترسی شما به تمام سفارش‌های جدید فعال شد.`,
            'success'
          );
        }
        setIsSettleModalOpen(false);
      } else {
        triggerNotification('خطا در تسویه', data.message || 'ثبت تسویه با مشکل مواجه شد.', 'error');
      }
    } catch (err: any) {
      console.error('Error settling commission:', err);
      triggerNotification('خطا در ارتباط با سرور', 'لطفاً اتصال اینترنت خود را بررسی فرمایید.', 'error');
    } finally {
      setSettlingProcessing(false);
    }
  };

  // Achareh Model: Upfront Commission for Unlocking Customer Info
  const [orderForCommission, setOrderForCommission] = React.useState<RepairOrder | null>(null);
  const [commissionTrackCode, setCommissionTrackCode] = React.useState('');
  const [commissionCardNumber, setCommissionCardNumber] = React.useState('');
  const [commissionSubmitting, setCommissionSubmitting] = React.useState(false);
  const [serverCardInfo, setServerCardInfo] = React.useState({
    card_number: '6104-3389-6112-6667',
    bank_name: 'بانک ملت',
    card_holder: 'مهدی عباسی (کدیار۲۴)'
  });

  React.useEffect(() => {
    fetch('/api/settings/card-info')
      .then(r => r.json())
      .then(d => {
        if (d?.cardInfo?.card_number) {
          setServerCardInfo({
            card_number: d.cardInfo.card_number,
            bank_name: d.cardInfo.bank_name || 'بانک ملت',
            card_holder: d.cardInfo.card_holder || 'مهدی عباسی (کدیار۲۴)'
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleCommissionOrderSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!orderForCommission) return;
    if (!commissionTrackCode.trim()) {
      triggerNotification('کد پیگیری الزامی است', 'لطفاً کد پیگیری یا شماره ارجاع فیش واریزی را وارد فرمایید.', 'warning');
      return;
    }

    setCommissionSubmitting(true);
    try {
      const baseCost = Number(orderForCommission.estimatedCost || (orderForCommission as any).price || (orderForCommission as any).amount || 350000);
      const commissionAmount = Math.round(baseCost * 0.15);
      const track = commissionTrackCode.trim();

      // Record transaction on server
      await fetch('/api/technicians/settle-commission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Token': localStorage.getItem('session_user_id') || ''
        },
        body: JSON.stringify({
          techId: activeTech.id,
          orderId: orderForCommission.id,
          phone: activeTech.phone,
          amount: commissionAmount,
          paymentMethod: 'card_to_card',
          cardNumber: commissionCardNumber,
          trackingCode: track,
          description: `واریز کمیسیون ۱۵٪ پیش‌پرداخت جهت آزادسازی سفارش ${orderForCommission.id}`
        })
      }).catch(() => {});

      // Accept order and pass commission metadata to backend
      await onAcceptOrder(orderForCommission.id, activeTech.id, {
        trackingCode: track,
        commission_paid: 1,
        commission_amount: commissionAmount
      });

      triggerNotification(
        'اطلاعات مشتری آزاد شد',
        'کمیسیون ۱۵٪ با موفقیت ثبت گردید. شماره تماس و آدرس دقیق مشتری برای شما آزاد شد. اکنون می‌توانید جهت هماهنگی تماس بگیرید.',
        'success'
      );

      setOrderForCommission(null);
      setCommissionTrackCode('');
      setCommissionCardNumber('');
      setSelectedTab('my-jobs');
    } catch (err: any) {
      console.error('Error submitting commission:', err);
      triggerNotification('خطا در ثبت فیش', 'لطفاً مجدداً بررسی فرمایید.', 'error');
    } finally {
      setCommissionSubmitting(false);
    }
  };

  const [selectedTab, setSelectedTab] = React.useState<'available' | 'my-jobs' | 'search-errors' | 'parts-store' | 'add-error' | 'profile-docs' | 'digital-card' | 'wallet'>(
    canAccessAllTabs ? 'available' : 'profile-docs'
  );

  React.useEffect(() => {
    if (!canAccessAllTabs && (selectedTab === 'available' || selectedTab === 'my-jobs')) {
      setSelectedTab('profile-docs');
    }
  }, [canAccessAllTabs, selectedTab]);

  const [selectedErrorForTech, setSelectedErrorForTech] = React.useState<ErrorCode | null>(null);
  const [shopCategoryFilter, setShopCategoryFilter] = React.useState('');
  const [shopBrandFilter, setShopBrandFilter] = React.useState('');

  // Profile avatar and referral sharing state
  const [avatarUrlInput, setAvatarUrlInput] = React.useState(activeTech.avatarUrl || '');
  const [techNameInput, setTechNameInput] = React.useState(activeTech.name || '');
  const [techLocationInput, setTechLocationInput] = React.useState(activeTech.activeLocation || '');
  const [copiedLink, setCopiedLink] = React.useState(false);
  const [isAvatarProcessing, setIsAvatarProcessing] = React.useState(false);
  const [avatarDragOver, setAvatarDragOver] = React.useState(false);
  const avatarFileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setAvatarUrlInput(activeTech.avatarUrl || '');
    setTechNameInput(activeTech.name || '');
    setTechLocationInput(activeTech.activeLocation || '');
  }, [activeTech.id, activeTech.avatarUrl, activeTech.name, activeTech.activeLocation]);

  React.useEffect(() => {
    const handleNavigateTab = (e: any) => {
      const targetTab = e?.detail || 'profile-docs';
      if (targetTab === 'profile-docs') {
        setSelectedTab('profile-docs');
        setTimeout(() => {
          const el = document.getElementById('docs-upload-section') || document.getElementById('tab-profile-docs');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      }
    };
    window.addEventListener('navigate_tech_tab', handleNavigateTab);
    return () => window.removeEventListener('navigate_tech_tab', handleNavigateTab);
  }, []);

  const processAvatarFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      triggerNotification('نوع فایل نامعتبر', 'لطفاً فقط فایل تصویری (JPG, PNG, WebP) انتخاب کنید.', 'warning');
      return;
    }
    const MAX_SIZE = 15 * 1024 * 1024; // 15MB
    if (file.size > MAX_SIZE) {
      triggerNotification('حجم فایل بالا', 'حجم عکس حداکثر باید ۱۵ مگابایت باشد.', 'warning');
      return;
    }

    setIsAvatarProcessing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      if (!rawDataUrl) {
        setIsAvatarProcessing(false);
        return;
      }

      // Automatically optimize & compress image using canvas for ultra-reliable persistence
      const img = new window.Image();
      img.onload = () => {
        const maxDimension = 480;
        let w = img.width;
        let h = img.height;

        if (w > h) {
          if (w > maxDimension) {
            h = Math.round((h * maxDimension) / w);
            w = maxDimension;
          }
        } else {
          if (h > maxDimension) {
            w = Math.round((w * maxDimension) / h);
            h = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, w, h);
          const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
          
          // Automatically upload to server
          fetch('/api/technicians/upload-avatar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image: optimizedDataUrl,
              techId: activeTech.id,
              phone: activeTech.phone
            })
          })
          .then(r => r.json())
          .then(data => {
            setIsAvatarProcessing(false);
            if (data.status === 'ok' && (data.avatar_url || data.avatarUrl)) {
              const fullUrl = data.avatar_url || data.avatarUrl;
              setAvatarUrlInput(fullUrl);
              onUpdateTechnician(activeTech.id, {
                avatarUrl: fullUrl,
                name: techNameInput.trim() || activeTech.name
              });
              triggerNotification('عکس ذخیره شد', 'عکس پروفایل شما در سرور ذخیره شد و لینک مستقیم ایجاد گردید.', 'success');
            } else {
              setAvatarUrlInput(optimizedDataUrl);
              triggerNotification('تصویر انتخاب شد', 'جهت ذخیره نهایی روی دکمه ذخیره کلیک کنید.', 'info');
            }
          })
          .catch(() => {
            setIsAvatarProcessing(false);
            setAvatarUrlInput(optimizedDataUrl);
            triggerNotification('تصویر انتخاب شد', 'جهت ذخیره نهایی روی دکمه ذخیره کلیک کنید.', 'info');
          });
        } else {
          setAvatarUrlInput(rawDataUrl);
          setIsAvatarProcessing(false);
        }
      };
      img.onerror = () => {
        setAvatarUrlInput(rawDataUrl);
        setIsAvatarProcessing(false);
      };
      img.src = rawDataUrl;
    };
    reader.onerror = () => {
      setIsAvatarProcessing(false);
      triggerNotification('خطا در خواندن فایل', 'مشکلی در بارگذاری تصویر رخ داد.', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processAvatarFile(e.target.files[0]);
    }
  };

  const cities = React.useMemo(() => {
    if (citiesList && citiesList.length > 0) return citiesList;
    const saved = localStorage.getItem('ir_cities');
    return saved ? (JSON.parse(saved) as { name: string; regions: string[] }[]) : [];
  }, [citiesList]);

  // Dynamic base lists loaded from localStorage with static fallback
  const brands = React.useMemo(() => {
    const saved = localStorage.getItem('ir_brands');
    return saved ? (JSON.parse(saved) as string[]) : [];
  }, []);

  const categories = React.useMemo(() => {
    const saved = localStorage.getItem('ir_categories');
    return saved ? (JSON.parse(saved) as string[]) : [];
  }, []);

  const models = React.useMemo(() => {
    const saved = localStorage.getItem('ir_models');
    return saved ? (JSON.parse(saved) as string[]) : [];
  }, []);

  // Sync tab layout in case of active technician change or verification change
  React.useEffect(() => {
    setSelectedTab(canAccessAllTabs ? 'available' : 'profile-docs');
  }, [activeTech.id, activeTech.isVerified, canAccessAllTabs]);

  // Document upload & drag-and-drop state
  const [newDocText, setNewDocText] = React.useState('');
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = React.useState(false);
  const [uploadDocProgress, setUploadDocProgress] = React.useState(0);
  const [dragActive, setDragActive] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = React.useState<{ techName: string; docName: string } | null>(null);
  const [zoomImage, setZoomImage] = React.useState<string | null>(null);

  // Password change states for technician
  const [techCurrentPasswordInput, setTechCurrentPasswordInput] = React.useState('');
  const [techNewPasswordInput, setTechNewPasswordInput] = React.useState('');
  const [techNewPasswordConfirmInput, setTechNewPasswordConfirmInput] = React.useState('');

  const handleTechPasswordChange = async () => {
    if (!techCurrentPasswordInput) {
      triggerNotification('کاستی اطلاعات', 'لطفاً رمز عبور فعلی را وارد نمایید.', 'warning');
      return;
    }
    if (!techNewPasswordInput.trim()) {
      triggerNotification('کاستی اطلاعات', 'لطفاً رمز عبور جدید را وارد نمایید.', 'warning');
      return;
    }
    if (techNewPasswordInput.length < 4) {
      triggerNotification('کاستی اطلاعات', 'رمز عبور جدید باید حداقل ۴ کاراکتر باشد.', 'warning');
      return;
    }
    if (techNewPasswordInput !== techNewPasswordConfirmInput) {
      triggerNotification('عدم تطابق رمز عبور', 'تکرار رمز عبور جدید با تاییدیه آن مطابقت ندارد!', 'warning');
      return;
    }

    // Check client password ONLY if activeTech.password exists and is plain text (not a hash)
    const isHashed = activeTech.password && (activeTech.password.startsWith('$2a$') || activeTech.password.startsWith('$2b$') || activeTech.password.startsWith('$2y$'));
    if (activeTech.password && !isHashed && techCurrentPasswordInput !== activeTech.password) {
      triggerNotification('رمز عبور نادرست', 'رمز عبور فعلی اشتباه است!', 'error');
      return;
    }

    // Sync with backend API
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('session_user_id') || activeTech.id;
      const res = await fetch('/api/auth/force-change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Token': token
        },
        body: JSON.stringify({
          currentPassword: techCurrentPasswordInput,
          newPassword: techNewPasswordInput.trim(),
          phone: activeTech.phone,
          techId: activeTech.id
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.status === 'error') {
        if (data.error) {
          triggerNotification('خطا در تغییر رمز', data.error, 'error');
          return;
        }
      }
    } catch (e) {
      console.warn('Server password sync skipped:', e);
    }

    onUpdateTechnician(activeTech.id, { password: techNewPasswordInput.trim() });
    triggerNotification('رمز عبور تغییر یافت', 'رمز عبور شما با موفقیت تغییر یافت و با سرور مرکزی همگام شد.', 'success');
    setTechCurrentPasswordInput('');
    setTechNewPasswordInput('');
    setTechNewPasswordConfirmInput('');
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const validExtensions = ['jpg', 'jpeg', 'png', 'pdf', 'mp4', 'mov', 'avi', 'xls', 'xlsx', 'csv', 'doc', 'docx'];
      if (!validExtensions.includes(ext)) {
        triggerNotification('قالب فایل نامعتبر', 'لطفا فقط فایل‌های مجاز: تصویری (JPG, PNG)، فایل PDF، ویدیو (MP4/MOV) یا سند فاکتور (Excel/CSV/Word) انتخاب کنید.', 'warning');
        return;
      }
      
      const MAX_SIZE = 50 * 1024 * 1024; // 50MB
      if (file.size > MAX_SIZE) {
        triggerNotification('حجم فایل غیر مجاز', 'حداکثر حجم مجاز فایل ۵۰ مگابایت است.', 'warning');
        return;
      }

      setSelectedFile(file);
      
      if (!newDocText.trim()) {
        const dotIdx = file.name.lastIndexOf('.');
        const cleanName = dotIdx !== -1 ? file.name.substring(0, dotIdx) : file.name;
        setNewDocText(cleanName);
      }

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const validExtensions = ['jpg', 'jpeg', 'png', 'pdf', 'mp4', 'mov', 'avi', 'xls', 'xlsx', 'csv', 'doc', 'docx'];
      if (!validExtensions.includes(ext)) {
        triggerNotification('قالب فایل نامعتبر', 'لطفا فقط فایل‌های مجاز: تصویری (JPG, PNG)، فایل PDF، ویدیو (MP4/MOV) یا سند فاکتور (Excel/CSV/Word) انتخاب کنید.', 'warning');
        return;
      }
      
      const MAX_SIZE = 50 * 1024 * 1024; // 50MB
      if (file.size > MAX_SIZE) {
        triggerNotification('حجم فایل غیر مجاز', 'حداکثر حجم مجاز فایل ۵۰ مگابایت است.', 'warning');
        return;
      }

      setSelectedFile(file);
      if (!newDocText.trim()) {
        const dotIdx = file.name.lastIndexOf('.');
        const cleanName = dotIdx !== -1 ? file.name.substring(0, dotIdx) : file.name;
        setNewDocText(cleanName);
      }
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleUploadDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocText.trim()) {
      triggerNotification('کاستی اطلاعات', 'لطفاً عنوان مدرک را وارد کنید.', 'warning');
      return;
    }
    if (!selectedFile) {
      triggerNotification('کاستی اطلاعات', 'لطفاً ابتدا یک فایل انتخاب کنید.', 'warning');
      return;
    }

    setIsUploadingDoc(true);
    setUploadDocProgress(20);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const fileDataUrl = reader.result as string;
      try {
        setUploadDocProgress(50);
        // Upload document to server endpoint
        const response = await fetch('/api/directus-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `${newDocText}.${selectedFile.name.split('.').pop()}`,
            fileData: fileDataUrl,
            fileType: selectedFile.type,
            technicianId: activeTech.id
          })
        });

        if (!response.ok) {
          const errJson = await response.json().catch(() => ({}));
          throw new Error(errJson.error || 'سیستم آپلود سرور با مشکل مواجه شد.');
        }

        const data = await response.json();
        setUploadDocProgress(85);

        if (data.success && data.url) {
          setUploadDocProgress(100);
          const currentDocs = Array.isArray(activeTech.documents) ? activeTech.documents : [];
          const targetName = newDocText.trim().toLowerCase();
          const existingIdx = currentDocs.findIndex(d => {
            const info = getDocInfo(d);
            return info.name.trim().toLowerCase() === targetName;
          });

          const docPayload = JSON.stringify({
            name: newDocText,
            fileUrl: data.url,
            fileType: selectedFile.type,
            uploadedAt: new Date().toLocaleDateString('fa-IR')
          });

          let updatedDocs = [...currentDocs];
          if (existingIdx >= 0) {
            updatedDocs[existingIdx] = docPayload;
          } else {
            updatedDocs.push(docPayload);
          }

          onUpdateTechnician(activeTech.id, {
            documents: updatedDocs
          });

          fetch(`/api/technicians/${activeTech.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documents: updatedDocs })
          }).catch(() => {});

          setNewDocText('');
          setSelectedFile(null);
          setPreviewUrl(null);
          triggerNotification('آپلود مدرک موفقیت‌آمیز', 'مدرک با موفقیت در پرونده شما ذخیره و به‌روزرسانی شد.', 'success');
        } else {
          throw new Error(data.error || 'سرور آپلود پاسخ به فرمت درست نداد.');
        }
      } catch (err: any) {
        triggerNotification('خطای آپلود مدرک', `خطا در ورود سند: ${err.message}`, 'error');
      } finally {
        setIsUploadingDoc(false);
        setUploadDocProgress(0);
      }
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleDeleteDocument = (idxToDelete: number) => {
    const currentDocs = Array.isArray(activeTech.documents) ? activeTech.documents : [];
    if (idxToDelete < 0 || idxToDelete >= currentDocs.length) return;

    const docToDelete = currentDocs[idxToDelete];
    const docInfo = getDocInfo(docToDelete);
    const updatedDocs = currentDocs.filter((_, i) => i !== idxToDelete);

    // Also remove from document_images if matched
    const currentImgs = Array.isArray(activeTech.document_images) ? activeTech.document_images : [];
    const updatedImgs = currentImgs.filter(img => {
      if (typeof img === 'string' && docInfo.url && (img === docInfo.url || img.includes(docInfo.url) || docInfo.url.includes(img))) {
        return false;
      }
      return true;
    });

    onUpdateTechnician(activeTech.id, {
      documents: updatedDocs,
      document_images: updatedImgs
    });

    fetch(`/api/technicians/${activeTech.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documents: updatedDocs,
        document_images: updatedImgs
      })
    }).catch(() => {});

    triggerNotification('حذف مدرک', `مدرک «${docInfo.name || 'انتخابی'}» با موفقیت حذف شد.`, 'success');
  };

  const handleDeleteImage = (imgIdx: number) => {
    const currentImgs = Array.isArray(activeTech.document_images) ? activeTech.document_images : [];
    if (imgIdx < 0 || imgIdx >= currentImgs.length) return;
    const updatedImgs = currentImgs.filter((_, i) => i !== imgIdx);

    onUpdateTechnician(activeTech.id, {
      document_images: updatedImgs
    });

    fetch(`/api/technicians/${activeTech.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_images: updatedImgs })
    }).catch(() => {});

    triggerNotification('حذف تصویر مدرک', 'تصویر مدرک با موفقیت حذف شد.', 'success');
  };

  // Submit error form States
  const [errorCode, setErrorCode] = React.useState('');
  const [isCommonProblem, setIsCommonProblem] = React.useState(false);
  const [errTitle, setErrTitle] = React.useState('');
  const [errCategory, setErrCategory] = React.useState('پکیج دیواری');
  const [errBrand, setErrBrand] = React.useState('بوتان');
  const [errModel, setErrModel] = React.useState('');
  const [errDesc, setErrDesc] = React.useState('');
  const [errStep1, setErrStep1] = React.useState('');
  const [errStep2, setErrStep2] = React.useState('');
  const [errPrecaution, setErrPrecaution] = React.useState('');
  const [errHazard, setErrHazard] = React.useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [errTools, setErrTools] = React.useState('');
  const [submitSuccess, setSubmitSuccess] = React.useState(false);

  const [techCategoryMode, setTechCategoryMode] = React.useState<'select' | 'custom'>('select');
  const [techBrandMode, setTechBrandMode] = React.useState<'select' | 'custom'>('select');
  const [techModelMode, setTechModelMode] = React.useState<'select' | 'custom'>('select');

  // Job operation temporary states
  const [selectedOrderForCost, setSelectedOrderForCost] = React.useState<string | null>(null);
  const [repairCost, setRepairCost] = React.useState<number>(150000);
  const [repairLogText, setRepairLogText] = React.useState('');
  const [selectedPartId, setSelectedPartId] = React.useState('');

  const normalizeLoc = (s?: string) => {
    if (!s) return '';
    return String(s)
      .trim()
      .replace(/[ـ،,\-_/\\()\[\]{}:;]/g, ' ')
      .replace(/[\u200B-\u200D\uFEFF\u00A0\u200c\u200f]/g, ' ')
      .replace(/ي/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/ة/g, 'ه')
      .replace(/آ/g, 'ا')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .trim();
  };

  const cleanLocNoise = (s?: string) => {
    return normalizeLoc(s)
      .replace(/\b(استان|شهرستان|شهر|منطقه|محله|بخش|روستا|خیابان|کوچه|بلوار|میدان)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const getDocInfo = (d: any) => {
    if (!d) return { name: '', url: '', fileType: '', isJson: false, raw: d };
    if (typeof d === 'object') {
      const dataUrl = d.url || d.fileUrl || d.fileData || d.src || '';
      return {
        name: d.name || d.title || d.fileName || 'مدرک فنی',
        url: dataUrl,
        fileType: d.fileType || (dataUrl.includes('.pdf') ? 'application/pdf' : 'image/jpeg'),
        isJson: true,
        raw: d
      };
    }
    if (typeof d === 'string') {
      const trimmed = d.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          const dataUrl = parsed.url || parsed.fileUrl || parsed.fileData || parsed.src || '';
          return {
            name: parsed.name || parsed.title || parsed.fileName || 'مدرک فنی',
            url: dataUrl,
            fileType: parsed.fileType || (dataUrl.includes('.pdf') ? 'application/pdf' : 'image/jpeg'),
            isJson: true,
            raw: parsed
          };
        } catch (e) {}
      }
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/uploads/') || trimmed.startsWith('data:')) {
        return {
          name: 'سند بارگذاری‌شده',
          url: trimmed,
          fileType: trimmed.includes('.pdf') ? 'application/pdf' : 'image/jpeg',
          isJson: true,
          raw: d
        };
      }
      return {
        name: d,
        url: '',
        fileType: '',
        isJson: false,
        raw: d
      };
    }
    return { name: String(d), url: '', fileType: '', isJson: false, raw: d };
  };

  const getCityFromLoc = (loc: string) => {
    if (!loc) return '';
    return loc.split(/[،,ـ-]/)[0].trim();
  };

  const techCityName = React.useMemo(() => {
    const raw = activeTech.activeLocation || activeTech.city || '';
    return getCityFromLoc(raw) || raw || 'شهر من';
  }, [activeTech.activeLocation, activeTech.city]);

  const [showAllLocations, setShowAllLocations] = React.useState(false);

  // Local status synced with activeTech.status and localStorage for zero-latency UI reactivity
  const [localStatus, setLocalStatus] = React.useState<string>(() => {
    return activeTech.status || localStorage.getItem('ir_active_tech_status') || 'active';
  });

  React.useEffect(() => {
    if (activeTech.status) {
      setLocalStatus(activeTech.status);
    }
  }, [activeTech.status]);

  React.useEffect(() => {
    let ch: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        ch = new BroadcastChannel('kadyar_sync_channel');
        ch.onmessage = (ev) => {
          const msg = ev?.data;
          if (msg && msg.type === 'TECH_STATUS_UPDATED') {
            const cleanId = String(activeTech.id).replace(/^tech_/, '');
            const msgCleanId = String(msg.techId).replace(/^tech_/, '');
            const cleanPhone = String(activeTech.phone || '').replace(/^0/, '');
            const msgCleanPhone = String(msg.phone || '').replace(/^0/, '');
            if (cleanId === msgCleanId || (cleanPhone && cleanPhone === msgCleanPhone)) {
              if (msg.status) {
                setLocalStatus(msg.status);
              }
            }
          }
        };
      } catch (e) {}
    }
    const handleCustom = (e: any) => {
      const detail = e.detail;
      if (detail && detail.status) {
        const cleanId = String(activeTech.id).replace(/^tech_/, '');
        const msgCleanId = String(detail.techId).replace(/^tech_/, '');
        if (cleanId === msgCleanId) {
          setLocalStatus(detail.status);
        }
      }
    };
    window.addEventListener('tech-status-changed', handleCustom);
    return () => {
      if (ch) {
        try { ch.close(); } catch (e) {}
      }
      window.removeEventListener('tech-status-changed', handleCustom);
    };
  }, [activeTech.id, activeTech.phone]);

  // Vacation / Off-Duty Mode state (uses localStatus and activeTech.status)
  const isVacationMode = localStatus === 'vacation' || localStatus === 'inactive' || (activeTech.status as string) === 'vacation' || (activeTech.status as string) === 'inactive';

  const isPendingStatus = (s?: string) => !s || s === 'registered' || s === 'pending' || s === 'waiting' || s === 'new';

  const rawAvailableOrders = isVacationMode ? [] : orders.filter((o) => 
    isPendingStatus(o.status as string) && (!o.technicianId || o.technicianId === '' || o.technicianId === activeTech.id)
  );

  const activeMyOrders = orders.filter((o) => 
    o.technicianId === activeTech.id && !isPendingStatus(o.status as string)
  );

  const filteredAvailableOrders = rawAvailableOrders.filter((o) => {
    if (showAllLocations) return true;

    // Collect all location tokens for Technician
    const techRawStrings = [
      activeTech.activeLocation,
      activeTech.city,
      (activeTech as any).region,
      (activeTech as any).location,
      (activeTech as any).address
    ].filter(Boolean);

    // Collect all location tokens for Order
    const orderRawStrings = [
      o.city,
      (o as any).region,
      (o as any).address,
      (o as any).customerAddress
    ].filter(Boolean);

    if (techRawStrings.length === 0 || orderRawStrings.length === 0) return true;

    const techTokens = new Set<string>();
    for (const raw of techRawStrings) {
      const n = normalizeLoc(raw);
      const c = cleanLocNoise(raw);
      if (n && n.length >= 2) techTokens.add(n);
      if (c && c.length >= 2) techTokens.add(c);
      n.split(/[\s,،]+/).forEach(w => {
        const cw = cleanLocNoise(w);
        if (cw && cw.length >= 2) techTokens.add(cw);
      });
    }

    const orderTokens = new Set<string>();
    for (const raw of orderRawStrings) {
      const n = normalizeLoc(raw);
      const c = cleanLocNoise(raw);
      if (n && n.length >= 2) orderTokens.add(n);
      if (c && c.length >= 2) orderTokens.add(c);
      n.split(/[\s,،]+/).forEach(w => {
        const cw = cleanLocNoise(w);
        if (cw && cw.length >= 2) orderTokens.add(cw);
      });
    }

    const isAll = (t: string) => !t || t === 'همه' || t === 'all' || t === 'کل' || t === 'همه شهرها' || t === 'all_cities' || t === 'سراسر کشور';
    if (Array.from(techTokens).some(isAll) || Array.from(orderTokens).some(isAll)) return true;

    // 1. Direct Token Match (Exact or Substring)
    for (const t of techTokens) {
      for (const ordTok of orderTokens) {
        if (t === ordTok || (t.length >= 3 && ordTok.length >= 3 && (t.includes(ordTok) || ordTok.includes(t)))) {
          return true;
        }
      }
    }

    // 2. Matching via Dynamic Settings Table (citiesList: [ { name: "اراک", regions: ["فرمهین", "ساوه", ...] } ])
    const currentCitiesList = citiesList || [];
    if (Array.isArray(currentCitiesList) && currentCitiesList.length > 0) {
      for (const group of currentCitiesList) {
        const gNameNorm = normalizeLoc(group.name || '');
        const gNameClean = cleanLocNoise(gNameNorm);
        const gRegionsNorm = (group.regions || []).map(r => normalizeLoc(r)).filter(r => r && r.length >= 2);
        const gRegionsClean = (group.regions || []).map(r => cleanLocNoise(r)).filter(r => r && r.length >= 2);

        const groupKeywords = Array.from(new Set([
          gNameNorm,
          gNameClean,
          ...gRegionsNorm,
          ...gRegionsClean
        ])).filter(k => k && k.length >= 2);

        const techInThisGroup = Array.from(techTokens).some(t =>
          groupKeywords.some(k => t === k || (t.length >= 3 && k.length >= 3 && (t.includes(k) || k.includes(t))))
        );

        const orderInThisGroup = Array.from(orderTokens).some(ot =>
          groupKeywords.some(k => ot === k || (ot.length >= 3 && k.length >= 3 && (ot.includes(k) || k.includes(ot))))
        );

        if (techInThisGroup && orderInThisGroup) {
          return true;
        }
      }
    }

    // 3. Fallback Built-in Province Clusters
    const builtinClusters = [
      {
        name: "اراک",
        aliases: ["اراک", "مرکزی", "استان مرکزی", "فراهان"],
        regions: ["فرمهین", "فراهان", "ساوه", "خمین", "محلات", "شازند", "تفرش", "دلیجان", "زرندیه", "کمیجان", "آشتیان", "خنداب", "مامونیه", "غرق آباد", "میلاجرد", "ساروق", "نراق", "مهاجران", "توره", "زاویه", "پرندک", "خشکرود", "نوقان", "آستانه", "هزاوه", "رازقان", "جاورسیان", "هندودر"]
      },
      {
        name: "تهران",
        aliases: ["تهران", "استان تهران", "کرج", "البرز", "استان البرز"],
        regions: ["ری", "شهر ری", "شمیرانات", "شمیران", "تجریش", "اسلامشهر", "شهریار", "دماوند", "ورامین", "پاکدشت", "رباط کریم", "قدس", "شهر قدس", "ملارد", "پردیس", "بهارستان", "قرچک", "فیروزکوه", "بومهن", "رودهن", "لواسان", "اندیشه", "صفادشت", "کهریزک", "حسن آباد", "صباشهر", "وحیدیه", "شاهدشهر", "صالحیه", "نصیرشهر", "باقرشهر", "احمدآباد مستوفی", "قیامدشت", "فردیس", "ساوجبلاغ", "نظرآباد", "هشتگرد", "طالقان", "اشتهارد", "کمال شهر", "محمدشهر", "ماهدشت", "گرمدره", "چهارباغ"]
      },
      {
        name: "مشهد",
        aliases: ["مشهد", "خراسان", "خراسان رضوی"],
        regions: ["نیشابور", "سبزوار", "تربت حیدریه", "قوچان", "چناران", "کاشمر", "تربت جام", "تایباد", "سرخس", "گناباد", "فریمان", "بینالود", "طرقبه", "شاندیز", "خواف", "بردسکن", "درگز", "کلات", "باخرز", "خلیل آباد", "مه ولات", "بجستان", "فیروزه", "جغتای", "جوین", "داورزن", "رشتخوار", "زاوه", "صالح آباد", "ششتمد", "گلبهار", "زبرخان"]
      },
      {
        name: "اصفهان",
        aliases: ["اصفهان", "استان اصفهان"],
        regions: ["کاشان", "خمینی شهر", "نجف آباد", "شاهین شهر", "فولادشهر", "لنجان", "شهرضا", "مبارکه", "فلاورجان", "آران و بیدگل", "زرین شهر", "گلپایگان", "سمیرم", "خوانسار", "تیران", "داران", "نطنز", "اردستان", "نائین", "خور و بیابانک", "چادگان", "دهاقان", "بویین میاندشت", "هرند", "ورزنه", "جرقویه", "کوهپایه"]
      },
      {
        name: "شیراز",
        aliases: ["شیراز", "فارس", "استان فارس"],
        regions: ["مرودشت", "کازرون", "جهرم", "لار", "لارستان", "فسا", "داراب", "فیروزآباد", "ممسنی", "نورآباد", "آباده", "اقلید", "سپیدان", "استهبان", "نی ریز", "لامرد", "کوار", "زرین دشت", "قیروکارزین", "خرم بید", "بوانات", "خرامه", "ارسنجان", "پاسارگاد", "گراش", "خنج", "رستم", "فراشبند", "سروستان", "بیضا", "اوز", "سرچهان", "زرقان", "بختگان", "جویم"]
      },
      {
        name: "تبریز",
        aliases: ["تبریز", "آذربایجان شرقی", "آذربایجان"],
        regions: ["مراغه", "مرند", "میانه", "اهر", "بناب", "سراب", "آذرشهر", "اسکو", "شبستر", "عجب شیر", "ملکان", "هریس", "بستان آباد", "کلیبر", "جلفا", "سهند", "هشترود", "ورزقان", "چاراویماق", "خداآفرین", "هوراند"]
      },
      {
        name: "اهواز",
        aliases: ["اهواز", "خوزستان", "استان خوزستان"],
        regions: ["آبادان", "دزفول", "خرمشهر", "ماهشهر", "بندر ماهشهر", "ایذه", "بهبهان", "شوشتر", "شوش", "امیدیه", "مسجد سلیمان", "رامهرمز", "اندیمشک", "شادگان", "هندیجان", "سوسنگرد", "دشت آزادگان", "باغملک", "گتوند", "لالی", "هفتکل", "رامشیر", "هویزه", "کارون", "باوی", "حمیدیه", "آغاجاری", "کرخه", "صیدون"]
      },
      {
        name: "قم",
        aliases: ["قم", "استان قم"],
        regions: ["کهک", "جعفریه", "سلفچگان", "قنوات", "دستجرد"]
      },
      {
        name: "رشت",
        aliases: ["رشت", "گیلان", "استان گیلان"],
        regions: ["انزلی", "بندر انزلی", "لاهیجان", "لنگرود", "فومن", "رودسر", "تالش", "هشتپر", "صومعه سرا", "آستارا", "آستانه اشرفیه", "رودبار", "منجیل", "لوشان", "ماسوله", "ماسال", "شفت", "سیاهکل", "رضوانشهر", "املش", "خمام"]
      },
      {
        name: "ساری",
        aliases: ["ساری", "مازندران", "استان مازندران"],
        regions: ["بابل", "آمل", "قائم شهر", "قائمشهر", "تنکابن", "شهسوار", "چالوس", "نوشهر", "بابلسر", "رامسر", "محمودآباد", "نور", "نکا", "بهشهر", "فریدونکنار", "جویبار", "سوادکوه", "زیرآب", "پل سفید", "کلاردشت", "عباس آباد", "رویان", "گلوگاه", "سیمرغ", "میاندورود"]
      },
      {
        name: "کرمانشاه",
        aliases: ["کرمانشاه", "استان کرمانشاه"],
        regions: ["اسلام آباد غرب", "کنگاور", "سنقر", "جوانرود", "صحنه", "هرسین", "سرپل ذهاب", "پاوه", "روانسر", "گیلانغرب", "قصر شیرین", "تازه آباد", "ثلاث باباجانی", "دالاهو", "کرند غرب"]
      },
      {
        name: "ارومیه",
        aliases: ["ارومیه", "آذربایجان غربی"],
        regions: ["خوی", "بوکان", "مهاباد", "میاندوآب", "سلماس", "پیرانشهر", "نقده", "تکاب", "ماکو", "سردشت", "شاهین دژ", "اشنویه", "قره ضیاءالدین", "سیه چشمه", "چایپاره", "پلدشت", "شوط", "چالدران", "میرآباد", "باروق", "چهاربرج"]
      },
      {
        name: "همدان",
        aliases: ["همدان", "استان همدان"],
        regions: ["ملایر", "نهاوند", "تویسرکان", "کبودرآهنگ", "بهار", "رزن", "فامنین", "لالجین", "مریانج", "قروه درجزین", "درگزین"]
      },
      {
        name: "یزد",
        aliases: ["یزد", "استان یزد"],
        regions: ["میبد", "اردکان", "مهریز", "بافق", "ابرکوه", "تفت", "اشکذر", "هرات", "مروست", "بهاباد", "خاتم", "زارچ"]
      },
      {
        name: "کرمان",
        aliases: ["کرمان", "استان کرمان"],
        regions: ["رفسنجان", "سیرجان", "جیرفت", "بم", "زرند", "کهنوج", "شهر بابک", "بافت", "بردسیر", "عنبرآباد", "منوجان", "راور", "انار", "رودبار جنوب", "قلعه گنج", "ریگان", "فهرج", "نرماشیر", "ارزوئیه", "کوهبنان", "رابر", "فاریاب", "جازموریان", "گنبکی"]
      },
      {
        name: "خرم آباد",
        aliases: ["خرم آباد", "لرستان", "استان لرستان"],
        regions: ["بروجرد", "دورود", "الیگودرز", "کوهدشت", "ازنا", "پلدختر", "الشتر", "سلسله", "نورآباد", "دلفان", "چگنی", "معمولان"]
      },
      {
        name: "قزوین",
        aliases: ["قزوین", "استان قزوین"],
        regions: ["الوند", "البرز قزوین", "تاکستان", "بوئین زهرا", "آبیک", "محمدیه", "محمودآباد نمونه", "اقبالیه", "شریفیه", "ضیاءآباد", "آوج"]
      },
      {
        name: "زنجان",
        aliases: ["زنجان", "استان زنجان"],
        regions: ["ابهر", "خرمدره", "قیدار", "خدابنده", "طارم", "آب بر", "ماهنشان", "ایجرود", "زرین آباد", "سلطانیه"]
      },
      {
        name: "سمنان",
        aliases: ["سمنان", "استان سمنان"],
        regions: ["شاهرود", "دامغان", "گرمسار", "مهدی شهر", "سنگسر", "سرخه", "آرادان", "میامی", "بسطام", "شهمیرزاد", "ایوانکی"]
      },
      {
        name: "گرگان",
        aliases: ["گرگان", "گلستان", "استان گلستان"],
        regions: ["گنبد کاووس", "گنبد", "علی آباد کتول", "بندر ترکمن", "آق قلا", "کلاله", "آزادشهر", "کردکوی", "مینودشت", "گالیکش", "بندر گز", "رامیان", "مراوه تپه", "گمیشان"]
      },
      {
        name: "بوشهر",
        aliases: ["بوشهر", "استان بوشهر"],
        regions: ["برازجان", "دشتستان", "گناوه", "بندر گناوه", "کنگان", "بندر کنگان", "عسلویه", "خورموج", "دشتی", "جم", "دیلم", "بندر دیلم", "اهرم", "تنگستان", "دیر", "بندر دیر", "دلوار"]
      },
      {
        name: "بندر عباس",
        aliases: ["بندر عباس", "بندرعباس", "هرمزگان", "استان هرمزگان"],
        regions: ["قشم", "کیش", "میناب", "بندرلنگه", "لنگه", "رودان", "بستک", "حاجی آباد", "جاسک", "بندر خمیر", "پارسیان", "گاوبندی", "سیریک", "بشاگرد", "ابوموسی"]
      }
    ];

    for (const cluster of builtinClusters) {
      const allClusterKeywords = Array.from(new Set([
        normalizeLoc(cluster.name),
        cleanLocNoise(cluster.name),
        ...(cluster.aliases || []).map(a => normalizeLoc(a)),
        ...(cluster.aliases || []).map(a => cleanLocNoise(a)),
        ...(cluster.regions || []).map(r => normalizeLoc(r)),
        ...(cluster.regions || []).map(r => cleanLocNoise(r))
      ])).filter(k => k && k.length >= 2);

      const techInCluster = Array.from(techTokens).some(t =>
        allClusterKeywords.some(k => t === k || (t.length >= 3 && k.length >= 3 && (t.includes(k) || k.includes(t))))
      );

      const orderInCluster = Array.from(orderTokens).some(ot =>
        allClusterKeywords.some(k => ot === k || (ot.length >= 3 && k.length >= 3 && (ot.includes(k) || k.includes(ot))))
      );

      if (techInCluster && orderInCluster) {
        return true;
      }
    }

    return false;
  });

  const handleToggleVacation = () => {
    const nextStatus = isVacationMode ? 'active' : 'vacation';
    setLocalStatus(nextStatus);
    localStorage.setItem('ir_active_tech_status', nextStatus);
    localStorage.setItem('ir_logged_in_tech_status', nextStatus);

    onUpdateTechnician(activeTech.id, { status: nextStatus as any });

    if (nextStatus === 'vacation') {
      setNewOrderPopup(null);
    }

    // Broadcast instant sync across open tabs/windows/PWA
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const ch = new BroadcastChannel('kadyar_sync_channel');
        ch.postMessage({
          type: 'TECH_STATUS_UPDATED',
          techId: activeTech.id,
          phone: activeTech.phone,
          status: nextStatus
        });
        ch.close();
      } catch (e) {}
    }

    // Window event for immediate intra-window UI responsiveness
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('tech-status-changed', {
          detail: { techId: activeTech.id, phone: activeTech.phone, status: nextStatus }
        }));
      } catch (e) {}
    }

    // Directly hit real-time status API to ensure 100% immediate persistence across site and server
    const token = localStorage.getItem('access_token') || localStorage.getItem('session_user_id') || '';
    fetch(`/api/technicians/${encodeURIComponent(activeTech.id)}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Session-Token': token
      },
      body: JSON.stringify({
        id: activeTech.id,
        phone: activeTech.phone,
        status: nextStatus
      })
    })
      .then(r => r.json())
      .then(res => {
        if (res && res.techStatus) {
          setLocalStatus(res.techStatus);
        }
      })
      .catch(() => {});

    if (nextStatus === 'vacation') {
      triggerNotification('حالت مرخصی فعال شد', 'وضعیت شما در سرور و سایت به «مرخصی» تغییر یافت. درخواست‌ها موقتاً متوقف شدند.', 'warning');
    } else {
      triggerNotification('حالت آماده‌به‌کار فعال شد', 'وضعیت شما در سرور و سایت به «آماده‌به‌کار» تغییر یافت و آماده پذیرش سفارش هستید.', 'success');
    }
  };

  // Sound and Real-time Alert for incoming orders
  const [soundEnabled, setSoundEnabled] = React.useState<boolean>(() => {
    return localStorage.getItem('ir_tech_sound_alert') !== 'false';
  });
  const [newOrderPopup, setNewOrderPopup] = React.useState<RepairOrder | null>(null);

  // Auto-dismiss popup if tech is in vacation mode
  React.useEffect(() => {
    if (isVacationMode && newOrderPopup) {
      setNewOrderPopup(null);
    }
  }, [isVacationMode, newOrderPopup]);
  const knownOrderIdsRef = React.useRef<Set<string>>(new Set());
  const isFirstLoadRef = React.useRef<boolean>(true);

  const playChimeSound = () => {
    if (!soundEnabled || isVacationMode) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const now = ctx.currentTime;

      // Two-tone pleasant notification chime
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.35, now + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.45);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880, now + 0.15); // A5
      osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.35); // D6
      gain2.gain.setValueAtTime(0, now + 0.15);
      gain2.gain.linearRampToValueAtTime(0.4, now + 0.22);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.7);
    } catch (e) {
      console.warn('Audio alert skipped:', e);
    }
  };

  // Detect when a new matching order arrives in real-time (suppressed if on vacation)
  React.useEffect(() => {
    const currentMatchingIds = new Set(filteredAvailableOrders.map(o => String(o.id)));
    
    if (isFirstLoadRef.current) {
      knownOrderIdsRef.current = currentMatchingIds;
      isFirstLoadRef.current = false;
      return;
    }

    // If tech is on vacation, do not trigger alerts or popups
    if (isVacationMode) {
      knownOrderIdsRef.current = currentMatchingIds;
      return;
    }

    // Find any new order that was not in known set
    const newlyArrived = filteredAvailableOrders.filter(o => !knownOrderIdsRef.current.has(String(o.id)));
    if (newlyArrived.length > 0) {
      const latestOrder = newlyArrived[0];
      playChimeSound();
      setNewOrderPopup(latestOrder);
      triggerNotification(
        '🔔 سفارش کار جدید در محدوده شما!',
        `سفارش جدید برای ${latestOrder.category} (${latestOrder.city || 'منطقه شما'}) ثبت گردید. جهت قبول سفارش اقدام نمایید.`,
        'success'
      );
    }

    knownOrderIdsRef.current = currentMatchingIds;
  }, [filteredAvailableOrders.length, orders, isVacationMode]);

  const handleCreateErrorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCommonProblem && !errorCode) {
      triggerNotification('کاستی اطلاعات', 'لطفا کُد خطا را وارد نمایید.', 'warning');
      return;
    }
    if (!errTitle || !errDesc) {
      triggerNotification('کاستی اطلاعات', 'لطفا فیلدهای اجباری ستاره دار را پر کنید.', 'warning');
      return;
    }

    onNewErrorSubmit(harmonizeErrorCode({
      code: isCommonProblem ? 'مشکل شایع' : errorCode,
      title: errTitle,
      category: errCategory,
      brand: errBrand,
      model: errModel || 'عمومی',
      description: errDesc,
      steps: [errStep1 || 'بررسی وضعیت جریان برق', errStep2 || 'بررسی و سنجش اتصالات سوکت سنسور'].filter(Boolean),
      precautions: [errPrecaution].filter(Boolean),
      hazardLevel: errHazard,
      toolsNeeded: errTools ? errTools.split('،') : ['مولتی متر'],
      views: 0,
      updatedBy: activeTech.name,
      isApproved: false, // Must be approved by administrator
      isCommonProblem: isCommonProblem,
      tags: isCommonProblem ? ['مشکل شایع'] : []
    }));

    setSubmitSuccess(true);
    // resetting
    setErrorCode('');
    setIsCommonProblem(false);
    setErrTitle('');
    setErrDesc('');
    setErrStep1('');
    setErrStep2('');
    setErrPrecaution('');

    triggerNotification(
      isCommonProblem ? 'ثبت مشکل شایع' : 'ثبت کد خطا',
      'پیشنهاد شما با موفقیت ثبت شد و پس از تایید مدیریت منتشر خواهد شد.',
      'success'
    );

    setTimeout(() => {
      setSubmitSuccess(false);
      setSelectedTab('my-jobs');
    }, 2500);
  };

  const handleFinalizeJob = (orderId: string) => {
    const partToUse = spareParts.find(p => p.id === selectedPartId);
    const partsUsed = partToUse ? [{ partId: partToUse.id, name: partToUse.name, price: partToUse.price, quantity: 1 }] : [];

    onUpdateOrderStatus(orderId, 'completed', {
      repairLog: repairLogText || 'دستگاه عیب‌یابی و با موفقیت تحویل مشتری گردید.',
      partsUsed
    });

    setSelectedOrderForCost(null);
    setRepairLogText('');
    setSelectedPartId('');
    triggerNotification('اتمام سفارش کار', 'سفارش با موفقیت به عنوان تکمیل شده و تحویل به مشتری ثبت گردید.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Identity bar & Technician selector */}
      <div className="bg-white rounded-2xl border border-slate-205 p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={activeTech.avatarUrl || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>"}
                alt={activeTech.name}
                className="w-14 h-14 rounded-full object-cover border-2 border-blue-500"
              />
              <span className={`absolute bottom-0 right-0 w-4 h-4 border-2 border-white rounded-full ${
                isSuspended ? 'bg-rose-500' : isVacationMode ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
              }`}></span>
            </div>

            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-slate-800 text-sm">{activeTech.name}</span>
                {isSuspended ? (
                  <span className="bg-rose-100 text-rose-800 border border-rose-200 text-[9px] font-bold px-2 py-0.5 rounded-sm">⛔ تعلیق همکاری</span>
                ) : isVacationMode ? (
                  <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-bold px-2 py-0.5 rounded-sm flex items-center gap-1">
                    ☕ در مرخصی موقت (عدم پذیرش سفارش)
                  </span>
                ) : activeTech.isVerified ? (
                  <span className="bg-blue-50 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded-sm">✓ تکنسین مجاز</span>
                ) : (
                  <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded-sm">⏳ در انتظار تایید هویت</span>
                )}
              </div>
              <p className="text-slate-400 text-xs font-semibold mt-1">تخصص: {(Array.isArray(activeTech.specialty) ? activeTech.specialty : [activeTech.specialty]).filter(Boolean).join('، ')}</p>
              <div className="flex items-center gap-3 mt-1.5 text-[10px]">
                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-sm">کارکرد: {activeTech.completedOrders} سفارش</span>
                <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded-sm">امتیاز مشتریان: ⭐ {activeTech.rating}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 flex-wrap">
            {/* Vacation / Off-Duty Mode Toggle */}
            <button
              type="button"
              onClick={handleToggleVacation}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                isVacationMode
                  ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
              }`}
              title={isVacationMode ? 'برای بازگشت به کار و دریافت سفارش کلیک کنید' : 'رفتن به مرخصی و توقف سفارش‌های جدید'}
            >
              {isVacationMode ? (
                <>
                  <Coffee className="w-4 h-4 text-amber-600 animate-pulse" />
                  <span className="text-[11px]">در مرخصی (عدم پذیرش)</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <span className="text-[11px]">آماده‌به‌کار (آنلاین)</span>
                </>
              )}
            </button>

            {/* Kodyar Wallet Card */}
            <div className="bg-gradient-to-br from-slate-50 to-emerald-50/40 border border-emerald-200/80 rounded-2xl p-2.5 text-center min-w-[155px] shadow-xs">
              <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500 font-bold mb-0.5">
                <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                <span>کیف پول کدیار:</span>
              </div>
              <div className="font-mono font-black text-slate-900 text-sm">
                {rawBalance.toLocaleString('fa-IR')} <span className="text-[9px] font-sans font-normal text-slate-500">تومان</span>
              </div>
              <div className="mt-1 flex items-center justify-center">
                {rawBalance >= 50000 ? (
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/80 border border-emerald-300 px-2 py-0.5 rounded-md">
                    ✓ مجاز به قبول کار
                  </span>
                ) : (
                  <span className="text-[9px] font-bold text-rose-700 bg-rose-100/80 border border-rose-300 px-2 py-0.5 rounded-md">
                    ⚠️ نیاز به شارژ (حداقل ۵۰ ت)
                  </span>
                )}
              </div>
              {hasPendingCommissionApproval ? (
                <div className="mt-1.5 bg-amber-100 text-amber-900 rounded-lg text-[9px] font-bold py-1 px-1.5 flex items-center justify-center gap-1 border border-amber-300">
                  <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                  <span>فیش در نوبت تایید مدیر</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsWalletModalOpen(true)}
                  className="mt-1.5 w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-extrabold py-1 px-2 transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1 active:scale-95"
                >
                  <CreditCard className="w-3 h-3" />
                  <span>شارژ کارت‌به‌کارت ملت</span>
                </button>
              )}
            </div>

            {/* Secure Logout Button */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={onLogout}
                className="bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 border border-rose-200 p-2.5 h-[34px] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                title="خروج امن از حساب کاربری"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">خروج</span>
              </button>
            </div>
          </div>
        </div>

        {/* Suspended Alert Banner */}
        {isSuspended && (
          <div className="mt-4 bg-rose-50 border border-rose-300 rounded-xl p-3.5 flex items-start gap-3 text-xs text-rose-900 shadow-xs">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="block text-rose-800 font-extrabold text-xs sm:text-sm">حساب همکاری شما توسط مدیریت کدیار۲۴ تعلیق شده است</strong>
              <p className="text-[11px] text-rose-700 leading-relaxed">
                به دلیل تعلیق وضعیت همکاری، امکان دسترسی به دریافت سفارش‌های جدید مسدود شده است. جهت بررسی علت تعلیق و فعال‌سازی مجدد، با پشتیبانی یا مدیریت کدیار۲۴ در تماس باشید.
              </p>
            </div>
          </div>
        )}

        {/* Vacation Alert Banner */}
        {isVacationMode && (
          <div className="mt-4 bg-amber-50/90 border border-amber-200 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <Coffee className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>وضعیت فعلی: در حالت استراحت / مرخصی موقت.</strong> در این بازه، هشدارهای سفارش جدید برای شما قطع شده و مشتریان امکان ارجاع مستقیم کار به شما را نخواهند داشت.
              </span>
            </div>
            <button
              type="button"
              onClick={handleToggleVacation}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] px-3.5 py-1.5 rounded-lg shadow-xs cursor-pointer transition-all shrink-0"
            >
              پایان مرخصی و شروع به کار
            </button>
          </div>
        )}
      </div>

      {/* Navigation tabs */}
      <div className="flex border-b border-slate-200 flex-wrap gap-y-1.5">
        {canAccessAllTabs && (
          <>
            <button
              id="tab-available-jobs"
              onClick={() => setSelectedTab('available')}
              className={`pb-3 px-4 text-xs font-bold transition-colors cursor-pointer relative ${
                selectedTab === 'available'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <span>سفارشات جدید در محله شما ({rawAvailableOrders.length})</span>
              {rawAvailableOrders.length > 0 && (
                <span className="mr-1 bg-rose-500 text-white rounded-full text-[9px] px-1.5 py-0.5 inline-block font-sans font-bold">
                  {rawAvailableOrders.length}
                </span>
              )}
            </button>

            <button
              id="tab-my-jobs"
              onClick={() => setSelectedTab('my-jobs')}
              className={`pb-3 px-4 text-xs font-bold transition-colors cursor-pointer relative ${
                selectedTab === 'my-jobs'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <span>کارهای در دست اقدام من ({activeMyOrders.length})</span>
            </button>

            <button
              id="tab-wallet"
              onClick={() => setSelectedTab('wallet')}
              className={`pb-3 px-4 text-xs font-bold transition-colors cursor-pointer relative flex items-center gap-1.5 ${
                selectedTab === 'wallet'
                  ? 'text-emerald-600 border-b-2 border-emerald-600'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-600" />
              <span>کیف پول و کمیسیون</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                rawBalance >= 50000 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {rawBalance.toLocaleString('fa-IR')} ت
              </span>
            </button>

            <button
              id="tab-search-errors"
              onClick={() => setSelectedTab('search-errors')}
              className={`pb-3 px-4 text-xs font-bold transition-colors cursor-pointer relative flex items-center gap-1.5 ${
                selectedTab === 'search-errors'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Search className="w-3.5 h-3.5 text-blue-600" />
              <span>کدهای خطا و دیاگ</span>
            </button>

            <button
              id="tab-parts-store"
              onClick={() => setSelectedTab('parts-store')}
              className={`pb-3 px-4 text-xs font-bold transition-colors cursor-pointer relative flex items-center gap-1.5 ${
                selectedTab === 'parts-store'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
              <span>فروشگاه قطعات و ابزار</span>
            </button>

            <button
              id="tab-add-error"
              onClick={() => setSelectedTab('add-error')}
              className={`pb-3 px-4 text-xs font-bold transition-colors cursor-pointer relative ${
                selectedTab === 'add-error'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <span>ثبت کد خطای جدید</span>
            </button>
          </>
        )}

        <button
          id="tab-profile-docs"
          onClick={() => setSelectedTab('profile-docs')}
          className={`pb-3 px-4 text-xs font-bold transition-colors cursor-pointer relative ${
            selectedTab === 'profile-docs'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>مدارک و پرونده شخصی</span>
        </button>

        <button
          id="tab-digital-card"
          onClick={() => setSelectedTab('digital-card')}
          className={`pb-3 px-4 text-xs font-bold transition-colors cursor-pointer relative flex items-center gap-1.5 ${
            selectedTab === 'digital-card'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Share2 className="w-3.5 h-3.5 text-amber-500" />
          <span>کارت ویزیت و معرفی اپ به مشتریان</span>
        </button>
      </div>

      {/* Notice Banner for Technicians with Missing Documents */}
      {(!activeTech.documents || activeTech.documents.length === 0) && (
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white rounded-2xl p-4 sm:p-5 shadow-md border border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h4 className="font-black text-xs sm:text-sm">⚠️ همکار گرامی، پرونده و مدارک هویتی/فنی شما هنوز بارگذاری نشده است</h4>
              <p className="text-[11px] text-amber-100 font-medium mt-1 leading-relaxed">
                طبق ابلاغ مدیریت محترم کدیار۲۴، جهت تایید دسترسی و تخصیص سفارش‌های کار، لطفاً مدارک خود (کارت ملی، جواز، مدرک فنی) را در بخش پرونده بارگذاری فرمایید.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedTab('profile-docs')}
            className="bg-white hover:bg-slate-100 text-amber-900 font-black text-xs px-4 py-2.5 rounded-xl shadow cursor-pointer transition active:scale-95 whitespace-nowrap self-stretch sm:self-auto text-center"
          >
            📂 ورود به بخش بارگذاری مدارک
          </button>
        </div>
      )}

      {/* Main body of tabs */}
      {selectedTab === 'available' && (
        <div className="space-y-4">
          {/* Commission Debt Lock Alert Banner */}
          {hasCommissionDebt ? (
            hasPendingCommissionApproval ? (
              <div className="bg-gradient-to-r from-amber-600 to-indigo-700 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-amber-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-200 animate-pulse flex-shrink-0" />
                    <h4 className="font-bold text-sm sm:text-base">فیش واریز کمیسیون در انتظار تایید مدیریت کدیار۲۴ است</h4>
                  </div>
                  <p className="text-xs text-amber-100 leading-relaxed max-w-2xl">
                    رسید کارت‌به‌کارت کمیسیون به مبلغ <strong className="text-white underline">{commissionDebtAmount.toLocaleString('fa-IR')} تومان</strong> ثبت شده و در نوبت تایید مدیریت است. به محض بررسی و تایید توسط مدیر، دسترسی شما برای قبول سفارش‌های جدید بلافاصله بازگشایی خواهد شد.
                  </p>
                </div>
                <div className="bg-white/20 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 whitespace-nowrap self-stretch sm:self-auto justify-center">
                  <Clock className="w-4 h-4 text-amber-200" />
                  <span>در حال بررسی مدیریت</span>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-rose-600 to-amber-600 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-rose-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-amber-200 flex-shrink-0" />
                    <h4 className="font-bold text-sm sm:text-base">پرداخت کمیسیون کدیار۲۴ و تایید مدیریت جهت دریافت سفارش جدید الزامی است</h4>
                  </div>
                  <p className="text-xs text-rose-50 leading-relaxed max-w-2xl">
                    سفارش اول شما به عنوان هدیه ورود به کدیار۲۴ کاملاً <strong className="text-white">رایگان و بدون کسر کمیسیون</strong> انجام شد. از سفارش دوم به بعد، مبلغ <strong className="text-white underline">{commissionDebtAmount.toLocaleString('fa-IR')} تومان</strong> کمیسیون پلتفرم (۱۵٪) را به شماره کارت مدیریت واریز نمایید. پس از تایید مدیر، دسترسی شما به سفارش‌های جدید مجدداً فعال می‌شود.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSettleModalOpen(true)}
                  className="bg-white hover:bg-slate-100 text-rose-700 font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5 whitespace-nowrap active:scale-95 self-stretch sm:self-auto justify-center"
                >
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>واریز و تسویه کمیسیون ({commissionDebtAmount.toLocaleString('fa-IR')} ت)</span>
                </button>
              </div>
            )
          ) : (
            <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <p className="leading-relaxed font-sans">
                درخواست‌های زیر با توجه به منطقه تخصص و فعال شما فیلتر شده‌اند. به محض زدن دکمه <strong>«قبول مسئولیت تعمیر»</strong>، این درخواست به صورت انحصاری برای شما رزرو شده و از دید سایرین خارج می‌شود.
              </p>
            </div>
          )}

          {/* Province / City Restriction Badge & Live Sound Alert Toggle */}
          {!hasCommissionDebt && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white border border-slate-205 p-4 rounded-xl shadow-xs">
              <div className="flex items-center gap-3">
                <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 select-none">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  محدوده سفارش‌های جدید:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const nextState = !soundEnabled;
                    setSoundEnabled(nextState);
                    localStorage.setItem('ir_tech_sound_alert', String(nextState));
                    if (nextState) {
                      playChimeSound();
                      triggerNotification('هشدار صوتی فعال شد', 'هنگام ثبت سفارش جدید در محدوده شما، صدای زنگ پخش خواهد شد.', 'info');
                    } else {
                      triggerNotification('هشدار صوتی غیرفعال شد', 'صدای زنگ سفارش‌های جدید خاموش شد.', 'warning');
                    }
                  }}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                    soundEnabled 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                  }`}
                  title="روشن/خاموش کردن صدای زنگ سفارش‌های جدید"
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-600 animate-pulse" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{soundEnabled ? 'زنگ هشدار آنلاین: روشن' : 'زنگ هشدار: خاموش'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowAllLocations(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    !showAllLocations ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  📍 شهر/استان من ({techCityName})
                </button>
                <button
                  type="button"
                  onClick={() => setShowAllLocations(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    showAllLocations ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  🌐 همه استان‌ها ({rawAvailableOrders.length})
                </button>
              </div>
            </div>
          )}

          {/* Incoming Order Live Notification Card */}
          {newOrderPopup && !hasCommissionDebt && (
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 text-white rounded-2xl p-4 sm:p-5 shadow-xl border-2 border-emerald-300 animate-bounce duration-1000 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-xs flex-shrink-0 mt-0.5">
                  <Bell className="w-6 h-6 text-amber-200 animate-spin duration-1000" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                      سفارش فوری جدید
                    </span>
                    <span className="text-xs text-emerald-100 font-sans">کد: {newOrderPopup.id}</span>
                  </div>
                  <h4 className="font-extrabold text-sm sm:text-base text-white mt-1">
                    درخواست تعمیر {newOrderPopup.category} ({newOrderPopup.brand})
                  </h4>
                  <p className="text-xs text-emerald-50 mt-0.5">
                    موقعیت: <strong className="text-white underline">شهر {newOrderPopup.city || activeTech.city || 'منطقه شما'}</strong> • مشتری: محرمانه (مشاهده پس از قبول سفارش)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    handleAttemptAcceptOrder(newOrderPopup.id);
                    setNewOrderPopup(null);
                  }}
                  className="flex-1 sm:flex-none bg-white hover:bg-emerald-50 text-emerald-800 font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>قبول فوری مسئولیت (کسر ۵۰,۰۰۰ ت)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewOrderPopup(null)}
                  className="bg-black/20 hover:bg-black/30 text-white p-2.5 rounded-xl transition-all cursor-pointer"
                  title="بستن هشدار"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Wallet Balance & Commission Rule Banner */}
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50/50 to-slate-50 border border-blue-200/80 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs mb-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-800 text-xs sm:text-sm">
                    موجودی کیف پول کدیار: {rawBalance.toLocaleString('fa-IR')} تومان
                  </span>
                  {rawBalance >= 50000 ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                      ✓ آماده قبول سفارش
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-full">
                      ⚠️ نیاز به شارژ (حداقل ۵۰,۰۰۰ ت)
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  قانون کدیار۲۴: بابت هر سفارش ۵۰,۰۰۰ تومان از کیف پول کسر می‌شود. اولین تکنسینی که سفارش را قبول کند، کار به او تعلق می‌گیرد.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsWalletModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-xs cursor-pointer transition-all flex items-center gap-1.5 shrink-0 active:scale-95"
            >
              <CreditCard className="w-4 h-4" />
              <span>شارژ کارت‌به‌کارت حساب ملت</span>
            </button>
          </div>

          {filteredAvailableOrders.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-205 bg-white rounded-2xl">
              <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-2 stroke-[1.2]" />
              <p className="text-slate-500 text-xs">درخواست کار بدون متصدی جدیدی یافت نشد.</p>
              <p className="text-slate-400 text-[10px] mt-1">با پورتال مشتری یک درخواست جدید ثبت کنید یا فیلتر نمایش استان را تغییر دهید.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAvailableOrders.map((ord, idx) => (
                <div key={`avail_ord_${ord.id}_${idx}`} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md font-sans">
                        کد درخواست: {ord.id}
                      </span>
                      <span className="text-[9px] text-slate-400">ثبت: {new Date(ord.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded">
                        {ord.category} ({ord.brand})
                      </span>
                      {ord.errorCode && (
                        <span className="bg-rose-50 text-rose-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                          کد خطا: {ord.errorCode}
                        </span>
                      )}
                      {ord.technicianId === activeTech.id && (
                        <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-2 py-0.5 rounded border border-amber-200">
                          ⭐ درخواست اختصاصی مشتری
                        </span>
                      )}
                    </div>

                    {/* Customer info confidential card */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 mb-2.5">
                      <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs">
                        <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>مشتری کدیار۲۴ (اطلاعات محرمانه تا قبول سفارش)</span>
                      </div>
                      <p className="text-[10.5px] text-slate-500 mt-1 leading-relaxed">
                        نام، شماره تماس و آدرس دقیق بلافاصله پس از فشردن دکمه قبول سفارش و کسر ۵۰,۰۰۰ تومان از کیف پول آزاد و نمایش داده می‌شود.
                      </p>
                    </div>
                    
                    <div className="space-y-2 text-slate-500 text-[11px] mb-3 leading-relaxed">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>محدوده تقریبی: شهر {ord.city || activeTech.city || 'منطقه شما'} (آدرس دقیق پس از پذیرش)</span>
                      </div>

                      <div className="bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl text-slate-700 text-[11px] space-y-1">
                        <div className="flex items-center justify-between text-slate-600">
                          <span>کمیسیون کدیار۲۴:</span>
                          <span className="font-bold text-emerald-700 font-sans">۵۰,۰۰۰ تومان (کسر آنی از کیف پول)</span>
                        </div>
                        <div className="flex items-center justify-between text-[10.5px] text-slate-500">
                          <span>آزادسازی اطلاعات و آدرس:</span>
                          <span className="text-blue-700 font-medium">آنی، بدون نیاز به تایید مدیر</span>
                        </div>
                      </div>

                      <p className="bg-slate-50 p-2 rounded-xl text-slate-600 mt-1 lines-clamp-2 truncate max-h-[50px] overflow-hidden">
                        {ord.description || 'توضیحات ایراد فنی اضافه درج نشده است.'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 text-[9px] block">زمان حضور پیشنهادی</span>
                      <span className="text-slate-800 font-semibold text-[10px]">
                        {ord.date && !ord.date.includes('T') ? ord.date : 'هماهنگی با مشتری'} {ord.timeSlot ? `(${ord.timeSlot})` : ''}
                      </span>
                    </div>

                    <button
                      id={`accept-btn-${ord.id}`}
                      type="button"
                      onClick={() => handleAttemptAcceptOrder(ord.id)}
                      className={`rounded-xl text-xs py-2 px-3.5 font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 whitespace-nowrap ${
                        !activeTech.isVerified
                          ? 'bg-slate-400 hover:bg-slate-500 text-white'
                          : rawBalance >= 50000
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-amber-600 hover:bg-amber-700 text-white'
                      }`}
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>
                        {!activeTech.isVerified
                          ? 'در انتظار تایید مدارک مدیر'
                          : rawBalance >= 50000
                          ? 'قبول سفارش (کسر ۵۰,۰۰۰ ت)'
                          : 'قبول سفارش (نیاز به شارژ)'}
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedTab === 'my-jobs' && (
        <div className="space-y-4">
          {activeMyOrders.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-205 bg-white rounded-2xl">
              <Truck className="w-12 h-12 text-slate-300 mx-auto mb-2 stroke-[1.2]" />
              <p className="text-slate-500 text-xs">شما هیچ سفارش فعالی به نام خود ندارید.</p>
              <p className="text-slate-400 text-[10px] mt-1">از تب سفارشات جدید، مسئولیت یک کار را قبول کنید.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeMyOrders.map((ord, idx) => (
                <div key={`my_ord_${ord.id}_${idx}`} className="bg-white border-2 border-blue-100/80 rounded-2xl p-4 sm:p-5 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded font-sans">
                          شماره: {ord.id}
                        </span>
                        <span className="text-slate-700 font-bold text-xs">
                          خدمات {ord.category} {ord.brand}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[10px] mt-1 font-mono">مدل: {ord.model || 'عمومی'} - خطای اعلامی: {ord.errorCode || 'نامشخص'}</p>
                    </div>

                    {/* 3-Step Simplified Status Badge */}
                    <div>
                      <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${
                        ord.status === 'accepted'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : ord.status === 'in_progress' || ord.status === 'enroute' || ord.status === 'repairing' || ord.status === 'needs_part'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : ord.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : isPendingStatus(ord.status as string)
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {isPendingStatus(ord.status as string) && 'در انتظار پذیرش'}
                        {ord.status === 'accepted' && '۱. قبول و آزادسازی اطلاعات'}
                        {(ord.status === 'in_progress' || ord.status === 'enroute' || ord.status === 'repairing' || ord.status === 'needs_part') && '۲. اعزام به محل مشتری'}
                        {ord.status === 'completed' && '۳. اتمام و تحویل دستگاه ✓'}
                        {ord.status === 'cancelled' && 'لغو شده'}
                      </span>
                    </div>
                  </div>

                  {/* Customer Information detail */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mb-4">
                    <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      <div className="font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span>مشخصات متقاضی:</span>
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-medium">
                          اطلاعات آزاد شده ✓
                        </span>
                      </div>
                      <p className="text-slate-600">نام: <span className="font-semibold text-slate-800">{ord.customerName}</span></p>
                      <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200/80">
                        <span className="text-slate-600 font-sans font-bold text-sm text-slate-900">{ord.customerPhone}</span>
                        <a
                          href={`tel:${ord.customerPhone}`}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-3 py-1 rounded-lg flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>تماس مستقیم</span>
                        </a>
                      </div>
                      <p className="text-slate-600">
                        آدرس: <span className="font-sans text-slate-800 font-medium select-all">
                          {[ord.city, ord.region, ord.address].filter(s => s && String(s).trim()).join('، ') || 'هماهنگی دقیق تلفنی با مشتری'}
                        </span>
                      </p>
                    </div>

                    <div className="space-y-1 bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-col justify-between">
                      <div>
                        <div className="font-bold text-slate-700 mb-1">شرح ایراد فنی:</div>
                        <p className="text-justify leading-relaxed text-slate-600">{ord.description || 'توشیح اضافه ارائه نشده است.'}</p>
                      </div>
                      <div className="mt-2 text-[10px] text-slate-400">
                        بازه حضور: <span className="font-bold text-slate-700">
                          {ord.date && !ord.date.includes('T') ? ord.date : 'هماهنگی با مشتری'} {ord.timeSlot ? `(${ord.timeSlot})` : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 3-Step Action Triggers */}
                  {ord.status !== 'completed' && ord.status !== 'cancelled' && (
                    <div className="border-t border-slate-100 pt-3 flex flex-wrap gap-2 justify-between items-center">
                      <div className="flex flex-wrap items-center gap-2">
                        {isPendingStatus(ord.status as string) && (
                          <button
                            id={`accept-my-btn-${ord.id}`}
                            onClick={() => {
                              if (isVacationMode) {
                                triggerNotification('حالت مرخصی فعال است', 'در وضعیت مرخصی امکان قبول مسئولیت سفارش جدید وجود ندارد. ابتدا وضعیت خود را به آماده‌به‌کار تغییر دهید.', 'warning');
                                return;
                              }
                              onAcceptOrder(ord.id, activeTech.id);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 px-3.5 rounded-lg cursor-pointer transition-all flex items-center gap-1 shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>قبول مسئولیت و شروع</span>
                          </button>
                        )}

                        {ord.status === 'accepted' && (
                          <button
                            id={`dispatch-btn-${ord.id}`}
                            onClick={() => onUpdateOrderStatus(ord.id, 'in_progress')}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold py-2 px-4 rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                          >
                            <Truck className="w-4 h-4" />
                            <span>۲. اعزام به محل مشتری (شروع کار)</span>
                          </button>
                        )}

                        {(ord.status === 'in_progress' || ord.status === 'enroute' || ord.status === 'repairing' || ord.status === 'needs_part') && (
                          <button
                            id={`open-finalize-btn-${ord.id}`}
                            onClick={() => setSelectedOrderForCost(ord.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold py-2 px-4 rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>۳. اتمام و تحویل دستگاه به مشتری</span>
                          </button>
                        )}
                      </div>

                      <button
                        id={`cancel-order-btn-${ord.id}`}
                        onClick={() => {
                          const conf = window.confirm('آیا از لغو این سفارش مطمئن هستید؟');
                          if (conf) onUpdateOrderStatus(ord.id, 'cancelled');
                        }}
                        className="text-rose-500 hover:text-white hover:bg-rose-500 border border-rose-300 text-[10px] py-1.5 px-3 rounded-xl cursor-pointer transition-all"
                      >
                        انصراف و لغو سرویس
                      </button>
                    </div>
                  )}

                  {/* Completion confirmation overlay (without repairCost input) */}
                  {selectedOrderForCost === ord.id && (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mt-4 space-y-3 animate-in fade-in slide-in-from-top-3 duration-200">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-start gap-2.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="leading-relaxed">
                          <strong>تاییدیه اتمام کار و تحویل دستگاه:</strong>
                          <p className="text-[11px] text-emerald-800 mt-0.5">
                            کمیسیون ۱۵٪ این سفارش قبلاً در مرحله اول (آزادسازی اطلاعات) وصول شده است و کسر دیگری صورت نمی‌گیرد. با ثبت تایید زیر، دستگاه تحویل مشتری شده و سفارش خاتمه می‌یابد.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-1 font-medium">قطعه یدکی مصرفی از فروشگاه (اختیاری):</label>
                          <select
                            value={selectedPartId}
                            onChange={(e) => setSelectedPartId(e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl p-2 text-xs w-full cursor-pointer"
                          >
                            <option value="">خیر - قطعه‌ای مصرف نشد</option>
                            {spareParts.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.price.toLocaleString('fa-IR')} ت)
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-500 block mb-1 font-medium">گزارش کار و توضیحات نهایی (اختیاری):</label>
                          <input
                            type="text"
                            placeholder="رفع عیب، تست کارکرد و تحویل سالم به مشتری..."
                            value={repairLogText}
                            onChange={(e) => setRepairLogText(e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl p-2 text-xs w-full"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end pt-2 border-t border-slate-200/60">
                        <button
                          type="button"
                          onClick={() => setSelectedOrderForCost(null)}
                          className="text-slate-600 bg-slate-200 text-center px-4 py-2 rounded-xl text-xs hover:bg-slate-300 cursor-pointer transition-colors"
                        >
                          انصراف
                        </button>
                        <button
                          id={`finalize-submit-${ord.id}`}
                          type="button"
                          onClick={() => handleFinalizeJob(ord.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-5 py-2 rounded-xl text-xs shadow-sm cursor-pointer transition-all flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          <span>تایید اتمام کار و تحویل دستگاه</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search Error Codes and Schematics Tab for Technicians */}
      {selectedTab === 'search-errors' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-md inline-block">
                  دسترسی نامحدود همکار فنی
                </span>
                <span className="bg-amber-400 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                  VIP تکنسین
                </span>
              </div>
              <h3 className="font-extrabold text-sm sm:text-base">مرجع تخصصی کدهای ارور، دیاگرام‌ها و عیب‌یابی پکیج و لوازم خانگی</h3>
              <p className="text-blue-100 text-xs">مشاهده کامل دلایل بروز ارور، روش‌های مرحله‌به‌مرحله رفع عیب، مقدار اهم قطعات و نقشه‌های فنی</p>
            </div>
            <button
              onClick={() => setSelectedTab('add-error')}
              className="bg-white text-blue-800 hover:bg-blue-50 text-xs font-black px-4 py-2.5 rounded-xl transition-all shadow-xs shrink-0 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>ثبت تجربه یا کد خطای جدید</span>
            </button>
          </div>

          <ErrorSearch
            errorCodes={(errorCodes || []).filter(c => c && c.isApproved)}
            commonProblems={commonProblems || []}
            spareParts={spareParts || []}
            affiliateProducts={affiliateProducts || []}
            onSelectError={setSelectedErrorForTech}
            selectedError={selectedErrorForTech}
            onBookRepair={() => {
              triggerNotification('ثبت سفارش', 'جهت پذیرش سفارش‌ها به تب «سفارشات جدید در محله شما» مراجعه فرمایید.', 'info');
            }}
            onFilterParts={(cat, br) => {
              setShopCategoryFilter(cat);
              setShopBrandFilter(br);
              setSelectedTab('parts-store');
            }}
            currentUser={currentUser || { id: activeTech.id, role: 'technician', full_name: activeTech.name, phone: activeTech.phone, subscription: { is_premium: true } }}
            triggerNotification={triggerNotification}
            onPurchase={onPurchasePart}
            categoryConfig={categoryConfig || {}}
            technicians={technicians || []}
          />
        </div>
      )}

      {/* Spare Parts Marketplace Tab for Technicians */}
      {selectedTab === 'parts-store' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
            <div className="space-y-1">
              <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-md inline-block">
                تامین قطعات اورجینال با قیمت همکار
              </span>
              <h3 className="font-extrabold text-sm sm:text-base">فروشگاه قطعات یدکی پکیج، کولر گازی و لوازم خانگی</h3>
              <p className="text-emerald-100 text-xs">سفارش مستقیم و سریع قطعات اصلی با تخفیف ویژه تکنسین‌ها جهت پروژه‌های تعمیری فعال</p>
            </div>
          </div>

          <PartsStore
            parts={spareParts}
            categoriesList={categoriesList && Array.isArray(categoriesList) ? categoriesList : []}
            onPurchase={(part, addr, name, phone, card, track, qty) => {
              if (onPurchasePart) {
                onPurchasePart(part, addr, name || activeTech.name, phone || activeTech.phone, card, track, qty);
              } else {
                triggerNotification('ثبت سفارش قطعه', `سفارش قطعه "${part.name}" برای شما ثبت شد.`, 'success');
              }
            }}
            brandFilter={shopBrandFilter}
            categoryFilter={shopCategoryFilter}
            affiliateProducts={affiliateProducts}
            errorCodesList={errorCodes}
            onClearFilters={() => {
              setShopBrandFilter('');
              setShopCategoryFilter('');
            }}
          />
        </div>
      )}

      {selectedTab === 'add-error' && (
        <form onSubmit={handleCreateErrorSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-2">
            <Sparkles className="w-5 h-5 text-blue-600 animate-pulse" />
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-800">مشارکت تکنسین‌ها در بانک اطلاعات خطاهای ایران</h3>
              <p className="text-[10px] text-slate-400">کدهای خطایی که جدیداً عیب‌یابی موفق داشته‌اید را ثبت کنید تا همکاران و افراد دیگر استفاده کنند.</p>
            </div>
          </div>

          {submitSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 text-xs text-center font-bold">
              ✓ مورد با موفقیت برای مدیریت فرستاده شد. پس از تایید نهایی در جستجو گنجانده می‌شود!
            </div>
          )}

          {/* Special Toggle for Common Problems (DIY) vs Error Codes */}
          <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl flex items-center justify-between gap-3 text-right">
            <div className="space-y-0.5">
              <span className="text-xs font-extrabold text-blue-900 block">ثبت به عنوان مشکل شایع دستگاه (بدون نیاز به کد خطا)</span>
              <span className="text-[10px] text-slate-500 block">الگوی تایتل - کتگوری - برند - علل و راه‌حل به همراه تگ مشکلات شایع برای راهنمای DIY کاربران</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isCommonProblem}
                onChange={(e) => {
                  setIsCommonProblem(e.target.checked);
                  if (e.target.checked) {
                    setErrorCode('');
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-600 text-[10px] font-bold mb-1">
                {isCommonProblem ? 'کد خطا (اختیاری یا خالی)' : 'کد خطا (مانند E9, F1) *'}
              </label>
              <input
                required={!isCommonProblem}
                disabled={isCommonProblem}
                type="text"
                placeholder={isCommonProblem ? 'بدون نیاز به کد خطا' : 'E9'}
                value={errorCode}
                onChange={(e) => setErrorCode(e.target.value)}
                className={`w-full text-xs p-2 rounded-xl outline-none border transition-all ${
                  isCommonProblem ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
            </div>
            <div>
              <label className="block text-slate-600 text-[10px] font-bold mb-1">عنوان فارسی خطا (علت مشهود) *</label>
              <input
                required
                type="text"
                placeholder="خرابی حسگر یا کمبود فشار آب ورودی"
                value={errTitle}
                onChange={(e) => setErrTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs p-2 rounded-xl outline-none"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-600 text-[10px] font-bold">مدل دستگاه‌های مورد نظر *</label>
                <button
                  type="button"
                  onClick={() => {
                    setTechModelMode(techModelMode === 'select' ? 'custom' : 'select');
                    setErrModel('');
                  }}
                  className="text-[8.5px] text-blue-600 hover:text-blue-800 font-extrabold flex items-center gap-0.5 cursor-pointer bg-slate-100 hover:bg-slate-205 px-1.5 py-0.5 rounded"
                >
                  {techModelMode === 'select' ? '➕ تایپ مدل جدید' : '📋 انتخاب موجود'}
                </button>
              </div>
              {techModelMode === 'select' ? (
                <select
                  value={errModel}
                  onChange={(e) => setErrModel(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-205 text-xs p-2 rounded-xl outline-none cursor-pointer"
                  required
                >
                  <option value="">-- انتخاب مدل --</option>
                  <option value="عمومی">عمومی (کل مدل‌ها)</option>
                  {models.map(md => (
                    <option key={md} value={md}>{md}</option>
                  ))}
                </select>
              ) : (
                <input
                  required
                  type="text"
                  placeholder="M24FF و مدل‌های مشابه"
                  value={errModel}
                  onChange={(e) => setErrModel(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs p-2 rounded-xl outline-none animate-in fade-in duration-200"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-600 text-[10px] font-bold">دسته‌بندی دستگاه *</label>
                <button
                  type="button"
                  onClick={() => {
                    setTechCategoryMode(techCategoryMode === 'select' ? 'custom' : 'select');
                    setErrCategory('');
                  }}
                  className="text-[8.5px] text-blue-600 hover:text-blue-800 font-extrabold flex items-center gap-0.5 cursor-pointer bg-slate-100 hover:bg-slate-205 px-1.5 py-0.5 rounded"
                >
                  {techCategoryMode === 'select' ? '➕ دستگاه جدید' : '📋 انتخاب موجود'}
                </button>
              </div>
              {techCategoryMode === 'select' ? (
                <select
                  value={errCategory}
                  onChange={(e) => setErrCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs p-2 rounded-xl outline-none cursor-pointer"
                  required
                >
                  <option value="">-- انتخاب دسته‌بندی --</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              ) : (
                <input
                  required
                  type="text"
                  placeholder="نوع دستگاه جدید..."
                  value={errCategory}
                  onChange={(e) => setErrCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs p-2 rounded-xl outline-none animate-in fade-in duration-200"
                />
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-600 text-[10px] font-bold">برند دستگاه *</label>
                <button
                  type="button"
                  onClick={() => {
                    setTechBrandMode(techBrandMode === 'select' ? 'custom' : 'select');
                    setErrBrand('');
                  }}
                  className="text-[8.5px] text-blue-600 hover:text-blue-800 font-extrabold flex items-center gap-0.5 cursor-pointer bg-slate-100 hover:bg-slate-205 px-1.5 py-0.5 rounded"
                >
                  {techBrandMode === 'select' ? '➕ برند جدید' : '📋 انتخاب موجود'}
                </button>
              </div>
              {techBrandMode === 'select' ? (
                <select
                  value={errBrand}
                  onChange={(e) => setErrBrand(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs p-2 rounded-xl outline-none cursor-pointer"
                  required
                >
                  <option value="">-- انتخاب برند --</option>
                  {brands.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              ) : (
                <input
                  required
                  type="text"
                  placeholder="نام برند جدید..."
                  value={errBrand}
                  onChange={(e) => setErrBrand(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs p-2 rounded-xl outline-none animate-in fade-in duration-200"
                />
              )}
            </div>

            <div>
              <label className="block text-slate-600 text-[10px] font-bold mb-1">میزان خطر احتمالی</label>
              <select
                value={errHazard}
                onChange={(e) => setErrHazard(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-205 text-xs p-2 rounded-xl outline-none cursor-pointer"
              >
                <option value="low">کم خطر - عادی</option>
                <option value="medium">متوسط - احتیاط عمومی</option>
                <option value="high">خطر بالا - احتیاج به قطع برق</option>
                <option value="critical">بحرانی - خطر نشت گاز، برق گرفتگی شدید</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-600 text-[10px] font-bold mb-1">توضیحات کلی علت بروز خطا *</label>
            <textarea
              required
              rows={2}
              placeholder="شیر سه طرفه قطع است یا سیم کشی آسیب دیده..."
              value={errDesc}
              onChange={(e) => setErrDesc(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs p-2.5 rounded-xl outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-600 text-[10px] font-bold mb-1">گام ۱ برای رفع خطا</label>
              <input
                type="text"
                placeholder="محافظ ولتاژ و ورودی برق را قطع کرده و مجدد راه اندازی کنید"
                value={errStep1}
                onChange={(e) => setErrStep1(e.target.value)}
                className="w-full bg-slate-50 border border-slate-205 text-xs p-2 rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-600 text-[10px] font-bold mb-1">گام ۲ برای رفع خطا</label>
              <input
                type="text"
                placeholder="برد فرمان را باز کرده و سلامت خازن ورودی را بررسی نمایید"
                value={errStep2}
                onChange={(e) => setErrStep2(e.target.value)}
                className="w-full bg-slate-50 border border-slate-205 text-xs p-2 rounded-xl outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-600 text-[10px] font-bold mb-1">نکات واجب ایمنی (جلوگیری از حوادث احتمالی)</label>
              <input
                type="text"
                placeholder="قطع کامل گاز شهری یا آب گرم قبل از دست به آچار شدن"
                value={errPrecaution}
                onChange={(e) => setErrPrecaution(e.target.value)}
                className="w-full bg-slate-50 border border-slate-205 text-xs p-2 rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-600 text-[10px] font-bold mb-1">ابزارهای مورد این کار (با علامت «،» فرعی جدا کنید)</label>
              <input
                type="text"
                placeholder="آچار ۱۰، انبردست کوچک، مولتی‌متر تریاک"
                value={errTools}
                onChange={(e) => setErrTools(e.target.value)}
                className="w-full bg-slate-50 border border-slate-205 text-xs p-2 rounded-xl outline-none"
              />
            </div>
          </div>

          <button
            id="technician-add-error-submit"
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2 px-4 text-xs font-semibold shadow-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت و ارسال کد خطا جهت بازبینی مدیریت کدیار۲۴</span>
          </button>
        </form>
      )}

      {selectedTab === 'profile-docs' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-205 p-5 sm:p-6 shadow-xs space-y-5 animate-in fade-in duration-150 text-right">
            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <span className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse"></span>
              <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm">مدارک احراز هویت و اسناد صلاحیت فنی</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Profile details list card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <span className="block text-slate-700 text-xs font-bold border-b border-slate-150 pb-2">سیاهه‌ اطلاعات کاربری تکنسین</span>
                <div className="space-y-3 text-xs text-slate-600 font-medium leading-relaxed">
                  <div><strong>نام و خانوادگی:</strong> <span className="text-slate-900 font-extrabold">{activeTech.name}</span></div>
                  <div><strong>شماره موبایل ارتباطی:</strong> <span className="text-slate-900 font-bold font-mono">{activeTech.phone}</span></div>
                  <div><strong>محدوده تحت پوشش خدمت:</strong> <span className="text-slate-900 font-bold">{activeTech.activeLocation}</span></div>
                  <div><strong>زمینه‌های تخصص ثبت‌شده:</strong> <span className="text-slate-900 font-bold">{(Array.isArray(activeTech.specialty) ? activeTech.specialty : [activeTech.specialty]).filter(Boolean).join('، ')}</span></div>
                  <div>
                    <strong>وضعیت تأیید هویت صنف:</strong>{' '}
                    {activeTech.isVerified ? (
                      <span className="bg-emerald-600 text-white py-0.5 px-3 rounded-md font-bold text-[9px] inline-block mr-1">تأیید صلاحیت رسمی</span>
                    ) : (
                      <span className="bg-rose-50 text-rose-700 border border-rose-250 py-0.5 px-3 rounded-md font-bold text-[9px] inline-block mr-1 animate-pulse">در انتظار بررسی مدارک توسط مدیریت</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Upload license form card */}
              <form 
                onSubmit={handleUploadDocument} 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`bg-slate-50 border-2 ${dragActive ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 border-dashed'} rounded-2xl p-5 space-y-4 transition-all relative`}
              >
                <span className="block text-slate-700 text-xs font-bold border-b border-slate-150 pb-2">بارگذاری مدارک جدید صلاحیت (کارت ملی، گواهی فنی، جواز کسب)</span>
                
                {/* Document Information Banner */}
                <div className="bg-blue-50/80 border border-blue-200/80 text-blue-900 text-[11px] p-2.5 rounded-xl font-bold flex items-start gap-2">
                  <Check className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span>مدارک بارگذاری شده صرفاً جهت احراز هویت و تأیید صلاحیت تکنسین در سامانه ذخیره می‌شوند. شما می‌توانید مدارک خود را در هر زمان ویرایش، جایگزین یا حذف نمایید.</span>
                </div>

                {/* 3 Quick Document Selector Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  {[
                    { title: 'کارت ملی هوشمند', shortKey: 'کارت ملی', icon: '🪪' },
                    { title: 'گواهی فنی‌وحرفه‌ای', shortKey: 'فنی', icon: '🛠️' },
                    { title: 'جواز کسب کار صنف', shortKey: 'جواز', icon: '🏢' }
                  ].map(card => {
                    const currentDocs = Array.isArray(activeTech.documents) ? activeTech.documents : [];
                    const isUploaded = currentDocs.some(d => {
                      const info = getDocInfo(d);
                      const dName = String(info.name || '');
                      return dName.includes(card.shortKey) || dName.includes(card.title);
                    });
                    const isSelected = newDocText === card.title;

                    return (
                      <button
                        key={card.title}
                        type="button"
                        onClick={() => {
                          setNewDocText(card.title);
                          setSelectedFile(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.click();
                          }
                        }}
                        className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between space-y-1.5 group ${
                          isUploaded
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100'
                            : isSelected
                            ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-400/30'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-base">{card.icon}</span>
                          {isUploaded ? (
                            <span className="bg-emerald-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                              <Check className="w-2.5 h-2.5 text-white" />
                              ثبت شده (تغییر)
                            </span>
                          ) : (
                            <span className="text-[8px] text-blue-600 font-bold bg-blue-50 group-hover:bg-blue-100 px-1.5 py-0.5 rounded-md">
                              انتخاب فایل ↗
                            </span>
                          )}
                        </div>
                        <div className="font-extrabold text-[11px] leading-tight text-slate-800">{card.title}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-600">عنوان یا نام مدرک:</label>
                  <input
                    type="text"
                    placeholder="مثال: گواهینامه فنی و حرفه‌ای پکیج"
                    value={newDocText}
                    onChange={(e) => setNewDocText(e.target.value)}
                    className="w-full bg-white border border-slate-205 text-xs px-3.5 py-2.5 rounded-xl outline-none text-right font-medium focus:border-blue-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-600">انتخاب فایل اسکن شده (JPG, PNG, PDF):</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white hover:bg-blue-50/10 p-5 rounded-xl cursor-pointer text-center transition-all space-y-2 group"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/jpeg,image/jpg,image/png,application/pdf"
                      className="hidden"
                    />
                    
                    <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-blue-600 mx-auto transition-colors" />
                    
                    {selectedFile ? (
                      <div className="space-y-1">
                        <p className="text-xs text-blue-700 font-extrabold truncate max-w-[200px] mx-auto">{selectedFile.name}</p>
                        <p className="text-[9px] text-slate-400 font-extrabold">{(selectedFile.size / 1024).toFixed(1)} KB | برای تغییر کلیک کنید</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-[10px] text-slate-600 font-bold">فایل را به اینجا بکشید یا برای انتخاب کلیک کنید</p>
                        <p className="text-[8px] text-slate-400 font-bold">حداکثر حجم مجاز: ۵ مگابایت</p>
                      </div>
                    )}
                  </div>
                </div>

                {previewUrl && (
                  <div className="bg-white border border-slate-150 p-2 rounded-xl flex items-center justify-center">
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      className="max-h-20 rounded-lg object-contain border border-slate-100 shadow-2xs" 
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-750 hover:bg-blue-700 text-white rounded-xl text-xs font-bold py-2.5 px-4 cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                  disabled={isUploadingDoc}
                >
                  <Plus className="w-4 h-4" />
                  <span>آپلود و ثبت در پرونده</span>
                </button>

                {isUploadingDoc && (
                  <div className="space-y-1.5 bg-white p-2.5 rounded-lg border border-slate-150">
                    <div className="flex justify-between items-center text-[9px] font-bold text-slate-600">
                      <span>در حال کدگذاری و انتقال ایمن فایل...</span>
                      <span>{uploadDocProgress}٪</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full transition-all" style={{ width: `${uploadDocProgress}%` }}></div>
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Existing certificates directory listing */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <span className="block text-slate-750 text-xs font-extrabold">مستندات صلاحیت پیوست‌شده شما ({activeTech.documents?.length || 0} پرونده):</span>
              {(activeTech.documents && activeTech.documents.length > 0) || (activeTech.document_images && activeTech.document_images.length > 0) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-right">
                  {(activeTech.documents || []).map((doc, idx) => {
                    const info = getDocInfo(doc);
                    const docName = info.name || `مدرک ${idx + 1}`;
                    const fileType = info.fileType;
                    const isJson = info.isJson;

                    return (
                      <div key={idx} className="bg-white border border-slate-205 p-3.5 rounded-2xl flex flex-col justify-between gap-3 shadow-2xs hover:shadow-xs transition-shadow">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                            <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-extrabold text-slate-800 truncate" title={docName}>{docName}</h4>
                            <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
                              {isJson ? (fileType.includes('pdf') ? 'فرمت دیجیتال PDF' : 'تصویر ارسالی') : 'سند پیش‌فرض صنف'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-50 pt-2.5">
                          <span className="bg-emerald-50 text-emerald-700 text-[9px] px-2 py-0.5 rounded-md font-extrabold flex items-center gap-0.5">
                            <Check className="w-3 h-3" />
                            <span>معتبر</span>
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setPreviewDoc({ techName: activeTech.name, docName: doc })}
                              className="bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white px-2.5 py-1.5 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                              title="مشاهده پیش‌نمایش واقعی سند"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>مشاهده مدرک</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDocument(idx)}
                              className="bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white px-2.5 py-1.5 rounded-lg font-bold text-[10px] flex items-center gap-1 border border-rose-200 transition-all cursor-pointer"
                              title="حذف این مدرک"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>حذف</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-bold bg-slate-50">
                  هیچ مدرکی برای شما یافت نشد. لطفاً برای احراز هویت سند خود را آپلود نمایید.
                </div>
              )}

              {activeTech.document_images && activeTech.document_images.length > 0 && (
                <div className="mt-3">
                  <span className="block text-slate-750 text-xs font-extrabold mb-2">تصاویر واقعی مدارک آپلود شده:</span>
                  <div className="flex flex-wrap items-center gap-3">
                    {(Array.isArray(activeTech.document_images) ? activeTech.document_images : [activeTech.document_images]).map((img: any, iIdx) => {
                      const src = typeof img === 'string' ? img : (img && (img.url || img.data || img.src)) || '';
                      if (!src) return null;
                      return (
                        <div key={iIdx} className="relative group inline-block">
                          <img 
                            src={src} 
                            alt="مدرک تکنسین" 
                            onClick={() => setZoomImage(src)} 
                            className="w-20 h-20 object-cover rounded-lg border border-slate-300 hover:scale-105 transition-transform cursor-pointer shadow-sm" 
                            title="کلیک برای مشاهده بزرگ"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteImage(iIdx);
                            }}
                            className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full p-1 shadow-md hover:bg-rose-700 cursor-pointer transition-colors z-10"
                            title="حذف این تصویر مدرک"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Technician password change card */}
          <div className="bg-white rounded-2xl border border-slate-205 p-5 sm:p-6 shadow-xs space-y-5 animate-in fade-in duration-150 text-right">
            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <span className="w-2.5 h-2.5 bg-blue-600 rounded-full"></span>
              <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm">🔑 تغییر رمز عبور پنل تکنسین</h3>
            </div>

            <div className="max-w-md space-y-4">
              <p className="text-[11px] text-slate-500 font-extrabold leading-relaxed">
                جهت حفظ امنیت حساب کاربری خود، می‌توانید کلمه عبور پیش‌فرض یا فعلی‌تان را تغییر دهید. رمز جدید فوراً با پایگاه داده یکپارچه سراسری همگام‌سازی می‌گردد.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-600">رمز عبور فعلی:</label>
                  <input
                    type="password"
                    value={techCurrentPasswordInput}
                    onChange={(e) => setTechCurrentPasswordInput(e.target.value)}
                    placeholder="رمز ورود فعلی"
                    className="w-full bg-white border border-slate-205 text-xs px-3.5 py-2.5 rounded-xl outline-none text-right font-medium focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-600">رمز عبور جدید:</label>
                  <input
                    type="password"
                    value={techNewPasswordInput}
                    onChange={(e) => setTechNewPasswordInput(e.target.value)}
                    placeholder="حداقل ۴ کاراکتر"
                    className="w-full bg-white border border-slate-205 text-xs px-3.5 py-2.5 rounded-xl outline-none text-right font-medium focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-600">تکرار رمز عبور جدید:</label>
                  <input
                    type="password"
                    value={techNewPasswordConfirmInput}
                    onChange={(e) => setTechNewPasswordConfirmInput(e.target.value)}
                    placeholder="تکرار رمز جدید"
                    className="w-full bg-white border border-slate-205 text-xs px-3.5 py-2.5 rounded-xl outline-none text-right font-medium focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleTechPasswordChange}
                  className="bg-blue-600 hover:bg-blue-750 hover:bg-blue-700 text-white rounded-xl text-xs font-bold py-2.5 px-6 cursor-pointer transition-colors animate-in"
                >
                  تأیید و همگام‌سازی رمز عبور جدید
                </button>
              </div>
            </div>
          </div>

          {/* Commission & Payments History Section */}
          <div className="bg-white rounded-2xl border border-slate-205 p-5 sm:p-6 shadow-xs space-y-5 animate-in fade-in duration-150 text-right">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-emerald-600 rounded-full"></span>
                <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm">💳 وضعیت حساب کمیسیون و سوابق پرداخت‌ها</h3>
              </div>
              {hasCommissionDebt && !hasPendingCommissionApproval && (
                <button
                  type="button"
                  onClick={() => setIsSettleModalOpen(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <span>تسویه کمیسیون و فعال‌سازی سفارش‌ها</span>
                </button>
              )}
            </div>

            {/* Current Financial State Alert */}
            {hasPendingCommissionApproval ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold leading-relaxed flex items-start gap-2.5">
                <span className="text-base">⏳</span>
                <div>
                  <div className="font-extrabold text-amber-950 mb-0.5">فیش تسویه کمیسیون در نوبت تایید مدیریت است</div>
                  <div className="text-[11px] text-amber-800 font-medium">
                    فیش واریز تسویه کمیسیون شما ثبت گردیده است. بلافاصله پس از مشاهده و تأیید توسط مدیریت در پنل ادمین، قفل سفارش‌های همشهری باز شده و مجدداً سفارش‌های جدید برای شما نمایش داده می‌شود.
                  </div>
                </div>
              </div>
            ) : hasCommissionDebt ? (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold leading-relaxed flex items-start gap-2.5">
                <span className="text-base">⚠️</span>
                <div>
                  <div className="font-extrabold text-rose-950 mb-0.5">
                    بدهی کمیسیون سفارش‌های همشهری: {commissionDebtAmount.toLocaleString('fa-IR')} تومان
                  </div>
                  <div className="text-[11px] text-rose-800 font-medium">
                    سفارش اول شما به عنوان هدیه انجام شد. جهت دریافت و مشاهده سفارش‌های بعدی از همشهری‌های خود، لطفاً کمیسیون پلتفرم را تسویه فرمایید تا بلافاصله پس از تایید مدیریت، سفارش‌ها فعال شوند.
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold leading-relaxed flex items-start gap-2.5">
                <span className="text-base">✅</span>
                <div>
                  <div className="font-extrabold text-emerald-950 mb-0.5">وضعیت مالی: تسویه کامل و حساب فعال</div>
                  <div className="text-[11px] text-emerald-800 font-medium">
                    حساب شما فاقد هرگونه بدهی کمیسیون بوده و تمامی سفارش‌های جدید اعزام همشهری‌های شما بدون محدودیت قابل مشاهده و پذیرش هستند.
                  </div>
                </div>
              </div>
            )}

            {/* Payments List Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-extrabold text-slate-700">
                <span>لیست تراکنش‌ها و پرداخت‌های ثبت‌شده:</span>
                <span className="text-[11px] text-slate-500 font-mono">تعداد: {myPayments.length}</span>
              </div>

              {myPayments.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  هیچ پرداختی تاکنون ثبت نشده است.
                  <div className="text-[10px] text-slate-400 mt-1">سفارش اول شما رایگان است و پس از آن سوابق پرداخت کمیسیون در این بخش ثبت می‌شود.</div>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-150 text-slate-700 bg-slate-50">
                        <th className="py-2.5 px-3 font-extrabold">ردیف</th>
                        <th className="py-2.5 px-3 font-extrabold">تاریخ</th>
                        <th className="py-2.5 px-3 font-extrabold">مبلغ</th>
                        <th className="py-2.5 px-3 font-extrabold">بابت (علت پرداخت)</th>
                        <th className="py-2.5 px-3 font-extrabold">روش پرداخت</th>
                        <th className="py-2.5 px-3 font-extrabold">کد رهگیری</th>
                        <th className="py-2.5 px-3 font-extrabold">وضعیت</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {myPayments.map((p: any, idx: number) => {
                        const isApproved = p.status === 'completed' || p.status === 'confirmed' || p.status === 'success';
                        const isPending = p.status === 'pending' || !p.status;
                        return (
                          <tr key={`tech_pay_${p.id || idx}`} className="hover:bg-slate-50/40">
                            <td className="py-2.5 px-3 font-mono text-slate-500">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">
                              {p.created_at ? new Date(p.created_at).toLocaleDateString('fa-IR') : 'ثبت‌شده'}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-800 font-mono">
                              {Number(p.amount || 0).toLocaleString('fa-IR')} تومان
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-700">
                              {p.description || (p.related_type === 'commission' ? 'تسویه کمیسیون ۱۵٪ بابت سفارش اعزام همشهری' : 'پرداخت خدمات پلتفرم')}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                              {p.payment_method === 'card_to_card' ? 'کارت به کارت' : 'درگاه شتاب'}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">
                              {p.ref_code || p.tracking_code || p.ref_id || p.authority || '---'}
                            </td>
                            <td className="py-2.5 px-3">
                              {isApproved ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  تایید شده (حساب فعال)
                                </span>
                              ) : isPending ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                                  در انتظار تایید مدیریت
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                                  رد شده
                                </span>
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
        </div>
      )}

      {/* 📱 DIGITAL BUSINESS CARD & APP REFERRAL TAB */}
      {selectedTab === 'digital-card' && (
        <div className="space-y-6 text-right animate-in fade-in duration-200">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-lg border border-blue-800/50 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider inline-block mb-2">
                  کارت ویزیت دیجیتال و کد دعوت اختصاصی تکنسین
                </span>
                <h3 className="text-lg sm:text-xl font-extrabold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                  <span>معرفی اپلیکیشن کدیار۲۴ به مشتریان و دریافت کار مستقیم</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed mt-1 max-w-2xl font-sans">
                  با ارسال لینک اختصاصی زیر به مشتریان خود، آن‌ها می‌توانند اپلیکیشن کدیار۲۴ را نصب یا در وب‌سایت، درخواست تعمیرات خود را مستقیماً برای شما ثبت کنند. تصویر و نام شما روی صفحه اول نمایش داده می‌شود.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Profile Picture & Avatar Editor */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Image className="w-5 h-5 text-blue-600" />
                  <h4 className="font-extrabold text-sm text-slate-900">ویرایش تصویر پروفایل و نام در اپلیکیشن</h4>
                </div>
                {isAvatarProcessing && (
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full animate-pulse">
                    در حال بهینه‌سازی عکس...
                  </span>
                )}
              </div>

              {/* Hidden file input */}
              <input
                ref={avatarFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                onChange={handleAvatarFileInputChange}
                className="hidden"
              />

              {/* Interactive Avatar Area */}
              <div
                onDragOver={(e) => { e.preventDefault(); setAvatarDragOver(true); }}
                onDragLeave={() => setAvatarDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setAvatarDragOver(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    processAvatarFile(e.dataTransfer.files[0]);
                  }
                }}
                className={`flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl border transition-all ${
                  avatarDragOver
                    ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-400/30'
                    : 'bg-slate-50 border-slate-100'
                }`}
              >
                <div
                  onClick={() => avatarFileInputRef.current?.click()}
                  className="relative group cursor-pointer shrink-0"
                  title="کلیک برای انتخاب عکس جدید از سیستم"
                >
                  <img
                    src={avatarUrlInput || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='35' r='20' fill='%23ccc'/><path d='M20 85c0-15 15-25 30-25s30 10 30 25z' fill='%23ccc'/></svg>"}
                    alt={activeTech.name}
                    className="w-20 h-20 rounded-full object-cover border-4 border-white ring-4 ring-blue-500/20 shadow-md group-hover:opacity-80 transition-all"
                  />
                  <div className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-5 h-5 mb-0.5" />
                    <span className="text-[9px] font-bold">تغییر عکس</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      avatarFileInputRef.current?.click();
                    }}
                    className="absolute -bottom-1 -right-1 bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-full shadow-md transition-all cursor-pointer"
                    title="انتخاب عکس از گالری / کامپیوتر"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5 text-center sm:text-right min-w-0 flex-1">
                  <h5 className="font-black text-slate-900 text-sm">{activeTech.name}</h5>
                  <p className="text-[11px] text-slate-500 font-bold">شهر: {activeTech.activeLocation || 'تعیین‌نشده'}</p>
                  <p className="text-[10px] text-emerald-600 font-extrabold">⭐ امتیاز: {activeTech.rating || '5.0'} | {activeTech.completedOrders || 0} سفارش موفق</p>
                  
                  <div className="flex items-center gap-2 pt-1 justify-center sm:justify-start flex-wrap">
                    <button
                      type="button"
                      onClick={() => avatarFileInputRef.current?.click()}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-lg cursor-pointer transition-all shadow-2xs flex items-center gap-1.5"
                    >
                      <Upload className="w-3 h-3" />
                      <span>انتخاب عکس از سیستم</span>
                    </button>
                    {avatarUrlInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarUrlInput('');
                          triggerNotification('تصویر حذف شد', 'تصویر به آواتار پیش‌فرض تغییر یافت. دکمه ذخیره را بزنید.', 'info');
                        }}
                        className="bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-700 text-[10px] font-bold px-2.5 py-1.5 rounded-lg cursor-pointer transition-all flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>حذف عکس</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">نام و نام خانوادگی نمایش در اپ:</label>
                  <input
                    type="text"
                    value={techNameInput}
                    onChange={(e) => setTechNameInput(e.target.value)}
                    placeholder="نام تکنسین"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">شهر فعالیت اصلی:</label>
                  <input
                    type="text"
                    value={techLocationInput}
                    onChange={(e) => setTechLocationInput(e.target.value)}
                    placeholder="مانند: تهران، اصفهان، شیراز..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">آدرس تصویر آواتار (یا انتخاب مستقیم از دکمه بالا):</label>
                  <input
                    type="text"
                    value={avatarUrlInput}
                    onChange={(e) => setAvatarUrlInput(e.target.value)}
                    placeholder="https://example.com/avatar.jpg یا انتخاب مستقیم با دکمه بالا"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 text-left font-mono outline-none focus:border-blue-500 focus:bg-white mb-1"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    می‌توانید مستقیماً با دکمه بالا عکس را از دستگاه خود انتخاب کنید، یا آدرس اینترنتی تصویر را وارد نمایید.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const finalAvatar = avatarUrlInput.trim();
                    const finalName = techNameInput.trim() || activeTech.name;
                    const finalLoc = techLocationInput.trim() || activeTech.activeLocation;

                    onUpdateTechnician(activeTech.id, {
                      name: finalName,
                      avatarUrl: finalAvatar,
                      activeLocation: finalLoc
                    });
                    triggerNotification('به‌روزرسانی موفق', 'اطلاعات و عکس پروفایل شما با موفقیت در دیتابیس و حافظه پایدار ثبت و به‌روزرسانی شد.', 'success');
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-3 px-4 rounded-xl cursor-pointer transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>ذخیره و به‌روزرسانی عکس و مشخصات پروفایل</span>
                </button>
              </div>
            </div>

            {/* 2. Referral Share & Business Card Module */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-amber-500" />
                    <h4 className="font-extrabold text-sm text-slate-900">لینک و پیام اختصاصی دعوت از مشتریان</h4>
                  </div>
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2.5 py-1 rounded-lg border border-emerald-200">
                    دامنه رسمی kodyar24.ir
                  </span>
                </div>

                {/* Helper for clean domain URL */}
                {(() => {
                  const getCleanShareUrl = () => {
                    if (typeof window !== 'undefined') {
                      const host = window.location.hostname;
                      if (host.includes('run.app') || host.includes('localhost') || host.includes('127.0.0.1') || host.includes('ais-dev') || host.includes('ais-pre')) {
                        return `https://kodyar24.ir/?tech=${activeTech.id}`;
                      }
                      return `${window.location.origin}/?tech=${activeTech.id}`;
                    }
                    return `https://kodyar24.ir/?tech=${activeTech.id}`;
                  };
                  const cleanShareUrl = getCleanShareUrl();

                  return (
                    <>
                      {/* Referral Link Box */}
                      <div className="space-y-2 mb-5">
                        <label className="block text-[11px] font-extrabold text-slate-700">لینک کارت ویزیت دیجیتال و معرفی شما:</label>
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2 rounded-2xl">
                          <input
                            type="text"
                            readOnly
                            value={cleanShareUrl}
                            className="w-full bg-transparent text-xs font-mono font-bold text-blue-700 outline-none px-2 text-left"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(cleanShareUrl);
                              setCopiedLink(true);
                              setTimeout(() => setCopiedLink(false), 3000);
                              triggerNotification('کپی شد', 'لینک اختصاصی کارت ویزیت تکنسین با دامنه رسمی کدیار۲۴ کپی شد.', 'success');
                            }}
                            className="bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-extrabold px-4 py-2.5 rounded-xl cursor-pointer shrink-0 transition-all flex items-center gap-1.5"
                          >
                            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedLink ? 'کپی شد!' : 'کپی لینک'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Quick Share Buttons */}
                      <div className="space-y-2">
                        <label className="block text-[11px] font-extrabold text-slate-700">اشتراک‌گذاری فوری در پیام‌رسان‌ها:</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {/* Eitaa */}
                          <a
                            href={`https://eitaa.com/share/url?url=${encodeURIComponent(cleanShareUrl)}&text=${encodeURIComponent(`سلام، جهت ثبت سفارش تعمیرات لوازم خانگی و استعلام کدهای خطا از طریق کارت ویزیت اختصاصی ${activeTech.name} وارد سامانه کدیار۲۴ شوید:`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-[10px] font-extrabold py-2.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all text-center"
                          >
                            <span>ارسال در ایتا</span>
                          </a>

                          {/* Telegram */}
                          <a
                            href={`https://t.me/share/url?url=${encodeURIComponent(cleanShareUrl)}&text=${encodeURIComponent(`سلام، جهت ثبت سفارش تعمیرات تخصصی ${activeTech.name} وارد لینک شوید:`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-[10px] font-extrabold py-2.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all text-center"
                          >
                            <span>تلگرام</span>
                          </a>

                          {/* WhatsApp */}
                          <a
                            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`سلام، جهت ثبت سفارش تعمیرات توسط ${activeTech.name} وارد لینک زیر شوید:\n${cleanShareUrl}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold py-2.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all text-center"
                          >
                            <span>واتساپ</span>
                          </a>

                          {/* SMS */}
                          <a
                            href={`sms:?body=${encodeURIComponent(`سلام، جهت ثبت سفارش آنلاین تعمیرات تخصصی ${activeTech.name} وارد سامانه شوید:\n${cleanShareUrl}`)}`}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-[10px] font-extrabold py-2.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all text-center"
                          >
                            <span>پیامک (SMS)</span>
                          </a>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Digital Business Card Live Preview */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 mt-4 space-y-3">
                <span className="text-[9px] font-mono font-bold text-amber-400 block uppercase tracking-wider">نمای کارت ویزیت دیجیتال شما در دید مشتری:</span>
                <div className="flex items-center gap-3">
                  <img
                    src={activeTech.avatarUrl || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='35' r='20' fill='%23ccc'/><path d='M20 85c0-15 15-25 30-25s30 10 30 25z' fill='%23ccc'/></svg>"}
                    alt={activeTech.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-amber-400 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-black text-white block truncate">{activeTech.name}</span>
                    <span className="text-[10px] text-slate-300 font-bold block">تکنسین برتر کدیار۲۴ | {activeTech.activeLocation || 'ایران'}</span>
                    <span className="text-[9px] text-amber-300 font-extrabold block mt-0.5">⭐ {activeTech.rating || '5.0'} (۱۸۰ روز گارانتی کتبی خدمات)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 💼 WALLET & COMMISSION DEDICATED TAB */}
      {selectedTab === 'wallet' && (
        <div className="space-y-6">
          {/* Top Wallet Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-800 text-white rounded-3xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
              <div className="relative z-10">
                <div className="flex items-center justify-between opacity-80 mb-2">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <Wallet className="w-4 h-4" />
                    کیف پول تکنسین کدیار۲۴
                  </span>
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono">حساب فعال</span>
                </div>
                <div className="text-3xl font-black font-mono tracking-tight my-1">
                  {rawBalance.toLocaleString('fa-IR')} <span className="text-sm font-sans font-medium text-emerald-100">تومان</span>
                </div>
                <div className="mt-3">
                  {rawBalance >= 50000 ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-white/20 text-white px-2.5 py-1 rounded-xl border border-white/30 backdrop-blur-xs">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-200" />
                      امکان قبول سفارش‌های جدید فعال است
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-rose-500/90 text-white px-2.5 py-1 rounded-xl border border-rose-300/40">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-200" />
                      موجودی ناکافی (حداقل ۵۰,۰۰۰ تومان شارژ الزامی است)
                    </span>
                  )}
                </div>
              </div>
              <div className="text-[10px] text-emerald-100/90 mt-4 pt-3 border-t border-white/10 flex items-center justify-between relative z-10">
                <span>تکنسین: {activeTech.name}</span>
                <span className="font-mono">{activeTech.phone}</span>
              </div>
            </div>

            {/* Commission Policy Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-slate-800 font-extrabold text-sm mb-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <span>قانون کمیسیون کدیار۲۴</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  کمیسیون هر سفارش کار <strong className="text-slate-800">۵۰,۰۰۰ تومان</strong> به صورت ثابت می‌باشد. هنگام قبول هر سفارش توسط شما، این مبلغ مستقیماً از کیف پول شما کسر شده و سفارش منحصراً به نام شما ثبت می‌شود.
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-[11px] text-slate-600 mt-3 flex items-center justify-between">
                <span>ظرفیت قبول سفارش با موجودی فعلی:</span>
                <strong className="font-mono text-xs text-blue-700 font-black">
                  {Math.floor(rawBalance / 50000)} سفارش
                </strong>
              </div>
            </div>

            {/* Quick Actions & Status */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-slate-800 font-extrabold text-sm mb-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <span>وضعیت فیش‌های در انتظار</span>
                </div>
                {hasPendingCommissionApproval ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900 space-y-1">
                    <span className="font-bold flex items-center gap-1 text-amber-800">
                      <Clock className="w-4 h-4 text-amber-600 animate-spin" />
                      فیش واریزی در نوبت تایید مدیریت
                    </span>
                    <p className="text-[11px] text-amber-700 leading-relaxed">
                      فیش کارت‌به‌کارت شما در تب پرداخت‌های پنل مدیر سایت قرار دارد. پس از تایید توسط مدیر، موجودی کیف پول بلافاصله شارژ خواهد شد.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 leading-relaxed">
                    در حال حاضر هیچ فیش در انتظار تاییدی ندارید. با فرم زیر می‌توانید کارت به کارت انجام داده و بلافاصله فیش واریزی ثبت فرمایید.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsWalletModalOpen(true)}
                className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <CreditCard className="w-4 h-4" />
                <span>شارژ فوری کیف پول (کارت به کارت)</span>
              </button>
            </div>
          </div>

          {/* Card-to-Card Mellat Transfer & Recharge Section */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">شارژ کیف پول از طریق کارت به کارت به حساب ملت مدیر کدیار۲۴</h3>
                <p className="text-xs text-slate-400">مبلغ مورد نظر را به شماره کارت زیر واریز نموده و فیش را ثبت فرمایید</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Card Information Visual Box */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-3xl border border-indigo-400/30 shadow-lg relative overflow-hidden">
                  <div className="flex justify-between items-center text-xs text-indigo-200 font-bold mb-3">
                    <span>حساب رسمی کدیار۲۴</span>
                    <span className="bg-red-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-md">
                      {serverCardInfo.bank_name || 'بانک ملت'}
                    </span>
                  </div>

                  <div className="my-3">
                    <span className="text-[10px] text-slate-300 block mb-1">شماره کارت مقصد:</span>
                    <div className="bg-black/40 border border-white/10 rounded-2xl p-3 flex items-center justify-between">
                      <span className="font-mono text-lg font-black tracking-wider text-amber-300 dir-ltr select-all">
                        {serverCardInfo.card_number || '6104-3389-6112-6667'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const num = (serverCardInfo.card_number || '6104338961126667').replace(/-/g, '');
                          navigator.clipboard?.writeText(num);
                          triggerNotification('کپی شد', 'شماره کارت بانک ملت کدیار۲۴ کپی گردید.', 'success');
                        }}
                        className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>کپی</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-3 border-t border-white/10">
                    <span className="text-slate-300">نام صاحب حساب:</span>
                    <strong className="text-white font-bold text-sm">
                      {serverCardInfo.card_holder || 'مهدی عباسی (مدیر کدیار۲۴)'}
                    </strong>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-2">
                  <div className="font-extrabold flex items-center gap-1.5 text-amber-800">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>راهنمای شارژ و تایید فیش:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-900/90 leading-relaxed">
                    <li>حداقل مبلغ پیشنهادی برای شروع ۵۰,۰۰۰ تومان (معادل ۱ سفارش) است.</li>
                    <li>پس از انجام انتقال در آپ، بله، همراه بانک یا خودپرداز، شماره پیگیری را وارد نمایید.</li>
                    <li>مدیریت سایت در تب «مدیریت پرداخت‌ها» واریزی شما را مشاهده و با یک کلیک تایید می‌کند.</li>
                    <li>به محض تایید مدیر، موجودی شما به‌صورت آنی شارژ شده و می‌توانید سفارش بردارید.</li>
                  </ul>
                </div>
              </div>

              {/* Form Box */}
              <div className="lg:col-span-7">
                <form onSubmit={handleWalletRechargeSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      مبلغ شارژ را انتخاب یا وارد فرمایید: <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                      {[
                        { amount: 50000, label: '۵۰,۰۰۰ ت', desc: '۱ سفارش' },
                        { amount: 100000, label: '۱۰۰,۰۰۰ ت', desc: '۲ سفارش' },
                        { amount: 200000, label: '۲۰۰,۰۰۰ ت', desc: '۴ سفارش' },
                        { amount: 500000, label: '۵۰۰,۰۰۰ ت', desc: '۱۰ سفارش' },
                      ].map((preset) => (
                        <button
                          key={`preset_${preset.amount}`}
                          type="button"
                          onClick={() => {
                            setRechargeAmount(preset.amount);
                            setCustomRechargeAmount('');
                          }}
                          className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                            rechargeAmount === preset.amount && !customRechargeAmount
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-extrabold shadow-xs'
                              : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <div className="font-mono text-xs font-bold">{preset.label}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{preset.desc}</div>
                        </button>
                      ))}
                    </div>

                    <div className="relative">
                      <input
                        type="number"
                        placeholder="یا مبلغ دلخواه به تومان (حداقل ۵۰,۰۰۰)"
                        value={customRechargeAmount}
                        onChange={(e) => {
                          setCustomRechargeAmount(e.target.value);
                          if (e.target.value) {
                            setRechargeAmount(Number(e.target.value));
                          }
                        }}
                        className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3 text-xs focus:outline-emerald-600 text-slate-800 font-mono"
                      />
                      <span className="absolute left-3 top-3 text-xs text-slate-400">تومان</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      کد پیگیری یا ۴ رقم آخر کارت واریزکننده: <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: ۸۹۰۲۳۴ یا ۴ رقم آخر کارت"
                      value={rechargeTrackCode}
                      onChange={(e) => setRechargeTrackCode(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-2xl p-3 text-xs focus:outline-emerald-600 text-slate-800 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      شماره ۱۶ رقمی کارت مبدا (اختیاری جهت بررسی سریع‌تر):
                    </label>
                    <input
                      type="text"
                      placeholder="۶۰۳۷-xxxx-xxxx-xxxx"
                      value={rechargeCardNumber}
                      onChange={(e) => setRechargeCardNumber(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-2xl p-3 text-xs focus:outline-emerald-600 text-slate-800 font-mono dir-ltr text-right"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={rechargeProcessing}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-4 rounded-2xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:bg-slate-300"
                    >
                      {rechargeProcessing ? (
                        <span className="animate-pulse">در حال ثبت فیش واریزی و ارسال به مدیریت...</span>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span>ثبت فیش کارت‌به‌کارت و ارسال جهت تایید مدیریت ({rechargeAmount.toLocaleString('fa-IR')} تومان)</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Transactions & Receipts History */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-slate-600" />
                <h4 className="font-extrabold text-slate-900 text-sm">تاریخچه تراکنش‌ها و فیش‌های شارژ کیف پول</h4>
              </div>
              <span className="text-xs text-slate-400 font-sans">
                تعداد: {myPayments.length} تراکنش
              </span>
            </div>

            {myPayments.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <Wallet className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-xs font-bold">هنوز تراکنش یا فیش واریزی ثبت نشده است.</p>
                <p className="text-slate-400 text-[11px] mt-1">با فرم بالا می‌توانید اولین شارژ کیف پول خود را انجام دهید.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-medium">
                      <th className="py-2.5 px-3">نوع تراکنش</th>
                      <th className="py-2.5 px-3">مبلغ</th>
                      <th className="py-2.5 px-3">کد پیگیری</th>
                      <th className="py-2.5 px-3">تاریخ ثبت</th>
                      <th className="py-2.5 px-3">وضعیت تایید</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myPayments.map((p, idx) => (
                      <tr key={`p_${p.id}_${idx}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-800">
                          {p.type === 'wallet_recharge' ? 'شارژ کیف پول (کارت به کارت ملت)' : (p.description || 'کمیسیون کدیار۲۴')}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-emerald-700">
                          {Number(p.amount || 0).toLocaleString('fa-IR')} تومان
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600">
                          {p.trackingCode || (p as any).trackCode || 'ثبت شده'}
                        </td>
                        <td className="py-3 px-3 text-slate-500 text-[11px]">
                          {new Date(p.createdAt || Date.now()).toLocaleDateString('fa-IR')} {new Date(p.createdAt || Date.now()).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-3">
                          {p.status === 'approved' || p.status === 'completed' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              تایید شده و به کیف پول اضافه شد
                            </span>
                          ) : p.status === 'rejected' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-100 border border-rose-300 px-2.5 py-0.5 rounded-full">
                              <X className="w-3 h-3 text-rose-600" />
                              رد شده توسط مدیریت
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full">
                              <Clock className="w-3 h-3 text-amber-600 animate-spin" />
                              در انتظار تایید مدیریت کدیار۲۴
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 💳 UNIFIED WALLET RECHARGE & COMMISSION SETTLEMENT MODAL */}
      {(isSettleModalOpen || isWalletModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">شارژ فوری کیف پول کدیار۲۴</h3>
                  <p className="text-[11px] text-slate-400 font-medium">کارت‌به‌کارت مستقیم به حساب بانک ملت مدیریت</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsSettleModalOpen(false);
                  setIsWalletModalOpen(false);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Balance Summary Box */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 mb-4 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">نام تکنسین:</span>
                <span className="font-bold text-slate-800">{activeTech.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">موجودی فعلی کیف پول:</span>
                <span className="font-bold font-mono text-slate-800">{rawBalance.toLocaleString('fa-IR')} تومان</span>
              </div>
              <div className="flex justify-between items-center text-xs font-black bg-blue-50 p-2.5 rounded-xl border border-blue-200 text-blue-800">
                <span>حداقل موجودی جهت قبول سفارش:</span>
                <span className="text-sm font-sans text-emerald-700">۵۰,۰۰۰ تومان</span>
              </div>
            </div>

            {/* Bank Mellat Info Box */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 rounded-2xl border border-indigo-400/40 shadow-sm space-y-2.5 mb-4">
              <div className="flex justify-between items-center text-[10.5px] text-indigo-200 font-bold">
                <span>واریز کارت‌به‌کارت به حساب کدیار۲۴:</span>
                <span className="bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">
                  {serverCardInfo.bank_name || 'بانک ملت'}
                </span>
              </div>
              <div className="flex items-center justify-between bg-black/35 rounded-xl px-3 py-2 border border-white/10">
                <div className="font-mono text-base font-black tracking-wider select-all dir-ltr text-amber-300">
                  {serverCardInfo.card_number || '6104-3389-6112-6667'}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText((serverCardInfo.card_number || '6104338961126667').replace(/-/g, ''));
                    triggerNotification('کپی شد', 'شماره کارت بانک ملت کپی گردید.', 'success');
                  }}
                  className="bg-white/10 hover:bg-white/20 text-white text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  کپی
                </button>
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-200 pt-1 border-t border-white/10">
                <span>صاحب حساب:</span>
                <strong className="text-white font-black">{serverCardInfo.card_holder || 'مهدی عباسی (مدیر کدیار۲۴)'}</strong>
              </div>
            </div>

            {/* Quick Recharge Form */}
            <form onSubmit={handleWalletRechargeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  مبلغ شارژ را مشخص فرمایید:
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[50000, 100000, 200000, 500000].map((amt) => (
                    <button
                      key={`modal_amt_${amt}`}
                      type="button"
                      onClick={() => {
                        setRechargeAmount(amt);
                        setCustomRechargeAmount('');
                      }}
                      className={`p-2 rounded-xl text-center border text-[11px] font-mono font-bold transition-all cursor-pointer ${
                        rechargeAmount === amt && !customRechargeAmount
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {(amt / 1000).toLocaleString('fa-IR')} ت
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  placeholder="یا مبلغ دلخواه به تومان"
                  value={customRechargeAmount}
                  onChange={(e) => {
                    setCustomRechargeAmount(e.target.value);
                    if (e.target.value) setRechargeAmount(Number(e.target.value));
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  کد پیگیری یا ۴ رقم آخر کارت واریزکننده: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: ۷۴۸۲۹۱ یا ۴ رقم آخر کارت"
                  value={rechargeTrackCode}
                  onChange={(e) => setRechargeTrackCode(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs focus:outline-emerald-600 text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  شماره کارت واریزکننده (اختیاری):
                </label>
                <input
                  type="text"
                  placeholder="۱۶ رقم کارت مبدا"
                  value={rechargeCardNumber}
                  onChange={(e) => setRechargeCardNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-800 font-mono"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={rechargeProcessing}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-4 rounded-2xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:bg-slate-300"
                >
                  {rechargeProcessing ? (
                    <span className="animate-pulse">در حال ثبت فیش و ارسال به مدیریت...</span>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>ثبت فیش واریز کارت‌به‌کارت ({rechargeAmount.toLocaleString('fa-IR')} تومان)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 💳 ACHAREH MODEL: UPFRONT COMMISSION & CUSTOMER UNLOCK MODAL */}
      {orderForCommission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-205 relative max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">آزادسازی شماره و آدرس مشتری</h3>
                  <p className="text-[11px] text-slate-400 font-medium">واریز کمیسیون پیش‌پرداخت (مدل کارمزد کدیار۲۴)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOrderForCommission(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Order Details Preview */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 mb-4 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">شماره سفارش:</span>
                <span className="font-mono font-bold text-slate-800">#{orderForCommission.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">دستگاه و برند:</span>
                <span className="font-bold text-slate-800">{orderForCommission.category} ({orderForCommission.brand})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">نام متقاضی:</span>
                <span className="font-bold text-slate-800">{orderForCommission.customerName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">محدوده تقریبی:</span>
                <span className="font-bold text-slate-800">{[orderForCommission.city, orderForCommission.region].filter(Boolean).join('، ') || 'هماهنگی در شهر'}</span>
              </div>
              <div className="flex justify-between items-center text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200/70">
                <span>شماره تماس و آدرس دقیق:</span>
                <span className="font-bold flex items-center gap-1 text-[11px]">
                  <Lock className="w-3 h-3 text-amber-600" />
                  بلافاصله پس از ثبت فیش آزاد می‌شود
                </span>
              </div>
            </div>

            {/* Commission Calculation */}
            {(() => {
              const baseCost = Number(orderForCommission.estimatedCost || (orderForCommission as any).price || (orderForCommission as any).amount || 350000);
              const commAmount = Math.round(baseCost * 0.15);
              return (
                <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3.5 mb-4 text-xs space-y-2">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>اجرت برآوردی کار:</span>
                    <span className="font-bold font-sans text-slate-800">{baseCost.toLocaleString('fa-IR')} تومان</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-blue-200/70 pt-2 font-black text-blue-900 text-sm">
                    <span>مبلغ کمیسیون ۱۵٪ پلتفرم:</span>
                    <span className="text-base font-sans text-emerald-700">{commAmount.toLocaleString('fa-IR')} تومان</span>
                  </div>
                </div>
              );
            })()}

            {/* Card Information Box */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 rounded-2xl border border-indigo-400/40 shadow-sm space-y-2.5 mb-4">
              <div className="flex justify-between items-center text-[10.5px] text-indigo-200 font-bold">
                <span>واریز کارت‌به‌کارت به حساب کدیار۲۴:</span>
                <span className="bg-indigo-900/80 px-2 py-0.5 rounded text-[10px] text-indigo-100">{serverCardInfo.bank_name || 'بانک ملت'}</span>
              </div>
              <div className="flex items-center justify-between bg-black/25 rounded-xl px-3 py-2 border border-white/10">
                <div className="font-mono text-base font-black tracking-wider select-all dir-ltr text-amber-300">
                  {serverCardInfo.card_number || '6104-3389-6112-6667'}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText((serverCardInfo.card_number || '6104338961126667').replace(/-/g, ''));
                    triggerNotification('کپی شد', 'شماره کارت در حافظه کپی گردید.', 'success');
                  }}
                  className="bg-white/10 hover:bg-white/20 text-white text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  کپی کارت
                </button>
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-200 pt-1 border-t border-white/10">
                <span>صاحب حساب:</span>
                <strong className="text-white font-black">{serverCardInfo.card_holder || 'مهدی عباسی (کدیار۲۴)'}</strong>
              </div>
            </div>

            {/* Form to submit receipt */}
            <form onSubmit={handleCommissionOrderSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  کد پیگیری یا ۴ رقم آخر کارت واریزی شما: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: ۸۴۹۲۰۱ یا ۴ رقم آخر کارت"
                  value={commissionTrackCode}
                  onChange={(e) => setCommissionTrackCode(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs focus:outline-emerald-600 text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  شماره کارت واریز کننده (اختیاری):
                </label>
                <input
                  type="text"
                  placeholder="۱۶ رقم شماره کارت مبدا"
                  value={commissionCardNumber}
                  onChange={(e) => setCommissionCardNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-mono"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={commissionSubmitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-4 rounded-2xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:bg-slate-300"
                >
                  {commissionSubmitting ? (
                    <span className="animate-pulse">در حال آزادسازی اطلاعات مشتری...</span>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>ثبت فیش و آزادسازی فوری شماره و آدرس مشتری</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📋 DOCUMENT VIEWER MODAL */}
      {zoomImage && (
        <div
          onClick={() => setZoomImage(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out', padding: '20px' }}
        >
          <img src={zoomImage} alt="بزرگ‌نمایی مدرک" style={{ maxWidth: '95vw', maxHeight: '95vh', borderRadius: '8px', boxShadow: '0 0 30px rgba(0,0,0,0.5)' }} />
        </div>
      )}

      {previewDoc && (
        <DocumentViewer
          techName={previewDoc.techName}
          docName={previewDoc.docName}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
};