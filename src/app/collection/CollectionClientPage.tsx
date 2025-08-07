"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { VirtualizedAlbumGrid } from "@/components/virtualized-album-grid";
import { AlbumForm } from "@/components/album-form";
import { AlbumDetailModal } from "@/components/album-detail-modal";
import { ConfirmationModal } from "@/components/confirmation-modal";
import type { Album, AlbumType } from "@/types/album";
import { saveFile, verifyPermission } from '@/lib/file-system';
import { getActiveCloudFile, saveToCloudFile, isUsingCloudStorage, getStorageTypeDisplay, setActiveCloudFile, getCloudConnectionStatus } from '@/lib/cloud-storage';
import { getCollectionMetadata, setCollectionMetadata, getFileHandleFromUser, getActiveFileHandle } from '@/lib/db';
import { useRouter, useSearchParams } from 'next/navigation';
import { useGlobalLoading } from '@/contexts/LoadingContext';

import { Plus, Settings, Search, ArrowUp, ArrowDown, Share2, Cloud, FileSpreadsheet, LogOut, User } from 'lucide-react';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DiscogsTokenSettings } from "@/components/discogs-token-settings";
import { encryptData, decryptData } from '@/lib/crypto';

import { ShareCollectionModal } from '@/components/share-collection-modal';
import { CollectionSettingsModal } from '@/components/collection-settings-modal';
import { LoadFromGistModal } from '@/components/load-from-gist-modal';
import { CloudSyncModal } from '@/components/cloud-sync-modal';
import { ExcelSyncModal } from '@/components/excel-sync-modal';
import { HelpModal } from '@/components/help-modal';
import { EmptyStateGuidance } from '@/components/empty-state-guidance';
import { PriceSummaryModal } from '@/components/price-summary-modal';

import type { CollectionData } from '@/services/gist';

