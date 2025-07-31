import * as React from 'react';
import { useModalAccessibility } from '@/lib/useModalAccessibility';
import { Button } from '@/components/ui/button';
import { X, Plus, Share2, Settings, Search, ArrowUp, Cloud, FileSpreadsheet, Upload } from 'lucide-react';

interface HelpModalProps {
  onClose: () => void;
}

export function HelpModal({ onClose }: HelpModalProps) {
  const modalRef = useModalAccessibility(onClose);

  const helpSections = [
    {
      title: "📚 기본 기능",
      items: [
        {
          icon: <Plus className="w-4 h-4" />,
          title: "앨범 추가",
          description: "우하단의 파란색 + 버튼을 클릭하여 새 앨범을 컬렉션에 추가할 수 있습니다."
        },
        {
          icon: <Search className="w-4 h-4" />,
          title: "앨범 검색",
          description: "상단 검색창에서 제목, 아티스트, 레이블로 앨범을 빠르게 찾을 수 있습니다."
        },
        {
          icon: <Share2 className="w-4 h-4" />,
          title: "컬렉션 공유",
          description: "상단 공유 버튼으로 컬렉션을 이미지(탑스터)로 만들어 SNS에 공유할 수 있습니다."
        }
      ]
    },
    {
      title: "🔧 고급 기능",
      items: [
        {
          icon: <Settings className="w-4 h-4" />,
          title: "환경설정",
          description: "상단 톱니바퀴 버튼에서 다양한 설정과 동기화 옵션에 접근할 수 있습니다."
        },
        {
          icon: <FileSpreadsheet className="w-4 h-4" />,
          title: "엑셀 동기화",
          description: "컬렉션을 Excel 파일로 내보내거나 Excel에서 앨범 데이터를 가져올 수 있습니다."
        },
        {
          icon: <Cloud className="w-4 h-4" />,
          title: "URL 공유",
          description: "URL을 생성하여 컬렉션을 공유할 수 있습니다."
        }
      ]
    },
    {
      title: "🎵 앨범 관리",
      items: [
        {
          icon: <ArrowUp className="w-4 h-4" />,
          title: "정렬 및 필터",
          description: "앨범을 제목, 아티스트, 발매일 등으로 정렬하고 타입별로 필터링할 수 있습니다."
        }
      ]
    }
  ];

  const shortcuts = [
    { key: "Ctrl + F", description: "검색창 포커스" },
    { key: "Esc", description: "모달 닫기" },
    { key: "Enter", description: "폼 제출" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fadein p-4">
      <div
        className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-zinc-200 dark:border-zinc-800 transform animate-scalein"
        ref={modalRef}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">📖 사용자 가이드</h2>
          <button
            className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
            onClick={onClose}
            aria-label="닫기"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-8">
          {/* 기능 가이드 섹션 */}
          {helpSections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="space-y-4">
              <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
                {section.title}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {section.items.map((item, itemIndex) => (
                  <div
                    key={itemIndex}
                    className="flex gap-3 p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                  >
                    <div className="flex-shrink-0 p-2 rounded-md bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400">
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-zinc-800 dark:text-zinc-200 mb-1">
                        {item.title}
                      </h4>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* 단축키 섹션 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
              ⌨️ 단축키
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {shortcuts.map((shortcut, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                >
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {shortcut.description}
                  </span>
                  <kbd className="px-2 py-1 text-xs font-semibold text-zinc-800 bg-zinc-200 border border-zinc-300 rounded dark:bg-zinc-700 dark:text-zinc-200 dark:border-zinc-600">
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ 섹션 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
              ❓ 자주 묻는 질문
            </h3>
            <div className="space-y-3">
              <details className="group">
                <summary className="cursor-pointer p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
                  <span className="font-medium">컬렉션 데이터는 어디에 저장되나요?</span>
                </summary>
                <div className="mt-2 p-4 text-sm text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700">
                  컬렉션 데이터는 로컬 JSON 파일로 저장됩니다. 클라우드 동기화를 통해 백업하거나 다른 기기와 공유할 수 있습니다.
                </div>
              </details>
              
              <details className="group">
                <summary className="cursor-pointer p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
                  <span className="font-medium">Discogs 토큰은 어떻게 발급받나요?</span>
                </summary>
                <div className="mt-2 p-4 text-sm text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700">
                  Discogs.com에 로그인 후 Settings → Developer → Generate new token에서 개인용 토큰을 발급받을 수 있습니다.
                </div>
              </details>

              <details className="group">
                <summary className="cursor-pointer p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
                  <span className="font-medium">탑스터 이미지는 어떤 크기로 생성되나요?</span>
                </summary>
                <div className="mt-2 p-4 text-sm text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700">
                  3x3, 4x4, 5x5, 6x6 그리드로 생성 가능하며, 앨범 순서는 드래그 앤 드롭으로 조정할 수 있습니다.
                </div>
              </details>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              더 많은 도움이 필요하시면 GitHub Issues를 확인해보세요.
            </p>
            <Button onClick={onClose}>
              확인
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
