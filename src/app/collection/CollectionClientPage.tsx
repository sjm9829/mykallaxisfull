"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AlbumGrid } from "@/components/album-grid";
import { AlbumForm } from "@/components/album-form";
import { AlbumDetailModal } from "@/components/album-detail-modal";
import { ConfirmationModal } from "@/components/confirmation-modal";
import type { Album, AlbumType } from "@/types/album";
import { saveFile, verifyPermission } from '@/lib/file-system';
import { getCollectionMetadata, setCollectionMetadata, getFileHandleFromUser, getActiveFileHandle } from '@/lib/db';
import { useRouter, useSearchParams } from 'next/navigation';
import { exportToExcel, importFromExcel } from '@/services/excel';
import { Plus, Settings, Search, ArrowUp, ArrowDown, Share2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useModalAccessibility } from "@/lib/useModalAccessibility";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DiscogsTokenSettings } from "@/components/discogs-token-settings";
import { encryptData, decryptData } from '@/lib/crypto';
import { exportAlbumsAsImage } from '@/lib/image-export';
import { ShareCollectionModal } from '@/components/share-collection-modal';

export default function CollectionClientPage() {
    const [albums, setAlbums] = useState<Album[]>([]);
    const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
    const [fileName, setFileName] = useState('');
    const [username, setUsername] = useState('');
    const [discogsToken, setDiscogsToken] = useState<string | null>(null); // Discogs 토큰 상태
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Album | null>(null);
    const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
    const [hasPermission, setHasPermission] = useState(false);
    const [showImportConfirm, setShowImportConfirm] = useState(false);
    const [importedAlbums, setImportedAlbums] = useState<Partial<Album>[] | null>(null);
    const [showDiscogsTokenSettings, setShowDiscogsTokenSettings] = useState(false); // Discogs 토큰 설정 모달 상태
    const [showShareModal, setShowShareModal] = useState(false); // 공유 모달 상태

    // 필터, 정렬, 검색 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<AlbumType | 'all'>('all');
  const [sortKey, setSortKey] = useState<keyof Album | '' >('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    const router = useRouter();
    const searchParams = useSearchParams();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const formModalRef = useModalAccessibility(() => { setShowForm(false); setEditingAlbum(null); });
    const discogsSettingsModalRef = useModalAccessibility(() => { setShowDiscogsTokenSettings(false); });

    const loadFileContent = useCallback(async (handle: FileSystemFileHandle, expectedUsername: string, expectedCollectionName: string) => {
        console.log("Loading collection:", expectedUsername, expectedCollectionName);

        if (!expectedUsername || !expectedCollectionName) {
                setIsLoading(false); // Added to ensure loading state is cleared
                router.push('/');
                return;
            }

        setUsername(expectedUsername);
        setFileName(`${expectedCollectionName}.json`);

        // Verify that the selected file matches the requested collection
        const permission = await verifyPermission(handle, true);
        console.log("Permission granted:", permission);
        setHasPermission(permission);

        if (!permission) {
            toast.error("파일 읽기/쓰기 권한이 거부되었습니다. 다시 파일을 선택해주세요.");
            setIsLoading(false);
            router.push('/');
            return;
        }

        const file = await handle.getFile();
        const text = await file.text();
        console.log("Attempting to get file content from handle:", handle);
        let parsedContent;
        try {
            parsedContent = JSON.parse(text);
            console.log("Parsed file content:", parsedContent);
        } catch (e) {
            console.error("Error parsing file:", e);
            toast.error("선택된 파일이 유효한 JSON 형식이 아닙니다.");
            router.push('/');
            return;
        }

        const fileUsername = parsedContent._metadata?.username || '';
        const fileCollectionName = parsedContent._metadata?.collectionName || handle.name.replace('.json', '');

        if (fileUsername !== expectedUsername || fileCollectionName !== expectedCollectionName) {
            toast.error("선택된 파일이 요청된 컬렉션과 일치하지 않습니다.");
            setIsLoading(false); // Added to ensure loading state is cleared
            router.push('/');
            return;
        }

        try {
            const albumsToSet = parsedContent.albums && Array.isArray(parsedContent.albums) ? parsedContent.albums : [];
            console.log("Albums to set:", albumsToSet);
                setAlbums(albumsToSet);

                // Update albumCount in IndexedDB if it's different
                const metadata = await getCollectionMetadata(expectedUsername, expectedCollectionName);
                if (metadata && albumsToSet.length !== metadata.albumCount) {
                    await setCollectionMetadata(expectedUsername, expectedCollectionName, albumsToSet.length);
                }

                if (parsedContent._metadata?.encryptedDiscogsToken) {
                    try {
                        const decrypted = await decryptData(
                            parsedContent._metadata.encryptedDiscogsToken.encryptedData,
                            parsedContent._metadata.encryptedDiscogsToken.iv,
                            parsedContent._metadata.encryptedDiscogsToken.salt
                        );
                        setDiscogsToken(decrypted);
                    } catch (decryptError) {
                        console.error("Error decrypting Discogs token:", decryptError);
                        toast.error("Discogs 토큰 복호화에 실패했습니다.");
                    }
                }
            } catch (e) {
                console.error("Error reading file or setting albums:", e);
                setAlbums([]);
                toast.error("컬렉션 파일을 읽는 중 오류가 발생했습니다.");
                setIsLoading(false); // Added to ensure loading state is cleared
                router.push('/');
            } finally {
                setIsLoading(false);
            }
        
    }, [router]);

    useEffect(() => {
        const currentUsername = searchParams.get('username');
        const currentCollectionName = searchParams.get('collectionName');

        const initializeCollection = async () => {
            if (currentUsername && currentCollectionName) {
                const activeHandle = await getActiveFileHandle();
                if (activeHandle) {
                    setFileHandle(activeHandle);
                    await loadFileContent(activeHandle, currentUsername, currentCollectionName);
                } else {
                    setIsLoading(false); // No active handle, show file selection
                }
            } else {
                setIsLoading(false); // Missing URL params, show file selection
            }
        };

        initializeCollection();
    }, [searchParams, loadFileContent]);

    

    const saveAlbumsToFile = useCallback(async (updatedAlbums: Album[]) => {
        if (!fileHandle) return;

        let permissionGranted = hasPermission;
        if (!permissionGranted) {
            permissionGranted = await verifyPermission(fileHandle, true);
            setHasPermission(permissionGranted);
        }

        if (permissionGranted) {
            try {
                const contentToSave: { _metadata: { username: string; collectionName: string; encryptedDiscogsToken?: { encryptedData: string; iv: string; salt: string; } }, albums: Album[] } = {
                    _metadata: { username: username, collectionName: fileName.replace(".json", "") },
                    albums: updatedAlbums,
                };
                if (discogsToken) {
                    const encryptedToken = await encryptData(discogsToken);
                    contentToSave._metadata.encryptedDiscogsToken = encryptedToken;
                }
                await saveFile(fileHandle, JSON.stringify(contentToSave, null, 2));
                await setCollectionMetadata(username, fileName.replace(".json", ""), updatedAlbums.length);
                toast.success("컬렉션이 파일에 저장되었습니다.");
            } catch (error) {
                console.error("Failed to save file:", error);
                toast.error("파일 저장에 실패했습니다.");
            }
        } else {
            console.error("Permission to write file was denied.");
            toast.error("파일 쓰기 권한이 거부되었습니다.");
        }
    }, [fileHandle, hasPermission, username, discogsToken, fileName]);

    useEffect(() => {
        document.title = `My KALLAX is Full`;
    }, [username, fileName]);

    // Save Discogs token to file when it changes
    useEffect(() => {
        if (fileHandle && discogsToken !== undefined) { // Only save if fileHandle exists and discogsToken has been loaded/set
            saveAlbumsToFile(albums); // Pass current albums to save
        }
    }, [discogsToken, fileHandle, albums, saveAlbumsToFile]);

    const handleAddAlbum = (data: Omit<Album, "id" | "createdAt" | "updatedAt">) => {
        const now = new Date().toISOString();
        const newAlbum: Album = {
            ...data,
            id: (Math.random() + Date.now()).toString(),
            createdAt: now,
            updatedAt: now,
        };
        const updatedAlbums = [newAlbum, ...albums];
        setAlbums(updatedAlbums);
        saveAlbumsToFile(updatedAlbums);
        setShowForm(false);
        toast.success("앨범이 추가되었습니다.");
    };

    const handleUpdateAlbum = (updatedData: Omit<Album, "id" | "createdAt" | "updatedAt">) => {
        if (editingAlbum) {
            const updatedAlbums = albums.map(album =>
                album.id === editingAlbum.id
                    ? { ...album, ...updatedData, updatedAt: new Date().toISOString() }
                    : album
            );
            setAlbums(updatedAlbums);
            saveAlbumsToFile(updatedAlbums);
            setEditingAlbum(null);
            toast.success("앨범이 수정되었습니다.");
        }
    };

    const confirmDelete = () => {
        if (deleteTarget) {
            const updatedAlbums = albums.filter(a => a.id !== deleteTarget.id);
            setAlbums(updatedAlbums);
            saveAlbumsToFile(updatedAlbums);
            if (selectedAlbum?.id === deleteTarget.id) setSelectedAlbum(null);
            setDeleteTarget(null);
            toast.success("앨범이 삭제되었습니다.");
        }
    };

    const handleEditAlbum = (album: Album) => {
        setEditingAlbum(album);
        setSelectedAlbum(null);
    };

    const handleDeleteAlbum = (album: Album) => {
        setDeleteTarget(album);
    };

    const cancelDelete = () => {
        setDeleteTarget(null);
    };

    const handleExportExcel = useCallback(() => {
        try {
            const blob = exportToExcel(albums);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${fileName.replace('.json', '') || 'collection'}-backup.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast.success("엑셀 파일로 내보내기 성공!");
        } catch (error) {
            console.error("Error exporting to Excel:", error);
            toast.error("엑셀 파일 내보내기 실패.");
        }
    }, [albums, fileName]);

    const handleImportExcel = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        toast.info("handleImportExcel 함수 호출됨.");
        const file = event.target.files?.[0];
        if (file) {
            toast.info(`파일 감지됨: ${file.name}`);
            toast.info("엑셀 파일 가져오는 중...");
            importFromExcel(file)
                .then(data => {
                    setImportedAlbums(data);
                    setShowImportConfirm(true);
                })
                .catch(error => {
                    console.error("Error importing from Excel:", error);
                    toast.error("엑셀 파일 가져오기 실패.");
                })
                .finally(() => {
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                });
        } else {
            toast.error("선택된 파일이 없습니다.");
        }
    }, []);

    const confirmImport = useCallback(() => {
        if (importedAlbums) {
            const newAlbums: Album[] = importedAlbums.map(importedAlbum => ({
                id: (Math.random() + Date.now()).toString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                coverImageUrl: importedAlbum.coverImageUrl,
                artist: importedAlbum.artist || '',
                title: importedAlbum.title || '',
                type: importedAlbum.type || 'Other',
                format: importedAlbum.format,
                country: importedAlbum.country,
                releaseDate: importedAlbum.releaseDate,
                style: importedAlbum.style,
                label: importedAlbum.label,
                catalogNo: importedAlbum.catalogNo,
                description: importedAlbum.description,
                isFavorite: importedAlbum.isFavorite || false,
                priceAmount: importedAlbum.priceAmount,
                priceCurrency: importedAlbum.priceCurrency,
                purchaseStore: importedAlbum.purchaseStore,
                purchaseDate: importedAlbum.purchaseDate,
            }));

            setAlbums(newAlbums);
            saveAlbumsToFile(newAlbums);
            setShowImportConfirm(false);
            setImportedAlbums(null);
            toast.success("엑셀 파일에서 컬렉션을 성공적으로 가져왔습니다!");
        }
    }, [importedAlbums, saveAlbumsToFile]);

    const cancelImport = useCallback(() => {
        setShowImportConfirm(false);
        setImportedAlbums(null);
    }, []);

    

    const handleAlbumClick = (album: Album) => {
        setSelectedAlbum(album);
    };

    const handleDeleteClick = (album: Album) => {
        handleDeleteAlbum(album);
    };

    // 필터링 및 정렬 로직
    const filteredAndSortedAlbums = useMemo(() => {
        let filtered = albums;

        // 검색 필터
        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(album =>
                album.title.toLowerCase().includes(lowerCaseSearchTerm) ||
                album.artist.toLowerCase().includes(lowerCaseSearchTerm) ||
                album.label?.toLowerCase().includes(lowerCaseSearchTerm)
            );
        }

        // 타입 필터
        if (filterType !== 'all') {
            filtered = filtered.filter(album => album.type === filterType);
        }

        // 정렬
        if (sortKey) {
            filtered.sort((a, b) => {
                const aValue = a[sortKey];
                const bValue = b[sortKey];

                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
                }
                if (typeof aValue === 'number' && typeof bValue === 'number') {
                    return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
                }
                // 날짜 문자열 정렬
                if (sortKey === 'createdAt' || sortKey === 'updatedAt' || sortKey === 'releaseDate' || sortKey === 'purchaseDate') {
                    const parseDateValue = (val: unknown) => {
                        if (!val || val === '미상' || (typeof val === 'object' && Object.keys(val).length === 0)) {
                            return sortOrder === 'asc' ? Infinity : -Infinity; // '미상' 또는 빈 값을 정렬 순서에 따라 끝으로 보냄
                        }
                        // Ensure val is a string, number, or Date before passing to Date constructor
                        if (typeof val === 'string' || typeof val === 'number' || val instanceof Date) {
                            const date = new Date(val);
                            return isNaN(date.getTime()) ? (sortOrder === 'asc' ? Infinity : -Infinity) : date.getTime();
                        }
                        // If it's an unexpected type, treat it as an invalid date
                        return sortOrder === 'asc' ? Infinity : -Infinity;
                    };

                    const dateA = parseDateValue(aValue);
                    const dateB = parseDateValue(bValue);

                    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
                }
                return 0;
            });
        }

        return filtered;
    }, [albums, searchTerm, filterType, sortKey, sortOrder]);

    const handleShareCollection = useCallback(() => {
        setShowShareModal(true);
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen text-zinc-500 dark:text-zinc-400">
                <svg className="animate-spin -ml-1 mr-3 h-10 w-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>컬렉션 파일을 불러오는 중입니다...</span>
            </div>
        );
    }

    if (!fileHandle) {
        return (
            <div className="flex flex-col items-center justify-center h-screen text-zinc-500 dark:text-zinc-400">
                <p className="text-lg mb-4">컬렉션 파일을 선택해주세요.</p>
                <Button
                    onClick={async () => {
                        const handle = await getFileHandleFromUser();
                        if (handle) {
                            setFileHandle(handle);
                            // loadFileContent will be called by useEffect due to fileHandle change
                        }
                    }}
                >
                    파일 선택
                </Button>
            </div>
        );
    }

    return (
        <>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportExcel}
                accept=".xlsx, .xls"
                style={{ display: 'none' }}
            />
            <main className="flex min-h-screen flex-col items-center p-8 sm:p-16">
                <div className="w-full max-w-6xl mt-8">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex flex-col">
                            <h1 className="text-2xl font-bold">{fileName.replace(".json", "")}</h1>
                            <p className="text-lg font-normal text-zinc-500 dark:text-zinc-400 -mt-1">@{username}</p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="default"
                                size="icon"
                                onClick={handleShareCollection}
                                className="h-9 w-9 rounded-full bg-blue-600 text-white hover:bg-blue-700"
                            >
                                <Share2 className="h-5 w-5" />
                                <span className="sr-only">컬렉션 공유</span>
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="default"
                                        size="icon"
                                        className="h-9 w-9 rounded-full bg-zinc-700 text-white hover:bg-zinc-800"
                                    >
                                        <Settings className="h-5 w-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-white dark:bg-zinc-800 shadow-lg rounded-md border border-zinc-200 dark:border-zinc-800">
                                    <DropdownMenuItem onClick={() => {
                                        fileInputRef.current?.click();
                                    }}>
                                        엑셀 가져오기
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleExportExcel}>
                                        엑셀 내보내기
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setShowDiscogsTokenSettings(true)}>
                                        Discogs 토큰 설정
                                    </DropdownMenuItem>
                                    
                                <DropdownMenuItem onClick={() => router.push('/')}>
                                        나가기
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* 검색, 필터, 정렬 UI */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <Select value={filterType} onValueChange={(value: AlbumType | 'all') => setFilterType(value)}>
                            <SelectTrigger className="w-[180px] border border-zinc-200 dark:border-zinc-800">
                                <SelectValue placeholder="모든 유형" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-zinc-800 shadow-lg rounded-md border border-zinc-200 dark:border-zinc-800">
                                <SelectItem value="all">모든 유형</SelectItem>
                                <SelectItem value="Vinyl">Vinyl</SelectItem>
                                <SelectItem value="CD">CD</SelectItem>
                                <SelectItem value="Tape">Tape</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={sortKey} onValueChange={(value: keyof Album | '') => setSortKey(value)}>
                            <SelectTrigger className="w-[180px] border border-zinc-200 dark:border-zinc-800">
                                <SelectValue placeholder="정렬 기준" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-zinc-800 shadow-lg rounded-md border border-zinc-200 dark:border-zinc-800">
                                <SelectItem value="title">제목</SelectItem>
                                <SelectItem value="artist">아티스트</SelectItem>
                                <SelectItem value="releaseDate">발매일</SelectItem>
                                <SelectItem value="createdAt">생성일</SelectItem>
                                <SelectItem value="updatedAt">수정일</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                            className="h-[36px] w-[36px] flex-shrink-0 border border-zinc-200 dark:border-zinc-800"
                        >
                            {sortOrder === 'asc' ? <ArrowUp className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />}
                            <span className="sr-only">정렬 순서 변경</span>
                        </Button>

                        <div className="relative ml-auto">
                            <Input
                                type="text"
                                placeholder="앨범 검색 (제목, 아티스트, 레이블)"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 w-[300px] border border-zinc-200 dark:border-zinc-800"
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                        </div>
                    </div>

                    {filteredAndSortedAlbums.length > 0 ? (
                        <AlbumGrid
            albums={filteredAndSortedAlbums}
            onAlbumClick={handleAlbumClick}
            onEditAlbum={handleEditAlbum}
            onDeleteAlbum={handleDeleteClick}
          />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-zinc-500 dark:text-zinc-400">
                            <p className="text-lg mb-4">검색 결과가 없습니다.</p>
                        </div>
                    )}
                </div>

                { (showForm || editingAlbum) && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fadein"
                        onClick={() => console.log("Modal overlay clicked!")}>
                        <div
                      ref={formModalRef}
                      role="dialog"
                      aria-modal="true"
                      aria-label={editingAlbum ? "앨범 수정 폼" : "앨범 등록 폼"}
                      onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                              e.stopPropagation(); // 엔터 키 이벤트 전파 중단
                          }
                      }}
                  >
                            <AlbumForm
                                onSubmit={editingAlbum ? handleUpdateAlbum : handleAddAlbum}
                                onCancel={() => { setShowForm(false); setEditingAlbum(null); }}
                                initialData={editingAlbum || undefined}
                                discogsToken={discogsToken} // discogsToken prop 전달
                            />
                        </div>
                    </div>
                )}

                {selectedAlbum && (
                    <AlbumDetailModal
                        album={selectedAlbum}
                        onClose={() => setSelectedAlbum(null)}
                        onEdit={handleEditAlbum}
                        onDelete={handleDeleteAlbum}
                    />
                )}

                {deleteTarget && (
                    <ConfirmationModal
                        message={`'${deleteTarget.title}' 앨범을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
                        onConfirm={confirmDelete}
                        onCancel={cancelDelete}
                    />
                )}

                {showImportConfirm && importedAlbums && (
                    <ConfirmationModal
                        message="엑셀 파일의 데이터로 현재 컬렉션을 덮어쓰시겠습니까? 기존 데이터는 사라질 수 있습니다."
                        onConfirm={confirmImport}
                        onCancel={cancelImport}
                    />
                )}

                {showDiscogsTokenSettings && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fadein">
                        <div
                            ref={discogsSettingsModalRef}
                            role="dialog"
                            aria-modal="true"
                            aria-label="Discogs 토큰 설정"
                            className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800 p-6"
                        >
                            <DiscogsTokenSettings
                                onClose={() => setShowDiscogsTokenSettings(false)}
                                discogsToken={discogsToken}
                                setDiscogsToken={setDiscogsToken}
                            />
                        </div>
                    </div>
                )}

                {showShareModal && (
                    <ShareCollectionModal
                        albums={albums}
                        onClose={() => setShowShareModal(false)}
                        fileName={fileName}
                    />
                )}

                
            </main>

            <Button
                variant="default"
                size="icon"
                onClick={() => setShowForm(true)}
                className="fixed bottom-4 right-4 h-14 w-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 z-50"
            >
                <Plus className="h-7 w-7" />
                <span className="sr-only">앨범 추가</span>
            </Button>
        </>
    );
}