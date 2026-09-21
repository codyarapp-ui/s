import React, { useState, useMemo } from 'react';
import { 
  Settings, Check, X, AlertTriangle, Plus, Trash2, Edit3, 
  Search, Sliders, Cpu, Save, Key, Globe, Layers, Sparkles,
  Phone, HardDrive, RefreshCw, Radio, Filter, CheckCircle2, ChevronLeft,
  MapPin, Building2
} from 'lucide-react';
import { ErrorCode, SparePart, CommonProblem } from '../../types';

interface AdminConfigSectionProps {
  activeTab: string;
  categoriesList: string[];
  setCategoriesList?: React.Dispatch<React.SetStateAction<string[]>>;
  brandsList: string[];
  setBrandsList?: React.Dispatch<React.SetStateAction<string[]>>;
  modelsList: string[];
  setModelsList?: React.Dispatch<React.SetStateAction<string[]>>;
  citiesList?: { name: string; regions: string[] }[];
  onUpdateCategoriesList?: (cats: string[]) => void;
  onUpdateBrandsList?: (brands: string[]) => void;
  onUpdateModelsList?: (models: string[]) => void;
  onUpdateCitiesList?: (cities: { name: string; regions: string[] }[]) => void;
  errorCodes?: ErrorCode[];
  commonProblems?: CommonProblem[];
  spareParts?: SparePart[];
  categoryConfig?: any;
  onUpdateCategoryConfig?: (config: any) => void;
  onUpdateErrorCodesList?: (newErrors: ErrorCode[]) => void;
  onRejectErrorCode?: (id: string) => void;
  triggerNotification?: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
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
}

