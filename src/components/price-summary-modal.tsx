import * as React from 'react';
import { X, Calculator, TrendingUp, PieChart } from 'lucide-react';
import { modalManager } from '@/lib/modal-manager';

interface PriceSummary {
  totalAlbums: number;
  totalWithPrice: number;
  totalSpent: {
    KRW: number;
    USD: number;
    JPY: number;
    EUR: number;
  };
  averagePrice: {
    KRW: number;
    USD: number;
    JPY: number;
    EUR: number;
  };
  byCurrency: {
    KRW: { count: number; total: number };
    USD: { count: number; total: number };
    JPY: { count: number; total: number };
    EUR: { count: number; total: number };
  };
}

interface PriceSummaryModalProps {
  summary: PriceSummary;
  onClose: () => void;
}

interface ExchangeRates {
  USD: number;
  JPY: number;
  EUR: number;
}

// 환율 정보를 가져오는 함수 (네이버 환율 API 사용)
const fetchExchangeRates = async (): Promise<ExchangeRates> => {
  try {
    const currencies = ['USD', 'JPY', 'EUR'];
    const results = await Promise.allSettled(
      currencies.map(async (currency) => {
        const response = await fetch(
          `https://m.search.naver.com/p/csearch/content/qapirender.nhn?key=calculator&pkid=141&q=%ED%99%98%EC%9C%A8&where=m&u1=keb&u6=standardUnit&u7=0&u3=${currency}&u4=KRW&u8=down&u2=1`,
          {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
          }
        );
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${currency} 환율 정보를 가져올 수 없습니다`);
        }
        
        const data = await response.json();
        
        // 네이버 API 응답 검증
        if (!data.country || !Array.isArray(data.country) || data.country.length < 2) {
          throw new Error(`${currency}: 잘못된 환율 데이터 형식`);
        }
        
        // country[1].value가 KRW 환산 값
        const krwValue = parseFloat(data.country[1].value.replace(/,/g, ''));
        if (isNaN(krwValue) || krwValue <= 0) {
          throw new Error(`${currency}: 유효하지 않은 환율 값`);
        }
        
        return { currency, rate: krwValue };
      })
    );
    
    // 결과 처리
    const rates: ExchangeRates = {
      USD: 1300, // 기본값
      JPY: 9,
      EUR: 1400,
    };
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const { currency, rate } = result.value;
        rates[currency as keyof ExchangeRates] = rate;
      } else {
        console.warn(`${currencies[index]} 환율 가져오기 실패:`, result.reason);
      }
    });
    
    return rates;
  } catch (error) {
    console.warn('환율 정보 가져오기 실패, 고정 환율 사용:', error);
    // 환율 정보를 가져올 수 없는 경우 대략적인 고정 환율 사용
    return {
      USD: 1300, // 1 USD ≈ 1300 KRW
      JPY: 9,    // 1 JPY ≈ 9 KRW
      EUR: 1400, // 1 EUR ≈ 1400 KRW
    };
  }
};

const formatCurrency = (amount: number, currency: string) => {
  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: currency === 'KRW' || currency === 'JPY' ? 0 : 2,
  };

  try {
    return new Intl.NumberFormat('ko-KR', options).format(amount);
  } catch {
    // 통화 코드가 잘못된 경우 기본 형식으로 표시
    return `${amount.toLocaleString()} ${currency}`;
  }
};

export function PriceSummaryModal({ summary, onClose }: PriceSummaryModalProps) {
  const modalRef = React.useRef<HTMLDivElement>(null);
  const [exchangeRates, setExchangeRates] = React.useState<ExchangeRates>({
    USD: 1389, // 네이버에서 가져온 실제 환율 (2025-08-02 기준)
    JPY: 9.37,
    EUR: 1605.20,
  });
  
  const modalId = React.useMemo(() => `price-summary-${Date.now()}`, []);

  // modalManager 등록
  React.useEffect(() => {
    modalManager.pushModal(modalId, onClose);

    return () => {
      modalManager.popModal(modalId);
    };
  }, [modalId, onClose]);

  // 환율 정보 로드 (백그라운드에서 실행, 실패해도 기본값 사용)
  React.useEffect(() => {
    const loadExchangeRates = async () => {
      try {
        const rates = await fetchExchangeRates();
        setExchangeRates(rates);
      } catch (error) {
        console.warn('환율 정보 로딩 실패, 기본값 사용:', error);
        // 이미 기본값으로 초기화되어 있으므로 별도 처리 불필요
      }
    };
    
    loadExchangeRates();
  }, []);

  // KRW로 환산한 총 지출 계산
  const totalSpentInKRW = React.useMemo(() => {
    
    return summary.totalSpent.KRW + 
           summary.totalSpent.USD * exchangeRates.USD +
           summary.totalSpent.JPY * exchangeRates.JPY +
           summary.totalSpent.EUR * exchangeRates.EUR;
  }, [summary, exchangeRates]);

  // Tab 키 트랩핑만 처리 (ESC는 modalManager가 처리)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Tab 키 트랩핑
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 모달 외부 클릭 처리
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // 가격 정보가 있는 통화들만 필터링
  const activeCurrencies = Object.entries(summary.byCurrency).filter(([, data]) => data.count > 0);
  const hasAnyPrices = summary.totalWithPrice > 0;

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={handleOverlayClick}
    >
      <div 
        ref={modalRef}
        className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800 max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="price-summary-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-6 pb-0 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calculator className="h-6 w-6 text-blue-600" />
              <h2 id="price-summary-title" className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                구매 가격 요약
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
              aria-label="닫기"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {!hasAnyPrices ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <PieChart className="h-16 w-16 text-zinc-400 mb-4" />
              <h3 className="text-lg font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
                가격 정보가 없습니다
              </h3>
              <p className="text-zinc-500 dark:text-zinc-500">
                앨범 등록 시 구매 가격을 입력하면 여기서 요약을 확인할 수 있습니다.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 전체 요약 */}
              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">전체 요약</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">전체 앨범</p>
                    <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{summary.totalAlbums}장</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">가격 정보 있음</p>
                    <p className="text-xl font-bold text-green-600">
                      {summary.totalWithPrice}장 ({Math.round((summary.totalWithPrice / summary.totalAlbums) * 100)}%)
                    </p>
                  </div>
                </div>
              </div>

              {/* 통화별 요약 */}
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">통화별 구매 현황</h3>
                <div className="space-y-4">
                  {activeCurrencies.map(([currency, data]) => (
                    <div key={currency} className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-zinc-900 dark:text-zinc-100">{currency}</h4>
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">{data.count}장</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">총 지출</p>
                          <p className="text-lg font-bold text-red-600">
                            {formatCurrency(data.total, currency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">평균 가격</p>
                          <p className="text-lg font-bold text-blue-600">
                            {formatCurrency(summary.averagePrice[currency as keyof typeof summary.averagePrice], currency)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 총합 (환율 적용 KRW) */}
              {summary.totalWithPrice > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex flex-col items-center justify-center text-center">
                  <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    총 지출 금액
                  </h3>
                  <p className="text-3xl font-bold text-blue-600">
                    {formatCurrency(totalSpentInKRW, 'KRW')}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-0 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-md bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-600 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors font-medium"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
