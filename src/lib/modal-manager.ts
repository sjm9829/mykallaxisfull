/**
 * 전역 모달 관리자
 * 모달 스택을 관리하여 ESC 키 이벤트를 올바른 모달로 라우팅
 */

type ModalInstance = {
  id: string;
  onClose: () => void;
};

class ModalManager {
  private modalStack: ModalInstance[] = [];

  /**
   * 모달을 스택에 추가
   */
  pushModal(id: string, onClose: () => void) {
    this.modalStack.push({ id, onClose });
    this.setupESCListener();
  }

  /**
   * 모달을 스택에서 제거
   */
  popModal(id: string) {
    this.modalStack = this.modalStack.filter(modal => modal.id !== id);
    if (this.modalStack.length === 0) {
      this.removeESCListener();
    }
  }

  /**
   * 최상위 모달 가져오기
   */
  getTopModal(): ModalInstance | null {
    return this.modalStack[this.modalStack.length - 1] || null;
  }

  /**
   * 특정 모달이 최상위인지 확인
   */
  isTopModal(id: string): boolean {
    const topModal = this.getTopModal();
    return topModal?.id === id;
  }

  private escListener?: (e: KeyboardEvent) => void;

  private setupESCListener() {
    if (this.escListener) return; // 이미 등록된 경우 중복 등록 방지

    this.escListener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const topModal = this.getTopModal();
        if (topModal) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          topModal.onClose();
        }
      }
    };

    // keydown만 등록 (keyup 제거로 중복 방지)
    document.addEventListener('keydown', this.escListener, { capture: true, passive: false });
    window.addEventListener('keydown', this.escListener, { capture: true, passive: false });
  }

  private removeESCListener() {
    if (this.escListener) {
      document.removeEventListener('keydown', this.escListener, { capture: true });
      window.removeEventListener('keydown', this.escListener, { capture: true });
      this.escListener = undefined;
    }
  }
}

// 전역 인스턴스
export const modalManager = new ModalManager();
