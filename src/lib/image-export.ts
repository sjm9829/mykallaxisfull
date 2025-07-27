import { Album } from "@/types/album";
import { getPrimaryCoverImage } from "./album-images";
import * as htmlToImage from 'html-to-image';

export async function exportAlbumsAsImage(albums: Album[], filename: string = "collection-topster.png", gridColumns: number = 5) {
  if (albums.length === 0) {
    alert("내보낼 앨범이 없습니다.");
    return;
  }

  const albumCovers = albums.map(album => getPrimaryCoverImage(album)).filter((url): url is string => !!url);

  if (albumCovers.length === 0) {
    alert("앨범 커버 이미지가 없습니다.");
    return;
  }

  // 고정 설정값
  const FIXED_WIDTH = 900; // 고정 용지 너비
  const MIN_COLUMNS = 3;   // 최소 열 수
  const MAX_COLUMNS = 6;   // 최대 열 수
  const GAP = 4;           // 앨범 간 간격
  const PADDING = 10;      // 용지 여백

  // 열 수 검증 및 조정
  const columns = Math.max(MIN_COLUMNS, Math.min(MAX_COLUMNS, gridColumns));
  
  // ⚡️ 중복 방지: 실제 앨범 수만큼만 사용 (무한 반복 방지)
  const limitedAlbumCovers = albumCovers.slice(0, albums.length);
  
  // 개별 앨범 커버 크기 계산 (정사각형)
  const availableWidth = FIXED_WIDTH - (PADDING * 2) - (GAP * (columns - 1));
  const coverSize = Math.floor(availableWidth / columns);
  
  // 실제 사용할 앨범 수 계산 (행 수는 앨범 수에 따라 자동 결정)
  const rows = Math.ceil(limitedAlbumCovers.length / columns);
  const actualHeight = (coverSize * rows) + (GAP * (rows - 1)) + (PADDING * 2);

  // 컨테이너 생성
  const container = document.createElement("div");
  container.style.display = "grid";
  container.style.gridTemplateColumns = `repeat(${columns}, ${coverSize}px)`;
  container.style.gap = `${GAP}px`;
  container.style.padding = `${PADDING}px`;
  container.style.backgroundColor = "#ffffff"; // 흰색 배경
  container.style.width = `${FIXED_WIDTH}px`;
  container.style.height = `${actualHeight}px`;
  container.style.boxSizing = "border-box";

  // 이미지 로드 프로미스 생성
  const imageLoadPromises = limitedAlbumCovers.map((url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }));

  const imageElements = await Promise.all(imageLoadPromises.map(p => p.catch((e: Error) => e)));

  // 이미지 요소를 컨테이너에 추가
  for (const img of imageElements) {
    if (img instanceof HTMLImageElement) {
      img.style.width = `${coverSize}px`;
      img.style.height = `${coverSize}px`;
      img.style.objectFit = "cover";
      img.style.borderRadius = "4px"; // 살짝 둥근 모서리
      container.appendChild(img);
    } else {
      // 이미지 로드 실패 시 플레이스홀더
      const placeholder = document.createElement("div");
      placeholder.style.width = `${coverSize}px`;
      placeholder.style.height = `${coverSize}px`;
      placeholder.style.backgroundColor = "#e5e5e5";
      placeholder.style.border = "2px dashed #ccc";
      placeholder.style.display = "flex";
      placeholder.style.alignItems = "center";
      placeholder.style.justifyContent = "center";
      placeholder.style.color = "#999";
      placeholder.style.fontSize = `${Math.max(12, coverSize / 12)}px`;
      placeholder.style.borderRadius = "4px";
      placeholder.innerText = "이미지 로드 실패";
      container.appendChild(placeholder);
    }
  }

  document.body.appendChild(container);

  try {
    // 고정 해상도로 이미지 생성 (900px 기준)
    const dataUrl = await htmlToImage.toPng(container, {
      backgroundColor: "#ffffff",
      width: FIXED_WIDTH,
      height: actualHeight,
      pixelRatio: 1, // 기본 해상도
    });

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Error generating image:", error);
    alert("이미지 생성에 실패했습니다.");
  } finally {
    document.body.removeChild(container);
  }
}