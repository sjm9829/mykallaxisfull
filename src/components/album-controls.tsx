"use client";

import * as React from "react";
import { AlbumType } from "@/types/album";
import { Select } from "@/components/ui/select";

interface AlbumControlsProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterType: AlbumType | 'All';
  setFilterType: (type: AlbumType | 'All') => void;
  sortOption: 'artist' | 'title' | 'releaseDate' | 'createdAt';
  setSortOption: (option: 'artist' | 'title' | 'releaseDate' | 'createdAt') => void;
}

export function AlbumControls({
  searchTerm,
  setSearchTerm,
  filterType,
  setFilterType,
  sortOption,
  setSortOption,
}: AlbumControlsProps) {
  return (
    <div className="mb-6 flex justify-between items-center">
      <div className="flex space-x-4"> {/* Left group: Filter and Sort */}
        <Select
          key={filterType}
          value={filterType}
          onValueChange={(value: AlbumType | 'All') => setFilterType(value)}
        >
          <option value="All">모든 유형</option>
          <option value="Vinyl">Vinyl</option>
          <option value="CD">CD</option>
          <option value="Tape">Tape</option>
          <option value="Other">기타</option>
        </Select>
        <Select
          key={sortOption}
          value={sortOption}
          onValueChange={(value: 'artist' | 'title' | 'releaseDate' | 'createdAt') => setSortOption(value)}
        >
          <option value="createdAt">최신순</option>
          <option value="artist">아티스트순</option>
          <option value="title">타이틀순</option>
          <option value="releaseDate">발매일순</option>
        </Select>
      </div>
      <div className="w-1/3"> {/* Right group: Search */}
        <input
          type="text"
          placeholder="앨범 검색 (아티스트, 타이틀 등)"
          className="w-full p-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
    </div>
  );
}
