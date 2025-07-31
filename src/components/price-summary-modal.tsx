import * as React from 'react';
import { X, Calculator, TrendingUp, PieChart } from 'lucide-react';

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

// 환율 정보를 가져오는 함수
const fetchExchangeRates = async (): Promise<ExchangeRates | null> => {
  try {
    // ExchangeRate-API (무료, 제한 있음)를 사용
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/KRW');
    if (!response.ok) {
      throw new Error('환율 정보를 가져올 수 없습니다');
    }
    
    const data = await response.json();
    
    // KRW 기준이므로 역수를 계산하여 다른 통화를 KRW로 환산하는 비율을 구함
    return {
      USD: 1 / data.rates.USD, // 1 USD = X KRW
      JPY: 1 / data.rates.JPY, // 1 JPY = X KRW  
      EUR: 1 / data.rates.EUR, // 1 EUR = X KRW
    };
  } catch (error) {
    console.error('환율 정보 가져오기 실패:', error);
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
  const [exchangeRates, setExchangeRates] = React.useState<ExchangeRates | null>(null);

  // 환율 정보 로드
  React.useEffect(() => {
    const loadExchangeRates = async () => {
      const rates = await fetchExchangeRates();
      setExchangeRates(rates);
    };
    
    loadExchangeRates();
  }, []);

  // KRW로 환산한 총 지출 계산
  const totalSpentInKRW = React.useMemo(() => {
    if (!exchangeRates) return summary.totalSpent.KRW;
    
    return summary.totalSpent.KRW + 
           summary.totalSpent.USD * exchangeRates.USD +
           summary.totalSpent.JPY * exchangeRates.JPY +
           summary.totalSpent.EUR * exchangeRates.EUR;
  }, [summary, exchangeRates]);

  // 키보드 이벤트 처리
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
      
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
  }, [onClose]);

  // 모달 외부 클릭 처리
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      console.log("Modal overlay clicked!");
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
