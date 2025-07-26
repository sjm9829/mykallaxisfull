import { create } from 'zustand';
import { Album, AlbumType } from '@/types/album';
import { setCollectionMetadata, setLastOpenedCollection } from '@/lib/db';

interface AlbumState {
  albums: Album[];
  searchTerm: string;
  filterType: AlbumType | 'All';
  sortOption: 'artist' | 'title' | 'releaseDate' | 'createdAt';
  currentUsername: string;
  currentCollectionName: string;
}

interface AlbumActions {
  setAlbums: (albums: Album[]) => void;
  setSearchTerm: (term: string) => void;
  setFilterType: (type: AlbumType | 'All') => void;
  setSortOption: (option: 'artist' | 'title' | 'releaseDate' | 'createdAt') => void;
  loadCollection: (username: string, collectionName: string) => void;
  addAlbum: (album: Omit<Album, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateAlbum: (album: Album) => Promise<void>;
  deleteAlbum: (albumId: string) => Promise<void>;
  // saveCurrentCollection: () => void; // 필요시 추가
}

export const useAlbumStore = create<AlbumState & AlbumActions>()(
  (set, get) => ({
    albums: [],
    searchTerm: '',
    filterType: 'All',
    sortOption: 'createdAt',
    currentUsername: '',
    currentCollectionName: '',

    setAlbums: (albums) => set({ albums }),
    setSearchTerm: (term) => set({ searchTerm: term }),
    setFilterType: (type) => set({ filterType: type }),
    setSortOption: (option) => set({ sortOption: option }),

    loadCollection: async (username, collectionName) => {
      set({
        currentUsername: username,
        currentCollectionName: collectionName,
      });
      await setLastOpenedCollection(username, collectionName);
    },

    addAlbum: async (albumData) => {
      const newAlbum: Album = {
        ...albumData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const state = get(); // 현재 상태를 가져옵니다.
      const updatedAlbums = [...state.albums, newAlbum];
      await setCollectionMetadata(state.currentUsername, state.currentCollectionName, updatedAlbums.length);
      set({ albums: updatedAlbums }); // 동기적으로 상태 업데이트
    },

    updateAlbum: async (updatedAlbum) => {
      const state = get();
      const updatedAlbums = state.albums.map((album) =>
        album.id === updatedAlbum.id ? { ...updatedAlbum, updatedAt: new Date().toISOString() } : album
      );
      await setCollectionMetadata(state.currentUsername, state.currentCollectionName, updatedAlbums.length);
      set({ albums: updatedAlbums });
    },

    deleteAlbum: async (albumId) => {
      const state = get();
      const updatedAlbums = state.albums.filter((album) => album.id !== albumId);
      await setCollectionMetadata(state.currentUsername, state.currentCollectionName, updatedAlbums.length);
      set({ albums: updatedAlbums });
    },
  })
);
