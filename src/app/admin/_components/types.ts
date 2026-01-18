// Common types for Admin2 components
export interface Message {
    type: 'success' | 'error';
    text: string;
}

export interface ConfirmDialog {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
}
