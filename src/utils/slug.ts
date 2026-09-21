/**
 * URL Slug and path handling utilities for SEO and routing
 */

export function slugifyBrand(brand: string): string {
  if (!brand) return '';
  return brand
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u0600-\u06FF\-]/g, '');
}

export function getErrorCodeUrl(brand: string, code: string): string {
  const b = slugifyBrand(brand) || 'general';
  const c = encodeURIComponent(String(code || '').trim().toLowerCase());
  return `/error-code/${b}/${c}`;
}

export function parseErrorCodePath(path: string): { brandSlug: string; codeSlug: string } | null {
  if (!path) return null;
  const match = path.match(/^\/error-code\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  return {
    brandSlug: decodeURIComponent(match[1]),
    codeSlug: decodeURIComponent(match[2])
  };
}

export function isBrandMatch(brand: string, slug: string): boolean {
  if (!brand || !slug) return false;
  const bClean = brand.toLowerCase().trim();
  const sClean = slug.toLowerCase().trim();
  return (
    slugifyBrand(brand) === slugifyBrand(slug) ||
    bClean === sClean ||
    bClean.replace(/\s+/g, '-') === sClean
  );
}

export function isCodeMatch(code: string, slug: string): boolean {
  if (!code || !slug) return false;
  return code.toLowerCase().trim() === slug.toLowerCase().trim();
}

export function getPartUrl(part: any): string {
  if (!part) return '/parts';
  const brand = slugifyBrand(part.brand || 'general') || 'general';
  const identifier = encodeURIComponent(String(part.id || part.partNumber || part.part_number || part.code || part.slug || part.name || '').trim());
  return `/part/${brand}/${identifier}`;
}

export function parsePartPath(path: string): { isPartsList?: boolean; brandSlug?: string; partId?: string } | null {
  if (!path) return null;
  if (path === '/parts' || path === '/parts/' || path.startsWith('/parts?')) {
    return { isPartsList: true };
  }
  const matchWithBrand = path.match(/^\/part\/([^/]+)\/([^/]+)/);
  if (matchWithBrand) {
    return {
      brandSlug: decodeURIComponent(matchWithBrand[1]),
      partId: decodeURIComponent(matchWithBrand[2])
    };
  }
  const matchSimple = path.match(/^\/part\/([^/]+)/);
  if (matchSimple) {
    return {
      partId: decodeURIComponent(matchSimple[1])
    };
  }
  return null;
}

export function isPartMatch(part: any, partIdOrSlug: string, brandSlug?: string): boolean {
  if (!part || !partIdOrSlug) return false;
  const target = String(partIdOrSlug).toLowerCase().trim();
  const idMatch = String(part.id || '').toLowerCase().trim() === target;
  const partNoMatch = String(part.partNumber || part.part_number || '').toLowerCase().trim() === target;
  const codeMatch = String(part.code || '').toLowerCase().trim() === target;
  const slugMatch = String(part.slug || '').toLowerCase().trim() === target;
  const nameMatch = String(part.name || '').toLowerCase().trim() === target;

  const matched = idMatch || partNoMatch || codeMatch || slugMatch || nameMatch;
  if (!matched) return false;
  if (brandSlug) {
    return isBrandMatch(part.brand, brandSlug);
  }
  return true;
}
