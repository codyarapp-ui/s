/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SparePart, ErrorCode } from '../types';
import { getPartUrl } from '../utils/slug';
import {
  ShoppingBag,
  Check,
  ShieldCheck,
  Cpu,
  Box,
  Sparkles,
  CreditCard,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ExternalLink,
  Store,
  Layers,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

interface PartsStoreProps {
  parts: SparePart[];
  categoriesList?: string[];
  onPurchase: (
    part: SparePart,
    address: string,
    buyerName?: string,
    buyerPhone?: string,
    cardHolder?: string,
    trackNumber?: string,
    quantity?: number
  ) => void;
  brandFilter?: string;
  categoryFilter?: string;
  searchModelFilter?: string;
  searchErrorCode?: string;
  activeSearchType?: string;
  affiliateProducts?: any[];
  errorCodesList?: ErrorCode[];
  onClearFilters?: () => void;
}

const normalizePersianArabic = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[\u064A\u06CC]/g, 'ی')
    .replace(/[\u0643\u06A9]/g, 'ک')
    .trim();
};

const normalizeText = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[\u064A\u06CC]/g, 'ی')
    .replace(/[\u0643\u06A9]/g, 'ک')
    .replace(/[-\s_.\u200c/\\()]/g, '')
    .trim();
};

const normalizeCode = (code: string): string => {
  if (!code) return '';
  return code.toLowerCase().trim().replace(/[-_\s.]/g, '');
};

