import * as XLSX from 'xlsx';
import type { Album, AlbumType, Currency } from '@/types/album';
import { getPrimaryCoverImage } from '@/lib/album-images';

// Helper to convert boolean to string for export
const boolToString = (val: boolean | undefined) => val ? 'TRUE' : 'FALSE';

// 앨범 데이터를 엑셀 파일(Blob)로 변환
export const exportToExcel = (albums: Album[]): Blob => {
  const dataToExport = albums.map(album => ({
    '아티스트': album.artist,
    '타이틀': album.title,
    '유형': album.type,
    '형식': album.format || '',
    '제조국': album.country || '',
    '발매일': album.releaseDate || '',
    '스타일': album.style || '',
    '레이블': album.label || '',
    '카탈로그 넘버': album.catalogNo || '',
    '커버 이미지 URL': getPrimaryCoverImage(album) || '', // 메인 커버 이미지만 저장
    '설명': album.description || '',
    '즐겨찾기': boolToString(album.isFavorite), // Convert boolean to string
    '가격': album.priceAmount || '',
    '통화': album.priceCurrency || '',
    '구입처': album.purchaseStore || '',
    '구매일': album.purchaseDate || '',
    '생성일': album.createdAt,
    '수정일': album.updatedAt,
  }));

  const worksheet = XLSX.utils.json_to_sheet(dataToExport);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Albums');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

// 엑셀 파일(File)을 앨범 데이터로 변환
export const importFromExcel = (file: File): Promise<Partial<Album>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        if (!data) {
          reject(new Error("파일을 읽을 수 없습니다."));
          return;
        }
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        interface ExcelRow {
  '아티스트'?: string;
  '타이틀'?: string;
  '유형'?: string;
  '형식'?: string;
  '제조국'?: string;
  '발매일'?: string;
  '스타일'?: string;
  '레이블'?: string;
  '카탈로그 넘버'?: string;
  '커버 이미지 URL'?: string;
  '설명'?: string;
  '즐겨찾기'?: string;
  '가격'?: number;
  '통화'?: string;
  '구입처'?: string;
  '구매일'?: string;
  '생성일'?: string;
  '수정일'?: string;
}

// ...

        const json = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];

        // Helper to convert string to boolean for import
        const stringToBool = (val: string | undefined) => val?.toUpperCase() === 'TRUE';

        const albums: Partial<Album>[] = json.map(row => ({
          // id는 가져오기 시 새로 생성하므로 여기서는 파싱하지 않음
          createdAt: row['생성일'] ? String(row['생성일']) : undefined,
          updatedAt: row['수정일'] ? String(row['수정일']) : undefined,
          coverImageUrl: row['커버 이미지 URL'] ? String(row['커버 이미지 URL']) : undefined,
          artist: String(row['아티스트'] || ''),
          title: String(row['타이틀'] || ''),
          type: (row['유형'] || 'Other') as AlbumType, // Default to 'Other' if type is missing
          format: row['형식'] ? String(row['형식']) : undefined,
          country: row['제조국'] ? String(row['제조국']) : undefined,
          releaseDate: row['발매일'] ? String(row['발매일']) : undefined,
          style: row['스타일'] ? String(row['스타일']) : undefined,
          label: row['레이블'] ? String(row['레이블']) : undefined,
          catalogNo: row['카탈로그 넘버'] ? String(row['카탈로그 넘버']) : undefined,
          description: row['설명'] ? String(row['설명']) : undefined,
          isFavorite: stringToBool(row['즐겨찾기']), // Convert string to boolean
          priceAmount: row['가격'] ? Number(row['가격']) : undefined,
          priceCurrency: (row['통화'] || undefined) as Currency | undefined,
          purchaseStore: row['구입처'] ? String(row['구입처']) : undefined,
          purchaseDate: row['구매일'] ? String(row['구매일']) : undefined,
        }));

        resolve(albums);
      } catch (error) {
        console.error("Error parsing Excel data:", error);
        reject(new Error("엑셀 데이터를 파싱하는 중 오류가 발생했습니다. 파일 형식을 확인해주세요."));
      }
    };

    reader.onerror = (error) => {
      console.error("Error reading file with FileReader:", error);
      reject(new Error("파일을 읽는 중 오류가 발생했습니다."));
    };

    reader.readAsBinaryString(file);
  });
};
