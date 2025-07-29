import { Workbook } from 'exceljs';
import type { Album, AlbumType, Currency } from '@/types/album';
import { getPrimaryCoverImage } from '@/lib/album-images';

// Helper to convert boolean to string for export
const boolToString = (val: boolean | undefined) => val ? 'TRUE' : 'FALSE';

// 앨범 데이터를 엑셀 파일(Blob)로 변환
export const exportToExcel = async (albums: Album[]): Promise<Blob> => {
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet('Albums');

  // 헤더 설정
  worksheet.columns = [
    { header: '아티스트', key: 'artist', width: 20 },
    { header: '타이틀', key: 'title', width: 30 },
    { header: '유형', key: 'type', width: 15 },
    { header: '형식', key: 'format', width: 15 },
    { header: '제조국', key: 'country', width: 15 },
    { header: '발매일', key: 'releaseDate', width: 15 },
    { header: '스타일', key: 'style', width: 20 },
    { header: '레이블', key: 'label', width: 20 },
    { header: '카탈로그 넘버', key: 'catalogNo', width: 20 },
    { header: '커버 이미지 URL', key: 'coverImageUrl', width: 50 },
    { header: '설명', key: 'description', width: 30 },
    { header: '즐겨찾기', key: 'isFavorite', width: 15 },
    { header: '가격', key: 'priceAmount', width: 15 },
    { header: '통화', key: 'priceCurrency', width: 10 },
    { header: '구입처', key: 'purchaseStore', width: 20 },
    { header: '구매일', key: 'purchaseDate', width: 15 },
    { header: '생성일', key: 'createdAt', width: 20 },
    { header: '수정일', key: 'updatedAt', width: 20 },
  ];

  // 데이터 추가
  albums.forEach(album => {
    worksheet.addRow({
      artist: album.artist,
      title: album.title,
      type: album.type,
      format: album.format || '',
      country: album.country || '',
      releaseDate: album.releaseDate || '',
      style: album.style || '',
      label: album.label || '',
      catalogNo: album.catalogNo || '',
      coverImageUrl: getPrimaryCoverImage(album) || '',
      description: album.description || '',
      isFavorite: boolToString(album.isFavorite),
      priceAmount: album.priceAmount || '',
      priceCurrency: album.priceCurrency || '',
      purchaseStore: album.purchaseStore || '',
      purchaseDate: album.purchaseDate || '',
      createdAt: album.createdAt,
      updatedAt: album.updatedAt,
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

// 엑셀 파일(File)을 앨범 데이터로 변환
export const importFromExcel = async (file: File): Promise<Partial<Album>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        if (!buffer) {
          reject(new Error("파일을 읽을 수 없습니다."));
          return;
        }

        const workbook = new Workbook();
        await workbook.xlsx.load(buffer);
        
        const worksheet = workbook.getWorksheet(1); // 첫 번째 워크시트 가져오기
        if (!worksheet) {
          reject(new Error("워크시트를 찾을 수 없습니다."));
          return;
        }

        const albums: Partial<Album>[] = [];
        
        // Helper to convert string to boolean for import
        const stringToBool = (val: string | undefined) => val?.toUpperCase() === 'TRUE';

        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // 헤더 행 건너뛰기
          
          const rowData = row.values as (string | number | undefined)[];
          if (!rowData || rowData.length < 2) return; // 빈 행 건너뛰기

          // 고유한 ID와 타임스탬프 생성
          const now = new Date();
          const uniqueId = `${now.getTime()}_${rowNumber}_${Math.random().toString(36).substr(2, 9)}`;
          const uniqueTimestamp = new Date(now.getTime() + (rowNumber - 2)).toISOString(); // 각 행마다 1ms씩 차이

          const album: Partial<Album> = {
            id: uniqueId,
            artist: String(rowData[1] || ''),
            title: String(rowData[2] || ''),
            type: (rowData[3] || 'Other') as AlbumType,
            format: rowData[4] ? String(rowData[4]) : undefined,
            country: rowData[5] ? String(rowData[5]) : undefined,
            releaseDate: rowData[6] ? String(rowData[6]) : undefined,
            style: rowData[7] ? String(rowData[7]) : undefined,
            label: rowData[8] ? String(rowData[8]) : undefined,
            catalogNo: rowData[9] ? String(rowData[9]) : undefined,
            coverImageUrl: rowData[10] ? String(rowData[10]) : undefined,
            description: rowData[11] ? String(rowData[11]) : undefined,
            isFavorite: stringToBool(String(rowData[12] || '')),
            priceAmount: rowData[13] ? Number(rowData[13]) : undefined,
            priceCurrency: (rowData[14] || undefined) as Currency | undefined,
            purchaseStore: rowData[15] ? String(rowData[15]) : undefined,
            purchaseDate: rowData[16] ? String(rowData[16]) : undefined,
            createdAt: rowData[17] ? String(rowData[17]) : uniqueTimestamp,
            updatedAt: rowData[18] ? String(rowData[18]) : uniqueTimestamp,
          };

          albums.push(album);
        });

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

    reader.readAsArrayBuffer(file);
  });
};