export const PartsStore: React.FC<PartsStoreProps> = ({
  parts = [],
  categoriesList = [],
  onPurchase,
  brandFilter = '',
  categoryFilter = '',
  searchModelFilter = '',
  searchErrorCode = '',
  activeSearchType = 'error_code',
  affiliateProducts = [],
  errorCodesList = [],
  onClearFilters,
}) => {
  const [selectedCategory, setSelectedCategory] = React.useState<string>('همه');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [activeCheckoutPart, setActiveCheckoutPart] = React.useState<SparePart | null>(null);
  const [checkoutStep, setCheckoutStep] = React.useState<'form' | 'success'>('form');
  const [purchaseQuantity, setPurchaseQuantity] = React.useState<number>(1);
  const [zoomedPart, setZoomedPart] = React.useState<SparePart | null>(null);
  const [zoomScale, setZoomScale] = React.useState<number>(1);
  const [panPosition, setPanPosition] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState<boolean>(false);
  const dragStartRef = React.useRef<{ startX: number; startY: number; initPosX: number; initPosY: number }>({
    startX: 0,
    startY: 0,
    initPosX: 0,
    initPosY: 0,
  });

  // Dynamically derive categories from AdminPanel 'دسته‌بندی تجهیزات عیب‌یابی' (categoriesList)
  const categories = React.useMemo(() => {
    const customCats = Array.isArray(categoriesList) ? categoriesList.filter(Boolean) : [];
    if (customCats.length > 0) {
      return ['همه', ...customCats];
    }
    return ['همه', 'پکیج', 'ماشین لباسشویی', 'یخچال و فریزر', 'کولر گازی', 'ماشین ظرفشویی'];
  }, [categoriesList]);

  // Synchronize category tab automatically when user selects or clears category in cascading search
  React.useEffect(() => {
    if (categoryFilter && categoryFilter.trim() !== '' && categoryFilter !== 'همه') {
      const catNorm = normalizeText(categoryFilter);
      const matched = categories.find((c) => c !== 'همه' && (normalizeText(c).includes(catNorm) || catNorm.includes(normalizeText(c))));
      if (matched) {
        setSelectedCategory(matched);
      } else {
        setSelectedCategory(categoryFilter);
      }
    } else {
      setSelectedCategory('همه');
    }
  }, [categoryFilter, categories]);

  // Reset tab to 'همه' when top search tabs change or if search is on general tabs without category filter
  React.useEffect(() => {
    if (!categoryFilter) {
      setSelectedCategory('همه');
    }
  }, [activeSearchType]);

  const resetZoomAndPan = () => {
    setZoomScale(1);
    setPanPosition({ x: 0, y: 0 });
    setIsDragging(false);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initPosX: panPosition.x,
      initPosY: panPosition.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;
    setPanPosition({
      x: dragStartRef.current.initPosX + deltaX,
      y: dragStartRef.current.initPosY + deltaY,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      setIsDragging(false);
    }
  };

  const handleZoomIn = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoomScale((prev) => Math.min(3.5, Number((prev + 0.3).toFixed(2))));
  };

  const handleZoomOut = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoomScale((prev) => {
      const next = Math.max(0.7, Number((prev - 0.3).toFixed(2)));
      if (next <= 1) {
        setPanPosition({ x: 0, y: 0 });
      }
      return next;
    });
  };

  const handleZoomWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoomScale((prev) => Math.min(3.5, Number((prev + 0.2).toFixed(2))));
    } else {
      setZoomScale((prev) => {
        const next = Math.max(0.7, Number((prev - 0.2).toFixed(2)));
        if (next <= 1) {
          setPanPosition({ x: 0, y: 0 });
        }
        return next;
      });
    }
  };

  // Checkout Fields
  const [userName, setUserName] = React.useState('');
  const [userPhone, setUserPhone] = React.useState('');
  const [userAddress, setUserAddress] = React.useState('');
  const [cardHolder, setCardHolder] = React.useState('');
  const [trackNumber, setTrackNumber] = React.useState('');

  // 1. Identify Error Codes that match searchErrorCode
  const matchingErrorCodes = React.useMemo(() => {
    if (!searchErrorCode || !errorCodesList || errorCodesList.length === 0) return [];
    const codeQueryNorm = normalizeCode(searchErrorCode);
    const textQueryNorm = normalizeText(searchErrorCode);

    return errorCodesList.filter((err) => {
      const errCode = normalizeCode(err.code || (err as any).error_code || '');
      const errTitle = normalizeText(err.title || (err as any).error_title || '');
      const errDesc = normalizeText(err.description || '');
      return (
        errCode === codeQueryNorm ||
        (errCode.length >= 2 && codeQueryNorm.length >= 2 && (errCode.includes(codeQueryNorm) || codeQueryNorm.includes(errCode))) ||
        (textQueryNorm.length >= 2 && (errTitle.includes(textQueryNorm) || errDesc.includes(textQueryNorm)))
      );
    });
  }, [searchErrorCode, errorCodesList]);

  // 2. Extract related part IDs from matching error codes
  const relatedPartIdsFromErrors = React.useMemo(() => {
    const ids = new Set<string>();
    for (const err of matchingErrorCodes) {
      if (Array.isArray(err.relatedParts)) {
        err.relatedParts.forEach((id) => ids.add(String(id)));
      }
      if (Array.isArray((err as any).relatedAffiliateParts)) {
        (err as any).relatedAffiliateParts.forEach((id) => ids.add(String(id)));
      }
    }
    return ids;
  }, [matchingErrorCodes]);

  // 3. Extract technical keywords from error details (for smart semantic matching)
  const errorKeywords = React.useMemo(() => {
    if (!searchErrorCode) return [];
    const keywords: string[] = [searchErrorCode.toLowerCase().trim()];
    const techTerms = [
      'سنسور',
      'ntc',
      'برد',
      'پمپ',
      'شیر',
      'شیر برقی',
      'شیر گاز',
      'ترموستات',
      'دیفراست',
      'فن',
      'جرقه',
      'کلید',
      'پرشر',
      'مبدل',
      'گیج',
      'فلومتر',
      'فلوسوئیچ',
      'المنت',
      'دما',
      'موتور',
      'خازن',
      'هیدروستات',
      'میکروسوئیچ',
      'تخلیه',
      'الکترود',
      'ترموکوپل',
      'بلبرینگ',
      'تسمه',
      'مگنترون',
      'سنسور آب',
      'شیر ورودی',
    ];

    const toText = (val: any) => (Array.isArray(val) ? val.join(' ') : typeof val === 'string' ? val : '');

    for (const err of matchingErrorCodes) {
      const combined = `${err.code || ''} ${err.title || ''} ${err.description || ''} ${toText(err.causes)} ${toText(err.steps)} ${toText(err.solutions)}`.toLowerCase();
      for (const term of techTerms) {
        if (combined.includes(term)) {
          keywords.push(term);
        }
      }
    }
    return Array.from(new Set(keywords));
  }, [searchErrorCode, matchingErrorCodes]);

  // 4. Warehouse Spare Parts Filter Function
  const isPartMatchingCriteria = React.useCallback(
    (part: SparePart) => {
      const partCat = part.category || part.device_category || '';
      const partName = part.name || part.title || '';
      const partDesc = part.description || part.short_description || part.technical_description || '';
      const partModel = part.model || part.device_model || '';
      const partCode = part.code || part.partNumber || (part as any).part_number || '';
      const compArray = Array.isArray(part.compatibility) && part.compatibility.length > 0
        ? part.compatibility
        : (part.compatible_brands ? part.compatible_brands.split(/[،,]/).map((s) => s.trim()).filter(Boolean) : (part.brand ? [part.brand] : []));
      const compModels = Array.isArray(part.compatibleModels) && part.compatibleModels.length > 0
        ? part.compatibleModels
        : (Array.isArray(part.compatible_models) ? part.compatible_models : (partModel ? [partModel] : []));

      // Category check (from step 2 or store category tabs)
      const activeCat = categoryFilter && categoryFilter !== 'همه' ? categoryFilter : (selectedCategory !== 'همه' ? selectedCategory : '');
      if (activeCat) {
        const catNorm = normalizeText(activeCat);
        const partCatNorm = normalizeText(partCat);
        const matchesCat = partCatNorm.includes(catNorm) || catNorm.includes(partCatNorm);
        if (!matchesCat) return false;
      }

      // Brand check (from step 3)
      if (brandFilter && brandFilter !== 'همه' && brandFilter !== 'همه برندها') {
        const brandNorm = normalizeText(brandFilter);
        const matchesBrand =
          compArray.some((b) => {
            const bNorm = normalizeText(b);
            return bNorm.includes(brandNorm) || brandNorm.includes(bNorm);
          }) || (part.brand && (normalizeText(part.brand).includes(brandNorm) || brandNorm.includes(normalizeText(part.brand))));
        if (!matchesBrand) return false;
      }

      // Model check (from step 4)
      if (searchModelFilter && searchModelFilter !== 'همه مدل‌ها' && searchModelFilter !== 'عمومی') {
        const modelNorm = normalizeText(searchModelFilter);
        const matchesModel =
          compModels.some((m) => {
            const mNorm = normalizeText(m);
            return mNorm.includes(modelNorm) || modelNorm.includes(mNorm);
          }) ||
          normalizeText(partModel).includes(modelNorm) ||
          modelNorm.includes(normalizeText(partModel)) ||
          normalizeText(partName).includes(modelNorm) ||
          normalizeText(partDesc).includes(modelNorm);
        if (!matchesModel) return false;
      }

      // Local store search input
      if (searchQuery.trim()) {
        const qNorm = normalizeText(searchQuery);
        const matchesLocalQuery =
          normalizeText(partName).includes(qNorm) ||
          normalizeText(partDesc).includes(qNorm) ||
          normalizeText(partModel).includes(qNorm) ||
          normalizeCode(partCode).includes(normalizeCode(searchQuery)) ||
          compArray.some((c) => normalizeText(c).includes(qNorm));
        if (!matchesLocalQuery) return false;
      }

      // Error code check (from step 1 or error result card click)
      if (searchErrorCode.trim()) {
        const errCodeNorm = normalizeCode(searchErrorCode);
        const errTextNorm = normalizeText(searchErrorCode);

        // 1. If explicit related parts are assigned to the matching error code, strictly limit to those parts
        if (relatedPartIdsFromErrors.size > 0) {
          return relatedPartIdsFromErrors.has(String(part.id)) || relatedPartIdsFromErrors.has(String(partCode));
        }

        // 2. Direct code or title match
        if (normalizeCode(partCode) === errCodeNorm || normalizeCode(partName).includes(errCodeNorm)) return true;

        // 3. Specific technical component keywords in partName/partDesc
        if (errorKeywords.length > 0) {
          const partSpecificText = `${partName} ${partDesc}`.toLowerCase();
          const matchesKeyword = errorKeywords.some((kw) => kw && kw.length > 2 && partSpecificText.includes(kw));
          if (matchesKeyword) return true;
        }

        // If error query did not find direct related parts or keywords, don't loosely match unrelated parts
        return false;
      }

      return true;
    },
    [categoryFilter, selectedCategory, brandFilter, searchModelFilter, searchQuery, searchErrorCode, relatedPartIdsFromErrors, errorKeywords]
  );

  // 5. Affiliate Products Filter Function
  const isAffiliateProductMatchingCriteria = React.useCallback(
    (prod: any) => {
      const prodCat = prod.category || prod.device_category || '';
      const prodName = prod.name || prod.title || '';
      const prodDesc = prod.description || '';
      const prodBrand = prod.brand || '';
      const prodModel = prod.model || prod.device_model || '';

      const activeCat = categoryFilter && categoryFilter !== 'همه' ? categoryFilter : (selectedCategory !== 'همه' ? selectedCategory : '');
      if (activeCat) {
        const catNorm = normalizeText(activeCat);
        const prodCatNorm = normalizeText(prodCat);
        const matchesCat = prodCatNorm.includes(catNorm) || catNorm.includes(prodCatNorm);
        if (!matchesCat) return false;
      }

      if (brandFilter && brandFilter !== 'همه' && brandFilter !== 'همه برندها') {
        const brandNorm = normalizeText(brandFilter);
        const prodBrandNorm = normalizeText(prodBrand);
        const matchesBrand =
          prodBrandNorm.includes(brandNorm) ||
          brandNorm.includes(prodBrandNorm) ||
          normalizeText(prodName).includes(brandNorm);
        if (!matchesBrand) return false;
      }

      if (searchModelFilter && searchModelFilter !== 'همه مدل‌ها' && searchModelFilter !== 'عمومی') {
        const modelNorm = normalizeText(searchModelFilter);
        const matchesModel =
          normalizeText(prodModel).includes(modelNorm) ||
          modelNorm.includes(normalizeText(prodModel)) ||
          normalizeText(prodName).includes(modelNorm) ||
          normalizeText(prodDesc).includes(modelNorm);
        if (!matchesModel) return false;
      }

      if (searchQuery.trim()) {
        const qNorm = normalizeText(searchQuery);
        const matchesLocalQuery =
          normalizeText(prodName).includes(qNorm) ||
          normalizeText(prodDesc).includes(qNorm) ||
          normalizeText(prodBrand).includes(qNorm) ||
          normalizeText(prodModel).includes(qNorm);
        if (!matchesLocalQuery) return false;
      }

      if (searchErrorCode.trim()) {
        const errCodeNorm = normalizeCode(searchErrorCode);
        const errTextNorm = normalizeText(searchErrorCode);

        if (relatedPartIdsFromErrors.size > 0) {
          return relatedPartIdsFromErrors.has(String(prod.id));
        }

        if (normalizeCode(prodName).includes(errCodeNorm) || normalizeText(prodName).includes(errTextNorm)) return true;

        if (errorKeywords.length > 0) {
          const prodSpecificText = `${prodName} ${prodDesc}`.toLowerCase();
          const matchesKeyword = errorKeywords.some((kw) => kw && kw.length > 2 && prodSpecificText.includes(kw));
          if (matchesKeyword) return true;
        }

        return false;
      }

      return true;
    },
    [categoryFilter, selectedCategory, brandFilter, searchModelFilter, searchQuery, searchErrorCode, relatedPartIdsFromErrors, errorKeywords]
  );

  // Compute matched items
  const matchedWarehouseParts = React.useMemo(() => {
    return (parts || []).filter(isPartMatchingCriteria);
  }, [parts, isPartMatchingCriteria]);

  const inStockWarehouseParts = React.useMemo(() => {
    return matchedWarehouseParts.filter((p) => (p.stock || 0) > 0);
  }, [matchedWarehouseParts]);

  const matchedAffiliateProducts = React.useMemo(() => {
    return (affiliateProducts || []).filter(isAffiliateProductMatchingCriteria);
  }, [affiliateProducts, isAffiliateProductMatchingCriteria]);

  // Is cascading drill-down search actively applied?
  const isCascadingSearchActive = Boolean(searchErrorCode || brandFilter || categoryFilter || searchModelFilter);

  // Pagination for 3 Columns x 3 Rows (9 items per page)
  const ITEMS_PER_PAGE = 9;
  const [currentPage, setCurrentPage] = React.useState<number>(1);

  // Reset pagination to first page when any search criteria or category changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery, brandFilter, categoryFilter, searchModelFilter, searchErrorCode, activeSearchType]);

  // Priority Decision:
  // If cascading search is active:
  // - If in-stock warehouse parts exist: show in-stock warehouse parts exclusively.
  // - If NO in-stock warehouse parts exist: fallback to showing matching affiliate products!
  // If not cascading search:
  // - Show standard catalog of warehouse parts
  const shouldShowAffiliateFallback =
    isCascadingSearchActive &&
    (matchedWarehouseParts.length === 0 || inStockWarehouseParts.length === 0) &&
    matchedAffiliateProducts.length > 0;

  const displayWarehouseParts = isCascadingSearchActive && inStockWarehouseParts.length > 0 ? inStockWarehouseParts : matchedWarehouseParts;

  const totalWarehousePages = Math.max(1, Math.ceil(displayWarehouseParts.length / ITEMS_PER_PAGE));
  const paginatedWarehouseParts = React.useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return displayWarehouseParts.slice(start, start + ITEMS_PER_PAGE);
  }, [displayWarehouseParts, currentPage]);

  const totalAffiliatePages = Math.max(1, Math.ceil(matchedAffiliateProducts.length / ITEMS_PER_PAGE));
  const paginatedAffiliateProducts = React.useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return matchedAffiliateProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [matchedAffiliateProducts, currentPage]);

  const handleStartCheckout = (part: SparePart) => {
    setActiveCheckoutPart(part);
    setPurchaseQuantity(1);
    setCheckoutStep('form');
    try {
      const partUrl = getPartUrl(part);
      if (window.location.pathname !== partUrl) {
        window.history.pushState({ partId: part.id }, '', partUrl);
      }
    } catch (e) {}
  };

  const handleCloseCheckout = () => {
    setActiveCheckoutPart(null);
    try {
      if (window.location.pathname.startsWith('/part/')) {
        window.history.pushState({}, '', '/parts');
      }
    } catch (e) {}
  };

  const handleConfirmPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !userPhone || !userAddress || !cardHolder || !trackNumber || (activeCheckoutPart && activeCheckoutPart.stock < 1)) return;

    if (activeCheckoutPart) {
      onPurchase(activeCheckoutPart, userAddress, userName, userPhone, cardHolder, trackNumber, purchaseQuantity);
      setCheckoutStep('success');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-250/60 p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-blue-600" />
            <span>فروشگاه قطعات یدکی اورجینال لوازم خانگی</span>
          </h2>
          <p className="text-slate-500 text-xs mt-1">تضمین اصالت کالا، ضمانت برگشت وجه و سازگاری کامل با دستگاه‌های ایرانی و خارجی</p>
        </div>

        {/* Filter categories Tabs */}
        <div className="flex flex-wrap gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-100">
          {categories.map((cat) => (
            <button
              id={`cat-btn-${cat}`}
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                selectedCategory === cat ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Contextual Banner for Cascading Search State */}
      {isCascadingSearchActive && (
        <div className="bg-blue-50/70 border border-blue-200/80 text-blue-950 text-xs rounded-xl p-3 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0 animate-pulse" />
            <span className="font-bold">فیلتر هوشمند بر اساس جستجوی پلکانی:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {searchErrorCode && (
                <span className="bg-blue-600 text-white px-2 py-0.5 rounded-md text-[11px] font-bold">
                  کد خطای {searchErrorCode}
                </span>
              )}
              {categoryFilter && (
                <span className="bg-white border border-blue-200 text-blue-800 px-2 py-0.5 rounded-md text-[11px] font-semibold">
                  دستگاه: {categoryFilter}
                </span>
              )}
              {brandFilter && (
                <span className="bg-white border border-blue-200 text-blue-800 px-2 py-0.5 rounded-md text-[11px] font-semibold">
                  برند: {brandFilter}
                </span>
              )}
              {searchModelFilter && (
                <span className="bg-white border border-blue-200 text-blue-800 px-2 py-0.5 rounded-md text-[11px] font-semibold">
                  مدل: {searchModelFilter}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => {
              if (onClearFilters) onClearFilters();
              setSelectedCategory('همه');
            }}
            className="text-[11px] bg-white hover:bg-blue-100/70 text-blue-700 border border-blue-200 font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-center whitespace-nowrap"
          >
            پاک کردن فیلترها و نمایش همه
          </button>
        </div>
      )}

      {/* Warehouse / Affiliate Status Notice */}
      {shouldShowAffiliateFallback && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <p className="font-bold mb-0.5">قطعه مستقیماً در انبار کدیار ناموجود است؛ نمایش تامین‌کنندگان طرف قرارداد (همکاری در فروش):</p>
            <p className="text-[11px] text-amber-700">
              می‌توانید قطعه مورد نظر خود را از طریق تامین‌کننده معتبر زیر به صورت مستقیم تهیه فرمایید.
            </p>
          </div>
        </div>
      )}

      {/* Local Search Input within store */}
      <div className="mb-6">
        <input
          id="parts-search-input"
          type="text"
          placeholder="جستجوی عنوان یا کد قطعه (مثال: سنسور، برد برقی، پمپ، شیر گاز...)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-4 py-3 text-xs outline-none transition-all placeholder:text-slate-400"
        />
      </div>

      {/* Main Grid View */}
      {shouldShowAffiliateFallback ? (
        /* AFFILIATE PRODUCTS DISPLAY (FALLBACK WHEN WAREHOUSE IS OUT OF STOCK) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {paginatedAffiliateProducts.map((prod) => (
            <div
              key={prod.id}
              className="group border border-amber-200 bg-amber-50/20 hover:bg-white hover:border-amber-400 rounded-2xl p-4 transition-all hover:shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-100 mb-3 border border-slate-100">
                  <img
                    referrerPolicy="no-referrer"
                    src={
                      prod.image ||
                      prod.image_url ||
                      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23f1f5f9'/><text x='50' y='55' font-size='28' text-anchor='middle'>⚙️</text></svg>"
                    }
                    alt={prod.name || prod.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                  />
                  <span className="absolute top-2 right-2 bg-amber-600 text-white text-[10px] px-2 py-0.5 rounded-md font-sans font-bold flex items-center gap-1 shadow-xs">
                    <Store className="w-3 h-3" />
                    <span>تامین‌کننده معتبر</span>
                  </span>
                </div>

                <div className="flex items-start gap-2 justify-between mb-2">
                  <h3 className="font-bold text-slate-800 text-xs leading-normal">
                    {prod.name || prod.title || `${prod.brand} ${prod.model}`}
                  </h3>
                </div>

                {prod.description && (
                  <p className="text-slate-500 text-[11px] leading-relaxed mb-3 line-clamp-2">
                    {prod.description}
                  </p>
                )}

                {/* Brand and Model Tags */}
                <div className="mb-4 space-y-1">
                  <div className="flex items-center gap-2 text-[10px] text-slate-600">
                    <span className="text-slate-400">دسته‌بندی:</span>
                    <span className="font-bold text-slate-800">{prod.category || 'قطعات یدکی'}</span>
                  </div>
                  {prod.brand && (
                    <div className="flex items-center gap-2 text-[10px] text-slate-600">
                      <span className="text-slate-400">برند و مدل:</span>
                      <span className="font-bold text-slate-800">{prod.brand} {prod.model ? `- ${prod.model}` : ''}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <hr className="border-slate-100 mb-3" />
                <div className="flex items-center justify-between mb-3 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block">قیمت قطعه</span>
                    <span className="font-bold text-slate-800 font-sans">
                      {Number(prod.price || 0).toLocaleString('fa-IR')}
                    </span>
                    <span className="text-slate-500 text-[9px] mr-1">تومان</span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px] block">وضعیت موجودی</span>
                    <span className="text-amber-700 font-medium text-[10px] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      موجود در انبار همکار
                    </span>
                  </div>
                </div>

                <a
                  href={prod.buy_url || prod.buyUrl || prod.link || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-xs hover:shadow-md cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>خرید مستقیم از تامین‌کننده</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : displayWarehouseParts.length === 0 ? (
        /* EMPTY STATE */
        <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl">
          <Box className="w-12 h-12 text-slate-300 mx-auto mb-3 stroke-[1.2]" />
          <p className="text-slate-600 text-xs font-bold">قطعه مورد نظر برای این فیلتر یا کد خطا یافت نشد.</p>
          <p className="text-slate-400 text-[10px] mt-1">
            می‌توانید با پاک کردن فیلترها، کلیه قطعات موجود در انبار را مشاهده فرمایید.
          </p>
          {isCascadingSearchActive && (
            <button
              onClick={() => {
                if (onClearFilters) onClearFilters();
                setSelectedCategory('همه');
              }}
              className="mt-4 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all cursor-pointer"
            >
              مشاهده تمام قطعات فروشگاه
            </button>
          )}
        </div>
      ) : (
        /* KODYAR WAREHOUSE PARTS DISPLAY */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {paginatedWarehouseParts.map((part) => (
            <div
              key={part.id}
              className="group border border-slate-100 bg-slate-50/30 hover:bg-white hover:border-slate-300/80 rounded-2xl p-4 transition-all hover:shadow-md flex flex-col justify-between"
            >
              <div>
                <div
                  id={`part-img-wrap-${part.id}`}
                  onClick={() => {
                    setZoomedPart(part);
                    resetZoomAndPan();
                  }}
                  className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-100 mb-3 border border-slate-100 cursor-zoom-in group/img"
                  title="برای بزرگنمایی و مشاهده تصویر با کیفیت کلیک کنید"
                >
                  <img
                    referrerPolicy="no-referrer"
                    src={part.image}
                    alt={part.name}
                    className="w-full h-full object-cover group-hover/img:scale-105 transition-all duration-300"
                  />
                  <div className="absolute inset-0 bg-slate-950/0 group-hover/img:bg-slate-950/20 transition-all flex items-center justify-center pointer-events-none">
                    <span className="opacity-0 group-hover/img:opacity-100 transition-all bg-slate-900/80 backdrop-blur-xs text-white text-[10px] px-2 py-1 rounded-lg flex items-center gap-1 shadow-md">
                      <ZoomIn className="w-3.5 h-3.5" />
                      <span>مشاهده تصویر بزرگ</span>
                    </span>
                  </div>
                  <span className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded-md font-sans pointer-events-none">
                    {part.category}
                  </span>
                </div>

                <div className="flex items-start gap-2 justify-between mb-2">
                  <h3 className="font-bold text-slate-800 text-xs leading-normal">
                    <a
                      href={getPartUrl(part)}
                      onClick={(e) => {
                        e.preventDefault();
                        handleStartCheckout(part);
                      }}
                      className="hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      {part.name}
                    </a>
                  </h3>
                </div>

                <p className="text-slate-500 text-[11px] leading-relaxed mb-3 line-clamp-2">
                  {part.description}
                </p>

                {/* Compatibility Tags & Details */}
                <div className="mb-4 space-y-1.5">
                  {(() => {
                    const compList =
                      Array.isArray(part.compatibility) && part.compatibility.length > 0
                        ? part.compatibility
                        : part.compatible_brands
                        ? part.compatible_brands.split(/[،,]/).map((s) => s.trim()).filter(Boolean)
                        : part.brand
                        ? [part.brand]
                        : [];
                    const modelName = part.model || part.device_model;

                    return (
                      <>
                        {modelName && modelName !== 'همه مدل‌ها' && modelName !== 'عمومی' && (
                          <div className="text-[10px] text-slate-500">
                            <span className="text-slate-400">مدل: </span>
                            <span className="font-bold text-slate-700">{modelName}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-[10px] text-slate-400 block mb-1">برندهای سازگار:</span>
                          <div className="flex flex-wrap gap-1">
                            {compList.length > 0 ? (
                              compList.map((c) => (
                                <span
                                  key={c}
                                  className="bg-blue-50 text-blue-700 border border-blue-100 text-[9.5px] px-2 py-0.5 rounded-md font-bold"
                                >
                                  {c}
                                </span>
                              ))
                            ) : (
                              <span className="bg-slate-100 text-slate-500 text-[9px] px-1.5 py-0.5 rounded-sm">
                                عمومی / تمام برندها
                              </span>
                            )}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div>
                <hr className="border-slate-100 mb-3" />
                <div className="flex items-center justify-between mb-3 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block">قیمت مصرف‌کننده</span>
                    <span className="font-bold text-slate-800 font-sans">{part.price.toLocaleString('fa-IR')}</span>
                    <span className="text-slate-500 text-[9px] mr-1">تومان</span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px] block">وضعیت انبار کدیار</span>
                    {part.stock > 0 ? (
                      <span className="text-emerald-600 font-medium text-[10px] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        {part.stock} عدد موجود
                      </span>
                    ) : (
                      <span className="text-rose-500 font-medium text-[10px]">اتمام موجودی</span>
                    )}
                  </div>
                </div>

                <button
                  id={`buy-btn-${part.id}`}
                  disabled={part.stock < 1}
                  onClick={() => handleStartCheckout(part)}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    part.stock > 0
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs hover:shadow-md'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>سفارش فوری قطعه</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls for 3 Columns x 3 Rows (9 items) */}
      {((shouldShowAffiliateFallback && totalAffiliatePages > 1) || (!shouldShowAffiliateFallback && displayWarehouseParts.length > ITEMS_PER_PAGE)) && (
        <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            <span>نمایش </span>
            <span className="font-bold text-slate-800 font-sans">
              {shouldShowAffiliateFallback
                ? `${(currentPage - 1) * ITEMS_PER_PAGE + 1} تا ${Math.min(currentPage * ITEMS_PER_PAGE, matchedAffiliateProducts.length)}`
                : `${(currentPage - 1) * ITEMS_PER_PAGE + 1} تا ${Math.min(currentPage * ITEMS_PER_PAGE, displayWarehouseParts.length)}`}
            </span>
            <span> از </span>
            <span className="font-bold text-slate-800 font-sans">
              {shouldShowAffiliateFallback ? matchedAffiliateProducts.length : displayWarehouseParts.length}
            </span>
            <span> کالا</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 ${
                currentPage === 1
                  ? 'border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 cursor-pointer bg-white'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
              <span>صفحه قبل</span>
            </button>

            <div className="flex items-center gap-1">
              {Array.from(
                { length: shouldShowAffiliateFallback ? totalAffiliatePages : totalWarehousePages },
                (_, i) => i + 1
              ).map((pageNum) => (
                <button
                  key={`page-${pageNum}`}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded-xl text-xs font-sans font-bold transition-all cursor-pointer ${
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button
              onClick={() =>
                setCurrentPage((p) =>
                  Math.min(shouldShowAffiliateFallback ? totalAffiliatePages : totalWarehousePages, p + 1)
                )
              }
              disabled={currentPage === (shouldShowAffiliateFallback ? totalAffiliatePages : totalWarehousePages)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 ${
                currentPage === (shouldShowAffiliateFallback ? totalAffiliatePages : totalWarehousePages)
                  ? 'border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 cursor-pointer bg-white'
              }`}
            >
              <span>صفحه بعد</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Checkout Modal of Shetab Gate */}
      {activeCheckoutPart && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-250 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-slate-950 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-xs">ثبت رسید پرداخت کارت‌به‌کارت</h3>
              </div>
              <button
                onClick={handleCloseCheckout}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {checkoutStep === 'form' ? (
              <form onSubmit={handleConfirmPurchase} className="p-6">
                {/* Summary */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-4 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-500">مورد خرید:</span>
                    <span className="font-bold text-slate-800">{activeCheckoutPart.name}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-500">قیمت واحد:</span>
                    <span className="text-slate-700 font-sans">{activeCheckoutPart.price.toLocaleString('fa-IR')} تومان</span>
                  </div>

                  {/* Quantity Selector */}
                  <div className="flex justify-between items-center py-2.5 my-2 border-y border-slate-200/80 bg-white/70 px-3 rounded-xl">
                    <span className="font-bold text-slate-700 text-xs">تعداد سفارش:</span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setPurchaseQuantity((prev) => Math.max(1, prev - 1))}
                        disabled={purchaseQuantity <= 1}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center font-bold text-slate-700 text-sm transition-colors cursor-pointer"
                      >
                        -
                      </button>
                      <span className="font-bold text-slate-900 font-sans text-sm w-6 text-center">
                        {purchaseQuantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPurchaseQuantity((prev) => Math.min(activeCheckoutPart.stock, prev + 1))}
                        disabled={purchaseQuantity >= activeCheckoutPart.stock}
                        className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <span className="font-bold text-slate-800">مبلغ نهایی قابل پرداخت:</span>
                    <span className="font-bold text-blue-600 text-sm font-sans">
                      {(activeCheckoutPart.price * purchaseQuantity).toLocaleString('fa-IR')} تومان
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-600 text-[10px] font-bold mb-1">نام و نام خانوادگی خریدار *</label>
                    <input
                      required
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="مثال: محمد مهدوی"
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs rounded-xl outline-none focus:bg-white focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 text-[10px] font-bold mb-1">شماره تلفن همراه *</label>
                    <input
                      required
                      type="tel"
                      value={userPhone}
                      onChange={(e) => setUserPhone(e.target.value)}
                      placeholder="مثال: 09121234567"
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs rounded-xl outline-none focus:bg-white focus:border-blue-500 text-left"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 text-[10px] font-bold mb-1">آدرس دقیق تحویل قطعه *</label>
                    <textarea
                      required
                      value={userAddress}
                      onChange={(e) => setUserAddress(e.target.value)}
                      placeholder="آدرس کامل پستی، کد پستی در صورت امکان"
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs rounded-xl outline-none focus:bg-white focus:border-blue-500"
                    />
                  </div>

                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-[11px] text-amber-800 leading-relaxed">
                    لطفاً مبلغ فوق را به شماره کارت اعلامی توسط پشتیبانی واریز کرده و اطلاعات فیش را در زیر ثبت کنید.
                  </div>

                  <div>
                    <label className="block text-slate-600 text-[10px] font-bold mb-1">نام صاحب کارت واریزکننده *</label>
                    <input
                      required
                      type="text"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      placeholder="مثال: علی احمدی"
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs rounded-xl outline-none focus:bg-white focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 text-[10px] font-bold mb-1">شماره پیگیری فیش واریزی *</label>
                    <input
                      required
                      type="text"
                      value={trackNumber}
                      onChange={(e) => setTrackNumber(e.target.value)}
                      placeholder="مثال: 123456789"
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs rounded-xl outline-none focus:bg-white focus:border-blue-500 text-left"
                    />
                  </div>
                </div>

                <button
                  id="checkout-confirm-btn"
                  type="submit"
                  className="w-full mt-5 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white rounded-xl py-2.5 text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>ثبت اطلاعات فیش پرداخت</span>
                </button>
              </form>
            ) : (
              <div className="p-8 text-center bg-white">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 scale-105 animate-pulse">
                  <Check className="w-8 h-8 text-emerald-600" />
                </div>
                <h4 className="font-bold text-slate-800 text-sm mb-2">درخواست شما ثبت شد!</h4>
                <p className="text-slate-500 text-xs leading-relaxed max-w-sm mx-auto mb-4">
                  فیش پرداخت شما ثبت شد و پس از تایید توسط واحد مالی (حداکثر ۲ ساعت)، قطعه رزرو و ارسال می‌شود. نتیجه از طریق پیامک به شماره{' '}
                  <span className="font-semibold text-slate-800">{userPhone}</span> اطلاع داده خواهد شد.
                </p>
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-[11px] text-slate-600 text-right mb-5 grid grid-cols-2 gap-2">
                  <div>
                    شماره پیگیری: <span className="font-bold text-slate-900 font-mono">{trackNumber}</span>
                  </div>
                  <div>
                    وضعیت: <span className="text-amber-600 font-medium font-sans">در انتظار تایید پرداخت</span>
                  </div>
                </div>

                <button
                  id="checkout-close-btn"
                  onClick={handleCloseCheckout}
                  className="w-full bg-slate-900 text-white text-xs py-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  بستن پنجره سفارش
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product Image Zoom Fullscreen Lightbox Stage */}
      {zoomedPart && (
        <div
          id="image-zoom-modal"
          className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-50 flex flex-col justify-between select-none animate-in fade-in duration-200"
        >
          {/* Top Bar */}
          <div className="relative z-30 flex items-center justify-between p-4 sm:p-5 bg-gradient-to-b from-slate-950/90 via-slate-950/50 to-transparent">
            <div className="flex items-center gap-2.5 truncate">
              <span className="bg-blue-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg font-sans shadow-md">
                {zoomedPart.category}
              </span>
              <h3 className="font-bold text-sm sm:text-base text-white truncate drop-shadow-sm">
                {zoomedPart.name}
              </h3>
            </div>

            <button
              id="close-image-zoom-btn"
              type="button"
              onClick={() => {
                setZoomedPart(null);
                resetZoomAndPan();
              }}
              className="w-10 h-10 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/70 text-white flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-lg hover:scale-105"
              title="بستن تصویر (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Center Stage */}
          <div
            id="zoom-pan-container"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleZoomWheel}
            className={`flex-1 w-full h-full flex items-center justify-center overflow-hidden touch-none relative ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            title="با ماوس یا انگشت تصویر را حرکت دهید | با اسکرول ماوس زوم کنید"
          >
            <div
              style={{
                transform: `translate3d(${panPosition.x}px, ${panPosition.y}px, 0) scale(${zoomScale})`,
                transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.2, 0, 0.2, 1)',
              }}
              className="w-full h-full flex items-center justify-center px-2 sm:px-6 py-2 origin-center pointer-events-none"
            >
              <img
                referrerPolicy="no-referrer"
                src={zoomedPart.image}
                alt={zoomedPart.name}
                draggable={false}
                className="w-auto h-auto max-w-[96vw] md:max-w-[90vw] lg:max-w-[85vw] max-h-[74vh] md:max-h-[80vh] lg:max-h-[84vh] object-contain rounded-2xl shadow-2xl select-none"
              />
            </div>

            {/* Floating Zoom Toolbar */}
            <div className="absolute bottom-4 inset-x-0 flex items-center justify-center pointer-events-none z-30">
              <div
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                className="bg-slate-900/90 backdrop-blur-lg border border-slate-700/80 rounded-2xl px-4 py-2 flex items-center gap-3 shadow-2xl pointer-events-auto text-white select-none"
              >
                <button
                  id="zoom-out-btn"
                  type="button"
                  onClick={handleZoomOut}
                  disabled={zoomScale <= 0.7}
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer text-slate-200"
                  title="کوچک‌نمایی (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>

                <span className="text-xs font-bold font-mono min-w-[52px] text-center text-blue-400 select-none">
                  {Math.round(zoomScale * 100)}%
                </span>

                <button
                  id="zoom-in-btn"
                  type="button"
                  onClick={handleZoomIn}
                  disabled={zoomScale >= 4}
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer text-slate-200"
                  title="بزرگ‌نمایی (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                {(zoomScale !== 1 || panPosition.x !== 0 || panPosition.y !== 0) && (
                  <button
                    id="zoom-reset-btn"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      resetZoomAndPan();
                    }}
                    className="w-8 h-8 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-blue-400 flex items-center justify-center transition-colors cursor-pointer border border-blue-500/30"
                    title="بازنشانی اندازه و موقعیت اصلی"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="relative z-30 p-4 sm:p-5 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-transparent flex items-center justify-between text-xs text-white border-t border-slate-800/40">
            <div>
              <span className="text-slate-400 text-[10px] block">قیمت قطعه</span>
              <span className="font-bold text-emerald-400 font-sans text-sm sm:text-base">
                {zoomedPart.price.toLocaleString('fa-IR')}
              </span>
              <span className="text-slate-400 text-[11px] mr-1">تومان</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const targetPart = zoomedPart;
                  setZoomedPart(null);
                  resetZoomAndPan();
                  handleStartCheckout(targetPart);
                }}
                disabled={zoomedPart.stock < 1}
                className={`px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
                  zoomedPart.stock > 0
                    ? 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-[1.02]'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>ثبت سفارش کالا</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