export const AdminConfigSection: React.FC<AdminConfigSectionProps> = ({
  activeTab,
  categoriesList = [],
  brandsList = [],
  modelsList = [],
  citiesList = [],
  onUpdateCategoriesList,
  onUpdateBrandsList,
  onUpdateModelsList,
  onUpdateCitiesList,
  errorCodes = [],
  commonProblems = [],
  spareParts = [],
  categoryConfig = {},
  onUpdateCategoryConfig,
  onUpdateErrorCodesList,
  triggerNotification,
  pageContents,
  onUpdatePageContents,
  trustBadges,
  onUpdateTrustBadges,
  supportPhone,
  onUpdateSupportPhone
}) => {
  const [selectedConfigSubTab, setSelectedConfigSubTab] = useState<'categories' | 'cities' | 'general' | 'sms' | 'ai' | 'direct_insert'>('categories');
  const [siteTitle, setSiteTitle] = useState('سامانه جامع تخصصی کد یار');
  const [siteDescription, setSiteDescription] = useState('بانک جامع کدهای خطای لوازم خانگی و پکیج، عیب‌یابی هوشمند، خدمات تخصصی تکنسین‌ها');
  const [supportPhoneNumber, setSupportPhoneNumber] = useState(supportPhone || '09120947304');

  // Page contents state (Footer and portal links)
  const [aboutUsText, setAboutUsText] = useState(pageContents?.aboutUs || '');
  const [contactUsText, setContactUsText] = useState(pageContents?.contactUs || '');
  const [rulesText, setRulesText] = useState(pageContents?.rules || '');
  const [disputeText, setDisputeText] = useState(pageContents?.dispute || '');
  const [appDownloadUrlText, setAppDownloadUrlText] = useState(pageContents?.appDownloadUrl || 'https://kodyar24.ir/download/app.apk');

  // Trust badges state (Enamad and Samandehi in Footer)
  const [b1Link, setB1Link] = useState(trustBadges?.badge1Link || 'https://enamad.ir');
  const [b1Img, setB1Img] = useState(trustBadges?.badge1Image || '');
  const [b2Link, setB2Link] = useState(trustBadges?.badge2Link || 'https://samandehi.ir');
  const [b2Img, setB2Img] = useState(trustBadges?.badge2Image || '');

  React.useEffect(() => {
    if (pageContents) {
      if (pageContents.aboutUs !== undefined) setAboutUsText(pageContents.aboutUs);
      if (pageContents.contactUs !== undefined) setContactUsText(pageContents.contactUs);
      if (pageContents.rules !== undefined) setRulesText(pageContents.rules);
      if (pageContents.dispute !== undefined) setDisputeText(pageContents.dispute);
      if (pageContents.appDownloadUrl !== undefined) setAppDownloadUrlText(pageContents.appDownloadUrl);
    }
  }, [pageContents]);

  React.useEffect(() => {
    if (trustBadges) {
      if (trustBadges.badge1Link !== undefined) setB1Link(trustBadges.badge1Link || 'https://enamad.ir');
      if (trustBadges.badge1Image !== undefined) setB1Img(trustBadges.badge1Image || '');
      if (trustBadges.badge2Link !== undefined) setB2Link(trustBadges.badge2Link || 'https://samandehi.ir');
      if (trustBadges.badge2Image !== undefined) setB2Img(trustBadges.badge2Image || '');
    }
  }, [trustBadges]);

  React.useEffect(() => {
    if (supportPhone) {
      setSupportPhoneNumber(supportPhone);
    }
  }, [supportPhone]);

  // SMS Gateway state
  const [smsApiKey, setSmsApiKey] = useState(() => localStorage.getItem('ir_sms_api_key') || 'KAVENEGAR_API_KEY_SECURE');
  const [smsSenderNumber, setSmsSenderNumber] = useState(() => localStorage.getItem('ir_sms_sender_number') || '10008663');

  // AI state
  const [aiModelName, setAiModelName] = useState(() => localStorage.getItem('ir_ai_model_name') || 'gemini-2.5-flash');
  const [aiTemperature, setAiTemperature] = useState(() => {
    const saved = localStorage.getItem('ir_ai_temperature');
    return saved ? parseFloat(saved) : 0.3;
  });

  React.useEffect(() => {
    const token = localStorage.getItem('session_user_id') || localStorage.getItem('token') || '';
    fetch('/api/settings', {
      headers: { 'X-Session-Token': token }
    })
      .then(r => r.json())
      .then(d => {
        const s = d.settings || {};
        if (s.smsSettings?.apiKey || s.smsApiKey) {
          const val = s.smsSettings?.apiKey || s.smsApiKey;
          setSmsApiKey(val);
          localStorage.setItem('ir_sms_api_key', val);
        }
        if (s.smsSettings?.senderNumber || s.smsSenderNumber) {
          const val = s.smsSettings?.senderNumber || s.smsSenderNumber;
          setSmsSenderNumber(val);
          localStorage.setItem('ir_sms_sender_number', val);
        }
        if (s.aiSettings?.model || s.aiModelName) {
          const val = s.aiSettings?.model || s.aiModelName;
          setAiModelName(val);
          localStorage.setItem('ir_ai_model_name', val);
        }
        if (s.aiSettings?.temperature !== undefined) {
          const val = Number(s.aiSettings.temperature);
          setAiTemperature(val);
          localStorage.setItem('ir_ai_temperature', String(val));
        }
      })
      .catch(() => {});
  }, []);

  // Category, Brand, Model selection & search
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  const [searchCategory, setSearchCategory] = useState('');
  const [searchBrand, setSearchBrand] = useState('');
  const [searchModel, setSearchModel] = useState('');

  // Inputs for adding new items
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [newBrandInput, setNewBrandInput] = useState('');
  const [newModelInput, setNewModelInput] = useState('');

  // Cities and Regions State
  const [selectedCityIndex, setSelectedCityIndex] = useState<number | null>(0);
  const [searchCity, setSearchCity] = useState('');
  const [searchRegion, setSearchRegion] = useState('');
  const [newCityInput, setNewCityInput] = useState('');
  const [newRegionInput, setNewRegionInput] = useState('');

  // Editing state for Cities & Regions
  const [editingCityIndex, setEditingCityIndex] = useState<number | null>(null);
  const [editingCityName, setEditingCityName] = useState('');
  const [editingRegionIndex, setEditingRegionIndex] = useState<number | null>(null);
  const [editingRegionName, setEditingRegionName] = useState('');

  // Save status feedback
  const [dbSaveNotice, setDbSaveNotice] = useState<string | null>(null);

  // Direct insert error code state
  const [dirCategory, setDirCategory] = useState('');
  const [dirBrand, setDirBrand] = useState('');
  const [dirModel, setDirModel] = useState('');
  const [dirCode, setDirCode] = useState('');
  const [dirTitle, setDirTitle] = useState('');
  const [dirPossibleCauses, setDirPossibleCauses] = useState('');
  const [dirSolution, setDirSolution] = useState('');
  const [directInsertStatus, setDirectInsertStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showNotification = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'success') => {
    if (triggerNotification) {
      triggerNotification(title, message, type);
    }
    setDbSaveNotice(message);
    setTimeout(() => {
      setDbSaveNotice(null);
    }, 4000);
  };

  // Persist directly to DB (both /api/settings and /api/sync)
  const persistToDatabase = async (payload: {
    categoriesList?: string[];
    brandsList?: string[];
    modelsList?: string[];
    citiesList?: { name: string; regions: string[] }[];
    categoryConfig?: any;
    supportPhone?: string;
    pageContents?: any;
    trustBadges?: any;
    smsSettings?: any;
    aiSettings?: any;
  }) => {
    try {
      const token = localStorage.getItem('session_user_id') || localStorage.getItem('token') || '';
      const headers = {
        'Content-Type': 'application/json',
        'X-Session-Token': token
      };

      // 1. Post to /api/settings
      fetch('/api/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      }).catch(err => console.warn('Settings API sync warning:', err));

      // 2. Post to /api/sync
      fetch('/api/sync', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      }).catch(err => console.warn('Sync API sync warning:', err));

      // Also persist to localStorage for instant local backup
      if (payload.categoriesList) localStorage.setItem('ir_categories', JSON.stringify(payload.categoriesList));
      if (payload.brandsList) localStorage.setItem('ir_brands', JSON.stringify(payload.brandsList));
      if (payload.modelsList) localStorage.setItem('ir_models', JSON.stringify(payload.modelsList));
      if (payload.citiesList) localStorage.setItem('ir_cities', JSON.stringify(payload.citiesList));
      if (payload.categoryConfig) localStorage.setItem('ir_category_config', JSON.stringify(payload.categoryConfig));
      if (payload.supportPhone) localStorage.setItem('ir_support_phone', payload.supportPhone);
      if (payload.pageContents) localStorage.setItem('ir_page_contents', JSON.stringify(payload.pageContents));
      if (payload.trustBadges) localStorage.setItem('ir_trust_badges', JSON.stringify(payload.trustBadges));
      if (payload.smsSettings) localStorage.setItem('ir_sms_settings', JSON.stringify(payload.smsSettings));
      if (payload.aiSettings) localStorage.setItem('ir_ai_settings', JSON.stringify(payload.aiSettings));
    } catch (e) {
      console.error('Error persisting config to DB:', e);
    }
  };

  // Helper to extract brands associated with a category
  const brandsForCategory = useMemo(() => {
    if (!selectedCategory) {
      return brandsList.filter(b => 
        !searchBrand.trim() || b.toLowerCase().includes(searchBrand.trim().toLowerCase())
      );
    }

    const brandSet = new Set<string>();

    if (categoryConfig?.[selectedCategory]?.brands && Array.isArray(categoryConfig[selectedCategory].brands)) {
      categoryConfig[selectedCategory].brands.forEach((b: string) => {
        if (b && String(b).trim()) brandSet.add(String(b).trim());
      });
    }

    errorCodes.forEach((err: any) => {
      const cat = err.category || err.device_type;
      if (cat === selectedCategory && err.brand && String(err.brand).trim()) {
        brandSet.add(String(err.brand).trim());
      }
    });

    commonProblems.forEach((prob: any) => {
      if (prob.category === selectedCategory && prob.brand && String(prob.brand).trim()) {
        brandSet.add(String(prob.brand).trim());
      }
    });

    spareParts.forEach((part: any) => {
      const cat = part.category || part.device_category;
      if (cat === selectedCategory) {
        if (part.brand && String(part.brand).trim()) brandSet.add(String(part.brand).trim());
        if (Array.isArray(part.compatibility)) {
          part.compatibility.forEach((b: any) => {
            if (b && String(b).trim()) brandSet.add(String(b).trim());
          });
        }
      }
    });

    const result = Array.from(brandSet);
    if (!searchBrand.trim()) return result;
    return result.filter(b => b.toLowerCase().includes(searchBrand.trim().toLowerCase()));
  }, [selectedCategory, categoryConfig, errorCodes, commonProblems, spareParts, brandsList, searchBrand]);

  // Helper to extract models associated with selected category & selected brand
  const modelsForCategoryAndBrand = useMemo(() => {
    if (!selectedCategory && !selectedBrand) {
      return modelsList.filter(m => 
        !searchModel.trim() || m.toLowerCase().includes(searchModel.trim().toLowerCase())
      );
    }

    const modelSet = new Set<string>();

    if (selectedCategory && categoryConfig?.[selectedCategory]) {
      if (selectedBrand && categoryConfig[selectedCategory]?.brandModels?.[selectedBrand]) {
        categoryConfig[selectedCategory].brandModels[selectedBrand].forEach((m: string) => {
          if (m && String(m).trim()) modelSet.add(String(m).trim());
        });
      } else if (!selectedBrand && categoryConfig[selectedCategory]?.models) {
        categoryConfig[selectedCategory].models.forEach((m: string) => {
          if (m && String(m).trim()) modelSet.add(String(m).trim());
        });
      }
    }

    errorCodes.forEach((err: any) => {
      const cat = err.category || err.device_type;
      const matchCat = !selectedCategory || cat === selectedCategory;
      const matchBrand = !selectedBrand || err.brand === selectedBrand;
      if (matchCat && matchBrand && err.model && String(err.model).trim()) {
        const raw = String(err.model);
        raw.split(/[/,،]/).forEach((m) => {
          const clean = m.trim();
          if (clean && clean !== 'تمام مدل‌ها' && clean !== 'همه مدل‌ها') {
            modelSet.add(clean);
          }
        });
      }
    });

    commonProblems.forEach((prob: any) => {
      const matchCat = !selectedCategory || prob.category === selectedCategory;
      const matchBrand = !selectedBrand || prob.brand === selectedBrand;
      if (matchCat && matchBrand && prob.model && String(prob.model).trim()) {
        const raw = String(prob.model);
        raw.split(/[/,،]/).forEach((m) => {
          const clean = m.trim();
          if (clean && clean !== 'تمام مدل‌ها' && clean !== 'همه مدل‌ها') {
            modelSet.add(clean);
          }
        });
      }
    });

    spareParts.forEach((part: any) => {
      const cat = part.category || part.device_category;
      const matchCat = !selectedCategory || cat === selectedCategory;
      const matchBrand = !selectedBrand || part.brand === selectedBrand;
      if (matchCat && matchBrand) {
        const mod = part.model || part.device_model;
        if (mod && String(mod).trim()) {
          String(mod).split(/[/,،]/).forEach((m) => {
            const clean = m.trim();
            if (clean) modelSet.add(clean);
          });
        }
      }
    });

    const result = Array.from(modelSet);
    if (!searchModel.trim()) return result;
    return result.filter(m => m.toLowerCase().includes(searchModel.trim().toLowerCase()));
  }, [selectedCategory, selectedBrand, categoryConfig, errorCodes, commonProblems, spareParts, modelsList, searchModel]);

  // Counts of brands for each category
  const categoryBrandCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    categoriesList.forEach(cat => {
      const brandSet = new Set<string>();
      if (categoryConfig?.[cat]?.brands) {
        categoryConfig[cat].brands.forEach((b: string) => brandSet.add(b));
      }
      errorCodes.forEach((err: any) => {
        if ((err.category === cat || err.device_type === cat) && err.brand) {
          brandSet.add(err.brand);
        }
      });
      commonProblems.forEach((prob: any) => {
        if (prob.category === cat && prob.brand) brandSet.add(prob.brand);
      });
      spareParts.forEach((part: any) => {
        if (part.category === cat || part.device_category === cat) {
          if (part.brand) brandSet.add(part.brand);
        }
      });
      counts[cat] = brandSet.size;
    });
    return counts;
  }, [categoriesList, categoryConfig, errorCodes, commonProblems, spareParts]);

  // Filtered Cities
  const filteredCities = useMemo(() => {
    return citiesList.filter((c) => {
      if (!searchCity.trim()) return true;
      const term = searchCity.trim().toLowerCase();
      const matchCityName = c.name?.toLowerCase().includes(term);
      const matchRegion = c.regions?.some((r) => r.toLowerCase().includes(term));
      return matchCityName || matchRegion;
    });
  }, [citiesList, searchCity]);

  // Active Selected City Object
  const currentSelectedCity = useMemo(() => {
    if (selectedCityIndex === null || selectedCityIndex < 0 || selectedCityIndex >= citiesList.length) {
      return null;
    }
    return citiesList[selectedCityIndex] || null;
  }, [citiesList, selectedCityIndex]);

  // Filtered Regions for Active City
  const filteredRegions = useMemo(() => {
    if (!currentSelectedCity) return [];
    const regions = currentSelectedCity.regions || [];
    if (!searchRegion.trim()) return regions;
    const term = searchRegion.trim().toLowerCase();
    return regions.filter((r) => r.toLowerCase().includes(term));
  }, [currentSelectedCity, searchRegion]);

  // General Settings Handlers
  const handleSaveGeneralSettings = () => {
    if (onUpdateSupportPhone) {
      onUpdateSupportPhone(supportPhoneNumber);
    }
    const updatedPageContents = {
      aboutUs: aboutUsText,
      contactUs: contactUsText,
      rules: rulesText,
      dispute: disputeText,
      appDownloadUrl: appDownloadUrlText
    };
    if (onUpdatePageContents) {
      onUpdatePageContents(updatedPageContents);
    }
    const updatedBadges = {
      badge1Link: b1Link,
      badge1Image: b1Img,
      badge2Link: b2Link,
      badge2Image: b2Img
    };
    if (onUpdateTrustBadges) {
      onUpdateTrustBadges(updatedBadges);
    }

    persistToDatabase({
      supportPhone: supportPhoneNumber,
      pageContents: updatedPageContents,
      trustBadges: updatedBadges
    } as any);

    showNotification('تنظیمات اطلاعات پایه و پورتال', 'مشخصات سایت، متون صفحات راهنما و نمادهای فوتر با موفقیت ذخیره شدند.', 'success');
  };

  const handleSaveSmsSettings = () => {
    persistToDatabase({
      smsSettings: {
        apiKey: smsApiKey.trim(),
        senderNumber: smsSenderNumber.trim()
      }
    });
    localStorage.setItem('ir_sms_api_key', smsApiKey.trim());
    localStorage.setItem('ir_sms_sender_number', smsSenderNumber.trim());
    showNotification('تنظیمات پیامک', 'پیکربندی درگاه پیامک ذخیره شد و در دیتابیس ثبت گردید.', 'success');
  };

  const handleSaveAiSettings = () => {
    persistToDatabase({
      aiSettings: {
        model: aiModelName.trim(),
        temperature: aiTemperature
      }
    });
    localStorage.setItem('ir_ai_model_name', aiModelName.trim());
    localStorage.setItem('ir_ai_temperature', String(aiTemperature));
    showNotification('تنظیمات هوش مصنوعی', 'تنظیمات مدل هوش مصنوعی ذخیره شد و در دیتابیس ثبت گردید.', 'success');
  };

  // Add Category Handler
  const handleAddCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    if (categoriesList.includes(trimmed)) {
      alert('این دسته‌بندی قبلاً وجود دارد.');
      return;
    }
    const updatedCategories = [...categoriesList, trimmed];
    if (onUpdateCategoriesList) onUpdateCategoriesList(updatedCategories);

    persistToDatabase({ categoriesList: updatedCategories });
    
    setSelectedCategory(trimmed);
    setSelectedBrand(null);
    setNewCategoryInput('');
    showNotification('ثبت دسته‌بندی', `دسته‌بندی «${trimmed}» با موفقیت اضافه و در دیتابیس ذخیره شد.`, 'success');
  };

  // Delete Category Handler
  const handleDeleteCategory = (catToDelete: string) => {
    if (confirm(`آیا از حذف دسته‌بندی "${catToDelete}" اطمینان دارید؟`)) {
      const updatedCategories = categoriesList.filter(c => c !== catToDelete);
      if (onUpdateCategoriesList) onUpdateCategoriesList(updatedCategories);

      const newConfig = { ...categoryConfig };
      delete newConfig[catToDelete];
      if (onUpdateCategoryConfig) onUpdateCategoryConfig(newConfig);

      persistToDatabase({ categoriesList: updatedCategories, categoryConfig: newConfig });

      if (selectedCategory === catToDelete) {
        setSelectedCategory(null);
        setSelectedBrand(null);
      }
      showNotification('حذف دسته‌بندی', `دسته‌بندی «${catToDelete}» حذف گردید.`, 'info');
    }
  };

  // Add Brand Handler
  const handleAddBrand = () => {
    const trimmed = newBrandInput.trim();
    if (!trimmed) return;

    let updatedBrands = brandsList;
    if (!brandsList.includes(trimmed)) {
      updatedBrands = [...brandsList, trimmed];
      if (onUpdateBrandsList) onUpdateBrandsList(updatedBrands);
    }

    let updatedConfig = { ...categoryConfig };
    if (selectedCategory) {
      const existingBrands = updatedConfig[selectedCategory]?.brands || [];
      if (!existingBrands.includes(trimmed)) {
        updatedConfig = {
          ...updatedConfig,
          [selectedCategory]: {
            ...(updatedConfig[selectedCategory] || {}),
            brands: [...existingBrands, trimmed]
          }
        };
        if (onUpdateCategoryConfig) onUpdateCategoryConfig(updatedConfig);
      }
    }

    persistToDatabase({ brandsList: updatedBrands, categoryConfig: updatedConfig });
    
    setNewBrandInput('');
    const targetMsg = selectedCategory 
      ? `برند «${trimmed}» برای دسته‌بندی «${selectedCategory}» با موفقیت در دیتابیس ثبت شد.`
      : `برند «${trimmed}» با موفقیت در دیتابیس ثبت شد.`;
    showNotification('ثبت برند', targetMsg, 'success');
  };

  // Delete Brand Handler
  const handleDeleteBrand = (brandToDelete: string) => {
    if (selectedCategory) {
      if (confirm(`آیا می‌خواهید برند "${brandToDelete}" را از دسته‌بندی "${selectedCategory}" حذف کنید؟`)) {
        let updatedConfig = { ...categoryConfig };
        if (updatedConfig[selectedCategory]?.brands) {
          updatedConfig[selectedCategory].brands = updatedConfig[selectedCategory].brands.filter((b: string) => b !== brandToDelete);
          if (onUpdateCategoryConfig) onUpdateCategoryConfig(updatedConfig);
          persistToDatabase({ categoryConfig: updatedConfig });
        }
        if (selectedBrand === brandToDelete) setSelectedBrand(null);
        showNotification('حذف برند', `برند «${brandToDelete}» از دسته‌بندی «${selectedCategory}» حذف شد.`, 'info');
      }
    } else {
      if (confirm(`آیا از حذف برند "${brandToDelete}" از کل سیستم اطمینان دارید؟`)) {
        const updatedBrands = brandsList.filter(b => b !== brandToDelete);
        if (onUpdateBrandsList) onUpdateBrandsList(updatedBrands);
        persistToDatabase({ brandsList: updatedBrands });
        if (selectedBrand === brandToDelete) setSelectedBrand(null);
        showNotification('حذف برند', `برند «${brandToDelete}» از سیستم حذف شد.`, 'info');
      }
    }
  };

  // Add Model Handler
  const handleAddModel = () => {
    const trimmed = newModelInput.trim();
    if (!trimmed) return;

    let updatedModels = modelsList;
    if (!modelsList.includes(trimmed)) {
      updatedModels = [...modelsList, trimmed];
      if (onUpdateModelsList) onUpdateModelsList(updatedModels);
    }

    let updatedConfig = { ...categoryConfig };
    if (selectedCategory) {
      const catData = updatedConfig[selectedCategory] || {};
      const catModels = catData.models || [];
      const updatedCatModels = catModels.includes(trimmed) ? catModels : [...catModels, trimmed];
      
      let brandModels = catData.brandModels || {};
      if (selectedBrand) {
        const bModels = brandModels[selectedBrand] || [];
        brandModels = {
          ...brandModels,
          [selectedBrand]: bModels.includes(trimmed) ? bModels : [...bModels, trimmed]
        };
      }

      updatedConfig = {
        ...updatedConfig,
        [selectedCategory]: {
          ...catData,
          models: updatedCatModels,
          brandModels
        }
      };
      if (onUpdateCategoryConfig) onUpdateCategoryConfig(updatedConfig);
    }

    persistToDatabase({ modelsList: updatedModels, categoryConfig: updatedConfig });

    setNewModelInput('');
    const targetMsg = selectedCategory 
      ? `مدل «${trimmed}» برای «${selectedCategory}${selectedBrand ? ' › ' + selectedBrand : ''}» در دیتابیس ذخیره شد.`
      : `مدل «${trimmed}» با موفقیت در دیتابیس ثبت شد.`;
    showNotification('ثبت مدل', targetMsg, 'success');
  };

  // Delete Model Handler
  const handleDeleteModel = (modelToDelete: string) => {
    if (selectedCategory) {
      if (confirm(`آیا می‌خواهید مدل "${modelToDelete}" را از این دسته‌بندی حذف کنید؟`)) {
        let updatedConfig = { ...categoryConfig };
        if (updatedConfig[selectedCategory]) {
          if (updatedConfig[selectedCategory].models) {
            updatedConfig[selectedCategory].models = updatedConfig[selectedCategory].models.filter((m: string) => m !== modelToDelete);
          }
          if (selectedBrand && updatedConfig[selectedCategory].brandModels?.[selectedBrand]) {
            updatedConfig[selectedCategory].brandModels[selectedBrand] = updatedConfig[selectedCategory].brandModels[selectedBrand].filter((m: string) => m !== modelToDelete);
          }
          if (onUpdateCategoryConfig) onUpdateCategoryConfig(updatedConfig);
          persistToDatabase({ categoryConfig: updatedConfig });
        }
        showNotification('حذف مدل', `مدل «${modelToDelete}» حذف شد.`, 'info');
      }
    } else {
      if (confirm(`آیا از حذف مدل "${modelToDelete}" از کل سیستم اطمینان دارید؟`)) {
        const updatedModels = modelsList.filter(m => m !== modelToDelete);
        if (onUpdateModelsList) onUpdateModelsList(updatedModels);
        persistToDatabase({ modelsList: updatedModels });
        showNotification('حذف مدل', `مدل «${modelToDelete}» از سیستم حذف شد.`, 'info');
      }
    }
  };

  // ==================== CITIES & REGIONS HANDLERS ====================
  // Add City Handler
  const handleAddCity = () => {
    const trimmed = newCityInput.trim();
    if (!trimmed) return;
    
    if (citiesList.some(c => c.name?.trim().toLowerCase() === trimmed.toLowerCase())) {
      alert('این شهر قبلاً در سیستم ثبت شده است.');
      return;
    }

    const newCityObj = { name: trimmed, regions: [] };
    const updatedCities = [newCityObj, ...citiesList];

    if (onUpdateCitiesList) onUpdateCitiesList(updatedCities);
    persistToDatabase({ citiesList: updatedCities });

    setSelectedCityIndex(0);
    setNewCityInput('');
    showNotification('ثبت شهر', `شهر «${trimmed}» با موفقیت اضافه و در دیتابیس ثبت شد.`, 'success');
  };

  // Edit City Name Handler
  const handleSaveEditCity = (realIndex: number) => {
    const trimmed = editingCityName.trim();
    if (!trimmed) {
      setEditingCityIndex(null);
      return;
    }

    const updatedCities = citiesList.map((c, i) => {
      if (i === realIndex) {
        return { ...c, name: trimmed };
      }
      return c;
    });

    if (onUpdateCitiesList) onUpdateCitiesList(updatedCities);
    persistToDatabase({ citiesList: updatedCities });

    setEditingCityIndex(null);
    setEditingCityName('');
    showNotification('ویرایش شهر', `نام شهر به «${trimmed}» تغییر یافت و ذخیره شد.`, 'success');
  };

  // Delete City Handler
  const handleDeleteCity = (realIndex: number, cityName: string) => {
    if (confirm(`آیا از حذف کامل شهر «${cityName}» و تمامی مناطق آن اطمینان دارید؟`)) {
      const updatedCities = citiesList.filter((_, i) => i !== realIndex);
      if (onUpdateCitiesList) onUpdateCitiesList(updatedCities);
      persistToDatabase({ citiesList: updatedCities });

      if (selectedCityIndex === realIndex) {
        setSelectedCityIndex(updatedCities.length > 0 ? 0 : null);
      } else if (selectedCityIndex !== null && selectedCityIndex > realIndex) {
        setSelectedCityIndex(selectedCityIndex - 1);
      }

      showNotification('حذف شهر', `شهر «${cityName}» از سیستم حذف شد.`, 'info');
    }
  };

  // Add Region to Active City Handler
  const handleAddRegion = () => {
    const trimmed = newRegionInput.trim();
    if (!trimmed) return;
    if (selectedCityIndex === null || !currentSelectedCity) {
      alert('لطفاً ابتدا یک شهر را انتخاب کنید.');
      return;
    }

    const existingRegions = currentSelectedCity.regions || [];
    if (existingRegions.some(r => r.trim().toLowerCase() === trimmed.toLowerCase())) {
      alert('این محله/منطقه قبلاً برای این شهر ثبت شده است.');
      return;
    }

    const updatedCities = citiesList.map((c, idx) => {
      if (idx === selectedCityIndex) {
        return {
          ...c,
          regions: [...(c.regions || []), trimmed]
        };
      }
      return c;
    });

    if (onUpdateCitiesList) onUpdateCitiesList(updatedCities);
    persistToDatabase({ citiesList: updatedCities });

    setNewRegionInput('');
    showNotification('ثبت محله/منطقه', `منطقه «${trimmed}» به شهر «${currentSelectedCity.name}» اضافه و در دیتابیس ذخیره شد.`, 'success');
  };

  // Edit Region Name Handler
  const handleSaveEditRegion = (regionIndex: number) => {
    const trimmed = editingRegionName.trim();
    if (!trimmed || selectedCityIndex === null || !currentSelectedCity) {
      setEditingRegionIndex(null);
      return;
    }

    const updatedCities = citiesList.map((c, cIdx) => {
      if (cIdx === selectedCityIndex) {
        const updatedRegions = [...(c.regions || [])];
        updatedRegions[regionIndex] = trimmed;
        return {
          ...c,
          regions: updatedRegions
        };
      }
      return c;
    });

    if (onUpdateCitiesList) onUpdateCitiesList(updatedCities);
    persistToDatabase({ citiesList: updatedCities });

    setEditingRegionIndex(null);
    setEditingRegionName('');
    showNotification('ویرایش منطقه', `نام منطقه به «${trimmed}» تغییر یافت و ذخیره شد.`, 'success');
  };

  // Delete Region from Active City Handler
  const handleDeleteRegion = (regionToDelete: string) => {
    if (!currentSelectedCity || selectedCityIndex === null) return;

    if (confirm(`آیا از حذف منطقه «${regionToDelete}» از شهر «${currentSelectedCity.name}» اطمینان دارید؟`)) {
      const updatedCities = citiesList.map((c, cIdx) => {
        if (cIdx === selectedCityIndex) {
          return {
            ...c,
            regions: (c.regions || []).filter(r => r !== regionToDelete)
          };
        }
        return c;
      });

      if (onUpdateCitiesList) onUpdateCitiesList(updatedCities);
      persistToDatabase({ citiesList: updatedCities });

      showNotification('حذف منطقه', `منطقه «${regionToDelete}» از شهر «${currentSelectedCity.name}» حذف شد.`, 'info');
    }
  };

  // Direct Error Code Insert
  const handleAddDirectErrorCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirCategory || !dirBrand || !dirCode.trim() || !dirTitle.trim()) {
      setDirectInsertStatus({ type: 'error', msg: 'لطفاً دسته‌بندی، برند، کد خطا و عنوان عیب را تکمیل نمایید.' });
      return;
    }

    const newError: ErrorCode = {
      id: `err_direct_${Date.now()}`,
      category: dirCategory,
      brand: dirBrand,
      model: dirModel.trim() || 'تمامی مدل‌ها',
      code: dirCode.trim().toUpperCase(),
      title: dirTitle.trim(),
      description: dirTitle.trim(),
      possible_causes: dirPossibleCauses.split('\n').filter(Boolean),
      solution: dirSolution.trim() || 'بررسی توسط تکنسین مجاز',
      is_approved: true,
      created_at: new Date().toISOString()
    };

    if (onUpdateErrorCodesList) {
      onUpdateErrorCodesList([newError, ...errorCodes]);
    }

    fetch('/api/error-codes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Token': localStorage.getItem('session_user_id') || ''
      },
      body: JSON.stringify(newError)
    }).catch(err => console.warn('Direct error insert API error:', err));

    setDirectInsertStatus({ type: 'success', msg: `کد خطای ${newError.code} با موفقیت در پایگاه داده ذخیره شد.` });
    setDirCode('');
    setDirTitle('');
    setDirPossibleCauses('');
    setDirSolution('');
    setTimeout(() => setDirectInsertStatus(null), 4000);
  };

  const filteredCategories = useMemo(() => {
    if (!searchCategory.trim()) return categoriesList;
    return categoriesList.filter(c => c.toLowerCase().includes(searchCategory.trim().toLowerCase()));
  }, [categoriesList, searchCategory]);

  if (activeTab !== 'config') return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-right font-sans">
      {/* Save Notification Toast */}
      {dbSaveNotice && (
        <div className="bg-emerald-500 text-white p-3 rounded-xl text-xs font-bold shadow-md flex items-center justify-between animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{dbSaveNotice}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setDbSaveNotice(null)}
            className="text-white/80 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-3xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-slate-100 text-slate-700 rounded-xl font-bold">⚙️</span>
            <h3 className="font-black text-slate-800 text-sm sm:text-base">اطلاعات پایه، ساختار دستگاه‌ها و زیرساخت سامانه</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">مدیریت دسته‌ها، برندها، مدل‌ها، استان‌ها و شهرها متصل به پایگاه داده.</p>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
        {[
          { id: 'categories', label: 'دسته‌ها، برندها و مدل‌ها', icon: '🏷️' },
          { id: 'cities', label: 'استان‌ها، شهرها و مناطق', icon: '🏙️' },
          { id: 'general', label: 'تنظیمات عمومی', icon: '🌐' },
          { id: 'sms', label: 'سامانه پیامک', icon: '📱' },
          { id: 'ai', label: 'موتور هوش مصنوعی', icon: '✨' },
          { id: 'direct_insert', label: 'افزودن مستقیم ارور', icon: '➕' }
        ].map((sub) => (
          <button
            key={sub.id}
            type="button"
            onClick={() => setSelectedConfigSubTab(sub.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              selectedConfigSubTab === sub.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>{sub.icon}</span>
            <span>{sub.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: Categories, Brands & Models (Hierarchical / Filtered) */}
      {selectedConfigSubTab === 'categories' && (
        <div className="space-y-4">
          {/* Active Navigation Filter Breadcrumb Bar */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/90 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-slate-700 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-blue-600" />
                وضعیت فیلتر فعال:
              </span>
              
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory(null);
                  setSelectedBrand(null);
                }}
                className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                  !selectedCategory 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                نمایش کل سیستم (بدون فیلتر)
              </button>

              {selectedCategory && (
                <div className="flex items-center gap-1 bg-blue-100/80 text-blue-900 px-3 py-1 rounded-lg font-bold border border-blue-200">
                  <span>دسته‌بندی: <strong>{selectedCategory}</strong></span>
                  <button 
                    type="button" 
                    onClick={() => {
                      setSelectedCategory(null);
                      setSelectedBrand(null);
                    }}
                    className="text-blue-700 hover:text-rose-600 mr-1 cursor-pointer"
                    title="حذف فیلتر دسته‌بندی"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {selectedCategory && selectedBrand && (
                <div className="flex items-center gap-1 bg-emerald-100/80 text-emerald-900 px-3 py-1 rounded-lg font-bold border border-emerald-200">
                  <span>برند: <strong>{selectedBrand}</strong></span>
                  <button 
                    type="button" 
                    onClick={() => setSelectedBrand(null)}
                    className="text-emerald-700 hover:text-rose-600 mr-1 cursor-pointer"
                    title="حذف فیلتر برند"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="text-[11px] text-slate-500 font-medium">
              💡 برای مشاهده برندها و مدل‌های هر دستگاه، روی نام دسته‌بندی کلیک کنید.
            </div>
          </div>

          {/* 3 Columns Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* COLUMN 1: Categories List */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-3xs flex flex-col h-[520px]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <span className="font-extrabold text-xs text-slate-800">۱. دسته‌بندی دستگاه‌ها</span>
                </div>
                <span className="text-[11px] bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-mono font-bold">
                  {categoriesList.length} دسته
                </span>
              </div>

              {/* Add New Category */}
              <div className="flex gap-2 my-3">
                <input
                  type="text"
                  placeholder="افزودن دسته جدید (مانند: مایکروویو)..."
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 transition"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  title="افزودن و ذخیره در دیتابیس"
                  className="px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer shadow-xs shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Search Category */}
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="جستجو در دسته‌ها..."
                  value={searchCategory}
                  onChange={(e) => setSearchCategory(e.target.value)}
                  className="w-full pr-8 pl-2 py-1.5 bg-slate-50/70 border border-slate-200/80 rounded-lg text-[11px] outline-none focus:bg-white focus:border-blue-400"
                />
              </div>

              {/* Category Items List */}
              <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
                {filteredCategories.map((cat: string) => {
                  const isSelected = selectedCategory === cat;
                  const brandCount = categoryBrandCounts[cat] || 0;
                  return (
                    <div
                      key={cat}
                      onClick={() => {
                        if (selectedCategory === cat) {
                          setSelectedCategory(null);
                          setSelectedBrand(null);
                        } else {
                          setSelectedCategory(cat);
                          setSelectedBrand(null);
                        }
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                        isSelected
                          ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-xs ring-2 ring-blue-200/60'
                          : 'bg-slate-50/80 hover:bg-slate-100 border-slate-200/70 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-blue-600 animate-pulse' : 'bg-slate-300'}`}></span>
                        <span className="truncate">{cat}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${
                          isSelected ? 'bg-blue-200 text-blue-800 font-bold' : 'bg-slate-200/70 text-slate-600'
                        }`}>
                          {brandCount} برند
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCategory(cat);
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                          title="حذف دسته‌بندی"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {filteredCategories.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    دسته‌بندی یافت نشد.
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 2: Brands List (Filtered by selected category) */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-3xs flex flex-col h-[520px]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  <span className="font-extrabold text-xs text-slate-800">۲. برندهای تجاری</span>
                </div>
                <div className="flex items-center gap-1">
                  {selectedCategory && (
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md font-bold truncate max-w-[120px]">
                      {selectedCategory}
                    </span>
                  )}
                  <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-mono font-bold">
                    {brandsForCategory.length} برند
                  </span>
                </div>
              </div>

              {/* Add New Brand */}
              <div className="flex gap-2 my-3">
                <input
                  type="text"
                  placeholder={
                    selectedCategory 
                      ? `برند جدید برای ${selectedCategory} (مانند: بوش)...`
                      : 'برند جدید (مانند: بوش، ال‌جی)...'
                  }
                  value={newBrandInput}
                  onChange={(e) => setNewBrandInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddBrand(); }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-emerald-500 transition"
                />
                <button
                  type="button"
                  onClick={handleAddBrand}
                  title="افزودن برند و ذخیره در دیتابیس"
                  className="px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer shadow-xs shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Search Brand */}
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="جستجو در برندها..."
                  value={searchBrand}
                  onChange={(e) => setSearchBrand(e.target.value)}
                  className="w-full pr-8 pl-2 py-1.5 bg-slate-50/70 border border-slate-200/80 rounded-lg text-[11px] outline-none focus:bg-white focus:border-emerald-400"
                />
              </div>

              {/* Brands Items List */}
              <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
                {brandsForCategory.map((brand: string) => {
                  const isSelected = selectedBrand === brand;
                  return (
                    <div
                      key={brand}
                      onClick={() => {
                        if (selectedBrand === brand) {
                          setSelectedBrand(null);
                        } else {
                          setSelectedBrand(brand);
                        }
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs ring-2 ring-emerald-200/60'
                          : 'bg-slate-50/80 hover:bg-slate-100 border-slate-200/70 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-emerald-600 animate-pulse' : 'bg-slate-300'}`}></span>
                        <span className="truncate">{brand}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isSelected && (
                          <span className="text-[10px] bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded font-medium">
                            انتخاب‌شده
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBrand(brand);
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                          title="حذف برند"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {brandsForCategory.length === 0 && (
                  <div className="text-center py-10 px-4 bg-slate-50/60 rounded-xl border border-dashed border-slate-200 my-2">
                    <p className="text-slate-500 text-xs font-bold">
                      {selectedCategory 
                        ? `هنوز برندی برای «${selectedCategory}» ثبت نشده است.` 
                        : 'هیچ برندی ثبت نشده است.'}
                    </p>
                    <p className="text-slate-400 text-[11px] mt-1">
                      از کادر بالا نام برند را بنویسید و دکمه + را بزنید تا بلافاصله در دیتابیس ذخیره شود.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 3: Models List (Filtered by category & brand) */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-3xs flex flex-col h-[520px]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                  <span className="font-extrabold text-xs text-slate-800">۳. مدل‌های دستگاه</span>
                </div>
                <div className="flex items-center gap-1">
                  {selectedBrand && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold truncate max-w-[100px]">
                      {selectedBrand}
                    </span>
                  )}
                  <span className="text-[11px] bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full font-mono font-bold">
                    {modelsForCategoryAndBrand.length} مدل
                  </span>
                </div>
              </div>

              {/* Add New Model */}
              <div className="flex gap-2 my-3">
                <input
                  type="text"
                  placeholder={
                    selectedBrand 
                      ? `مدل جدید برای ${selectedBrand} (مانند: SMS68TI02E)...`
                      : (selectedCategory ? `مدل جدید برای ${selectedCategory}...` : 'مدل جدید (مانند: 8500 یا V10)...')
                  }
                  value={newModelInput}
                  onChange={(e) => setNewModelInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddModel(); }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-indigo-500 transition"
                />
                <button
                  type="button"
                  onClick={handleAddModel}
                  title="افزودن مدل و ذخیره در دیتابیس"
                  className="px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer shadow-xs shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Search Model */}
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="جستجو در مدل‌ها..."
                  value={searchModel}
                  onChange={(e) => setSearchModel(e.target.value)}
                  className="w-full pr-8 pl-2 py-1.5 bg-slate-50/70 border border-slate-200/80 rounded-lg text-[11px] outline-none focus:bg-white focus:border-indigo-400"
                />
              </div>

              {/* Models Items List */}
              <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
                {modelsForCategoryAndBrand.map((model: string) => (
                  <div 
                    key={model} 
                    className="flex items-center justify-between bg-slate-50/80 hover:bg-slate-100 p-2.5 rounded-xl text-xs font-bold text-slate-700 border border-slate-200/70 transition"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span>
                      <span className="truncate font-mono">{model}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteModel(model)}
                      className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                      title="حذف مدل"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {modelsForCategoryAndBrand.length === 0 && (
                  <div className="text-center py-10 px-4 bg-slate-50/60 rounded-xl border border-dashed border-slate-200 my-2">
                    <p className="text-slate-500 text-xs font-bold">
                      {selectedCategory 
                        ? `هنوز مدلی برای «${selectedCategory}${selectedBrand ? ' › ' + selectedBrand : ''}» ثبت نشده است.` 
                        : 'هیچ مدلی ثبت نشده است.'}
                    </p>
                    <p className="text-slate-400 text-[11px] mt-1">
                      از کادر بالا نام مدل را وارد کرده و دکمه + را بزنید تا مستقیماً در دیتابیس ثبت گردد.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Cities & Regions (Direct Individual Edit & Add) */}
      {selectedConfigSubTab === 'cities' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Info bar */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/90 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600" />
                شهر فعال جهت مدیریت محله‌ها:
              </span>
              {currentSelectedCity ? (
                <span className="bg-emerald-100 text-emerald-900 px-3 py-1 rounded-lg font-black border border-emerald-300">
                  {currentSelectedCity.name} ({currentSelectedCity.regions?.length || 0} منطقه / محله)
                </span>
              ) : (
                <span className="text-slate-400">هیچ شهری انتخاب نشده است</span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              💡 برای مشاهده و مدیریت محله‌ها، روی نام هر شهر در ستون اول کلیک کنید. نام شهرها و محله‌ها با آیکون مداد قابل ویرایش مستقیم است.
            </div>
          </div>

          {/* 2 Columns Grid: Cities | Regions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* COLUMN 1: Cities List */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-3xs flex flex-col h-[560px]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-extrabold text-xs text-slate-800">۱. استان‌ها و شهرهای تحت پوشش</span>
                </div>
                <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-mono font-bold">
                  {citiesList.length} شهر
                </span>
              </div>

              {/* Add New City */}
              <div className="flex gap-2 my-3">
                <input
                  type="text"
                  placeholder="نام شهر جدید (مانند: نیشابور، کیش، بابل)..."
                  value={newCityInput}
                  onChange={(e) => setNewCityInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddCity(); }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-emerald-500 transition"
                />
                <button
                  type="button"
                  onClick={handleAddCity}
                  title="افزودن شهر و ذخیره در دیتابیس"
                  className="px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer shadow-xs shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Search City */}
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="جستجو در نام شهرها..."
                  value={searchCity}
                  onChange={(e) => setSearchCity(e.target.value)}
                  className="w-full pr-8 pl-2 py-1.5 bg-slate-50/70 border border-slate-200/80 rounded-lg text-[11px] outline-none focus:bg-white focus:border-emerald-400"
                />
              </div>

              {/* Cities Items List */}
              <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
                {filteredCities.map((city) => {
                  const realIndex = citiesList.findIndex((c) => c.name === city.name);
                  const isSelected = selectedCityIndex === realIndex;
                  const isEditing = editingCityIndex === realIndex;

                  return (
                    <div
                      key={city.name}
                      onClick={() => {
                        setSelectedCityIndex(realIndex);
                        setEditingRegionIndex(null);
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-xs ring-2 ring-emerald-200/70'
                          : 'bg-slate-50/80 hover:bg-slate-100 border-slate-200/70 text-slate-700'
                      }`}
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-1.5 flex-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingCityName}
                            onChange={(e) => setEditingCityName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEditCity(realIndex);
                              if (e.key === 'Escape') setEditingCityIndex(null);
                            }}
                            className="w-full p-1.5 bg-white border border-emerald-500 rounded-lg text-xs font-bold outline-none"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEditCity(realIndex)}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer"
                            title="ذخیره نام شهر"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCityIndex(null)}
                            className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg cursor-pointer"
                            title="انصراف"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-emerald-600 animate-pulse' : 'bg-slate-300'}`}></span>
                            <span className="truncate">{city.name}</span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${
                              isSelected ? 'bg-emerald-200 text-emerald-900 font-bold' : 'bg-slate-200/70 text-slate-600'
                            }`}>
                              {city.regions?.length || 0} منطقه
                            </span>
                            
                            {/* Edit City Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCityIndex(realIndex);
                                setEditingCityName(city.name);
                              }}
                              className="text-slate-400 hover:text-blue-600 p-1 transition cursor-pointer"
                              title="ویرایش نام شهر"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete City Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCity(realIndex, city.name);
                              }}
                              className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                              title="حذف شهر"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}

                {filteredCities.length === 0 && (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    شهری با این مشخصات یافت نشد.
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 2: Regions / Neighborhoods of Selected City */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-3xs flex flex-col h-[560px]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span className="font-extrabold text-xs text-slate-800">
                    ۲. مناطق و محله‌های {currentSelectedCity ? `شهر ${currentSelectedCity.name}` : ''}
                  </span>
                </div>
                {currentSelectedCity && (
                  <span className="text-[11px] bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-mono font-bold">
                    {filteredRegions.length} منطقه
                  </span>
                )}
              </div>

              {currentSelectedCity ? (
                <>
                  {/* Add New Region */}
                  <div className="flex gap-2 my-3">
                    <input
                      type="text"
                      placeholder={`نام محله یا منطقه جدید برای ${currentSelectedCity.name} (مانند: نیاوران، شهرک غرب)...`}
                      value={newRegionInput}
                      onChange={(e) => setNewRegionInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddRegion(); }}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 transition"
                    />
                    <button
                      type="button"
                      onClick={handleAddRegion}
                      title="افزودن منطقه و ذخیره در دیتابیس"
                      className="px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer shadow-xs shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Search Region */}
                  <div className="relative mb-2">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder={`جستجو در محله‌های ${currentSelectedCity.name}...`}
                      value={searchRegion}
                      onChange={(e) => setSearchRegion(e.target.value)}
                      className="w-full pr-8 pl-2 py-1.5 bg-slate-50/70 border border-slate-200/80 rounded-lg text-[11px] outline-none focus:bg-white focus:border-blue-400"
                    />
                  </div>

                  {/* Regions Items List */}
                  <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
                    {filteredRegions.map((region, rIdx) => {
                      const isEditing = editingRegionIndex === rIdx;

                      return (
                        <div
                          key={`${region}-${rIdx}`}
                          className="flex items-center justify-between bg-slate-50/80 hover:bg-slate-100 p-2.5 rounded-xl text-xs font-bold text-slate-700 border border-slate-200/70 transition"
                        >
                          {isEditing ? (
                            <div className="flex items-center gap-1.5 flex-1">
                              <input
                                type="text"
                                value={editingRegionName}
                                onChange={(e) => setEditingRegionName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveEditRegion(rIdx);
                                  if (e.key === 'Escape') setEditingRegionIndex(null);
                                }}
                                className="w-full p-1.5 bg-white border border-blue-500 rounded-lg text-xs font-bold outline-none"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEditRegion(rIdx)}
                                className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
                                title="ذخیره نام منطقه"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingRegionIndex(null)}
                                className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg cursor-pointer"
                                title="انصراف"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 overflow-hidden">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                                <span className="truncate">{region}</span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {/* Edit Region Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingRegionIndex(rIdx);
                                    setEditingRegionName(region);
                                  }}
                                  className="text-slate-400 hover:text-blue-600 p-1 transition cursor-pointer"
                                  title="ویرایش نام محله"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>

                                {/* Delete Region Button */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRegion(region)}
                                  className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                                  title="حذف محله"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}

                    {filteredRegions.length === 0 && (
                      <div className="text-center py-12 px-4 bg-slate-50/60 rounded-xl border border-dashed border-slate-200 my-2">
                        <p className="text-slate-500 text-xs font-bold">
                          هنوز منطقه‌ای برای «{currentSelectedCity.name}» ثبت نشده است.
                        </p>
                        <p className="text-slate-400 text-[11px] mt-1">
                          از کادر بالا نام منطقه یا محله را وارد کنید و دکمه + را بزنید تا مستقیماً ذخیره شود.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <MapPin className="w-10 h-10 text-slate-300 mb-2" />
                  <p className="text-xs font-bold text-slate-600">شهری انتخاب نشده است</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    برای مشاهده، افزودن، ویرایش و حذف محله‌ها، لطفاً یک شهر را از ستون کناری انتخاب کنید.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: General Settings */}
      {selectedConfigSubTab === 'general' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-5">
          <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
            <span>🌐</span> مشخصات و هویت پلتفرم
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700">عنوان سایت / اپلیکیشن</label>
              <input
                type="text"
                value={siteTitle}
                onChange={(e) => setSiteTitle(e.target.value)}
                className="w-full mt-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">تلفن پشتیبانی فوری (نمایش در فوتر و هدر سایت)</label>
              <input
                type="text"
                value={supportPhoneNumber}
                onChange={(e) => setSupportPhoneNumber(e.target.value)}
                className="w-full mt-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 font-mono text-left"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700">توضیحات کوتاه سامانه</label>
            <textarea
              rows={2}
              value={siteDescription}
              onChange={(e) => setSiteDescription(e.target.value)}
              className="w-full mt-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500"
            />
          </div>

          {/* صفحات راهنما و پورتال (لینک‌های فوتر) */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <h5 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
              <span>📄</span> مدیریت متن صفحات راهنما و پورتال (لینک‌های فوتر)
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700">۱. متن «درباره ما و معرفی مجتمع کدیار۲۴»</label>
                <textarea
                  rows={4}
                  value={aboutUsText}
                  onChange={(e) => setAboutUsText(e.target.value)}
                  placeholder="توضیحات معرفی مجتمع و اهداف سامانه..."
                  className="w-full mt-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 leading-relaxed"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">۲. متن «تماس با ما، نشانی و ساعات پاسخگویی»</label>
                <textarea
                  rows={4}
                  value={contactUsText}
                  onChange={(e) => setContactUsText(e.target.value)}
                  placeholder="آدرس دفتر، تلفن‌های تماس، ایمیل و ساعات کار..."
                  className="w-full mt-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 leading-relaxed"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">۳. متن «قوانین عمومی و ضوابط فعالیت متخصصین»</label>
                <textarea
                  rows={4}
                  value={rulesText}
                  onChange={(e) => setRulesText(e.target.value)}
                  placeholder="شرایط گارانتی قطعات، تعهدات تکنسین‌ها و نرخ اتحادیه..."
                  className="w-full mt-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 leading-relaxed"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">۴. متن «رسیدگی به شکایات، ممیزی و حل اختلاف صنفی»</label>
                <textarea
                  rows={4}
                  value={disputeText}
                  onChange={(e) => setDisputeText(e.target.value)}
                  placeholder="مراحل ثبت شکایت، بررسی کارشناسی و عودت وجه..."
                  className="w-full mt-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 leading-relaxed"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">لینک مستقیم دانلود اپلیکیشن اندروید (دکمه‌های فوتر و بنرها)</label>
              <input
                type="text"
                value={appDownloadUrlText}
                onChange={(e) => setAppDownloadUrlText(e.target.value)}
                placeholder="https://kodyar24.ir/download/app.apk"
                className="w-full mt-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 font-mono text-left"
              />
            </div>
          </div>

          {/* مجوزها و نمادهای الکترونیکی (ای‌نماد و ساماندهی) */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <h5 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
              <span>🛡️</span> مدیریت نمادهای اعتماد و مجوزهای الکترونیکی (فوتر)
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <span className="text-xs font-bold text-slate-800 block">نماد اول: ای‌نماد (اینماد)</span>
                <div>
                  <label className="text-[11px] text-slate-600">لینک صفحه تاییدیه ای‌نماد</label>
                  <input
                    type="text"
                    value={b1Link}
                    onChange={(e) => setB1Link(e.target.value)}
                    placeholder="https://trustseal.enamad.ir/..."
                    className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 font-mono text-left"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-600">آدرس اینترنتی تصویر/لوگوی ای‌نماد (اختیاری)</label>
                  <input
                    type="text"
                    value={b1Img}
                    onChange={(e) => setB1Img(e.target.value)}
                    placeholder="https://.../enamad.png"
                    className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 font-mono text-left"
                  />
                </div>
              </div>

              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <span className="text-xs font-bold text-slate-800 block">نماد دوم: ساماندهی وزارت ارشاد</span>
                <div>
                  <label className="text-[11px] text-slate-600">لینک صفحه تاییدیه ساماندهی</label>
                  <input
                    type="text"
                    value={b2Link}
                    onChange={(e) => setB2Link(e.target.value)}
                    placeholder="https://logo.samandehi.ir/..."
                    className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 font-mono text-left"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-600">آدرس اینترنتی تصویر/لوگوی ساماندهی (اختیاری)</label>
                  <input
                    type="text"
                    value={b2Img}
                    onChange={(e) => setB2Img(e.target.value)}
                    placeholder="https://.../samandehi.png"
                    className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 font-mono text-left"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSaveGeneralSettings}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Check className="w-4 h-4" />
              ذخیره تمامی مشخصات، صفحات پورتال و نمادها
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: SMS Gateway Settings */}
      {selectedConfigSubTab === 'sms' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
          <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
            <span>📱</span> تنظیمات درگاه پیامک OTP
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700">کلید API درگاه پیامک</label>
              <input
                type="password"
                value={smsApiKey}
                onChange={(e) => setSmsApiKey(e.target.value)}
                className="w-full mt-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 font-mono text-left"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">شماره خط اختصاصی فرستنده</label>
              <input
                type="text"
                value={smsSenderNumber}
                onChange={(e) => setSmsSenderNumber(e.target.value)}
                className="w-full mt-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 font-mono text-left"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSaveSmsSettings}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Check className="w-4 h-4" />
              ذخیره تنظیمات پیامک
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: AI Settings */}
      {selectedConfigSubTab === 'ai' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
          <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
            <span>✨</span> تنظیمات موتور هوش مصنوعی Gemini
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700">مدل هوش مصنوعی</label>
              <input
                type="text"
                value={aiModelName}
                onChange={(e) => setAiModelName(e.target.value)}
                className="w-full mt-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 font-mono text-left"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">درجه خلاقیت (Temperature: {aiTemperature})</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={aiTemperature}
                onChange={(e) => setAiTemperature(parseFloat(e.target.value))}
                className="w-full mt-3 accent-blue-600 cursor-pointer"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSaveAiSettings}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Check className="w-4 h-4" />
              ذخیره تنظیمات هوش مصنوعی
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: Direct Error Code Insert Form */}
      {selectedConfigSubTab === 'direct_insert' && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
              <span>➕</span> ثبت مستقیم کد خطا در پایگاه داده
            </h4>
            <p className="text-xs text-slate-500 mt-1">افزودن سریع و تکی یک رکورد خطای جدید بدون نیاز به اکسل یا درون‌ریزی گروهی.</p>
          </div>

          {directInsertStatus && (
            <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
              directInsertStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {directInsertStatus.type === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span>{directInsertStatus.msg}</span>
            </div>
          )}

          <form onSubmit={handleAddDirectErrorCode} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">دسته‌بندی دستگاه *</label>
                <select
                  value={dirCategory}
                  onChange={(e) => setDirCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 font-bold"
                  required
                >
                  <option value="">انتخاب دسته‌بندی...</option>
                  {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">برند تجاری *</label>
                <input
                  type="text"
                  placeholder="مثال: بوتان، ال‌جی..."
                  value={dirBrand}
                  onChange={(e) => setDirBrand(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">مدل دستگاه</label>
                <input
                  type="text"
                  placeholder="مثال: B5-C2 یا همه مدل‌ها..."
                  value={dirModel}
                  onChange={(e) => setDirModel(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">کد خطا (Error Code) *</label>
                <input
                  type="text"
                  placeholder="مثال: E1, F28, dE..."
                  value={dirCode}
                  onChange={(e) => setDirCode(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 font-mono text-left font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">عنوان فارسی خطا *</label>
                <input
                  type="text"
                  placeholder="مثال: خطای سنسور دمای آبگرم مصرفی..."
                  value={dirTitle}
                  onChange={(e) => setDirTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">علت‌های محتمل (هر علت در یک سطر)</label>
              <textarea
                rows={2}
                placeholder="خرابی NTC مدار گرمایش&#10;قطعی در کابل‌کشی سنسور"
                value={dirPossibleCauses}
                onChange={(e) => setDirPossibleCauses(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">روش رفع عیب و راهکار تعمیراتی</label>
              <textarea
                rows={2}
                placeholder="بررسی مقاومت اهمی سنسور با مولتی‌متر و در صورت نیاز تعویض سنسور NTC..."
                value={dirSolution}
                onChange={(e) => setDirSolution(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" />
                ثبت و ارسال کد خطا به دیتابیس
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminConfigSection;
