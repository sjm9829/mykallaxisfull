export type AlbumType = 'Vinyl' | 'CD' | 'Tape' | 'Other';
export type Currency = 'KRW' | 'USD';

export interface Album {
  // 기본 정보
  id: string;
  createdAt: string;
  updatedAt: string;

  // 앨범 정보
  coverImageUrl?: string;
  artist: string;
  title: string;
  type: AlbumType;
  format?: string;
  country?: string;
  releaseDate?: string; // YYYY-MM-DD, YYYY, 미상 등 자유로운 입력
  style?: string;
  label?: string;
  catalogNo?: string;
  description?: string;
  isFavorite: boolean;

  // 구입 정보
  priceAmount?: number;
  priceCurrency?: Currency;
  purchaseStore?: string;
  purchaseDate?: string; // YYYY-MM-DD, YYYY, 미상 등 자유로운 입력
}