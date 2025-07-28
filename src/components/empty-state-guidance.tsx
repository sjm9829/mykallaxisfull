import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, FileSpreadsheet, Cloud, Upload, Music, Sparkles } from 'lucide-react';

interface EmptyStateGuidanceProps {
  onAddFirstAlbum: () => void;
  onOpenExcelSync: () => void;
  onOpenCloudSync: () => void;
}

export function EmptyStateGuidance({ 
  onAddFirstAlbum, 
  onOpenExcelSync, 
  onOpenCloudSync 
}: EmptyStateGuidanceProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      {/* 메인 아이콘과 제목 */}
      <div className="mb-12">
        <div className="relative mb-8">
          <div className="w-20 h-20 mx-auto bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mb-6">
            <Music className="w-10 h-10 text-zinc-600 dark:text-zinc-400" />
          </div>
          <div className="absolute -top-2 -right-8">
            <Sparkles className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
          </div>
        </div>
        
        <h2 className="text-3xl font-bold text-zinc-800 dark:text-zinc-200 mb-4">
          첫 번째 앨범을 추가해보세요
        </h2>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto leading-relaxed">
          아직 컬렉션이 비어있습니다.<br />
          소중한 음반들을 추가하여 나만의 컬렉션을 만들어보세요.
        </p>
      </div>

      {/* 액션 옵션들 */}
      <div className="w-full max-w-2xl space-y-6">
        {/* 직접 추가 - 메인 액션 */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 p-8 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center">
              <Plus className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-left">
              <h3 className="text-xl font-semibold text-zinc-800 dark:text-zinc-200">
                직접 앨범 추가하기
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                첫 번째 앨범을 수동으로 입력해보세요
              </p>
            </div>
          </div>
          <Button 
            onClick={onAddFirstAlbum}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            size="lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            첫 앨범 추가하기
          </Button>
        </div>

        {/* 구분선 */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700"></div>
          <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">또는</span>
          <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700"></div>
        </div>

        {/* 가져오기 옵션들 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Excel에서 가져오기 */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-left">
                <h4 className="font-semibold text-zinc-800 dark:text-zinc-200">
                  Excel에서 가져오기
                </h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  기존 Excel 파일 불러오기
                </p>
              </div>
            </div>
            <Button
              onClick={onOpenExcelSync}
              variant="outline"
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              Excel 동기화
            </Button>
          </div>

          {/* 클라우드에서 가져오기 */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <Cloud className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-left">
                <h4 className="font-semibold text-zinc-800 dark:text-zinc-200">
                  클라우드에서 가져오기
                </h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  다른 기기에서 저장한 컬렉션
                </p>
              </div>
            </div>
            <Button
              onClick={onOpenCloudSync}
              variant="outline"
              className="w-full"
            >
              <Cloud className="w-4 h-4 mr-2" />
              클라우드 동기화
            </Button>
          </div>
        </div>
      </div>

    </div>
  );
}
