import { create } from 'zustand';
import { useShimmerStore } from '@/components/shimmer-effect';

interface ModalStore {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

export const useModalStore = create<ModalStore>((set) => ({
  isOpen: false,
  openModal: () => {
    useShimmerStore.getState().trigger();
    set({ isOpen: true });
  },
  closeModal: () => set({ isOpen: false }),
}));
