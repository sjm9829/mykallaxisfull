import { Album } from "@/types/album";
import * as htmlToImage from 'html-to-image';

export async function exportAlbumsAsImage(albums: Album[], filename: string = "collection-topster.png", gridSize: number = 5) {
  if (albums.length === 0) {
    alert("내보낼 앨범이 없습니다.");
    return;
  }

  const albumCovers = albums.map(album => album.coverImageUrl).filter((url): url is string => !!url);

  if (albumCovers.length === 0) {
    alert("앨범 커버 이미지가 없습니다.");
    return;
  }

  // Create a temporary div to render album covers
  const container = document.createElement("div");
  container.style.display = "grid";
  container.style.gridTemplateColumns = `repeat(${gridSize}, minmax(150px, 1fr))`; // Adjust column size as needed
  container.style.gap = "10px"; // Gap between album covers
  container.style.padding = "20px";
  container.style.backgroundColor = "#f0f0f0"; // Background color for the image
  container.style.width = "fit-content"; // Adjust width based on content
  container.style.height = "fit-content"; // Adjust height based on content

  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous"; // To avoid tainted canvas issues
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = `/api/image-proxy?url=${encodeURIComponent(url)}`;
    });
  };

  const imageLoadPromises = albumCovers.map(url => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }));

  const imageElements = await Promise.all(imageLoadPromises.map(p => p.catch(e => e)));

  for (const img of imageElements) {
    if (img instanceof HTMLImageElement) {
      img.style.width = "150px";
      img.style.height = "150px";
      img.style.objectFit = "cover";
      container.appendChild(img);
    } else {
      const placeholder = document.createElement("div");
      placeholder.style.width = "150px";
      placeholder.style.height = "150px";
      placeholder.style.backgroundColor = "#ccc";
      placeholder.style.display = "flex";
      placeholder.style.alignItems = "center";
      placeholder.style.justifyContent = "center";
      placeholder.style.color = "#666";
      placeholder.innerText = "Image load failed";
      container.appendChild(placeholder);
    }
  }

  document.body.appendChild(container);

  try {
    // html2canvas 대신 html-to-image 사용
    const dataUrl = await htmlToImage.toPng(container, {
      backgroundColor: undefined, // 컨테이너의 배경색 사용
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