export default function CollectionClientPage() {
    const [albums, setAlbums] = useState<Album[]>([]);
    const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
    const [fileName, setFileName] = useState('');
    const [username, setUsername] = useState('');
    const [discogsToken, setDiscogsToken] = useState<string | null>(null); // Discogs 토큰 상태
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
    
    const { setGlobalLoading } = useGlobalLoading();
    const [deleteTarget, setDeleteTarget] = useState<Album | null>(null);
    const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
    const [hasPermission, setHasPermission] = useState(false);
    const [showDiscogsTokenSettings, setShowDiscogsTokenSettings] = useState(false); // Discogs 토큰 설정 모달 상태
    const [showShareModal, setShowShareModal] = useState(false); // 공유 모달 상태
    const [showLoadFromGistModal, setShowLoadFromGistModal] = useState(false); // Gist 로드 모달 상태
    const [showCloudSyncModal, setShowCloudSyncModal] = useState(false); // 클라우드 동기화 모달 상태
    const [showExcelSyncModal, setShowExcelSyncModal] = useState(false); // 엑셀 동기화 모달 상태
    const [showHelpModal, setShowHelpModal] = useState(false); // 도움말 모달 상태
    const [showPriceSummaryModal, setShowPriceSummaryModal] = useState(false); // 가격 요약 모달 상태
    const [showCollectionSettings, setShowCollectionSettings] = useState(false); // 컬렉션 설정 모달 상태


    // 필터, 정렬, 검색 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<AlbumType | 'all'>('all');
  const [sortKey, setSortKey] = useState<keyof Album | '' >('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    const router = useRouter();
    const searchParams = useSearchParams();


    const formModalRef = useModalAccessibility(() => { setShowForm(false); setEditingAlbum(null); });
    const discogsSettingsModalRef = useModalAccessibility(() => { setShowDiscogsTokenSettings(false); });

    const loadFileContent = useCallback(async (handle: FileSystemFileHandle, expectedUsername: string, expectedCollectionName: string) => {
        if (!expectedUsername || !expectedCollectionName) {
                setIsLoading(false); // Added to ensure loading state is cleared
                router.push('/');
                return;
            }

        setUsername(expectedUsername);
        setFileName(`${expectedCollectionName}.json`);

        // Verify that the selected file matches the requested collection
        const permission = await verifyPermission(handle, true);
        setHasPermission(permission);

        if (!permission) {
            toast.error("파일 읽기/쓰기 권한이 거부되었습니다. 다시 파일을 선택해주세요.");
            setIsLoading(false);
            router.push('/');
            return;
        }

        const file = await handle.getFile();
        const text = await file.text();
        let parsedContent;
        try {
            parsedContent = JSON.parse(text);
        } catch (e) {
            console.error("Error parsing file:", e);
            toast.error("선택된 파일이 유효한 JSON 형식이 아닙니다.");
            router.push('/');
            return;
        }

        // 파일 메타데이터에서 username과 collectionName 추출
        let fileUsername = parsedContent._metadata?.username;
        let fileCollectionName = parsedContent._metadata?.collectionName;
        
        console.log('🔍 Raw file metadata debug:', {
            hasMetadata: !!parsedContent._metadata,
            metadataKeys: parsedContent._metadata ? Object.keys(parsedContent._metadata) : 'no metadata',
            rawUsername: parsedContent._metadata?.username,
            rawCollectionName: parsedContent._metadata?.collectionName,
            fallbackToFilename: handle.name.replace('.json', ''),
            expectedUsername,
            expectedCollectionName
        });
        
        // 메타데이터가 없는 경우 URL 파라미터 사용 (완전히 새로운 로컬 파일의 경우)
        if (!fileUsername) {
            fileUsername = expectedUsername; // URL에서 온 값을 사용
            console.log('⚠️ No username in metadata, using URL parameter:', expectedUsername);
        }
        if (!fileCollectionName) {
            fileCollectionName = expectedCollectionName; // URL에서 온 값을 사용  
            console.log('⚠️ No collectionName in metadata, using URL parameter:', expectedCollectionName);
        }

        console.log('🔍 File validation:', {
            expectedUsername,
            expectedCollectionName,
            fileUsername,
            fileCollectionName,
            metadata: parsedContent._metadata,
            searchParams: {
                username: searchParams.get('username'),
                collectionName: searchParams.get('collectionName')
            },
            rawComparison: {
                'fileUsername === expectedUsername': fileUsername === expectedUsername,
                'fileCollectionName === expectedCollectionName': fileCollectionName === expectedCollectionName,
                fileUsernameType: typeof fileUsername,
                expectedUsernameType: typeof expectedUsername,
                fileCollectionNameType: typeof fileCollectionName,
                expectedCollectionNameType: typeof expectedCollectionName
            }
        });

        // 검증 로직: 메타데이터가 있는 경우 컬렉션명만 확인, username은 유연하게 처리
        if (parsedContent._metadata?.collectionName) {
            // 컬렉션명이 일치하지 않는 경우에만 오류
            if (parsedContent._metadata.collectionName !== expectedCollectionName) {
                console.error('❌ Collection name validation failed:', {
                    fileCollectionName: `"${parsedContent._metadata.collectionName}"`, 
                    expectedCollectionName: `"${expectedCollectionName}"`,
                    collectionNameMatch: parsedContent._metadata.collectionName === expectedCollectionName
                });
                toast.error("선택된 파일이 요청된 컬렉션과 일치하지 않습니다.");
                setIsLoading(false);
                router.push('/');
                return;
            }
            
            // Username이 다른 경우 경고만 출력하고 파일의 username을 사용
            if (parsedContent._metadata.username && parsedContent._metadata.username !== expectedUsername) {
                console.warn('⚠️ Username mismatch, using file username:', {
                    fileUsername: parsedContent._metadata.username,
                    expectedUsername: expectedUsername
                });
                // 파일의 실제 username을 사용하도록 상태 업데이트
                setUsername(parsedContent._metadata.username);
                // URL도 파일의 실제 값으로 업데이트
                const correctedUrl = `/collection?username=${encodeURIComponent(parsedContent._metadata.username)}&collectionName=${encodeURIComponent(expectedCollectionName)}`;
                router.replace(correctedUrl);
            }
        } else {
            // 메타데이터가 없거나 불완전한 경우 경고만 출력하고 계속 진행
            console.warn('⚠️ File metadata missing or incomplete, proceeding with URL parameters:', {
                hasMetadata: !!parsedContent._metadata,
                hasUsername: !!parsedContent._metadata?.username,
                hasCollectionName: !!parsedContent._metadata?.collectionName
            });
        }

        try {
            const albumsToSet = parsedContent.albums && Array.isArray(parsedContent.albums) ? parsedContent.albums : [];
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
        
    }, [router, searchParams]);

    const loadCloudFileContent = useCallback(async (expectedUsername: string, expectedCollectionName: string) => {
        if (!expectedUsername || !expectedCollectionName) {
            setIsLoading(false);
            router.push('/');
            return;
        }

        try {
            // 토큰 상태 확인
            const connectionStatus = getCloudConnectionStatus();
            if (connectionStatus === 'expired') {
                console.log('🚨 Token expired during cloud file loading');
                toast.error("인증이 만료되었습니다. 클라우드 저장소에 다시 연결해주세요.");
                setIsLoading(false);
                router.push('/');
                return;
            }

            const cloudFile = getActiveCloudFile();
            if (!cloudFile) {
                console.error("No active cloud file found");
                setIsLoading(false);
                router.push('/');
                return;
            }

            setUsername(expectedUsername);
            setFileName(`${expectedCollectionName}.json`);

            // 실제로 클라우드에서 파일 내용 다운로드 (강제 새로고침)
            const { loadFromCloudFile } = await import('@/lib/cloud-storage');
            const fileContent = await loadFromCloudFile(cloudFile, true); // 강제 새로고침 활성화
            
            let parsedContent;
            try {
                parsedContent = JSON.parse(fileContent);
            } catch (e) {
                console.error("Error parsing cloud file:", e);
                toast.error("클라우드 파일이 유효한 JSON 형식이 아닙니다.");
                router.push('/');
                return;
            }

            // 메타데이터 확인 및 검증
            const fileUsername = parsedContent._metadata?.username || expectedUsername;
            const fileCollectionName = parsedContent._metadata?.collectionName || expectedCollectionName;

            // 실제 값으로 username과 fileName 설정
            setUsername(fileUsername);
            setFileName(`${fileCollectionName}.json`);

            // 메타데이터가 없거나 일치하지 않으면 경고만 하고 계속 진행
            if (!parsedContent._metadata?.username || !parsedContent._metadata?.collectionName) {
                console.warn("Cloud file missing metadata, using URL parameters");
                toast.error("파일 메타데이터가 부족합니다. URL 파라미터를 사용합니다.");
            }

            const albumsToSet = parsedContent.albums && Array.isArray(parsedContent.albums) ? parsedContent.albums : [];
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

        } catch (error) {
            console.error("Error loading cloud file:", error);
            setAlbums([]);
            
            // 토큰 만료 오류인 경우 특별 처리
            if (error instanceof Error && error.message.includes('클라우드 인증이 만료되었습니다')) {
                toast.warning("클라우드 인증이 만료되었습니다. 다시 로그인해주세요.");
                setIsLoading(false);
                router.push('/');
                return;
            }
            
            toast.error(`클라우드 파일을 읽는 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
            setIsLoading(false);
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
                console.log('🔄 Initializing collection:', { currentUsername, currentCollectionName });
                
                // 클라우드 연결 상태 확인
                const connectionStatus = getCloudConnectionStatus();
                console.log('☁️ Cloud connection status:', connectionStatus);
                
                if (connectionStatus === 'expired') {
                    console.log('🚨 Token expired, redirecting to home page for re-authentication');
                    toast.error("인증이 만료되었습니다. 클라우드 저장소에 다시 연결해주세요.");
                    setIsLoading(false);
                    router.push('/');
                    return;
                }
                
                // 먼저 클라우드 파일 확인 (우선순위)
                const cloudFile = getActiveCloudFile();
                console.log('☁️ Active cloud file:', cloudFile);
                
                if (cloudFile) {
                    // 클라우드 파일이 있으면 로컬 핸들 정리하고 클라우드 파일 로드
                    console.log('📁 Using cloud file, clearing local handle');
                    setActiveCloudFile(cloudFile); // 명시적으로 설정
                    await loadCloudFileContent(currentUsername, currentCollectionName);
                } else {
                    // 클라우드 파일이 없을 때만 로컬 파일 핸들 확인
                    const activeHandle = await getActiveFileHandle();
                    console.log('💾 Active file handle:', activeHandle);
                    
                    if (activeHandle) {
                        // 로컬 파일이 있으면 클라우드 파일 정보 정리
                        console.log('📁 Using local file, clearing cloud state');
                        setActiveCloudFile(null);
                        setFileHandle(activeHandle);
                        await loadFileContent(activeHandle, currentUsername, currentCollectionName);
                    } else {
                        console.log('❌ No active handle or cloud file found');
                        setIsLoading(false); // No active handle or cloud file, show file selection
                    }
                }
            } else {
                console.log('❌ Missing URL params:', { currentUsername, currentCollectionName });
                setIsLoading(false); // Missing URL params, show file selection
            }
        };

        initializeCollection();
    }, [searchParams, loadFileContent, loadCloudFileContent, router]);

    // 컬렉션 설정 저장 함수
    const handleCollectionSettingsSave = useCallback(async (newUsername: string, newCollectionName: string) => {
        const oldUsername = username;
        const oldCollectionName = fileName.replace('.json', '');
        
        // 상태 업데이트
        setUsername(newUsername);
        setFileName(`${newCollectionName}.json`);
        
        // URL 업데이트
        const newUrl = `/collection?username=${encodeURIComponent(newUsername)}&collectionName=${encodeURIComponent(newCollectionName)}`;
        router.replace(newUrl);
        
        // localStorage 업데이트
        localStorage.setItem('currentUsername', newUsername);
        
        try {
            // 메타데이터 업데이트
            await setCollectionMetadata(newUsername, newCollectionName, albums.length);
            
            // 앨범과 함께 새로운 메타데이터로 저장하는 로직을 직접 구현
            const cloudFile = getActiveCloudFile();
            
            if (cloudFile) {
                // 토큰 상태 확인
                const connectionStatus = getCloudConnectionStatus();
                if (connectionStatus === 'expired') {
                    console.log('🚨 Token expired during collection settings save');
                    toast.error("인증이 만료되었습니다. 클라우드 저장소에 다시 연결해주세요.");
                    router.push('/');
                    return;
                }

                // 클라우드 저장 시 전역 로딩 표시
                setGlobalLoading(true, '클라우드에 컬렉션 설정을 저장하는 중...');
                // 클라우드 저장
                const contentToSave: {
                    _metadata: {
                        username: string;
                        collectionName: string;
                        createdAt: string;
                        updatedAt: string;
                        encryptedDiscogsToken?: { encryptedData: string; iv: string; salt: string; }
                    },
                    albums: Album[]
                } = {
                    _metadata: {
                        username: newUsername,
                        collectionName: newCollectionName,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    },
                    albums: albums
                };

                if (discogsToken) {
                    const encrypted = await encryptData(discogsToken);
                    contentToSave._metadata.encryptedDiscogsToken = encrypted;
                }

                await saveToCloudFile(cloudFile, JSON.stringify(contentToSave, null, 2));
                setGlobalLoading(false); // 클라우드 저장 완료 후 로딩 해제
            } else if (fileHandle) {
                // 로컬 저장
                const permissionGranted = await verifyPermission(fileHandle, false);
                if (permissionGranted) {
                    const contentToSave: {
                        _metadata: {
                            username: string;
                            collectionName: string;
                            createdAt: string;
                            updatedAt: string;
                            encryptedDiscogsToken?: { encryptedData: string; iv: string; salt: string; }
                        },
                        albums: Album[]
                    } = {
                        _metadata: {
                            username: newUsername,
                            collectionName: newCollectionName,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        },
                        albums: albums
                    };

                    if (discogsToken) {
                        const encrypted = await encryptData(discogsToken);
                        contentToSave._metadata.encryptedDiscogsToken = encrypted;
                    }

                    await saveFile(fileHandle, JSON.stringify(contentToSave, null, 2));
                }
            }
            
            toast.success('컬렉션 설정이 저장되었습니다.');
            
            // 페이지 새로고침으로 새로운 설정값 반영
            window.location.reload();
        } catch (error) {
            console.error('컬렉션 설정 저장 실패:', error);
            
            // 토큰 만료 오류인 경우 특별 처리
            if (error instanceof Error && error.message.includes('클라우드 인증이 만료되었습니다')) {
                toast.warning("클라우드 인증이 만료되었습니다. 다시 로그인해주세요.");
                router.push('/');
                return;
            }
            
            toast.error('컬렉션 설정 저장에 실패했습니다.');
            
            // 실패 시 로딩 상태 해제
            setGlobalLoading(false);
            
            // 실패 시 원래 값으로 롤백
            setUsername(oldUsername);
            setFileName(`${oldCollectionName}.json`);
            const rollbackUrl = `/collection?username=${encodeURIComponent(oldUsername)}&collectionName=${encodeURIComponent(oldCollectionName)}`;
            router.replace(rollbackUrl);
        }
    }, [username, fileName, albums, discogsToken, router, fileHandle, setGlobalLoading]);

    

    const saveAlbumsToFile = useCallback(async (updatedAlbums: Album[], currentDiscogsToken: string | null) => {
        const cloudFile = getActiveCloudFile();
        
        // 클라우드 저장소 사용 중인 경우
        if (cloudFile) {
            try {
                // 토큰 상태 확인
                const connectionStatus = getCloudConnectionStatus();
                if (connectionStatus === 'expired') {
                    console.log('🚨 Token expired during save operation');
                    toast.error("인증이 만료되었습니다. 클라우드 저장소에 다시 연결해주세요.");
                    router.push('/');
                    return;
                }

                // 클라우드 저장 시 전역 로딩 표시
                setGlobalLoading(true, '클라우드에 앨범 컬렉션을 저장하는 중...');
                
                // URL 파라미터에서 실제 값 가져오기
                const currentUsername = searchParams.get('username') || username || '';
                const currentCollectionName = searchParams.get('collectionName') || fileName.replace(".json", "") || 'untitled';
                
                const contentToSave: { 
                    _metadata: { 
                        username: string; 
                        collectionName: string; 
                        createdAt: string;
                        updatedAt: string;
                        encryptedDiscogsToken?: { encryptedData: string; iv: string; salt: string; } 
                    }, 
                    albums: Album[] 
                } = {
                    _metadata: { 
                        username: currentUsername,
                        collectionName: currentCollectionName,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    },
                    albums: updatedAlbums,
                };
                
                if (currentDiscogsToken) {
                    const encryptedToken = await encryptData(currentDiscogsToken);
                    contentToSave._metadata.encryptedDiscogsToken = encryptedToken;
                }
                
                await saveToCloudFile(cloudFile, JSON.stringify(contentToSave, null, 2));
                await setCollectionMetadata(username, fileName.replace(".json", ""), updatedAlbums.length);
                
                setGlobalLoading(false); // 클라우드 저장 완료 후 로딩 해제
                toast.success(`${getStorageTypeDisplay()}에 저장되었습니다.`);
            } catch (error) {
                console.error("Failed to save to cloud:", error);
                setGlobalLoading(false); // 에러 시에도 로딩 해제
                
                // 토큰 만료 오류인 경우 특별 처리
                if (error instanceof Error && error.message.includes('클라우드 인증이 만료되었습니다')) {
                    toast.warning("클라우드 인증이 만료되었습니다. 다시 로그인해주세요.");
                    router.push('/');
                    return;
                }
                
                toast.error(`클라우드 저장에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
            }
            return;
        }
        
        // 로컬 파일 저장 (기존 로직)
        if (!fileHandle) return;

        let permissionGranted = hasPermission;
        if (!permissionGranted) {
            permissionGranted = await verifyPermission(fileHandle, true);
            setHasPermission(permissionGranted);
        }

        if (permissionGranted) {
            try {
                // URL 파라미터에서 실제 값 가져오기
                const currentUsername = searchParams.get('username') || username || '';
                const currentCollectionName = searchParams.get('collectionName') || fileName.replace(".json", "") || 'untitled';
                
                const contentToSave: { 
                    _metadata: { 
                        username: string; 
                        collectionName: string; 
                        createdAt: string;
                        updatedAt: string;
                        encryptedDiscogsToken?: { encryptedData: string; iv: string; salt: string; } 
                    }, 
                    albums: Album[] 
                } = {
                    _metadata: { 
                        username: currentUsername,
                        collectionName: currentCollectionName,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    },
                    albums: updatedAlbums,
                };
                if (currentDiscogsToken) {
                    const encryptedToken = await encryptData(currentDiscogsToken);
                    contentToSave._metadata.encryptedDiscogsToken = encryptedToken;
                }
                await saveFile(fileHandle, JSON.stringify(contentToSave, null, 2));
                await setCollectionMetadata(username, fileName.replace(".json", ""), updatedAlbums.length);
                toast.success("로컬 파일에 저장되었습니다.");
            } catch (error) {
                console.error("Failed to save file:", error);
                toast.error("파일 저장에 실패했습니다.");
            }
        } else {
            console.error("Permission to write file was denied.");
            toast.error("파일 쓰기 권한이 거부되었습니다.");
        }
    }, [fileHandle, hasPermission, username, fileName, searchParams, setGlobalLoading, router]);

    const handleSetDiscogsToken = useCallback(async (token: string | null) => {
        setDiscogsToken(token);
        // 토큰이 변경될 때만 명시적으로 저장 로직 호출
        if (fileHandle && token !== undefined) {
            await saveAlbumsToFile(albums, token);
        }
    }, [albums, fileHandle, saveAlbumsToFile]);

    useEffect(() => {
        document.title = `My KALLAX is Full`;
    }, [username, fileName]);

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
        saveAlbumsToFile(updatedAlbums, discogsToken);
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
            saveAlbumsToFile(updatedAlbums, discogsToken);
            setEditingAlbum(null);
            toast.success("앨범이 수정되었습니다.");
        }
    };

    const confirmDelete = () => {
        if (deleteTarget) {
            const updatedAlbums = albums.filter(a => a.id !== deleteTarget.id);
            setAlbums(updatedAlbums);
            saveAlbumsToFile(updatedAlbums, discogsToken);
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

    const handleShareCollection = useCallback(() => {
        setShowShareModal(true);
    }, []);

    const handleLoadFromGist = useCallback((data: CollectionData) => {
        setAlbums(data.albums);
        setUsername(data._metadata.username);
        setFileName(`${data._metadata.collectionName}.json`);
        toast.success(`${data._metadata.collectionName} 컬렉션을 불러왔습니다! (${data.albums.length}개 앨범)`);
    }, []);

    const handleLoadFromCloudSync = useCallback((newAlbums: Album[]) => {
        setAlbums(newAlbums);
        saveAlbumsToFile(newAlbums, discogsToken);
        // CloudSyncModal에서 이미 정확한 토스트 메시지를 보냄
    }, [saveAlbumsToFile, discogsToken]);

    const handleLoadFromExcelSync = useCallback((newAlbums: Album[]) => {
        setAlbums(newAlbums);
        saveAlbumsToFile(newAlbums, discogsToken);
        // ExcelSyncModal에서 정확한 토스트 메시지를 보냄
    }, [saveAlbumsToFile, discogsToken]);

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

    // 기존 구입처 목록 수집
    const existingStores = useMemo(() => {
        const stores = albums
            .map(album => album.purchaseStore)
            .filter((store): store is string => store != null && store.trim() !== '') // 타입 가드로 string만 필터링
            .filter((store, index, arr) => arr.indexOf(store) === index); // 중복 제거
        return stores.sort(); // 알파벳 순으로 정렬
    }, [albums]);

    // 가격 요약 계산
    const priceSummary = useMemo(() => {
        const summary = {
            totalAlbums: albums.length,
            totalWithPrice: 0,
            totalSpent: {
                KRW: 0,
                USD: 0,
                JPY: 0,
                EUR: 0
            },
            averagePrice: {
                KRW: 0,
                USD: 0,
                JPY: 0,
                EUR: 0
            },
            byCurrency: {
                KRW: { count: 0, total: 0 },
                USD: { count: 0, total: 0 },
                JPY: { count: 0, total: 0 },
                EUR: { count: 0, total: 0 }
            }
        };

        albums.forEach(album => {
            if (album.priceAmount && album.priceAmount > 0 && album.priceCurrency) {
                summary.totalWithPrice++;
                const currency = album.priceCurrency;
                summary.totalSpent[currency] += album.priceAmount;
                summary.byCurrency[currency].count++;
                summary.byCurrency[currency].total += album.priceAmount;
            }
        });

        // 평균 가격 계산
        Object.keys(summary.byCurrency).forEach(currency => {
            const curr = currency as keyof typeof summary.byCurrency;
            if (summary.byCurrency[curr].count > 0) {
                summary.averagePrice[curr] = summary.byCurrency[curr].total / summary.byCurrency[curr].count;
            }
        });

        return summary;
    }, [albums]);

    // 앨범 네비게이션 로직
    const selectedAlbumIndex = selectedAlbum ? filteredAndSortedAlbums.findIndex(album => album.id === selectedAlbum.id) : -1;
    
    const handlePreviousAlbum = useCallback(() => {
        if (selectedAlbumIndex > 0) {
            setSelectedAlbum(filteredAndSortedAlbums[selectedAlbumIndex - 1]);
        }
    }, [selectedAlbumIndex, filteredAndSortedAlbums]);

    const handleNextAlbum = useCallback(() => {
        if (selectedAlbumIndex >= 0 && selectedAlbumIndex < filteredAndSortedAlbums.length - 1) {
            setSelectedAlbum(filteredAndSortedAlbums[selectedAlbumIndex + 1]);
        }
    }, [selectedAlbumIndex, filteredAndSortedAlbums]);

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

    if (!fileHandle && !getActiveCloudFile()) {
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
        <TooltipProvider>
            <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-16 custom-scrollbar">
                <div className="w-full max-w-6xl mt-4 sm:mt-8">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6">
                        <div className="flex flex-col mb-3 sm:mb-0">
                            <h1 className="text-xl sm:text-2xl font-bold">{fileName.replace(".json", "")}</h1>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 -mt-1">
                                <p className="text-base sm:text-lg font-normal text-zinc-500 dark:text-zinc-400">@{username}</p>
                                <span className="hidden sm:inline text-zinc-400 dark:text-zinc-500">•</span>
                                <p className="text-base sm:text-lg font-normal text-zinc-500 dark:text-zinc-400">
                                    총 {filteredAndSortedAlbums.length}장의 음반
                                </p>
                                <span className="hidden sm:inline text-zinc-400 dark:text-zinc-500">•</span>
                                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                                    {isUsingCloudStorage() ? (
                                        <>
                                            <Cloud className="h-3 w-3" />
                                            {getStorageTypeDisplay()}
                                        </>
                                    ) : (
                                        <>
                                            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2v8h10V6H5z" clipRule="evenodd" />
                                            </svg>
                                            로컬 파일
                                        </>
                                    )}
                                </p>
                                {priceSummary.totalWithPrice > 0 && (
                                    <>
                                        <span className="hidden sm:inline text-zinc-400 dark:text-zinc-500">•</span>
                                        <button
                                            onClick={() => setShowPriceSummaryModal(true)}
                                            className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                                        >
                                            판도라의 상자
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2 justify-center sm:justify-end">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="default"
                                        size="icon"
                                        onClick={handleShareCollection}
                                        className="h-10 w-10 sm:h-9 sm:w-9 rounded-full bg-blue-600 text-white hover:bg-blue-700"
                                    >
                                        <Share2 className="h-5 w-5" />
                                        <span className="sr-only">컬렉션 공유</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>컬렉션을 이미지로 공유합니다</p>
                                </TooltipContent>
                            </Tooltip>
                            {/* 도움말 버튼 - 추후 활성화 예정
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="default"
                                        size="icon"
                                        onClick={() => setShowHelpModal(true)}
                                        className="h-9 w-9 rounded-full bg-green-600 text-white hover:bg-green-700"
                                    >
                                        <HelpCircle className="h-5 w-5" />
                                        <span className="sr-only">도움말</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>사용자 가이드 및 도움말</p>
                                </TooltipContent>
                            </Tooltip>
                            */}
                            <DropdownMenu>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="default"
                                                size="icon"
                                                className="h-10 w-10 sm:h-9 sm:w-9 rounded-full bg-zinc-700 text-white hover:bg-zinc-800"
                                            >
                                                <Settings className="h-5 w-5" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>환경설정 및 동기화 옵션</p>
                                    </TooltipContent>
                                </Tooltip>
                                <DropdownMenuContent align="end" className="bg-white dark:bg-zinc-800 shadow-lg rounded-md border border-zinc-200 dark:border-zinc-800">
                                    <DropdownMenuItem onClick={() => setShowExcelSyncModal(true)}>
                                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                                        엑셀 동기화
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setShowCloudSyncModal(true)}>
                                        <Cloud className="mr-2 h-4 w-4" />
                                        URL 공유
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setShowDiscogsTokenSettings(true)}>
                                        <Settings className="mr-2 h-4 w-4" />
                                        Discogs 토큰 설정
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setShowCollectionSettings(true)}>
                                        <User className="mr-2 h-4 w-4" />
                                        컬렉션 설정
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => router.push('/')}>
                                        <LogOut className="mr-2 h-4 w-4" />
                                        나가기
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* 검색, 필터, 정렬 UI */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 mb-4 sm:mb-6">
                        <Select value={filterType} onValueChange={(value: AlbumType | 'all') => setFilterType(value)}>
                            <SelectTrigger className="w-full sm:w-[180px] h-12 sm:h-10 border border-zinc-200 dark:border-zinc-800">
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

                        <div className="flex gap-2 items-center">
                            <Select value={sortKey} onValueChange={(value: keyof Album | '') => setSortKey(value)}>
                                <SelectTrigger className="w-full sm:w-[180px] h-12 sm:h-10 border border-zinc-200 dark:border-zinc-800">
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

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                        className="h-12 w-12 sm:h-10 sm:w-10 flex-shrink-0 border border-zinc-200 dark:border-zinc-800"
                                    >
                                        {sortOrder === 'asc' ? <ArrowUp className="h-5 w-5 sm:h-4 sm:w-4" /> : <ArrowDown className="h-5 w-5 sm:h-4 sm:w-4" />}
                                        <span className="sr-only">정렬 순서 변경</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>정렬 순서를 {sortOrder === 'asc' ? '내림차순' : '오름차순'}으로 변경</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>

                        <div className="flex sm:ml-auto">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="relative flex-1 sm:flex-initial">
                                        <Input
                                            type="text"
                                            placeholder="앨범 검색 (제목, 아티스트, 레이블)"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-12 pr-4 py-3 sm:pl-10 sm:pr-4 sm:py-2 w-full sm:w-[300px] h-12 sm:h-10 border border-zinc-200 dark:border-zinc-800 text-base sm:text-sm"
                                        />
                                        <Search className="absolute left-4 sm:left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>제목, 아티스트, 레이블로 앨범을 검색할 수 있습니다</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </div>

                    {/* 필터링된 결과 개수 표시 */}
                    {(searchTerm || filterType !== 'all') && (
                        <div className="mb-3 sm:mb-4">
                            <p className="text-sm sm:text-sm text-zinc-600 dark:text-zinc-400 px-1">
                                {filteredAndSortedAlbums.length}개의 음반이 검색되었습니다
                                {searchTerm && ` (검색어: "${searchTerm}")`}
                                {filteredAndSortedAlbums.length !== albums.length && ` / 전체 ${albums.length}장`}
                            </p>
                        </div>
                    )}

                    {filteredAndSortedAlbums.length > 0 ? (
                        <VirtualizedAlbumGrid
            albums={filteredAndSortedAlbums}
            onAlbumClick={handleAlbumClick}
            onEditAlbum={handleEditAlbum}
            onDeleteAlbum={handleDeleteClick}
          />
                    ) : albums.length === 0 ? (
                        // 컬렉션이 완전히 비어있을 때 - Empty State Guidance 표시
                        <EmptyStateGuidance
                            onAddFirstAlbum={() => setShowForm(true)}
                            onOpenExcelSync={() => setShowExcelSyncModal(true)}
                            onOpenCloudSync={() => setShowCloudSyncModal(true)}
                        />
                    ) : (
                        // 검색 결과가 없을 때만 기존 메시지 표시
                        <div className="flex flex-col items-center justify-center h-48 sm:h-64 text-zinc-500 dark:text-zinc-400">
                            <p className="text-base sm:text-lg mb-4">검색 결과가 없습니다.</p>
                        </div>
                    )}
                </div>

                { (showForm || editingAlbum) && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fadein">
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
                                existingStores={existingStores} // 기존 구입처 목록 전달
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
                        onPrevious={selectedAlbumIndex > 0 ? handlePreviousAlbum : undefined}
                        onNext={selectedAlbumIndex >= 0 && selectedAlbumIndex < filteredAndSortedAlbums.length - 1 ? handleNextAlbum : undefined}
                        currentIndex={selectedAlbumIndex >= 0 ? selectedAlbumIndex : undefined}
                        totalCount={filteredAndSortedAlbums.length}
                    />
                )}

                {deleteTarget && (
                    <ConfirmationModal
                        message={`'${deleteTarget.title}' 앨범을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
                        onConfirm={confirmDelete}
                        onCancel={cancelDelete}
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
                                onTokenChange={handleSetDiscogsToken}
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

                {showLoadFromGistModal && (
                    <LoadFromGistModal
                        onClose={() => setShowLoadFromGistModal(false)}
                        onLoad={handleLoadFromGist}
                    />
                )}

                {showCloudSyncModal && (
                    <CloudSyncModal
                        albums={albums}
                        onClose={() => setShowCloudSyncModal(false)}
                        onLoadAlbums={handleLoadFromCloudSync}
                        collectionName={fileName.replace('.json', '') || 'My Collection'}
                    />
                )}

                {showExcelSyncModal && (
                    <ExcelSyncModal
                        albums={albums}
                        onClose={() => setShowExcelSyncModal(false)}
                        onLoadAlbums={handleLoadFromExcelSync}
                        collectionName={fileName.replace('.json', '') || 'My Collection'}
                    />
                )}

                {showHelpModal && (
                    <HelpModal
                        onClose={() => setShowHelpModal(false)}
                    />
                )}

                {showPriceSummaryModal && (
                    <PriceSummaryModal
                        summary={priceSummary}
                        onClose={() => setShowPriceSummaryModal(false)}
                    />
                )}

                
            </main>

            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="default"
                        size="icon"
                        onClick={() => setShowForm(true)}
                        className="fixed bottom-6 right-6 sm:bottom-4 h-16 w-16 sm:h-14 sm:w-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 z-50 sm:right-[calc(50vw-24rem-11.5rem)]"
                    >
                        <Plus className="h-8 w-8 sm:h-7 sm:w-7" />
                        <span className="sr-only">앨범 추가</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                    <p>새 앨범을 컬렉션에 추가합니다</p>
                </TooltipContent>
            </Tooltip>

            {/* 컬렉션 설정 모달 */}
            <CollectionSettingsModal
                isOpen={showCollectionSettings}
                onClose={() => setShowCollectionSettings(false)}
                currentUsername={username}
                currentCollectionName={fileName.replace('.json', '')}
                onSave={handleCollectionSettingsSave}
                isCloudCollection={isUsingCloudStorage()}
            />
        </TooltipProvider>
    );
}