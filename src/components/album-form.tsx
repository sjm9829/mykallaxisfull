import * as React from "react";
import type { Album, AlbumType, Currency } from "@/types/album";
import { DiscogsSearchModal, type DiscogsSearchResult } from "./discogs-search-modal";

import { X } from "lucide-react";

interface DiscogsReleaseFormat {
  name: string;
  qty?: string;
  descriptions?: string[];
}

interface DiscogsReleaseData {
  formats?: DiscogsReleaseFormat[];
  artists?: { name: string }[];
  title?: string;
  country?: string;
  year?: number;
  styles?: string[];
  labels?: { name: string; catno: string }[];
  images?: { uri: string }[];
}

interface AlbumFormProps {
  onSubmit: (album: Omit<Album, "id" | "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
  initialData?: Album;
  discogsToken?: string | null; // discogsToken prop 추가
}

export function AlbumForm({ onSubmit, onCancel, initialData, discogsToken }: AlbumFormProps) {
  const [formData, setFormData] = React.useState({
    artist: initialData?.artist || "",
    title: initialData?.title || "",
    type: initialData?.type || "Vinyl",
    format: initialData?.format || "",
    country: initialData?.country || "",
    releaseDate: initialData?.releaseDate || "",
    style: initialData?.style || "",
    label: initialData?.label || "",
    catalogNo: initialData?.catalogNo || "",
    coverImageUrl: initialData?.coverImageUrl || "",
    description: initialData?.description || "",
    isFavorite: initialData?.isFavorite || false,
    priceAmount: initialData?.priceAmount || "",
    priceCurrency: initialData?.priceCurrency || "KRW",
    purchaseStore: initialData?.purchaseStore || "",
    purchaseDate: initialData?.purchaseDate || "",
  });

  const [error, setError] = React.useState("");
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchError, setSearchError] = React.useState<string | null>(null);
  const [searchResults, setSearchResults] = React.useState<DiscogsSearchResult[]>([]);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isFetchingReleaseDetails, setIsFetchingReleaseDetails] = React.useState(false);
  const [isRateLimited, setIsRateLimited] = React.useState(false);
  const [isThrottling, setIsThrottling] = React.useState(false);
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === "checkbox";
    setFormData(prev => ({ ...prev, [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value }));
  };

  const handleDiscogsSearch = async () => {
    if (isThrottling || isSearching || isRateLimited) return;

    if (!formData.artist && !formData.title) {
      setSearchError("아티스트 또는 타이틀 중 하나 이상을 입력해주세요.");
      setIsModalOpen(true);
      return;
    }

    setIsThrottling(true);
    searchTimeoutRef.current = setTimeout(() => {
      setIsThrottling(false);
    }, 2000); // 2 seconds throttle

    setIsSearching(true);
    setSearchError(null);
    setIsModalOpen(true);

    try {
      const queryParams = new URLSearchParams();
      queryParams.append('artist', formData.artist);
      queryParams.append('title', formData.title);
      const discogsFormat = {
        'Vinyl': 'Vinyl',
        'CD': 'CD',
        'Tape': 'Cassette',
        'Other': '',
      }[formData.type];

      if (discogsFormat) {
        queryParams.append('format', discogsFormat);
      }

      const headers: HeadersInit = {};
      if (discogsToken) {
        headers['X-Discogs-Personal-Access-Token'] = discogsToken;
      }

      const response = await fetch(`/api/discogs/search?${queryParams.toString()}`, { headers });
      if (!response.ok) {
        if (response.status === 429) {
          setSearchError("API 호출 제한에 도달했습니다. 잠시 후 다시 시도해주세요.");
          setIsRateLimited(true);
          setTimeout(() => setIsRateLimited(false), 30000);
        } else {
          const err = await response.json();
          setSearchError(err.error || 'Discogs 검색에 실패했습니다.');
        }
        throw new Error('API 호출 실패');
      }
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (e: unknown) {
      if (!isRateLimited) {
        if (e instanceof Error) {
          setSearchError(e.message);
        } else {
          setSearchError("알 수 없는 오류가 발생했습니다.");
        }
      }
    } finally {
      setIsSearching(false);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
      setIsThrottling(false); // Ensure throttling is reset
    }
  };

  const handleSelectResult = async (result: DiscogsSearchResult) => {
    setIsModalOpen(false);
    setIsFetchingReleaseDetails(true);
    try {
        const headers: HeadersInit = {};
        if (discogsToken) {
          headers['X-Discogs-Personal-Access-Token'] = discogsToken;
        }

        const response = await fetch(`/api/discogs/release/${result.id}`, { headers });
        if (!response.ok) {
          if (response.status === 429) {
            setError("API 호출 제한에 도달했습니다. 잠시 후 다시 시도해주세요.");
            setIsRateLimited(true);
            setTimeout(() => setIsRateLimited(false), 30000);
          } else {
            throw new Error('릴리즈 정보를 가져오는데 실패했습니다.');
          }
        }
        const releaseData = await response.json() as DiscogsReleaseData;

        const formatString = releaseData.formats?.map((f: DiscogsReleaseFormat) => {
            const desc = f.descriptions ? f.descriptions.join(', ') : '';
            return `${f.name}${desc ? ', ' + desc : ''}`;
        }).join('; ') || '';

        setFormData(prev => ({
            ...prev,
            artist: releaseData.artists?.[0]?.name || '',
            title: releaseData.title || '',
            format: formatString,
            country: releaseData.country || '',
            releaseDate: releaseData.year?.toString() || '',
            style: releaseData.styles?.join(', ') || '',
            label: releaseData.labels?.[0]?.name || '',
            catalogNo: releaseData.labels?.[0]?.catno || '',
            coverImageUrl: releaseData.images?.[0]?.uri || prev.coverImageUrl,
        }));

    } catch (e: unknown) {
        if (e instanceof Error) {
            setError("선택한 릴리즈의 상세 정보를 가져오는 중 오류가 발생했습니다: " + e.message);
        } else {
            setError("선택한 릴리즈의 상세 정보를 가져오는 중 알 수 없는 오류가 발생했습니다.");
        }
    } finally {
        setIsFetchingReleaseDetails(false);
    }
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.title.trim() || !formData.artist.trim()) {
      setError("앨범명과 아티스트는 필수입니다.");
      return;
    }
    onSubmit({
      ...formData,
      priceAmount: Number(formData.priceAmount) || undefined,
      priceCurrency: formData.priceCurrency as Currency,
      type: formData.type as AlbumType,
    });
  }

  return (
    <>
      {isModalOpen && (
        <DiscogsSearchModal
          results={searchResults}
          onSelect={handleSelectResult}
          onClose={() => setIsModalOpen(false)}
          isLoading={isSearching}
          error={searchError}
        />
      )}
      <form
        onSubmit={(e) => {
          console.log("Form onSubmit triggered!");
          e.preventDefault();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh]"
        aria-label={initialData ? "앨범 수정 폼" : "앨범 등록 폼"}
      >
        {isFetchingReleaseDetails && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-50 rounded-lg">
            <div className="text-white text-lg font-semibold flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              정보 가져오는 중...
            </div>
          </div>
        )}
        <div className="p-6 pb-0"> {/* Header section */} 
          <h2 className="text-2xl font-bold mb-6 text-center">{initialData ? "앨범 수정" : "앨범 등록"}</h2>
          {error && <div className="text-red-600 text-sm font-semibold border-l-4 border-red-500 pl-2 py-1 mb-4 bg-red-50 dark:bg-red-900/20">{error}</div>}
        </div>
        <button
          className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          onClick={onCancel}
          aria-label="닫기"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex-grow overflow-y-auto p-6 pt-0"> {/* Scrollable content section */} 
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 font-bold text-lg border-b pb-2 mb-2 flex justify-between items-center">
              <span>앨범 정보</span>
              <button
                type="button"
                onClick={handleDiscogsSearch}
                className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isFetchingReleaseDetails || isRateLimited} // Disable button while fetching details or rate-limited
              >
                {isFetchingReleaseDetails ? '정보 가져오는 중...' : isRateLimited ? 'API 제한됨 (잠시 후 재시도)' : 'Discogs 정보 가져오기'}
              </button>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1" htmlFor="artist">아티스트 *</label>
              <input id="artist" name="artist" value={formData.artist} onChange={handleChange} required className="w-full p-2 border rounded border-zinc-200 dark:border-zinc-800" placeholder="예: Jarreau" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1" htmlFor="title">타이틀 *</label>
              <input id="title" name="title" value={formData.title} onChange={handleChange} required className="w-full p-2 border rounded border-zinc-200 dark:border-zinc-800" placeholder="예: Jarreau" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="type">유형</label>
              <select id="type" name="type" value={formData.type} onChange={handleChange} className="w-full p-2 border rounded border-zinc-200 dark:border-zinc-800">
                <option value="Vinyl">Vinyl</option>
                <option value="CD">CD</option>
                <option value="Tape">Tape</option>
                <option value="Other">기타</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1" htmlFor="format">형식</label>
              <input id="format" name="format" value={formData.format} onChange={handleChange} className="w-full p-2 border rounded border-zinc-200 dark:border-zinc-800" placeholder="예: LP, Album" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="country">제조국</label>
              <input id="country" name="country" value={formData.country} onChange={handleChange} className="w-full p-2 border rounded border-zinc-200 dark:border-zinc-800" placeholder="예: US" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="releaseDate">발매일</label>
              <input id="releaseDate" name="releaseDate" value={formData.releaseDate} onChange={handleChange} className="w-full p-2 border rounded border-zinc-200 dark:border-zinc-800" placeholder="예: 1983-01-01, 1983, 미상" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1" htmlFor="style">스타일</label>
              <input id="style" name="style" value={formData.style} onChange={handleChange} className="w-full p-2 border rounded border-zinc-200 dark:border-zinc-800" placeholder="예: Soul-Jazz, Downtempo" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1" htmlFor="label">레이블</label>
              <input id="label" name="label" value={formData.label} onChange={handleChange} className="w-full p-2 border rounded border-zinc-200 dark:border-zinc-800" placeholder="예: Warner Bros. Records" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="catalogNo">카탈로그 넘버</label>
              <input id="catalogNo" name="catalogNo" value={formData.catalogNo} onChange={handleChange} className="w-full p-2 border rounded border-zinc-200 dark:border-zinc-800" placeholder="예: 1-23801" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1" htmlFor="coverImageUrl">앨범 커버 URL</label>
              <input id="coverImageUrl" name="coverImageUrl" type="url" value={formData.coverImageUrl} onChange={handleChange} className="w-full p-2 border rounded border-zinc-200 dark:border-zinc-800" placeholder="https://example.com/cover.jpg" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1" htmlFor="description">설명</label>
              <textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={2} className="w-full p-2 border rounded border-zinc-200 dark:border-zinc-800" />
            </div>

            <div className="md:col-span-2 font-bold text-lg border-b pb-2 mb-2 mt-4">구입 정보</div>
            <div className="flex items-end gap-2">
              <div className="flex-grow">
                <label className="block text-sm font-medium mb-1" htmlFor="priceAmount">가격</label>
                <input id="priceAmount" name="priceAmount" type="number" value={formData.priceAmount} onChange={handleChange} className="w-full p-2 border rounded border-zinc-200 dark:border-zinc-800" placeholder="예: 30000" />
              </div>
              <select name="priceCurrency" value={formData.priceCurrency} onChange={handleChange} className="p-2 border rounded border-zinc-200 dark:border-zinc-800">
                <option value="KRW">KRW</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="purchaseStore">구입처</label>
              <input id="purchaseStore" name="purchaseStore" value={formData.purchaseStore} onChange={handleChange} className="w-full p-2 border rounded border-zinc-200 dark:border-zinc-800" placeholder="예: 알라딘" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="purchaseDate">구매일</label>
              <input id="purchaseDate" name="purchaseDate" value={formData.purchaseDate} onChange={handleChange} className="w-full p-2 border rounded border-zinc-200 dark:border-zinc-800" placeholder="예: 2024-01-01, 2024, 미상" />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-6">
            <input type="checkbox" id="isFavorite" name="isFavorite" checked={formData.isFavorite} onChange={handleChange} />
            <label htmlFor="isFavorite" className="text-sm">즐겨찾기</label>
          </div>
        </div>

        <div className="p-6 flex gap-2 justify-end border-t border-zinc-200 dark:border-zinc-800"> {/* Footer section (buttons) */} 
          <button type="button" className="px-4 py-2 rounded bg-zinc-200 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-800" onClick={onCancel}>취소</button>
          <button type="button" className="px-4 py-2 rounded bg-blue-600 text-white"
            onClick={handleSubmit}>
            {initialData ? "수정 완료" : "등록"}
          </button>
        </div>
      </form>
    </>
  );
}